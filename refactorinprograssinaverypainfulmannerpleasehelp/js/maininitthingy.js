
import { showToast } from './toast.js';
import { loadDatabase } from './db.js';
import { renderBlogFeed } from './blogfeed.js';
import { initMaps, refreshMapHeatmaps } from './mapsinit.js';
import { setupAnalyticsMap, setAnalyticsMode, updateRadius, clearFreehandDraw } from './bigahhanalytics.js';
import { navigateTo } from './nav.js';
import { calculateDistanceMeters } from './dist.js';
import { renderInteractivePins } from './mappins.js';
import {handleTreeSubmit, updateCertaintyUI, handlePhotoSelect, openTreeDetail, timezoneOffset} from './bigahhcreatepost.js';
import {closeCreateModal, openCreateModal} from './bigahhcreatepost.js';
import {closeDetailModal} from './bigahhcreatepost.js';
import { updateTreeCounters } from './db.js';


window.handleTreeSubmit = handleTreeSubmit;
window.updateCertaintyUI = updateCertaintyUI;
window.handlePhotoSelect = handlePhotoSelect;
window.openTreeDetail = openTreeDetail;
window.setAnalyticsMode = setAnalyticsMode;
window.updateRadius = updateRadius;
window.clearFreehandDraw = clearFreehandDraw;

document.querySelectorAll('#closeModalBtn, #cancelModalBtn, #closecreatemodal').forEach(btn => {
  btn.addEventListener('click', closeCreateModal);
});
const closeDetailBtn = document.getElementById('closeDetailModalBtn');
if (closeDetailBtn) {
  closeDetailBtn.addEventListener('click', closeDetailModal);
}

const headerHomeBtn = document.getElementById('headerHomeBtn');
const homeMapBtn = document.getElementById('homeMapBtn');
const homePostBtn = document.getElementById('homePostBtn');
const blogPostBtn = document.getElementById('blogPostBtn');
const centerNavPostBtn = document.getElementById('nav-post');

const mapNav = document.getElementById('nav-map');
const homeNav = document.getElementById('nav-home');
const blogNav = document.getElementById('nav-blog');
const analyticsNav = document.getElementById('nav-analytics');
const getGPSBtn = document.getElementById('getgps');

if (headerHomeBtn) headerHomeBtn.addEventListener('click', () => navigateTo('home'));
if (homeNav) homeNav.addEventListener('click', () => navigateTo('home'));
if (homeMapBtn) homeMapBtn.addEventListener('click', () => navigateTo('map'));
if (mapNav) mapNav.addEventListener('click', () => navigateTo('map'));
if (blogNav) blogNav.addEventListener('click', () => navigateTo('blog'));
if (analyticsNav) analyticsNav.addEventListener('click', () => navigateTo('analytics'));

if (homePostBtn) homePostBtn.addEventListener('click', () => openCreateModal());
if (blogPostBtn) blogPostBtn.addEventListener('click', () => openCreateModal());
if (centerNavPostBtn) centerNavPostBtn.addEventListener('click', () => openCreateModal());

if (getGPSBtn) getGPSBtn.addEventListener('click', () => acquireGPSLocation());

showToast.showToast = showToast;

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

  window.isMobileDevice = isMobileUA || (isSmallScreen && hasTouch);
  applyDeviceModeUI();
}

function applyDeviceModeUI() {
  const desktopNotice = document.getElementById('desktopNotice');

  if (!window.isMobileDevice) {
    if (desktopNotice) desktopNotice.classList.remove('hidden');
    document.querySelectorAll('.mobile-only-flex').forEach(el => el.classList.add('hidden'));
  } else {
    if (desktopNotice) desktopNotice.classList.add('hidden');
    document.querySelectorAll('.mobile-only-flex').forEach(el => el.classList.remove('hidden'));
  }
}
