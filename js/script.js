/**
 *  AL-QURANITE - Main Script
 *  Module version – all logic centralized.
 */

// ==============================
// 0. IMPORT SUPABASE (ES Module)
// ==============================
import { supabase } from './supabase.js';

// ==============================
// 1. APP STATE & CONFIGURATION
// ==============================
const APP = {
  currentPage: '',
  currentSurah: null,
  surahList: [],
  lat: null,
  lng: null,
  hadithCache: null,
  quranCache: null,
  duaCache: null
};

// Islamic events (Hijri month/day -> description)
const ISLAMIC_EVENTS = {
  "01-01": "Islamic New Year (Al-Hijra)",
  "09-01": "Start of Ramadan",
  "10-01": "Eid al-Fitr",
  "12-09": "Day of Arafah",
  "12-10": "Eid al-Adha"
};

// Global variables for Qibla compass
let qiblaDirectionDeg = 0;
let currentDeviceHeading = 0;

// ==========================================
// Toast Notification Helper (NEW)
// ==========================================
function showToast(message, type = 'success') {
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = `toast-notification ${type === 'error' ? 'error' : ''}`;
    
    const icon = type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle';

    toast.innerHTML = `
        <div class="toast-icon ${type}"><i class="fas ${icon}"></i></div>
        <div class="toast-message">${message}</div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==============================
// 2. UTILITY FUNCTIONS
// ==============================
async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    return null;
  }
}

function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

function padZero(num) {
  return String(num).padStart(2, '0');
}

// ==============================
// 3. PAGE DETECTION
// ==============================
function detectPage() {
  const path = window.location.pathname;
  if (path.includes('index.html') || path === '/' || path.endsWith('/')) APP.currentPage = 'home';
  else if (path.includes('quran.html')) APP.currentPage = 'quran';
  else if (path.includes('hadith.html')) APP.currentPage = 'hadith';
  else if (path.includes('education.html')) APP.currentPage = 'education';
  else if (path.includes('connect.html')) APP.currentPage = 'connect';
  else if (path.includes('spirituality.html')) APP.currentPage = 'spirituality';
  else APP.currentPage = 'static';
}

// ==============================
// 4. COMMON WIDGETS (Clock, Prayer, Qibla, Hijri, etc.)
// ==============================
function updateClock() {
  const now = new Date();
  const timeStr = `${padZero(now.getHours())}:${padZero(now.getMinutes())}`;
  const el = document.getElementById('current-time-display');
  if (el) el.textContent = timeStr;
}

// --- Prayer Times ---
function renderPrayerTimes(data) {
  const listEl = document.getElementById('prayer-times-list');
  const loader = document.getElementById('prayer-loader');
  const banner = document.getElementById('next-prayer-banner');
  if (!listEl) return;

  if (loader) loader.style.display = 'none';
  if (banner) banner.classList.remove('d-none');

  if (data && data.code === 200) {
    const timings = data.data.timings;
    const locEl = document.getElementById('location-display');
    if (locEl) {
      const city = data.data.meta?.timezone?.split('/')[1] || 'Your Location';
      locEl.innerHTML = `<i class="fas fa-map-marker-alt me-1"></i> ${city}`;
    }

    const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const prayerDates = prayers.map(p => {
      const parts = timings[p].split(':');
      return new Date(`${todayStr}T${parts[0]}:${parts[1]}:00`);
    });

    let currentIdx = -1;
    for (let i = 0; i < prayerDates.length; i++) {
      const nextTime = (i + 1 < prayerDates.length) ? prayerDates[i + 1] : new Date(prayerDates[i].getTime() + 24 * 60 * 60 * 1000);
      if (now >= prayerDates[i] && now < nextTime) {
        currentIdx = i;
        break;
      }
    }

    if (currentIdx === -1 && now < prayerDates[0]) {
      currentIdx = -1;
    } else if (currentIdx === -1 && now >= prayerDates[prayerDates.length - 1]) {
      currentIdx = prayers.length;
    }

    let html = '';
    prayers.forEach((p, index) => {
      let statusClass = '';
      if (index === currentIdx) {
        statusClass = 'prayer-active';
      } else if (index === currentIdx + 1) {
        statusClass = 'prayer-upcoming';
      } else if (index < currentIdx) {
        statusClass = 'prayer-past';
      }

      html += `<div class="prayer-row ${statusClass}">
        <span class="prayer-name">${p}</span>
        <span class="prayer-time">${timings[p]}</span>
      </div>`;
    });
    listEl.innerHTML = html;

    let nextPrayer = null;
    let nextName = '';
    let smallestDiff = Infinity;

    prayers.forEach(p => {
      const parts = timings[p].split(':');
      const prayerDate = new Date(`${todayStr}T${parts[0]}:${parts[1]}:00`);
      const diff = prayerDate - now;
      if (diff > 0 && diff < smallestDiff) {
        smallestDiff = diff;
        nextPrayer = prayerDate;
        nextName = p;
      }
    });

    if (!nextPrayer) {
      const fajrParts = timings['Fajr'].split(':');
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      nextPrayer = new Date(`${tomorrowStr}T${fajrParts[0]}:${fajrParts[1]}:00`);
      nextName = 'Fajr (Tomorrow)';
      smallestDiff = nextPrayer - now;
    }

    if (banner) {
      const nameEl = document.getElementById('next-prayer-name');
      const timerEl = document.getElementById('countdown-timer');
      if (nameEl) nameEl.textContent = nextName;

      const interval = setInterval(() => {
        const nowInterval = new Date(); 
        const diff = nextPrayer - nowInterval;
        if (diff <= 0) {
          clearInterval(interval);
          renderPrayerTimes(data);
          return;
        }
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        if (timerEl) timerEl.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      }, 1000);
    }

  } else {
    if (banner) banner.classList.add('d-none');
    listEl.innerHTML = `<div class="text-center py-3 text-muted small">Could not load prayer times.</div>`;
  }
}

async function fetchPrayerTimes(lat, lng) {
  const cacheKey = `prayer_${lat}_${lng}`;
  const cached = JSON.parse(localStorage.getItem(cacheKey));
  const now = Date.now();

  if (cached && (now - cached.timestamp < 3600000)) {
    renderPrayerTimes(cached.data);
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  const url = `https://api.aladhan.com/v1/timings/${today}?latitude=${lat}&longitude=${lng}&method=2`;
  const data = await fetchData(url);

  if (data && data.code === 200) {
    localStorage.setItem(cacheKey, JSON.stringify({ timestamp: now, data }));
    renderPrayerTimes(data);
  } else {
    renderPrayerTimes(null);
  }
}

