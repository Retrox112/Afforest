import {interactiveMap, analyticsMap} from './mapsinit.js';
import {homeMap} from './mapsinit.js';
import {runAnalyticsQuery} from './bigahhanalytics.js';
//nav
    export function navigateTo(pageId) {
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