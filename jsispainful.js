   /* ==========================================================================
       1. INITIALIZATION & SEED DATA
       ========================================================================== */
    const STORAGE_KEY = 'afforest_trees_db_v2';

    let treeDB = [];
    let isMobileDevice = false;
    let devTapCount = 0;
    let devTapTimer = null;

    // Certainty Slider Text Map
    const CERTAINTY_MAP = {
      1: "Unknown",
      2: "Extremely Doubtful",
      3: "Doubtful",
      4: "Somewhat Uncertain",
      5: "Uncertain",
      6: "Moderately Certain",
      7: "Fairly Certain",
      8: "Almost Certain",
      9: "Very Certain",
      10: "Certain"
    };

    /* ==========================================================================
       2. APP LAUNCH & DEVICE DETECTION
       ========================================================================== */
    window.addEventListener('DOMContentLoaded', async () => {
      detectDevice();
      await loadDatabase();
      setTimeout(() => {
        initMaps();
        updateTreeCounters();
        renderBlogFeed();
        setupAnalyticsMap();
        updateCertaintyUI(1);
      }, 50);
    });

    function detectDevice() {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const isMobileUA = /android|iphone|ipad|ipod|windows phone/i.test(userAgent);
      const isSmallScreen = window.innerWidth <= 768;
      const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

      isMobileDevice = isMobileUA || (isSmallScreen && hasTouch);
      applyDeviceModeUI();
    }

    function applyDeviceModeUI() {
      const desktopNotice = document.getElementById('desktopNotice');

      if (!isMobileDevice) {
        desktopNotice.classList.remove('hidden');
        document.querySelectorAll('.mobile-only-flex').forEach(el => el.classList.add('hidden'));
      } else {
        desktopNotice.classList.add('hidden');
        document.querySelectorAll('.mobile-only-flex').forEach(el => el.classList.remove('hidden'));
      }

      const badge = document.getElementById('devDeviceStatusBadge');
      if (badge) {
        badge.innerText = isMobileDevice ? "Mobile Active" : "Desktop Active";
        badge.className = isMobileDevice 
          ? "text-[10px] px-2 py-0.5 rounded-full font-semibold bg-forest-500/20 text-forest-300 border border-forest-500/30"
          : "text-[10px] px-2 py-0.5 rounded-full font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30";
      }
    }
/*
    //edit this to retrieve data from cloud
    function loadDatabase() {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          treeDB = JSON.parse(stored);
        } catch(e) {
          treeDB = [];
        }
      } else {
        treeDB = [];
        saveDatabase();
      }
    }
    
    //edit this to store data in cloud
    function saveDatabase() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(treeDB));
      updateTreeCounters();
    }
*/
    function updateTreeCounters() {
      const total = treeDB.length;
      document.getElementById('headerTreeCount').innerText = total;
      document.getElementById('homeTotalTrees').innerText = total.toLocaleString();
    }

