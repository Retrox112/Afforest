import {renderInteractivePins} from './mappins.js';
import {treeDB} from './db.js';
import {setupFreehandCanvas, runAnalyticsQuery} from './bigahhanalytics.js';
import {analyticsVars} from './analatycvars.js';

let analyticsMode = analyticsVars.analyticsMode;
let radiusCircle = analyticsVars.radiusCircle;
let drawnPolygon = analyticsVars.drawnPolygon;
let drawnPoints = analyticsVars.drawnPoints;
let isDrawing = analyticsVars.isDrawing;
let chartSpeciesInst = analyticsVars.chartSpeciesInst;
let chartAgesInst = analyticsVars.chartAgesInst;
//maps
    export let homeMap, interactiveMap, analyticsMap;
    export let homePinsGroup, interactivePinsGroup, analyticsPinsGroup;
    export let pinMarker = null;

    pinMarker = null;

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
