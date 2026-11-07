//map pins
   export function renderInteractivePins() {
      if (homePinsGroup) homePinsGroup.clearLayers();
      if (interactivePinsGroup) interactivePinsGroup.clearLayers();
      if (analyticsPinsGroup) analyticsPinsGroup.clearLayers();

      const dotIcon = L.divIcon({
        className: 'custom-tree-dot',
        html: `<div style="width: 8px; height: 8px; background-color: #52b788; border-radius: 100%; border: 2px solid #ffffff; box-shadow: 0 0 10px #52b788; z-index: 100;"></div>`,
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

        if (homePinsGroup) {
          const homeMarker = L.marker([tree.lat, tree.lng], { icon: dotIcon }).bindPopup(popupContent);
          homePinsGroup.addLayer(homeMarker);
        }

        if (interactivePinsGroup) {
          const marker = L.marker([tree.lat, tree.lng], { icon: dotIcon }).bindPopup(popupContent);
          interactivePinsGroup.addLayer(marker);
        }

        if (analyticsPinsGroup) {
          const analyticsMarker = L.marker([tree.lat, tree.lng], { icon: dotIcon }).bindPopup(popupContent);
          analyticsPinsGroup.addLayer(analyticsMarker);
        }
      });
    }