// --- Qibla Compass ---
async function calculateQibla() {
  if (!APP.lat || !APP.lng) {
    getUserLocation();
    return;
  }

  const url = `https://api.aladhan.com/v1/qibla/${APP.lat}/${APP.lng}`;
  const data = await fetchData(url);
  const arrowEl = document.getElementById('qibla-arrow');
  const degEl = document.getElementById('qibla-direction');

  if (data && data.code === 200) {
    const deg = data.data.direction;
    qiblaDirectionDeg = deg;
    if (degEl) degEl.textContent = `${deg}°`;
    if (arrowEl) {
      arrowEl.style.setProperty('--qibla-deg', `${deg}deg`);
      arrowEl.style.transform = `translate(-50%, -100%) rotate(${deg}deg)`;
      arrowEl.classList.remove('hidden');
    }
  } else {
    if (degEl) degEl.textContent = '--°';
    if (arrowEl) arrowEl.classList.add('hidden');
  }
}

function initDeviceOrientation() {
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    DeviceOrientationEvent.requestPermission().then(response => {
      if (response === 'granted') {
        window.addEventListener('deviceorientation', handleOrientation, true);
      }
    }).catch(console.error);
  } else {
    window.addEventListener('deviceorientation', handleOrientation, true);
  }
}

function handleOrientation(event) {
  let alpha = event.webkitCompassHeading || event.alpha;
  if (alpha === null || alpha === undefined) return;

  currentDeviceHeading = alpha;
  const arrowEl = document.getElementById('qibla-arrow');
  if (arrowEl && qiblaDirectionDeg) {
    const degree = qiblaDirectionDeg - currentDeviceHeading;
    arrowEl.style.transform = `translate(-50%, -100%) rotate(${degree}deg)`;
  }
}