/* ==========================================================================
   SUPABASE DATABASE INTEGRATION
   ========================================================================== */
  const SUPABASE_URL = 'https://ztzooirkdgvlpxnkzlgu.supabase.co/rest/v1/trees';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0em9vaXJrZGd2bHB4bmt6bGd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2MzAzODEsImV4cCI6MjEwOTIwNjM4MX0.VFkr319f9ZFPD3zUXhohdRdIErjjOcr-l7rk33VRPb8';
  const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Fetch all tree records from the cloud database
  async function loadDatabase() {
    try {
      const { data, error } = await supabaseClient
        .from('trees')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      treeDB = data || [];
      updateTreeCounters();
      renderBlogFeed();
      refreshMapHeatmaps();
    } catch (err) {
      console.error('Failed to load trees from cloud:', err);
      showToast('Cloud database offline. Falling back to local cache.', true);
    }
  }

  // Insert a single new tree record into the cloud database
  async function saveTreeToCloud(newTree) {
    try {
      const { error } = await supabaseClient
        .from('trees')
        .insert([newTree]);

      if (error) throw error;

      showToast("Tree observation synced to cloud successfully!");
    } catch (err) {
      console.error('Cloud save failed:', err);
      showToast("failed to sync to cloud.", true);
    }
  }

    /* ==========================================================================
       3. ROUTING & NAVIGATION
       ========================================================================== */
    function navigateTo(pageId) {
      document.querySelectorAll('.page-content').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('active');
      });

      const target = document.getElementById(`page-${pageId}`);
      if (target) {
        target.classList.remove('hidden');
        target.classList.add('active');
      }

      document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-forest-400');
        btn.classList.add('text-slate-400');
      });
      const activeNav = document.getElementById(`nav-${pageId}`);
      if (activeNav) {
        activeNav.classList.remove('text-slate-400');
        activeNav.classList.add('text-forest-400');
      }

      setTimeout(() => {
        if (pageId === 'home' && homeMap) homeMap.invalidateSize();
        if (pageId === 'map' && interactiveMap) {
          interactiveMap.invalidateSize();
          interactiveMap.setView(interactiveMap.getCenter(), interactiveMap.getZoom());
        }
        if (pageId === 'analytics' && analyticsMap) {
          analyticsMap.invalidateSize();
          runAnalyticsQuery();
        }
      }, 250);
    }

    /* ==========================================================================
       4. MAPS ENGINE (ALWAYS-ENABLED ACCENT GREEN DOTS)
       ========================================================================== */
    let homeMap, interactiveMap, analyticsMap;
    let homePinsGroup, interactivePinsGroup, analyticsPinsGroup;

    // Public Dark Tile Layer (Esri Dark Gray Canvas - No API Key Needed)
    const DARK_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
    const TILE_ATTR = 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, OpenStreetMap contributors';

    function initMaps() {
      
      homeMap = L.map('homeHeatmap', {
        zoomControl: false,
        attributionControl: false
      }).setView([20, 0], 2);
      L.tileLayer(DARK_TILES, { maxZoom: 16 }).addTo(homeMap);
      homePinsGroup = L.layerGroup().addTo(homeMap);

      interactiveMap = L.map('interactiveMap').setView([20, 0], 2);
      L.tileLayer(DARK_TILES, { attribution: TILE_ATTR, maxZoom: 16 }).addTo(interactiveMap);
      interactivePinsGroup = L.layerGroup().addTo(interactiveMap);

      renderInteractivePins();

      setTimeout(() => {
        if (homeMap) homeMap.invalidateSize();
        if (interactiveMap) interactiveMap.invalidateSize();
      }, 300);
    }

    function refreshMapHeatmaps() {
      if (homeMap) homeMap.invalidateSize();
      if (interactiveMap) interactiveMap.invalidateSize();
      if (analyticsMap) analyticsMap.invalidateSize();
      renderInteractivePins();
    }

    /* ==========================================================================
       4.1 MAP MARKERS / DOTS RENDERER
       ========================================================================== */
    function renderInteractivePins() {
      if (homePinsGroup) homePinsGroup.clearLayers();
      if (interactivePinsGroup) interactivePinsGroup.clearLayers();
      if (analyticsPinsGroup) analyticsPinsGroup.clearLayers();

      // Custom Glowing Forest Green Accent Dot Icon
      const dotIcon = L.divIcon({
        className: 'custom-tree-dot',
        html: `<div style="width: 12px; height: 12px; background-color: #52b788; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 0 10px #52b788;"></div>`,
        iconSize: [12, 12],
        iconAnchor: [6, 6]
      });

      treeDB.forEach(tree => {
        const popupContent = `
          <div class="space-y-2 text-xs">
            <div class="font-bold text-slate-100">${tree.type || 'Unknown Species'}</div>
            <div class="text-[11px] text-slate-300">
              <div>Age: <span class="text-forest-400 font-bold">${tree.age !== null ? tree.age + ' yrs' : 'Unknown'}</span></div>
              <div class="font-mono text-[10px] text-slate-400">${tree.lat.toFixed(4)}, ${tree.lng.toFixed(4)}</div>
            </div>
            <button onclick="openTreeDetail('${tree.id}')" class="w-full bg-forest-600 hover:bg-forest-500 text-white py-1 px-2 rounded text-[10px] font-semibold">
              View Details & History
            </button>
          </div>
        `;

        // Add to Home Map pins layer
        if (homePinsGroup) {
          const homeMarker = L.marker([tree.lat, tree.lng], { icon: dotIcon }).bindPopup(popupContent);
          homePinsGroup.addLayer(homeMarker);
        }

        // Add to Interactive Map pins layer
        if (interactivePinsGroup) {
          const marker = L.marker([tree.lat, tree.lng], { icon: dotIcon }).bindPopup(popupContent);
          interactivePinsGroup.addLayer(marker);
        }

        // Add to Analytics Map pins layer if created
        if (analyticsPinsGroup) {
          const analyticsMarker = L.marker([tree.lat, tree.lng], { icon: dotIcon }).bindPopup(popupContent);
          analyticsPinsGroup.addLayer(analyticsMarker);
        }
      });
    }

    /* ==========================================================================
       5. BLOG FEED MODULE
       ========================================================================== */
    function renderBlogFeed() {
      const feedContainer = document.getElementById('blogFeedList');
      if (!feedContainer) return;

      if (treeDB.length === 0) {
        feedContainer.innerHTML = `
          <div class="bg-navy-900 border border-navy-800/80 rounded-2xl p-8 text-center space-y-3">
            <div class="w-12 h-12 rounded-full bg-forest-800/30 text-forest-400 flex items-center justify-center mx-auto">
              <i class="fa-solid fa-tree text-2xl"></i>
            </div>
            <h3 class="text-sm font-bold text-slate-200">No Trees Recorded Yet</h3>
            <p class="text-xs text-slate-400 max-w-sm mx-auto">The database is currently empty. Tap the record button on a mobile device to log your first tree observation!</p>
          </div>
        `;
        return;
      }

      feedContainer.innerHTML = treeDB.map(tree => {
        const latestLog = tree.logs && tree.logs.length > 0 ? tree.logs[tree.logs.length - 1] : null;
        const photoUrl = latestLog ? latestLog.photo : 'https://placehold.co/600x400/0a1128/52b788?text=Tree+Observation';
        const logCount = tree.logs ? tree.logs.length : 1;
        const certaintyText = CERTAINTY_MAP[tree.certainty] || 'Unknown';

        return `
          <div class="bg-navy-900 border border-navy-800 rounded-3xl overflow-hidden shadow-xl hover:border-navy-700 transition space-y-3">
            <div class="relative h-56 md:h-64 w-full bg-navy-950">
              <img src="${photoUrl}" alt="${tree.type || 'Tree'}" class="w-full h-full object-cover">
              <div class="absolute top-3 right-3 bg-navy-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-navy-700 text-[11px] font-semibold text-slate-200 flex items-center gap-1.5">
                <i class="fa-solid fa-camera text-forest-400"></i> ${logCount} Log${logCount > 1 ? 's' : ''}
              </div>
              <div class="absolute bottom-3 left-3 bg-navy-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-navy-700 text-[11px] font-semibold text-forest-300">
                ${certaintyText}
              </div>
            </div>

            <div class="p-4 md:p-5 space-y-3">
              <div class="flex items-start justify-between">
                <div>
                  <h3 class="text-lg font-bold text-slate-100">${tree.type || 'Unknown Species'}</h3>
                  <p class="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <i class="fa-solid fa-location-dot text-rose-400"></i>
                    Lat: ${tree.lat.toFixed(5)}, Lng: ${tree.lng.toFixed(5)}
                  </p>
                </div>
                <div class="text-right">
                  <span class="text-xs font-semibold text-slate-400 block">Est. Age</span>
                  <span class="text-base font-extrabold text-forest-400">${tree.age !== null ? tree.age + ' yrs' : 'Unknown'}</span>
                </div>
              </div>

              <div class="pt-2 border-t border-navy-800/80 flex items-center justify-between">
                <span class="text-[11px] text-slate-500">ID: ${tree.id}</span>
                <button onclick="openTreeDetail('${tree.id}')" class="text-xs text-cyanacc hover:text-cyan-300 font-semibold flex items-center gap-1">
                  View Full History <i class="fa-solid fa-chevron-right text-[10px]"></i>
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    /* ==========================================================================
       6. CREATE POST & CAMERA MODAL LOGIC
       ========================================================================== */
    let currentPhotoBase64 = null;
    let selectedLat = null;
    let selectedLng = null;

    function openCreateModal() {
      if (!isMobileDevice) {
        showToast("Recording tree observations is only supported on mobile devices with camera hardware.", true);
        return;
      }
      document.getElementById('createPostModal').classList.remove('hidden');
    }

    function closeCreateModal() {
      document.getElementById('createPostModal').classList.add('hidden');
      resetCreateForm();
    }

/*    function resetCreateForm() {
      document.getElementById('treePostForm').reset();
      currentPhotoBase64 = null;
      selectedLat = null;
      selectedLng = null;
      document.getElementById('photoPreview').classList.add('hidden');
      document.getElementById('photoPlaceholder').classList.remove('hidden');
      document.getElementById('duplicateAlert').classList.add('hidden');
      document.getElementById('inputLat').value = '';
      document.getElementById('inputLng').value = '';
      document.getElementById('geoStatus').innerText = "Click 'Get GPS' to fetch precise location coordinates.";
      updateCertaintyUI(1);
    } */

      function resetCreateForm() {
      const form = document.getElementById('treePostForm');
      if (form) form.reset();

      currentPhotoBase64 = null;
      selectedLat = null;
      selectedLng = null;

      const preview = document.getElementById('photoPreview');
      if (preview) preview.classList.add('hidden');

      const placeholder = document.getElementById('photoPlaceholder');
      if (placeholder) placeholder.classList.remove('hidden');

      const duplicateAlert = document.getElementById('duplicateAlert');
      if (duplicateAlert) duplicateAlert.classList.add('hidden');

      const inputLat = document.getElementById('inputLat');
      if (inputLat) inputLat.value = '';

      const inputLng = document.getElementById('inputLng');
      if (inputLng) inputLng.value = '';

      const geoStatus = document.getElementById('geoStatus');
      if (geoStatus) geoStatus.innerText = "Click 'Get GPS' to fetch precise location coordinates.";

      updateCertaintyUI(1);
    }

    function handlePhotoSelect(event) {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(e) {
        currentPhotoBase64 = e.target.result;
        const preview = document.getElementById('photoPreview');
        const placeholder = document.getElementById('photoPlaceholder');
        preview.src = currentPhotoBase64;
        preview.classList.remove('hidden');
        placeholder.classList.add('hidden');
      };
      reader.readAsDataURL(file);
    }

    function acquireGPSLocation() {
      const status = document.getElementById('geoStatus');
      status.innerText = "Acquiring satellite GPS location...";
      status.className = "text-[10px] text-amber-400 mt-1 animate-pulse";

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            selectedLat = pos.coords.latitude;
            selectedLng = pos.coords.longitude;
            document.getElementById('inputLat').value = selectedLat.toFixed(6);
            document.getElementById('inputLng').value = selectedLng.toFixed(6);
            status.innerText = "Location locked successfully!";
            status.className = "text-[10px] text-forest-400 mt-1";
            //checkForDuplicates(selectedLat, selectedLng);
          },
          (err) => {
            // Fallback random mock coordinates if user denies or on dev
            /*selectedLat = 37.7749 + (Math.random() - 0.5) * 0.05;
            selectedLng = -122.4194 + (Math.random() - 0.5) * 0.05;
            document.getElementById('inputLat').value = selectedLat.toFixed(6);
            document.getElementById('inputLng').value = selectedLng.toFixed(6);
            status.innerText = "GPS unavailable. Generated mock coordinates for testing.";
            status.className = "text-[10px] text-amber-400 mt-1";
            checkForDuplicates(selectedLat, selectedLng);*/
            showToast("Unable to acquire GPS location. Please ensure location services are enabled.", true);
            status.innerText = "Failed to acquire GPS location.";
            status.className = "text-[10px] text-rose-400 mt-1";
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
        status.innerText = "Geolocation not supported by device browser.";
        status.className = "text-[10px] text-rose-400 mt-1";
      }
    }

    function updateCertaintyUI(val) {
      const numericVal = parseInt(val);
      const text = CERTAINTY_MAP[numericVal] || "Unknown";
      const badge = document.getElementById('certaintyBadge');
      badge.innerText = `${numericVal}: ${text}`;

      const typeInput = document.getElementById('inputTreeType');
      const ageInput = document.getElementById('inputTreeAge');
      const reqTreeType = document.getElementById('reqTreeType');
      const reqTreeAge = document.getElementById('reqTreeAge');

      if (numericVal === 1) { // 1 = Unknown
        typeInput.disabled = true;
        ageInput.disabled = true;
        typeInput.value = "";
        ageInput.value = "";
        reqTreeType.classList.add('hidden');
        reqTreeAge.classList.add('hidden');
        badge.className = "text-xs font-bold text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700";
      } else {
        typeInput.disabled = false;
        ageInput.disabled = false;
        reqTreeType.classList.remove('hidden');
        reqTreeAge.classList.remove('hidden');

        if (numericVal >= 8) {
          badge.className = "text-xs font-bold text-forest-300 bg-forest-800/40 px-2.5 py-0.5 rounded-full border border-forest-600/40";
        } else if (numericVal >= 4) {
          badge.className = "text-xs font-bold text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full border border-amber-500/40";
        } else {
          badge.className = "text-xs font-bold text-rose-300 bg-rose-500/20 px-2.5 py-0.5 rounded-full border border-rose-500/40";
        }
      }
    }

/*    function checkForDuplicates(lat, lng) {
      const existing = findNearbyTree(lat, lng, 20); // 20 meters threshold
      const alertBox = document.getElementById('duplicateAlert');
      if (existing) {
        alertBox.classList.remove('hidden');
      } else {
        alertBox.classList.add('hidden');
      }
    }
*/
    function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
      const R = 6371e3;
      const p1 = lat1 * Math.PI/180;
      const p2 = lat2 * Math.PI/180;
      const dp = (lat2-lat1) * Math.PI/180;
      const dl = (lon2-lon1) * Math.PI/180;

      const a = Math.sin(dp/2) * Math.sin(dp/2) +
                Math.cos(p1) * Math.cos(p2) *
                Math.sin(dl/2) * Math.sin(dl/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    }
/*
    function findNearbyTree(lat, lng, maxMeters = 20) {
      return treeDB.find(t => calculateDistanceMeters(t.lat, t.lng, lat, lng) <= maxMeters);
    }
*/
    function handleTreeSubmit(event) {
      event.preventDefault();

      // Check required Photo or GPS or Form fields
      const certainty = parseInt(document.getElementById('certaintyRange').value);
      const typeVal = document.getElementById('inputTreeType').value.trim();
      const ageVal = document.getElementById('inputTreeAge').value.trim();

      if (!currentPhotoBase64 || selectedLat === null || selectedLng === null || (certainty > 1 && (!typeVal || !ageVal))) {
        showToast("Please fill out the post completely", true);
        return;
      }

      const treeType = (certainty === 1 || !typeVal) ? "unknown" : typeVal;
      const treeAge = (certainty === 1 || !ageVal) ? 0 : parseInt(ageVal);

      // Check for duplicate within 20m
      //const existingTree = false; 
      //findNearbyTree(selectedLat, selectedLng, 20);
/*
      if (existingTree) {
        // Append log to existing tree history
        existingTree.logs.push({
          photo: currentPhotoBase64,
          timestamp: new Date().toISOString(),
          certainty: certainty
        });
        if (treeType && !existingTree.type) existingTree.type = treeType;
        if (treeAge && existingTree.age === null) existingTree.age = treeAge;
        showToast("Image logged to existing tree entry!");
      } else {
        // Create new tree entry
        const newTree = {
          id: 'tree_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          lat: selectedLat,
          lng: selectedLng,
          type: treeType,
          age: treeAge,
          certainty: certainty,
          logs: [{
            photo: currentPhotoBase64,
            timestamp: new Date().toISOString(),
            certainty: certainty
          }]
        };
        treeDB.unshift(newTree);
        showToast("New tree observation published successfully!");
      }
*/
        // Create new tree entry
        const newTree = {
          id: 'tree_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          lat: selectedLat,
          lng: selectedLng,
          type: treeType,
          age: treeAge,
          certainty: certainty,
          logs: [{
            photo: currentPhotoBase64,
            timestamp: new Date().toISOString(),
            certainty: certainty
          }]
        };
        treeDB.unshift(newTree);
        showToast("New tree observation published successfully!");
      //saveDatabase();
      refreshMapHeatmaps();
      renderBlogFeed();
      closeCreateModal();
      updateTreeCounters();
      saveTreeToCloud(newTree);
    }

    /* ==========================================================================
       7. TREE DETAIL MODAL VIEW
       ========================================================================== */
    function openTreeDetail(treeId) {
      const tree = treeDB.find(t => t.id === treeId);
      if (!tree) return;

      const title = document.getElementById('modalTreeTitle');
      const body = document.getElementById('modalTreeBody');

      title.innerHTML = `<i class="fa-solid fa-tree text-forest-400"></i> ${tree.type || 'Unknown Species'}`;

      const logsHtml = tree.logs.map((log, idx) => `
        <div class="bg-navy-950 p-3 rounded-2xl border border-navy-800 space-y-2">
          <img src="${log.photo}" class="w-full h-40 object-cover rounded-xl" alt="Log Photo ${idx + 1}">
          <div class="flex items-center justify-between text-[11px] text-slate-400">
            <span>Log #${idx + 1} &bull; ${new Date(log.timestamp).toLocaleDateString()}</span>
            <span class="text-forest-400 font-semibold">${CERTAINTY_MAP[log.certainty] || 'Unknown'}</span>
          </div>
        </div>
      `).join('');

      body.innerHTML = `
        <div class="grid grid-cols-2 gap-2 bg-navy-950 p-3 rounded-2xl border border-navy-800 text-xs">
          <div>
            <span class="text-slate-400 block text-[10px]">Location Coordinates</span>
            <span class="font-bold text-slate-200 font-mono">${tree.lat.toFixed(5)}, ${tree.lng.toFixed(5)}</span>
          </div>
          <div>
            <span class="text-slate-400 block text-[10px]">Recorded Age</span>
            <span class="font-bold text-forest-400">${tree.age !== null ? tree.age + ' Years' : 'Unknown'}</span>
          </div>
        </div>

        <div class="space-y-2">
          <h4 class="text-xs font-bold text-slate-300 uppercase tracking-wider">Photo History Log (${tree.logs.length})</h4>
          <div class="space-y-3 max-h-60 overflow-y-auto pr-1">
            ${logsHtml}
          </div>
        </div>
      `;

      document.getElementById('treeDetailModal').classList.remove('hidden');
    }

    function closeDetailModal() {
      document.getElementById('treeDetailModal').classList.add('hidden');
    }

    /* ==========================================================================
       8. SPATIAL DATA RETRIEVAL & ANALYTICS MODULE
       ========================================================================== */
    let analyticsMode = 'pin'; // 'pin' | 'draw'
    let pinMarker = null;
    let radiusCircle = null;
    let drawnPolygon = null;
    let drawnPoints = [];
    let isDrawing = false;
    let chartSpeciesInst = null;
    let chartAgesInst = null;

    function setupAnalyticsMap() {
      if (analyticsMap) return;

      analyticsMap = L.map('analyticsMap', { zoomControl: true }).setView([20, 0], 2);
      L.tileLayer(DARK_TILES, { maxZoom: 16 }).addTo(analyticsMap);

      analyticsPinsGroup = L.layerGroup().addTo(analyticsMap);
      renderInteractivePins();

      // Default analytics pin
      pinMarker = L.marker([20, 0], { draggable: true }).addTo(analyticsMap);
      radiusCircle = L.circle([20, 0], {
        radius: 100000,
        color: '#52b788',
        fillColor: '#52b788',
        fillOpacity: 0.2
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

    function setAnalyticsMode(mode) {
      analyticsMode = mode;
      const pinBtn = document.getElementById('modePinBtn');
      const drawBtn = document.getElementById('modeDrawBtn');
      const radCtrl = document.getElementById('radiusControl');
      const drawCtrl = document.getElementById('drawControl');
      const canvas = document.getElementById('freehandCanvas');

      if (mode === 'pin') {
        pinBtn.className = "px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-forest-600 text-white transition flex items-center gap-1.5";
        drawBtn.className = "px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 transition flex items-center gap-1.5";
        radCtrl.classList.remove('hidden');
        drawCtrl.classList.add('hidden');
        canvas.classList.add('hidden');
        canvas.style.pointerEvents = 'none';
        if (pinMarker) analyticsMap.addLayer(pinMarker);
        if (radiusCircle) analyticsMap.addLayer(radiusCircle);
        if (drawnPolygon) analyticsMap.removeLayer(drawnPolygon);
      } else {
        drawBtn.className = "px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-forest-600 text-white transition flex items-center gap-1.5";
        pinBtn.className = "px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 transition flex items-center gap-1.5";
        radCtrl.classList.add('hidden');
        drawCtrl.classList.remove('hidden');
        canvas.classList.remove('hidden');
        canvas.style.pointerEvents = 'auto'; // Enable draw events on canvas
        if (pinMarker) analyticsMap.removeLayer(pinMarker);
        if (radiusCircle) analyticsMap.removeLayer(radiusCircle);
      }
      runAnalyticsQuery();
    }

    function updateRadius(kmVal) {
      document.getElementById('radiusVal').innerText = kmVal;
      if (radiusCircle) {
        radiusCircle.setRadius(kmVal * 1000);
        runAnalyticsQuery();
      }
    }

    function setupFreehandCanvas() {
      const canvas = document.getElementById('freehandCanvas');
      const ctx = canvas.getContext('2d');

      function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);

      function startDraw(e) {
        if (analyticsMode !== 'draw') return;
        isDrawing = true;
        drawnPoints = [];
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const pt = getCanvasPos(e);
        drawnPoints.push(pt);
      }

      function drawMove(e) {
        if (!isDrawing || analyticsMode !== 'draw') return;
        if (e.cancelable) e.preventDefault();
        const pt = getCanvasPos(e);
        drawnPoints.push(pt);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (drawnPoints.length < 2) return;

        // Enhanced bright glowing line rendering during draw drag
        ctx.beginPath();
        ctx.strokeStyle = '#52b788';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#52b788';
        ctx.shadowBlur = 10;
        ctx.fillStyle = 'rgba(82, 183, 136, 0.35)';
        
        ctx.moveTo(drawnPoints[0].x, drawnPoints[0].y);
        for (let i = 1; i < drawnPoints.length; i++) {
          ctx.lineTo(drawnPoints[i].x, drawnPoints[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      function endDraw() {
        if (!isDrawing || analyticsMode !== 'draw') return;
        isDrawing = false;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (drawnPoints.length > 2) {
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
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: clientX - rect.left, y: clientY - rect.top };
      }

      canvas.addEventListener('mousedown', startDraw);
      canvas.addEventListener('mousemove', drawMove);
      window.addEventListener('mouseup', endDraw);

      canvas.addEventListener('touchstart', startDraw, { passive: false });
      canvas.addEventListener('touchmove', drawMove, { passive: false });
      window.addEventListener('touchend', endDraw);
    }

    function clearFreehandDraw() {
      drawnPoints = [];
      if (drawnPolygon) {
        analyticsMap.removeLayer(drawnPolygon);
        drawnPolygon = null;
      }
      runAnalyticsQuery();
    }

    // Ray-casting point-in-polygon algorithm
    function isPointInPolygon(point, vs) {
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

    function runAnalyticsQuery() {
      let filtered = [];

      if (analyticsMode === 'pin' && pinMarker) {
        const center = pinMarker.getLatLng();
        const radiusMeters = radiusCircle.getRadius();
        filtered = treeDB.filter(t => calculateDistanceMeters(center.lat, center.lng, t.lat, t.lng) <= radiusMeters);
      } else if (analyticsMode === 'draw' && drawnPolygon) {
        const polyCoords = drawnPolygon.getLatLngs()[0].map(ll => [ll.lat, ll.lng]);
        filtered = treeDB.filter(t => isPointInPolygon([t.lat, t.lng], polyCoords));
      } else {
        filtered = treeDB;
      }

      // Update Analytics Dashboard Stats
      document.getElementById('statAreaCount').innerText = filtered.length;
      document.getElementById('filteredListBadge').innerText = `${filtered.length} Items`;

      const ages = filtered.filter(t => t.age !== null).map(t => t.age);
      const meanAge = ages.length > 0 ? (ages.reduce((a,b)=>a+b,0) / ages.length).toFixed(1) : 0;
      document.getElementById('statMeanAge').innerText = `${meanAge} yrs`;

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
      document.getElementById('statSpeciesCount').innerText = uniqueSpeciesCount;

      renderAnalyticsCharts(speciesMap, speciesAgeMap);
      renderAnalyticsTreeList(filtered);
    }

    function renderAnalyticsCharts(speciesMap, speciesAgeMap) {
      const labels = Object.keys(speciesMap);
      const counts = Object.values(speciesMap);

      const meanAges = labels.map(sp => {
        const arr = speciesAgeMap[sp] || [];
        return arr.length > 0 ? (arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1) : 0;
      });

      // Render Species Bar Chart
      const ctx1 = document.getElementById('chartSpecies').getContext('2d');
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

      // Render Mean Age Chart
      const ctx2 = document.getElementById('chartAges').getContext('2d');
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

    function renderAnalyticsTreeList(list) {
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

    /* ==========================================================================
       9. DEV TOOLS & HELPER UTILITIES
       ========================================================================== */
    function handleDevCounterClick() {
      devTapCount++;
      if (devTapTimer) clearTimeout(devTapTimer);
      
      if (devTapCount >= 7) {
        devTapCount = 0;
        openDevToolsModal();
      } else {
        devTapTimer = setTimeout(() => { devTapCount = 0; }, 2000);
      }
    }

    function openDevToolsModal() {
      document.getElementById('devToolsModal').classList.remove('hidden');
    }

    function closeDevToolsModal() {
      document.getElementById('devToolsModal').classList.add('hidden');
    }

/*    function setDevDeviceMode(isMobile) {
      isMobileDevice = isMobile;
      applyDeviceModeUI();
      showToast(`Device mode overridden to: ${isMobile ? 'Mobile' : 'Desktop'}`);
    }
*/
    async function addDemoTrees(count) {
      const demoSpecies = ['Oak', 'Pine', 'Birch', 'Maple', 'Banyan', 'Redwood', 'Eucalyptus', 'Cedar'];
      
      for (let i = 0; i < count; i++) {
        const lat = 20 + (Math.random() - 0.5) * 40;
        const lng = (Math.random() - 0.5) * 120;
        const species = demoSpecies[Math.floor(Math.random() * demoSpecies.length)];
        const age = Math.floor(Math.random() * 120) + 1;
        const certainty = Math.floor(Math.random() * 9) + 2;

        const demoTree = {
          id: 'demo_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          lat: lat,
          lng: lng,
          type: species,
          age: age,
          certainty: certainty,
          logs: [{
            photo: `https://placehold.co/600x400/0a1128/52b788?text=${encodeURIComponent(species)}+Tree`,
            timestamp: new Date().toISOString(),
            certainty: certainty
          }]
        };
        treeDB.unshift(demoTree);
        await saveTreeToCloud(demoTree); // Save the most recent demo tree to cloud
      }

      
      refreshMapHeatmaps();
      renderBlogFeed();
      if (analyticsMap) runAnalyticsQuery();
      showToast(`Added ${count} demo trees into database!`);
    }

    async function clearAllTrees() {
      const { error } = await supabaseClient.from('trees').delete().neq('id', ''); 
      if (error) console.warn('Cloud delete warning:', error);
      treeDB = [];
      refreshMapHeatmaps();
      renderBlogFeed();
      if (analyticsMap) runAnalyticsQuery();
      showToast("All tree data cleared from database.");
    }

    function showToast(message, isError = false) {
      const toast = document.getElementById('toast');
      const toastMsg = document.getElementById('toastMsg');
      toastMsg.innerText = message;
      
      if (isError) {
        toast.className = "fixed top-16 left-1/2 -translate-x-1/2 bg-rose-950 border border-rose-500 text-rose-200 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold z-50 transform translate-y-0 opacity-100 transition-all duration-300 flex items-center gap-2";
      } else {
        toast.className = "fixed top-16 left-1/2 -translate-x-1/2 bg-navy-800 border border-forest-500 text-slate-100 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold z-50 transform translate-y-0 opacity-100 transition-all duration-300 flex items-center gap-2";
      }

      setTimeout(() => {
        toast.classList.replace('translate-y-0', '-translate-y-20');
        toast.classList.replace('opacity-100', 'opacity-0');
      }, 3000);
    }