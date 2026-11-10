    import {showToast} from './toast.js';
    import {CERTAINTY_MAP, treeDB} from './db.js';
    import {refreshMapHeatmaps} from './mapsinit.js';
    import {renderBlogFeed} from './blogfeed.js';
    import {updateTreeCounters, saveTreeToCloud} from './db.js';
    
    // create post, cam
    let currentPhotoBase64 = null;
    let selectedLat = null;
    let selectedLng = null;

    export function openCreateModal() {
      if (!isMobileDevice) {
        showToast("Recording tree observations is only supported on mobile devices with camera hardware.", true);
        return;
      }
      document.getElementById('createPostModal').classList.remove('hidden');
    }

    export function closeCreateModal() {
      document.getElementById('createPostModal').classList.add('hidden');
      resetCreateForm();
    }

    export function resetCreateForm() {
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

    export function handlePhotoSelect(event) {
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

    export function acquireGPSLocation() {
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
          },
          (err) => {
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

    export function updateCertaintyUI(val) {
      const numericVal = parseInt(val);
      const text = CERTAINTY_MAP[numericVal] || "Unknown";
      const badge = document.getElementById('certaintyBadge');
      badge.innerText = `${numericVal}: ${text}`;

      const typeInput = document.getElementById('inputTreeType');
      const ageInput = document.getElementById('inputTreeAge');
      const reqTreeType = document.getElementById('reqTreeType');
      const reqTreeAge = document.getElementById('reqTreeAge');

      if (numericVal === 1) { 
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

    export function handleTreeSubmit(event) {
      event.preventDefault();

      const certainty = parseInt(document.getElementById('certaintyRange').value);
      const typeVal = document.getElementById('inputTreeType').value.trim();
      const ageVal = document.getElementById('inputTreeAge').value.trim();

      if (!currentPhotoBase64 || selectedLat === null || selectedLng === null || (certainty > 1 && (!typeVal || !ageVal))) {
        showToast("Please fill out the post completely", true);
        return;
      }

      const treeType = (certainty === 1 || !typeVal) ? "unknown" : typeVal;
      const treeAge = (certainty === 1 || !ageVal) ? 0 : parseInt(ageVal);

        // Create new tree entry
        const newTree = {
          id: 'tree_' + Date.now(),
          lat: selectedLat,
          lng: selectedLng,
          type: treeType,
          age: treeAge,
          certainty: certainty,
          created_at: new Date().toISOString() + timezoneOffset(),
          logs: [{
            photo: currentPhotoBase64,
            timestamp: new Date().toISOString(),
            certainty: certainty
          }]
        };
        treeDB.unshift(newTree);
        showToast("New tree observation published successfully!");
      refreshMapHeatmaps();
      renderBlogFeed();
      closeCreateModal();
      updateTreeCounters();
      saveTreeToCloud(newTree);
    }
    export function timezoneOffset() {
      const offset = new Date().getTimezoneOffset();
      const sign = offset > 0 ? '+' : '-';
      const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
      const minutes = String(Math.abs(offset) % 60).padStart(2, '0');
      return `${sign}${hours}:${minutes}`;
    };
    //tree detail
    export function openTreeDetail(treeId) {
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

    export function closeDetailModal() {
      document.getElementById('treeDetailModal').classList.add('hidden');
    }