// --- Location ---
function getUserLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        APP.lat = pos.coords.latitude;
        APP.lng = pos.coords.longitude;
        fetchPrayerTimes(APP.lat, APP.lng);
        calculateQibla();
      },
      () => {
        APP.lat = 21.4225;
        APP.lng = 39.8262;
        const locEl = document.getElementById('location-display');
        if (locEl) locEl.innerHTML = `<i class="fas fa-map-marker-alt me-1"></i> Mecca (Fallback)`;
        fetchPrayerTimes(APP.lat, APP.lng);
        calculateQibla();
      }
    );
  } else {
    APP.lat = 21.4225;
    APP.lng = 39.8262;
    const locEl = document.getElementById('location-display');
    if (locEl) locEl.innerHTML = `<i class="fas fa-map-marker-alt me-1"></i> Mecca (Fallback)`;
    fetchPrayerTimes(APP.lat, APP.lng);
    calculateQibla();
  }
}

function refreshPrayerTimes() {
  if (APP.lat && APP.lng) {
    fetchPrayerTimes(APP.lat, APP.lng);
    calculateQibla();
  } else {
    getUserLocation();
  }
}

// --- Hijri Date ---
async function fetchHijriDate(dateStr) {
  const url = `https://api.aladhan.com/v1/gToH/${dateStr}`;
  const data = await fetchData(url);
  if (data && data.code === 200) return data.data.hijri;
  return null;
}

async function updateHijriDate() {
  const now = new Date();
  const day = padZero(now.getDate());
  const month = padZero(now.getMonth() + 1);
  const year = now.getFullYear();
  const dateStr = `${day}-${month}-${year}`;

  const cacheKey = `hijri_${dateStr}`;
  const cached = JSON.parse(localStorage.getItem(cacheKey));
  const el = document.getElementById('hijri-date');
  const gregEl = document.getElementById('gregorian-date');
  const eventEl = document.getElementById('hijri-event');

  if (cached) {
    if (el) el.textContent = cached.hijri;
    if (gregEl) gregEl.textContent = new Date().toLocaleDateString();
    if (eventEl) eventEl.textContent = cached.event || '';
    return;
  }

  const hijri = await fetchHijriDate(dateStr);
  if (hijri) {
    const text = `${hijri.day} ${hijri.month.en} ${hijri.year}`;
    const key = padZero(hijri.day) + '-' + padZero(hijri.month.number);
    const eventText = ISLAMIC_EVENTS[key] ? `✨ Upcoming: ${ISLAMIC_EVENTS[key]}` : '';

    if (el) el.textContent = text;
    if (gregEl) gregEl.textContent = new Date().toLocaleDateString();
    if (eventEl) eventEl.textContent = eventText;

    localStorage.setItem(cacheKey, JSON.stringify({ hijri: text, event: eventText }));
  } else {
    if (el) el.textContent = 'Loading...';
  }
}

function convertDate(val) {
  const el = document.getElementById('converted-hijri');
  if (!val) { if (el) el.textContent = ''; return; }
  const parts = val.split('-');
  const dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
  fetchHijriDate(dateStr).then(hijri => {
    if (hijri && el) el.textContent = `${hijri.day} ${hijri.month.en} ${hijri.year} AH`;
    else if (el) el.textContent = 'Conversion failed';
  });
}

function resetDate() {
  const input = document.getElementById('gregorian-input');
  const el = document.getElementById('converted-hijri');
  if (input) input.value = '';
  if (el) el.textContent = '';
}

// ==============================
// 5. LOCAL DATA LOADERS
// ==============================
async function loadQuranData() {
  if (APP.quranCache) return APP.quranCache;
  try {
    const response = await fetch('data/quran.json');
    if (!response.ok) throw new Error('quran.json not found');
    const data = await response.json();
    APP.quranCache = data;
    return data;
  } catch (error) {
    console.error('Error loading quran.json:', error);
    return null;
  }
}

async function loadHadithData() {
  if (APP.hadithCache) return APP.hadithCache;
  try {
    const response = await fetch('data/hadith.json');
    if (!response.ok) throw new Error('hadith.json not found');
    const data = await response.json();
    APP.hadithCache = data;
    return data;
  } catch (error) {
    console.error('Error loading hadith.json:', error);
    return null;
  }
}

