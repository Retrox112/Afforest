import {showToast} from './toast.js';
import {treeDB, CERTAINTY_MAP} from './db.js';

//blogfeed
   export function renderBlogFeed() {
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