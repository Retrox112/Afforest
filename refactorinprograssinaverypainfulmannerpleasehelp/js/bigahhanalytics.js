// analytics.js
export let analyticsMode = 'pin'; // 'pin' | 'draw'
let pinMarker = null;
let radiusCircle = null;
let drawnPolygon = null;
let drawnPoints = [];
let isDrawing = false;
let chartSpeciesInst = null;
let chartAgesInst = null;

const DARK_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';

export function setupAnalyticsMap() {
  if (analyticsMap) return;

  analyticsMap = L.map('analyticsMap', { zoomControl: true }).setView([20, 0], 2);
  L.tileLayer(DARK_TILES, { maxZoom: 16 }).addTo(analyticsMap);

  analyticsPinsGroup = L.layerGroup().addTo(analyticsMap);
  renderInteractivePins();

  pinMarker = L.marker([20, 0], { draggable: true }).addTo(analyticsMap);
  radiusCircle = L.circle([20, 0], {
    radius: 100000,
    color: '#52b788',
    fillColor: '#52b788',
    fillOpacity: 0.2,
    zIndex: 500
  }).addTo(analyticsMap);

  pinMarker.on('drag', function(e) {
    const latlng = e.target.getLatLng();
    radiusCircle.setLatLng(latlng);
    runAnalyticsQuery();
  });

  analyticsMap.on('click', function(e) {
    if (analyticsMode === 'pin') {
      pinMarker.setLatLng(e.latlng);
      radiusCircle.setLatLng(e.latlng);
      runAnalyticsQuery();
    }
  });

  setupFreehandCanvas();
}

export function setAnalyticsMode(mode) {
  analyticsMode = mode;
  const pinBtn = document.getElementById('modePinBtn');
  const drawBtn = document.getElementById('modeDrawBtn');
  const radCtrl = document.getElementById('radiusControl');
  const drawCtrl = document.getElementById('drawControl');
  const canvas = document.getElementById('freehandCanvas');

  if (mode === 'pin') {
    if (pinBtn) pinBtn.className = "px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-forest-600 text-white transition flex items-center gap-1.5";
    if (drawBtn) drawBtn.className = "px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 transition flex items-center gap-1.5";
    if (radCtrl) radCtrl.classList.remove('hidden');
    if (drawCtrl) drawCtrl.classList.add('hidden');
    if (canvas) {
      canvas.classList.add('hidden');
      canvas.style.pointerEvents = 'none';
    }
    if (pinMarker && analyticsMap) analyticsMap.addLayer(pinMarker);
    if (radiusCircle && analyticsMap) analyticsMap.addLayer(radiusCircle);
    if (drawnPolygon && analyticsMap) analyticsMap.removeLayer(drawnPolygon);
  } else {
    if (drawBtn) drawBtn.className = "px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-forest-600 text-white transition flex items-center gap-1.5";
    if (pinBtn) pinBtn.className = "px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 transition flex items-center gap-1.5";
    if (radCtrl) radCtrl.classList.add('hidden');
    if (drawCtrl) drawCtrl.classList.remove('hidden');
    if (canvas) {
      canvas.classList.remove('hidden');
      canvas.style.pointerEvents = 'auto';
    }
    if (pinMarker && analyticsMap) analyticsMap.removeLayer(pinMarker);
    if (radiusCircle && analyticsMap) analyticsMap.removeLayer(radiusCircle);
  }
  runAnalyticsQuery();
}

export function updateRadius(kmVal) {
  const radiusValEl = document.getElementById('radiusVal');
  if (radiusValEl) radiusValEl.innerText = kmVal;
  if (radiusCircle) {
    radiusCircle.setRadius(kmVal * 1000);
    runAnalyticsQuery();
  }
}

let canvasCtx = null;
let currentCanvas = null;