async function loadDuaData() {
  if (APP.duaCache) return APP.duaCache;
  try {
    const response = await fetch('data/dua.json');
    if (!response.ok) throw new Error('dua.json not found');
    const data = await response.json();
    APP.duaCache = data;
    return data;
  } catch (error) {
    console.error('Error loading dua.json:', error);
    return null;
  }
}

// ==============================
// 6. DAILY AYAH (Homepage - Uses quran.json)
// ==============================
async function fetchDailyAyah() {
  const textEl = document.getElementById('daily-ayah');
  const sourceEl = document.getElementById('ayah-source');

  const data = await loadQuranData();
  if (data && data.length > 0) {
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    const index = dayOfYear % data.length;
    const verse = data[index];

    if (textEl) textEl.textContent = verse.english;
    if (sourceEl) sourceEl.textContent = verse.reference;
  } else {
    if (textEl) textEl.textContent = 'Unable to load Ayah.';
    if (sourceEl) sourceEl.textContent = '';
  }
}

// ==============================
// 7. DAILY DUA (Homepage - Uses dua.json)
// ==============================
async function initDailyDua() {
  const duaTextEl = document.getElementById('daily-dua');
  const duaSourceEl = document.getElementById('dua-source');
  if (!duaTextEl) return;

  const data = await loadDuaData();
  if (data && data.length > 0) {
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    const index = dayOfYear % data.length;
    const dua = data[index];

    duaTextEl.textContent = dua.english;
    duaSourceEl.textContent = dua.reference;
  } else {
    duaTextEl.textContent = "Unable to load Dua.";
    duaSourceEl.textContent = "";
  }
}

// ==============================
// 8. DAILY WISDOM (Connect page - 1 English Ayah + 1 Hadith)
// ==============================
async function initDailyWisdom() {
  const ayahEnglish = document.getElementById('ayahEnglish');
  const ayahSource = document.getElementById('ayahSource');
  const hadithText = document.getElementById('hadithText');
  const hadithSource = document.getElementById('hadithSource');
  const loader = document.getElementById('ayahLoader');
  const content = document.getElementById('ayahContent');

  if (!ayahEnglish) return;

  if (loader) loader.classList.remove('d-none');
  if (content) content.classList.add('d-none');

  const quranData = await loadQuranData();
  const hadithData = await loadHadithData();

  let ayah = null;
  let hadith = null;
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));

  if (quranData && quranData.length > 0) {
    const index = dayOfYear % quranData.length;
    ayah = quranData[index];
  }

  if (hadithData && hadithData.hadiths && hadithData.hadiths.length > 0) {
    const index = dayOfYear % hadithData.hadiths.length;
    hadith = hadithData.hadiths[index];
  }

  if (ayah) {
    ayahEnglish.textContent = ayah.english;
    ayahSource.textContent = ayah.reference;
  } else {
    ayahEnglish.textContent = 'Unable to load Ayah.';
    ayahSource.textContent = '';
  }

  if (hadith) {
    hadithText.textContent = `"${hadith.text}"`;
    hadithSource.textContent = hadith.source;
  } else {
    hadithText.textContent = 'Unable to load Hadith.';
    hadithSource.textContent = '';
  }

  if (loader) loader.classList.add('d-none');
  if (content) content.classList.remove('d-none');
}

// ==============================
// 9. ZAKAT CALCULATOR
// ==============================
function fetchNisabThreshold() {
    const pricePerGram = 80.0; 
    return pricePerGram * 85;
}

async function calculateZakat() {
  const cash = parseFloat(document.getElementById('cash-assets').value) || 0;
  const gold = parseFloat(document.getElementById('gold-assets').value) || 0;
  const business = parseFloat(document.getElementById('business-assets').value) || 0;
  const total = cash + gold + business;
  const zakatAmount = total * 0.025;

  const output = document.getElementById('zakat-output');
  const totalEl = document.getElementById('zakat-total');
  const warning = document.getElementById('nisab-warning');

  if (total > 0 && output && totalEl) {
    const nisab = fetchNisabThreshold();

    output.classList.add('show');
    totalEl.textContent = `$${zakatAmount.toFixed(2)}`;
    if (total < nisab) {
      warning.classList.remove('d-none');
    } else {
      warning.classList.add('d-none');
    }
  } else if (output) {
    output.classList.remove('show');
  }
}

