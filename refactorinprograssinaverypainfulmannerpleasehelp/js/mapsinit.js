//maps
    let homeMap, interactiveMap, analyticsMap;
    let homePinsGroup, interactivePinsGroup, analyticsPinsGroup;

    const DARK_TILES = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
    const TILE_ATTR = 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, OpenStreetMap contributors';

    export function initMaps() {
      
      homeMap = L.map('homeHeatmap', {
        zoomControl: false,
        attributionControl: false
      }).setView([20, 0], 2);
      L.tileLayer(DARK_TILES, { 'attribution': TILE_ATTR, maxZoom: 16 }).addTo(homeMap);
      homePinsGroup = L.layerGroup().addTo(homeMap);

      interactiveMap = L.map('interactiveMap').setView([20, 0], 2);
      L.tileLayer(DARK_TILES, { 'attribution': TILE_ATTR, maxZoom: 16 }).addTo(interactiveMap);
      interactivePinsGroup = L.layerGroup().addTo(interactiveMap);

      renderInteractivePins();

      setTimeout(() => {
        if (homeMap) homeMap.invalidateSize();
        if (interactiveMap) interactiveMap.invalidateSize();
      }, 300);
    }

    export function refreshMapHeatmaps() {
      if (homeMap) homeMap.invalidateSize();
      if (interactiveMap) interactiveMap.invalidateSize();
      if (analyticsMap) analyticsMap.invalidateSize();
      renderInteractivePins();
    }
