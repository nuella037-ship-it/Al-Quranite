/**
 *  AL-QURANITE - Main Script (Daily Ayah Updated)
 *  Clean version – no Hadith APIs.
 */

// ==============================
// 1. UTILITY FUNCTIONS & APP STATE
// ==============================

const APP = {
  currentPage: '',
  currentSurah: null,
  surahList: [],
  lat: null,
  lng: null,
  // Replaced Dua list with 30 curated Quranic verses
  ayahList: [
    { arabic: "إِنَّ مَعَ الْعُسْرِ يُسْرًا", translation: "Indeed, with hardship [comes] ease.", source: "Surah Ash-Sharh, 94:6" },
    { arabic: "وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا", translation: "And whoever fears Allah - He will make for him a way out.", source: "Surah At-Talaq, 65:2" },
    { arabic: "لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا", translation: "Allah does not burden a soul beyond its capacity.", source: "Surah Al-Baqarah, 2:286" },
    { arabic: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ", translation: "Unquestionably, by the remembrance of Allah hearts find rest.", source: "Surah Ar-Ra'd, 13:28" },
    { arabic: "فَاذْكُرُونِي أَذْكُرْكُمْ", translation: "So remember Me; I will remember you.", source: "Surah Al-Baqarah, 2:152" },
    { arabic: "وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا", translation: "And of His signs is that He created for you from yourselves mates.", source: "Surah Ar-Rum, 30:21" },
    { arabic: "كُلُّ نَفْسٍ ذَائِقَةُ الْمَوْتِ", translation: "Every soul will taste death.", source: "Surah Ali 'Imran, 3:185" },
    { arabic: "هَلْ يَسْتَوِي الَّذِينَ يَعْلَمُونَ وَالَّذِينَ لَا يَعْلَمُونَ", translation: "Are those who know equal to those who do not know?", source: "Surah Az-Zumar, 39:9" },
    { arabic: "ادْعُ إِلَىٰ سَبِيلِ رَبِّكَ بِالْحِكْمَةِ وَالْمَوْعِظَةِ الْحَسَنَةِ", translation: "Invite to the way of your Lord with wisdom and good instruction.", source: "Surah An-Nahl, 16:125" },
    { arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً", translation: "Our Lord, give us in this world [that which is] good and in the Hereafter [that which is] good.", source: "Surah Al-Baqarah, 2:201" },
    { arabic: "وَإِلَىٰ رَبِّكَ فَارْغَب", translation: "And to your Lord direct [your] longing.", source: "Surah Ash-Sharh, 94:8" },
    { arabic: "لَيْسَ كَمِثْلِهِ شَيْءٌ ۖ وَهُوَ السَّمِيعُ الْبَصِيرُ", translation: "There is nothing like unto Him, and He is the Hearing, the Seeing.", source: "Surah Ash-Shura, 42:11" },
    { arabic: "إِنَّ اللَّهَ مَعَ الصَّابِرِينَ", translation: "Indeed, Allah is with the patient.", source: "Surah Al-Baqarah, 2:153" },
    { arabic: "يَا أَيُّهَا الَّذِينَ آمَنُوا اتَّقُوا اللَّهَ وَقُولُوا قَوْلًا سَدِيدًا", translation: "O you who have believed, fear Allah and speak words of appropriate justice.", source: "Surah Al-Ahzab, 33:70" },
    { arabic: "وَلِلَّهِ الْأَسْمَاءُ الْحُسْنَىٰ فَادْعُوهُ بِهَا", translation: "And to Allah belong the best names, so invoke Him by them.", source: "Surah Al-A'raf, 7:180" },
    { arabic: "إِنَّ اللَّهَ يُحِبُّ الْمُحْسِنِينَ", translation: "Indeed, Allah loves the doers of good.", source: "Surah Al-Baqarah, 2:195" },
    { arabic: "عَسَىٰ أَن تَكْرَهُوا شَيْئًا وَهُوَ خَيْرٌ لَّكُمْ", translation: "Perhaps you hate a thing and it is good for you.", source: "Surah Al-Baqarah, 2:216" },
    { arabic: "وَجَاهِدُوا فِي اللَّهِ حَقَّ جِهَادِهِ", translation: "And strive for Allah with the striving due to Him.", source: "Surah Al-Hajj, 22:78" },
    { arabic: "يَا أَيُّهَا النَّاسُ إِنَّا خَلَقْنَاكُم مِّن ذَكَرٍ وَأُنثَىٰ", translation: "O mankind, indeed We have created you from male and female.", source: "Surah Al-Hujurat, 49:13" },
    { arabic: "اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ", translation: "Recite in the name of your Lord who created.", source: "Surah Al-'Alaq, 96:1" },
    { arabic: "إِنَّ اللَّهَ يُحِبُّ التَّوَّابِينَ وَيُحِبُّ الْمُتَطَهِّرِينَ", translation: "Indeed, Allah loves those who repent and loves those who purify themselves.", source: "Surah Al-Baqarah, 2:222" },
    { arabic: "قُلْ هُوَ اللَّهُ أَحَدٌ", translation: "Say, 'He is Allah, [who is] One.'", source: "Surah Al-Ikhlas, 112:1" },
    { arabic: "وَرَحْمَتِي وَسِعَتْ كُلَّ شَيْءٍ", translation: "And My mercy encompasses all things.", source: "Surah Al-A'raf, 7:156" },
    { arabic: "وَأَن لَّيْسَ لِلْإِنسَانِ إِلَّا مَا سَعَىٰ", translation: "And that man has only that for which he strives.", source: "Surah An-Najm, 53:39" },
    { arabic: "فَبِأَيِّ آلَاءِ رَبِّكُمَا تُكَذِّبَانِ", translation: "So which of the favors of your Lord would you deny?", source: "Surah Ar-Rahman, 55:13" },
    { arabic: "اسْتَغْفِرُوا رَبَّكُمْ إِنَّهُ كَانَ غَفَّارًا", translation: "Ask forgiveness of your Lord. Indeed, He is ever a Forgiver.", source: "Surah Nuh, 71:10" },
    { arabic: "وَمَا جَعَلْنَاكَ عَلَيْهِمْ حَفِيظًا", translation: "And We have not made you, [O Muhammad], a guardian over them.", source: "Surah Ash-Shura, 42:48" },
    { arabic: "وَعَدَ اللَّهُ الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ", translation: "Allah has promised those who believe and do righteous deeds.", source: "Surah Al-Ma'idah, 5:9" },
    { arabic: "سَبَّحَ لِلَّهِ مَا فِي السَّمَاوَاتِ وَالْأَرْضِ", translation: "Whatever is in the heavens and earth exalts Allah.", source: "Surah Al-Hadid, 57:1" },
    { arabic: "وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ ۚ عَلَيْهِ تَوَكَّلْتُ", translation: "And my success is not except through Allah. Upon Him I have relied.", source: "Surah Hud, 11:88" }
  ],
  currentAyahIndex: 0
};

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
// 2. PAGE DETECTION
// ==============================

function detectPage() {
  const path = window.location.pathname;
  if (path.includes('index.html') || path === '/' || path.endsWith('/')) APP.currentPage = 'home';
  else if (path.includes('quran.html')) APP.currentPage = 'quran';
  else if (path.includes('hadith.html')) APP.currentPage = 'hadith';
  else if (path.includes('education.html')) APP.currentPage = 'education';
  else if (path.includes('connect.html')) APP.currentPage = 'connect';
  else APP.currentPage = 'static';
}

// ==============================
// 3. COMMON WIDGETS
// ==============================

function updateClock() {
  const now = new Date();
  const timeStr = `${padZero(now.getHours())}:${padZero(now.getMinutes())}`;
  const el = document.getElementById('current-time-display');
  if (el) el.textContent = timeStr;
}
setInterval(updateClock, 1000);

/* --- Prayer Times & Qibla --- */
async function fetchPrayerTimes(lat, lng) {
  const today = new Date().toISOString().split('T')[0];
  const url = `https://api.aladhan.com/v1/timings/${today}?latitude=${lat}&longitude=${lng}&method=2`;
  const data = await fetchData(url);
  
  const listEl = document.getElementById('prayer-times-list');
  if (!listEl) return;
  
  if (data && data.code === 200) {
    const timings = data.data.timings;
    const locEl = document.getElementById('location-display');
    if (locEl) {
      const city = data.data.meta?.timezone?.split('/')[1] || 'Your Location';
      locEl.innerHTML = `<i class="fas fa-map-marker-alt me-1"></i> ${city}`;
    }

    const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    let html = '';
    prayers.forEach(p => {
      html += `<div class="prayer-row">
        <span class="prayer-name">${p}</span>
        <span class="prayer-time">${timings[p]}</span>
      </div>`;
    });
    listEl.innerHTML = html;
  } else {
    listEl.innerHTML = `<div class="text-center py-3 text-muted small">Could not load prayer times.</div>`;
  }
}

async function calculateQibla() {
  if (!APP.lat || !APP.lng) return;
  const url = `https://api.aladhan.com/v1/qibla/${APP.lat}/${APP.lng}`;
  const data = await fetchData(url);
  const arrowEl = document.getElementById('qibla-arrow');
  const degEl = document.getElementById('qibla-direction');
  
  if (data && data.code === 200) {
    const deg = data.data.direction;
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

// --- FIXED: Uses cached coordinates for instant refresh ---
function refreshPrayerTimes() {
  if (APP.lat && APP.lng) {
    fetchPrayerTimes(APP.lat, APP.lng);
    calculateQibla();
    console.log("Prayer times refreshed successfully!");
  } else {
    getUserLocation();
  }
}

/* --- Hijri Date --- */
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

  const hijri = await fetchHijriDate(dateStr);
  const el = document.getElementById('hijri-date');
  const gregEl = document.getElementById('gregorian-date');
  
  if (hijri) {
    if (el) el.textContent = `${hijri.day} ${hijri.month.en} ${hijri.year}`;
    if (gregEl) gregEl.textContent = new Date().toLocaleDateString();
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

/* --- Daily Ayah of the Day --- */
function fetchDailyAyah() {
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  APP.currentAyahIndex = dayOfYear % APP.ayahList.length;
  const ayah = APP.ayahList[APP.currentAyahIndex];

  // Update Home Page Widget
  const textEl = document.getElementById('daily-ayah');
  const sourceEl = document.getElementById('ayah-source');
  if (textEl) textEl.textContent = ayah.translation;
  if (sourceEl) sourceEl.textContent = ayah.source;

  // Update Connect Page Widget
  const apiArabic = document.getElementById('apiArabic');
  const apiEnglish = document.getElementById('apiEnglish');
  const apiSource = document.getElementById('apiSource');
  if (apiArabic) apiArabic.textContent = ayah.arabic;
  if (apiEnglish) apiEnglish.textContent = ayah.translation;
  if (apiSource) apiSource.textContent = ayah.source;

  // Hide the loader and show the content on the connect page
  const loader = document.getElementById('ayahLoader');
  const content = document.getElementById('ayahContent');
  if (loader) loader.style.display = 'none';
  if (content) content.style.display = 'block';
}

/* --- Zakat Calculator --- */
function calculateZakat() {
  const cash = parseFloat(document.getElementById('cash-assets').value) || 0;
  const gold = parseFloat(document.getElementById('gold-assets').value) || 0;
  const business = parseFloat(document.getElementById('business-assets').value) || 0;
  const total = (cash + gold + business) * 0.025;
  
  const output = document.getElementById('zakat-output');
  const totalEl = document.getElementById('zakat-total');
  if (total > 0 && output && totalEl) {
    output.classList.add('show');
    totalEl.textContent = `$${total.toFixed(2)}`;
  } else if (output) {
    output.classList.remove('show');
  }
}

// ==============================
// 4. EDUCATION PAGE
// ==============================

async function loadArticle(fileName) {
  const wrapper = document.getElementById('dynamic-content');
  if (!wrapper) return;
  
  const url = new URL(window.location);
  url.searchParams.set('article', fileName.replace('.html', ''));
  window.history.pushState({}, '', url);
  
  try {
    const response = await fetch(fileName);
    if (!response.ok) throw new Error('Article not found');
    const html = await response.text();
    wrapper.innerHTML = html;
    
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    if (titleMatch) document.title = titleMatch[1] + ' - Al-QURANITE';
    else {
      const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
      if (h1Match) document.title = h1Match[1].replace(/<[^>]*>/g, '') + ' - Al-QURANITE';
    }
    
    const searchInput = document.getElementById('namesSearch');
    if (searchInput) searchInput.addEventListener('input', filterNames);
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    wrapper.innerHTML = `<div class="text-center py-5 text-danger"><i class="fas fa-exclamation-circle fa-3x mb-3"></i><h3>Article could not be loaded</h3><p>Make sure all .html files are in the root folder, and use "Live Server" to avoid CORS errors.</p></div>`;
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

function initEducation() {
  const items = document.querySelectorAll('.dynamic-link');
  items.forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      const src = this.getAttribute('data-src');
      if (src) loadArticle(src);
    });
  });
  
  const article = getQueryParam('article');
  if (article) loadArticle(article + '.html');
  
  const searchInput = document.getElementById('bookSearch');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      const query = this.value.toLowerCase();
      const books = document.querySelectorAll('.book-item');
      books.forEach(b => {
        const text = b.textContent.toLowerCase();
        b.style.display = text.includes(query) ? 'flex' : 'none';
      });
    });
  }
}