// ==============================
// 10. EDUCATION PAGE
// ==============================
async function loadArticle(fileName, replace = false) {
  const wrapper = document.getElementById('dynamic-content');
  if (!wrapper) return;

  const url = new URL(window.location);
  url.searchParams.set('article', fileName.replace('.html', ''));
  if (replace) {
    window.history.replaceState({}, '', url);
  } else {
    window.history.pushState({}, '', url);
  }

  let content = null;
  try {
    // 1. Check Supabase
    const { data, error } = await supabase
      .from('articles')
      .select('content')
      .eq('filename', fileName)
      .maybeSingle();
    if (data && data.content) content = data.content;

    // 2. Fallback to static file
    if (!content) {
      const response = await fetch(fileName);
      if (!response.ok) throw new Error('Static file missing');
      content = await response.text();
    }

    wrapper.innerHTML = content;

    // Update title
    const titleMatch = content.match(/<title>(.*?)<\/title>/i);
    if (titleMatch) document.title = titleMatch[1] + ' - Al-QURANITE';
    else {
      const h1Match = content.match(/<h1[^>]*>(.*?)<\/h1>/i);
      if (h1Match) document.title = h1Match[1].replace(/<[^>]*>/g, '') + ' - Al-QURANITE';
    }

    localStorage.setItem('activeArticleFile', fileName);

    // Highlight the active link dynamically
    document.querySelectorAll('.book-item').forEach(el => el.classList.remove('active'));
    const activeLink = document.querySelector(`.book-item[data-src="${fileName}"]`);
    if (activeLink) activeLink.classList.add('active');

    // Re-attach 99-names search listener
    const searchInput = document.getElementById('namesSearch');
    if (searchInput) searchInput.addEventListener('input', filterNames);

    setTimeout(() => wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);

  } catch (error) {
    wrapper.innerHTML = `<div class="text-center py-5 text-danger">Article could not be loaded</div>`;
  }
}

function filterNames() {
  const query = document.getElementById('namesSearch').value.toLowerCase();
  const cards = document.querySelectorAll('.name-card');
  cards.forEach(card => {
    const text = card.getAttribute('data-name') || card.textContent.toLowerCase();
    card.style.display = text.includes(query) ? 'block' : 'none';
  });
}

async function renderSidebar() {
    const container = document.getElementById('bookListContainer');
    const loader = document.getElementById('sidebarLoader');
    const searchInput = document.getElementById('bookSearch');

    // 1. Fetch the articles including the new columns
    const { data: articles, error } = await supabase
        .from('articles')
        .select('filename, title, arabic_title, category')
        .order('id', { ascending: false });

    if (loader) loader.style.display = 'none';

    if (error || !articles || articles.length === 0) {
        container.innerHTML = `<div class="text-center text-muted small py-3">No articles found. Please sync them in the admin panel.</div>`;
        return;
    }

    let html = '';
    
    // 2. Loop with index to create dynamic numbers
    articles.forEach((article, index) => {
        const number = index + 1; // <-- dynamically numbered 1, 2, 3...
        const arabicName = article.arabic_title || ''; // <-- actual Arabic text
        const category = article.category || 'General'; // <-- category instead of filename

        html += `
            <div class="book-item dynamic-link" data-src="${article.filename}">
                <div class="d-flex align-items-center">
                    <span class="book-number">${number}</span>
                    <div class="book-info">
                        <h6>${article.title || article.filename}</h6>
                        <small>${category}</small> <!-- Changed from filename to category -->
                    </div>
                </div>
                <div class="book-name-ar">${arabicName}</div> <!-- Changed to actual Arabic title -->
            </div>
        `;
    });
    container.innerHTML = html;

    // Re-attach click listeners
    container.querySelectorAll('.dynamic-link').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const src = this.getAttribute('data-src');
            if (src) loadArticle(src);
        });
    });

    // Re-attach search filter
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const query = this.value.toLowerCase();
            const books = container.querySelectorAll('.book-item');
            books.forEach(b => {
                const text = b.textContent.toLowerCase();
                b.style.display = text.includes(query) ? 'flex' : 'none';
            });
        });
    }

    // Highlight the active item
    const activeFile = localStorage.getItem('activeArticleFile');
    if (activeFile) {
        const activeLink = container.querySelector(`.book-item[data-src="${activeFile}"]`);
        if (activeLink) activeLink.classList.add('active');
    }
}