export function setupFreehandCanvas() {
  currentCanvas = document.getElementById('freehandCanvas');
  if (!currentCanvas) return;
  canvasCtx = currentCanvas.getContext('2d');

  function resizeCanvas() {
    const rect = currentCanvas.parentElement.getBoundingClientRect();
    currentCanvas.width = rect.width;
    currentCanvas.height = rect.height;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  currentCanvas.addEventListener('mousedown', startDraw);
  currentCanvas.addEventListener('mousemove', drawMove);
  window.addEventListener('mouseup', endDraw);

  currentCanvas.addEventListener('touchstart', startDraw, { passive: false });
  currentCanvas.addEventListener('touchmove', drawMove, { passive: false });
  window.addEventListener('touchend', endDraw);
}

function startDraw(e) {
  if (analyticsMode !== 'draw' || !canvasCtx) return;
  isDrawing = true;
  drawnPoints = [];
  canvasCtx.clearRect(0, 0, currentCanvas.width, currentCanvas.height);
  const pt = getCanvasPos(e);
  drawnPoints.push(pt);
}

function drawMove(e) {
  if (!isDrawing || analyticsMode !== 'draw' || !canvasCtx) return;
  if (e.cancelable) e.preventDefault();
  const pt = getCanvasPos(e);
  drawnPoints.push(pt);

  canvasCtx.clearRect(0, 0, currentCanvas.width, currentCanvas.height);
  if (drawnPoints.length < 2) return;

  canvasCtx.beginPath();
  canvasCtx.strokeStyle = '#52b788';
  canvasCtx.lineWidth = 4;
  canvasCtx.shadowColor = '#52b788';
  canvasCtx.shadowBlur = 10;
  canvasCtx.fillStyle = 'rgba(82, 183, 136, 0.35)';
  
  canvasCtx.moveTo(drawnPoints[0].x, drawnPoints[0].y);
  for (let i = 1; i < drawnPoints.length; i++) {
    canvasCtx.lineTo(drawnPoints[i].x, drawnPoints[i].y);
  }
  canvasCtx.closePath();
  canvasCtx.fill();
  canvasCtx.stroke();
}

function endDraw() {
  if (!isDrawing || analyticsMode !== 'draw' || !canvasCtx) return;
  isDrawing = false;
  canvasCtx.clearRect(0, 0, currentCanvas.width, currentCanvas.height);

  if (drawnPoints.length > 2 && analyticsMap) {
    const latLngs = drawnPoints.map(p => analyticsMap.containerPointToLatLng(L.point(p.x, p.y)));
    if (drawnPolygon) analyticsMap.removeLayer(drawnPolygon);
    drawnPolygon = L.polygon(latLngs, {
      color: '#52b788',
      fillColor: '#52b788',
      fillOpacity: 0.4,
      weight: 3.5
    }).addTo(analyticsMap);
    runAnalyticsQuery();
  }
}

function getCanvasPos(e) {
  const rect = currentCanvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return { x: clientX - rect.left, y: clientY - rect.top };
}

export function clearFreehandDraw() {
  drawnPoints = [];
  if (drawnPolygon && analyticsMap) {
    analyticsMap.removeLayer(drawnPolygon);
    drawnPolygon = null;
  }
  runAnalyticsQuery();
}

export function isPointInPolygon(point, vs) {
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0], yi = vs[i][1];
    const xj = vs[j][0], yj = vs[j][1];
    const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function runAnalyticsQuery() {
  let filtered = [];

  if (analyticsMode === 'pin' && pinMarker && radiusCircle) {
    const center = pinMarker.getLatLng();
    const radiusMeters = radiusCircle.getRadius();
    filtered = treeDB.filter(t => calculateDistanceMeters(center.lat, center.lng, t.lat, t.lng) <= radiusMeters);
  } else if (analyticsMode === 'draw' && drawnPolygon) {
    const polyCoords = drawnPolygon.getLatLngs()[0].map(ll => [ll.lat, ll.lng]);
    filtered = treeDB.filter(t => isPointInPolygon([t.lat, t.lng], polyCoords));
  } else {
    filtered = treeDB;
  }

  const statAreaCount = document.getElementById('statAreaCount');
  const filteredListBadge = document.getElementById('filteredListBadge');
  if (statAreaCount) statAreaCount.innerText = filtered.length;
  if (filteredListBadge) filteredListBadge.innerText = `${filtered.length} Items`;

  const ages = filtered.filter(t => t.age !== null).map(t => t.age);
  const meanAge = ages.length > 0 ? (ages.reduce((a,b)=>a+b,0) / ages.length).toFixed(1) : 0;
  const statMeanAge = document.getElementById('statMeanAge');
  if (statMeanAge) statMeanAge.innerText = `${meanAge} yrs`;

  const speciesMap = {};
  const speciesAgeMap = {};

  filtered.forEach(t => {
    const type = t.type || 'Unknown';
    speciesMap[type] = (speciesMap[type] || 0) + 1;
    if (t.age !== null) {
      if (!speciesAgeMap[type]) speciesAgeMap[type] = [];
      speciesAgeMap[type].push(t.age);
    }
  });

  const uniqueSpeciesCount = Object.keys(speciesMap).length;
  const statSpeciesCount = document.getElementById('statSpeciesCount');
  if (statSpeciesCount) statSpeciesCount.innerText = uniqueSpeciesCount;

  renderAnalyticsCharts(speciesMap, speciesAgeMap);
  renderAnalyticsTreeList(filtered);
}

export function renderAnalyticsCharts(speciesMap, speciesAgeMap) {
  const labels = Object.keys(speciesMap);
  const counts = Object.values(speciesMap);

  const meanAges = labels.map(sp => {
    const arr = speciesAgeMap[sp] || [];
    return arr.length > 0 ? (arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1) : 0;
  });

  const chartSpeciesEl = document.getElementById('chartSpecies');
  if (chartSpeciesEl) {
    const ctx1 = chartSpeciesEl.getContext('2d');
    if (chartSpeciesInst) chartSpeciesInst.destroy();
    chartSpeciesInst = new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: labels.length > 0 ? labels : ['No Data'],
        datasets: [{
          label: 'Tree Count',
          data: counts.length > 0 ? counts : [0],
          backgroundColor: '#52b788',
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#94a3b8', font: { size: 10 } } },
          y: { ticks: { color: '#94a3b8', font: { size: 10 } }, beginAtZero: true }
        }
      }
    });
  }

  const chartAgesEl = document.getElementById('chartAges');
  if (chartAgesEl) {
    const ctx2 = chartAgesEl.getContext('2d');
    if (chartAgesInst) chartAgesInst.destroy();
    chartAgesInst = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: labels.length > 0 ? labels : ['No Data'],
        datasets: [{
          label: 'Mean Age (yrs)',
          data: meanAges.length > 0 ? meanAges : [0],
          backgroundColor: '#00b4d8',
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: '#94a3b8', font: { size: 10 } } },
          y: { ticks: { color: '#94a3b8', font: { size: 10 } }, beginAtZero: true }
        }
      }
    });
  }
}

export function renderAnalyticsTreeList(list) {
  const container = document.getElementById('analyticsTreeList');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = `<p class="text-xs text-slate-500 py-3 text-center">No trees found in the selected region.</p>`;
    return;
  }

  container.innerHTML = list.map(t => `
    <div class="bg-navy-950 p-2.5 rounded-xl border border-navy-800 flex items-center justify-between text-xs">
      <div>
        <span class="font-bold text-slate-200 block">${t.type || 'Unknown Species'}</span>
        <span class="text-[10px] text-slate-400">Lat: ${t.lat.toFixed(4)}, Lng: ${t.lng.toFixed(4)}</span>
      </div>
      <div class="text-right">
        <span class="text-emerald-400 font-semibold block">${t.age !== null ? t.age + ' yrs' : 'Unknown age'}</span>
        <button onclick="openTreeDetail('${t.id}')" class="text-[10px] text-cyanacc hover:underline">Details</button>
      </div>
    </div>
  `).join('');
}