// ==============================
// 5. QURAN PAGE
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
  
  document.querySelectorAll('.surah-item').forEach(el => {
    el.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      fetchSurah(id);
    });
  });
}

async function fetchSurah(id) {
  const urlAr = `https://api.alquran.cloud/v1/surah/${id}/ar`;
  const urlEn = `https://api.alquran.cloud/v1/surah/${id}/en.sahih`;
  const [dataAr, dataEn] = await Promise.all([fetchData(urlAr), fetchData(urlEn)]);
  
  const panel = document.getElementById('readerPanel');
  const welcome = document.getElementById('welcomeMessage');
  const content = document.getElementById('surahContent');
  
  if (!panel) return;
  
  if (dataAr && dataAr.code === 200 && dataEn && dataEn.code === 200) {
    APP.currentSurah = dataAr.data;
    if (welcome) welcome.style.display = 'none';
    if (content) content.style.display = 'block';
    
    document.getElementById('currentSurahTitle').textContent = dataAr.data.englishName;
    document.getElementById('surahMetaBadge').textContent = `${dataAr.data.numberOfAyahs} verses • ${dataAr.data.revelationType}`;
    
    const container = document.getElementById('versesContainer');
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
          <button class="btn-action-mini" onclick="copyText('${ayahEn.text.replace(/'/g, "\\'")}')"><i class="far fa-copy"></i> Copy</button>
          <button class="btn-action-mini" onclick="shareText('${ayahEn.text.replace(/'/g, "\\'")}')"><i class="fas fa-share-alt"></i> Share</button>
        </div>
      </div>`;
    });
    container.innerHTML = html;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    document.getElementById('versesContainer').innerHTML = `<div class="text-center py-5 text-danger">Failed to load Surah.</div>`;
  }
}

function initQuran() {
  fetchSurahs();
  
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
// 6. GLOBAL HELPERS (Copy/Share)
// ==============================

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => alert('Copied to clipboard!'));
}

function shareText(text) {
  if (navigator.share) {
    navigator.share({ title: 'Al-QURANITE', text: text });
  } else {
    alert('Share not supported on this browser.');
  }
}

// ==============================
// 7. INITIALIZATION
// ==============================

document.addEventListener('DOMContentLoaded', function() {
  detectPage();
  updateClock();
  
  if (APP.currentPage === 'home') {
    getUserLocation();
    updateHijriDate();
    fetchDailyAyah(); // Changed from fetchDailyDua
  }
  
  if (APP.currentPage === 'connect') {
    fetchDailyAyah(); // Changed from Hadith widget
  }
  
  if (APP.currentPage === 'education') initEducation();
  if (APP.currentPage === 'quran') initQuran();
});

setInterval(updateClock, 1000);