function initEducation() {
    renderSidebar();
    const article = getQueryParam('article');
    if (article) loadArticle(article + '.html', true);

    window.addEventListener('popstate', function() {
        const article = getQueryParam('article');
        if (article) {
            loadArticle(article + '.html', true);
        } else {
            const wrapper = document.getElementById('dynamic-content');
            if (wrapper) {
                wrapper.innerHTML = `
                    <div class="article-container text-center py-5">
                        <i class="fas fa-book-open fa-4x mb-4 text-emerald opacity-0-3"></i>
                        <h2 class="serif-heading text-muted">Select a Topic to begin</h2>
                        <p class="text-muted small">Use the search bar above to find specific articles.</p>
                    </div>
                `;
            }
        }
    });
}

// ==============================
// 11. QURAN PAGE
// ==============================
async function fetchSurahs() {
  const url = 'https://api.alquran.cloud/v1/surah';
  const data = await fetchData(url);
  const container = document.getElementById('surahListContainer');
  if (!container) return;

  if (data && data.code === 200) {
    APP.surahList = data.data;
    renderSurahList(APP.surahList);
  } else {
    container.innerHTML = `<div class="text-center p-4 text-muted small">Failed to load Surahs.</div>`;
  }
}

function renderSurahList(surahs) {
  const container = document.getElementById('surahListContainer');
  let html = '';
  surahs.forEach(s => {
    html += `<div class="surah-item" data-id="${s.number}">
      <div class="d-flex align-items-center">
        <span class="surah-number">${s.number}</span>
        <div class="surah-info">
          <h6>${s.englishName}</h6>
          <small>${s.englishNameTranslation} • ${s.numberOfAyahs} verses</small>
        </div>
      </div>
      <div class="surah-name-ar">${s.name}</div>
    </div>`;
  });
  container.innerHTML = html;
}

async function fetchSurah(id) {
  const urlAr = `https://api.alquran.cloud/v1/surah/${id}/ar`;
  const urlEn = `https://api.alquran.cloud/v1/surah/${id}/en.sahih`;
  const [dataAr, dataEn] = await Promise.all([fetchData(urlAr), fetchData(urlEn)]);

  const welcome = document.getElementById('welcomeMessage');
  const content = document.getElementById('surahContent');
  const versesContainer = document.getElementById('versesContainer');

  if (welcome) welcome.classList.add('d-none');
  if (content) content.classList.remove('d-none');

  if (dataAr && dataAr.code === 200 && dataEn && dataEn.code === 200) {
    APP.currentSurah = dataAr.data;

    document.getElementById('currentSurahTitle').textContent = dataAr.data.englishName;
    document.getElementById('surahMetaBadge').textContent = `${dataAr.data.numberOfAyahs} verses • ${dataAr.data.revelationType}`;

    let html = '';
    dataAr.data.ayahs.forEach((ayahAr, index) => {
      const ayahEn = dataEn.data.ayahs[index];
      const num = index + 1;
      html += `<div class="verse-card">
        <div class="verse-content-wrapper">
          <div class="verse-number-box">
            <span class="verse-num-text">${num}</span>
          </div>
          <div class="verse-text-content">
            <div class="verse-arabic">${ayahAr.text}</div>
            <div class="verse-translation">${ayahEn.text}</div>
          </div>
        </div>
        <div class="verse-actions">
          <button class="btn-action-mini" data-action="copy"><i class="far fa-copy"></i> Copy</button>
          <button class="btn-action-mini" data-action="share"><i class="fas fa-share-alt"></i> Share</button>
        </div>
      </div>`;
    });
    versesContainer.innerHTML = html;

    localStorage.setItem('activeSurahId', id);

    document.querySelectorAll('.surah-item').forEach(el => el.classList.remove('active'));
    const activeSurah = document.querySelector(`.surah-item[data-id="${id}"]`);
    if (activeSurah) activeSurah.classList.add('active');

    setTimeout(() => {
      content.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);

  } else {
    versesContainer.innerHTML = `<div class="text-center py-5 text-danger">
      <i class="fas fa-exclamation-circle fa-3x mb-3"></i>
      <h5>Could not load Surah</h5>
      <p>Please check your internet connection and try again.</p>
    </div>`;
  }
}

function initQuran() {
  fetchSurahs();

  const container = document.getElementById('surahListContainer');
  if (container) {
    container.addEventListener('click', function(e) {
      const item = e.target.closest('.surah-item');
      if (item) {
        const id = item.getAttribute('data-id');
        fetchSurah(id);
      }
    });
  }

  const searchInput = document.getElementById('surahSearch');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      const query = this.value.toLowerCase();
      const filtered = APP.surahList.filter(s =>
        s.englishName.toLowerCase().includes(query) ||
        s.name.includes(query) ||
        s.number.toString() === query
      );
      renderSurahList(filtered);
    });
  }
}

// ==============================
// 12. SPIRITUALITY PAGE – HADITH CAROUSEL
// ==============================
async function initHadithCarousel() {
  const container = document.getElementById('hadithCarouselInner');
  if (!container) return;

  const data = await loadHadithData();
  let allHadiths = [];
  const fallback = [
    { text: "None of you truly believes until he loves for his brother what he loves for himself.", source: "Sahih Bukhari" },
    { text: "The world is a prison for the believer and a paradise for the disbeliever.", source: "Sahih Muslim" },
    { text: "Whoever believes in Allah and the Last Day, let him speak good or remain silent.", source: "Sahih Bukhari" }
  ];

  if (data && data.hadiths && data.hadiths.length > 0) {
    allHadiths = data.hadiths.sort(() => 0.5 - Math.random());
  } else {
    allHadiths = fallback;
  }

  let html = '';
  allHadiths.forEach((h, index) => {
    const activeClass = index === 0 ? 'active' : '';
    html += `
      <div class="carousel-item ${activeClass}">
        <div class="quote-box">
          <i class="fas fa-quote-left quote-icon"></i>
          <p class="quote-text">"${h.text}"</p>
          <span class="quote-author">— ${h.source}</span>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;

  const carouselElement = document.getElementById('wisdomCarousel');
  if (carouselElement) {
    new bootstrap.Carousel(carouselElement, {
      interval: 4000,
      ride: 'carousel',
      wrap: true
    });
  }
}

// ==============================
// 13. GLOBAL HELPERS (Copy/Share)
// ==============================
function copyText(text) {
  navigator.clipboard.writeText(text)
    .then(() => showToast('Copied to clipboard!'))
    .catch(() => showToast('Failed to copy.', 'error'));
}

async function shareText(text) {
  if (!navigator.share) {
    showToast('Share not supported on this browser.', 'error');
    return;
  }

  try {
    await navigator.share({
      title: 'Al-QURANITE',
      text: text
    });
    // Success – no toast needed, or you could show one if you like
  } catch (error) {
    // User cancelled or another share is in progress – ignore silently
    if (error.name === 'AbortError' || error.name === 'InvalidStateError') {
      // The user cancelled the share, or a share is already in progress.
      // Do nothing – this is normal behavior.
    } else {
      // Unexpected error – show a toast
      showToast('Share failed: ' + error.message, 'error');
    }
  }
}

// ==============================
// 14. CONTACT FORM (Supabase)
// ==============================
async function handleContactFormSubmit(e) {
  e.preventDefault();
  const form = document.getElementById('contactForm');
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;

  try {
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('emailAddress').value.trim();
    const subject = document.getElementById('subjectSelect').value;
    const message = document.getElementById('messageText').value.trim();

    const { error } = await supabase.from('messages').insert([
      { first_name: firstName, last_name: lastName, email, subject, message }
    ]);

    if (error) throw error;
    showToast('Message sent successfully!'); // ✅ replaced alert
    form.reset();
  } catch (error) {
    showToast('Error sending message: ' + error.message, 'error'); // ✅ replaced alert
  } finally {
    btn.disabled = false;
  }
}

// ==============================
// 15. COMING SOON COUNTDOWN LOGIC
// ==============================
function initComingSoonCountdown() {
  const countdownEl = document.getElementById('countdown');
  if (!countdownEl) return;

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 30);

  function updateCountdown() {
    const now = new Date().getTime();
    const distance = targetDate.getTime() - now;
    if (distance < 0) return;
    document.getElementById('days').textContent = String(Math.floor(distance / (1000 * 60 * 60 * 24))).padStart(2, '0');
    document.getElementById('hours').textContent = String(Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0');
    document.getElementById('minutes').textContent = String(Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
    document.getElementById('seconds').textContent = String(Math.floor((distance % (1000 * 60)) / 1000)).padStart(2, '0');
  }
  updateCountdown();
  setInterval(updateCountdown, 1000);
}

// ==============================
// 16. EVENT DELEGATION FOR COPY/SHARE BUTTONS
// ==============================
function initCopyShareListeners() {
  document.addEventListener('click', function(e) {
    const target = e.target.closest('.btn-action-mini, .dh-actions button, .widget-card .btn');
    if (!target) return;

    let text = '';

    if (target.closest('#ayahContent')) {
      const ayah = document.getElementById('ayahEnglish')?.innerText;
      const hadith = document.getElementById('hadithText')?.innerText;
      text = `📖 Ayah of the Day:\n${ayah}\n\n📜 Hadith of the Day:\n${hadith}`;
    } else if (target.closest('.widget-card')) {
      const card = target.closest('.widget-card');
      const ayahText = card.querySelector('#daily-ayah')?.innerText;
      const ayahSource = card.querySelector('#ayah-source')?.innerText;
      const duaText = card.querySelector('#daily-dua')?.innerText;
      const duaSource = card.querySelector('#dua-source')?.innerText;

      if (ayahText && ayahSource) {
        text = `📖 Ayah of the Day:\n"${ayahText}"\n— ${ayahSource}`;
      } else if (duaText && duaSource) {
        text = `🤲 Dua of the Day:\n"${duaText}"\n— ${duaSource}`;
      }
    } else if (target.closest('.verse-card')) {
      text = target.closest('.verse-card')?.querySelector('.verse-translation')?.innerText;
    }

    if (!text) return;

    const action = target.getAttribute('data-action');
    if (action === 'copy') copyText(text);
    else if (action === 'share') shareText(text);
  });
}

// ==============================
// 17. EXPOSE FUNCTIONS TO WINDOW
// ==============================
window.copyText = copyText;
window.shareText = shareText;
window.refreshPrayerTimes = refreshPrayerTimes;
window.calculateQibla = calculateQibla;
window.convertDate = convertDate;
window.resetDate = resetDate;
window.calculateZakat = calculateZakat;
window.loadArticle = loadArticle;
window.filterNames = filterNames;
window.initDeviceOrientation = initDeviceOrientation;

// ==============================
// 18. INITIALIZATION
// ==============================
document.addEventListener('DOMContentLoaded', function() {
  // Disable browser scroll restoration
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  detectPage();
  updateClock();

  if (APP.currentPage === 'home') {
    getUserLocation();
    updateHijriDate();
    fetchDailyAyah();
    initDailyDua();

    // --- Home Page Button Event Listeners ---
    document.getElementById('refresh-prayer-btn')?.addEventListener('click', refreshPrayerTimes);
    document.getElementById('qibla-recalc-btn')?.addEventListener('click', refreshPrayerTimes);
    document.getElementById('qibla-calibrate-btn')?.addEventListener('click', initDeviceOrientation);
    document.getElementById('gregorian-input')?.addEventListener('change', function() {
      convertDate(this.value);
    });
    document.getElementById('reset-date-btn')?.addEventListener('click', resetDate);
    document.getElementById('calculate-zakat-btn')?.addEventListener('click', calculateZakat);
  }

  if (APP.currentPage === 'connect') {
    initDailyWisdom();
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
      contactForm.addEventListener('submit', handleContactFormSubmit);
    }
    
    const newsletterForm = document.querySelector('.newsletter-input-group');
    if (newsletterForm) {
      newsletterForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = this.querySelector('input[type="email"]').value.trim();
        if (!email) return showToast('Please enter an email address.', 'error'); // ✅ replaced alert
        const { error } = await supabase.from('newsletters').insert([{ email }]);
        if (error) showToast('Error subscribing: ' + error.message, 'error'); // ✅ replaced alert
        else {
          showToast('Subscribed successfully!');
          this.reset();
        }
      });
    }
  }

  if (APP.currentPage === 'spirituality') {
    initHadithCarousel();
  }

  if (APP.currentPage === 'education') {
    initEducation();
  }

  if (APP.currentPage === 'quran') {
    initQuran();
  }

  initComingSoonCountdown();
  initCopyShareListeners();
});

// Keep the clock running
setInterval(updateClock, 1000);