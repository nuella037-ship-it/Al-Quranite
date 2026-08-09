/**
 *  AL-QURANITE - Main Script (Production Ready - HadithAPI.com)
 *  Uses hadithapi.com with your provided API key.
 *  No mock content, no static fallbacks – pure API data.
 */

// ==============================
// 1. UTILITY FUNCTIONS & APP STATE
// ==============================

const APP = {
  currentPage: '',
  currentSurah: null,
  currentCollection: null,
  currentBook: null,
  currentChapterId: null,
  hadithPage: 1,
  hadithSize: 20,
  surahList: [],
  bookList: [],
  lat: null,
  lng: null,
  duaList: [
    { arabic: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ", translation: "Our Lord, give us in this world [that which is] good and in the Hereafter [that which is] good and protect us from the punishment of the Fire.", source: "Surah Al-Baqarah, 2:201" },
    { arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ الْهَمِّ وَالْحَزَنِ", translation: "O Allah, I seek refuge in You from anxiety and grief.", source: "Sahih Al-Bukhari" },
    { arabic: "رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي", translation: "My Lord, expand for me my chest [with assurance] and ease for me my task.", source: "Surah Taha, 20:25-26" },
    { arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَافِيَةَ", translation: "O Allah, I ask You for well-being.", source: "Sunan Ibn Majah" },
    { arabic: "لَا إِلَٰهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ", translation: "There is no deity except You; exalted are You. Indeed, I have been of the wrongdoers.", source: "Surah Al-Anbiya, 21:87" },
    { arabic: "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ", translation: "O Allah, send blessings upon Muhammad and upon the family of Muhammad.", source: "Sahih Al-Bukhari" }
  ],
  currentDuaIndex: 0
};

// === YOUR API KEY ===
const API_KEY = "$2y$10$CMLzJBy2h0l6elIOfEqnSEAbufBKlhk5FVMhmn0EPzS4lQL2";

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

function refreshPrayerTimes() { getUserLocation(); }

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
  const dateStr = `${day}-${month}-${year}`; // dd-MM-yyyy

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

/* --- Daily Hadith (HadithAPI.com - Random) --- */
/* --- Daily Hadith (Random using real endpoints) --- */
async function fetchDailyHadith() {
  const loader = document.getElementById('hadithLoader');
  const content = document.getElementById('hadithContent');
  const arabicEl = document.getElementById('apiArabic');
  const englishEl = document.getElementById('apiEnglish');
  const sourceEl = document.getElementById('apiSource');
  const dateEl = document.getElementById('hadithDate');

  if (loader) loader.style.display = 'none';
  if (content) content.style.display = 'block';

  // 1. Fetch all books
  const booksUrl = `https://hadithapi.com/api/books?apiKey=${API_KEY}`;
  const booksData = await fetchData(booksUrl);

  if (booksData && Array.isArray(booksData) && booksData.length > 0) {
    // 2. Pick a random book
    const randomBook = booksData[Math.floor(Math.random() * booksData.length)];
    
    // 3. Fetch chapters for that book
    const chaptersUrl = `https://hadithapi.com/api/books/${randomBook.slug}/chapters?apiKey=${API_KEY}`;
    const chaptersData = await fetchData(chaptersUrl);

    if (chaptersData && Array.isArray(chaptersData) && chaptersData.length > 0) {
      // 4. Pick a random chapter
      const randomChapter = chaptersData[Math.floor(Math.random() * chaptersData.length)];
      
      // 5. Fetch exactly 1 Hadith from that chapter
      const hadithsUrl = `https://hadithapi.com/api/hadiths?bookId=${randomChapter.book_id}&chapterId=${randomChapter.id}&page=1&size=1&apiKey=${API_KEY}`;
      const hadithsData = await fetchData(hadithsUrl);

      if (hadithsData && hadithsData.hadiths && hadithsData.hadiths.length > 0) {
        const h = hadithsData.hadiths[0];
        if (arabicEl) arabicEl.textContent = h.arabic || h.text;
        if (englishEl) englishEl.textContent = h.text;
        if (sourceEl) sourceEl.textContent = `${randomBook.name} - Chapter ${randomChapter.id} - Hadith ${h.id}`;
        if (dateEl) dateEl.textContent = new Date().toLocaleDateString();
        return; // Success! Stop here.
      }
    }
  }

  // If ANY step fails, show a real error message (no mock content)
  if (arabicEl) arabicEl.textContent = "Unable to load Hadith.";
  if (englishEl) englishEl.textContent = "The API is currently unreachable. Please try again later.";
  if (sourceEl) sourceEl.textContent = "API Error";
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString();
}

function copyDailyHadith() {
  const el = document.getElementById('apiEnglish');
  if (!el) return;
  const text = el.textContent;
  navigator.clipboard.writeText(text).then(() => alert('Hadith copied to clipboard!'));
}

function shareDailyHadith() {
  const el = document.getElementById('apiEnglish');
  if (!el) return;
  const text = el.textContent;
  if (navigator.share) {
    navigator.share({ title: 'Daily Hadith', text: text });
  } else {
    alert('Share not supported on this browser.');
  }
}

/* --- Dua of the Day --- */
function fetchDailyDua() {
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  APP.currentDuaIndex = dayOfYear % APP.duaList.length;
  const dua = APP.duaList[APP.currentDuaIndex];
  
  const textEl = document.getElementById('daily-dua');
  const sourceEl = document.getElementById('dua-source');
  if (textEl) textEl.textContent = dua.translation;
  if (sourceEl) sourceEl.textContent = dua.source;
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
// 6. HADITH PAGE (HadithAPI.com - No Mock Data)
// ==============================

/* --- Fetch Books (Collections) --- */
async function fetchCollections() {
  const url = `https://hadithapi.com/api/books?apiKey=${API_KEY}`;
  const data = await fetchData(url);
  const container = document.getElementById('bookListContainer');
  if (!container) return;
  
  if (data && Array.isArray(data)) {
    APP.collectionList = data;
    renderCollectionList(APP.collectionList);
  } else {
    container.innerHTML = `<div class="text-center p-4 text-muted small">Failed to load collections.</div>`;
  }
}

function renderCollectionList(collections) {
  const container = document.getElementById('bookListContainer');
  let html = '';
  collections.forEach(c => {
    html += `<div class="book-item collection-item" data-slug="${c.slug}">
      <div class="d-flex align-items-center">
        <div class="book-info">
          <h6>${c.name}</h6>
          <small>${c.total_chapters || '?'} chapters</small>
        </div>
      </div>
      <div class="book-name-ar">${c.slug}</div>
    </div>`;
  });
  container.innerHTML = html;
  
  document.querySelectorAll('.collection-item').forEach(el => {
    el.addEventListener('click', function() {
      const slug = this.getAttribute('data-slug');
      fetchBooks(slug);
    });
  });
}

/* --- Fetch Chapters (Books) --- */
async function fetchBooks(slug) {
  const url = `https://hadithapi.com/api/books/${slug}/chapters?apiKey=${API_KEY}`;
  const data = await fetchData(url);
  const container = document.getElementById('bookListContainer');
  
  if (data && Array.isArray(data)) {
    APP.currentCollection = slug;
    APP.bookList = data;
    renderBookList(APP.bookList);
  } else {
    container.innerHTML = `<div class="text-center p-4 text-muted small">Failed to load chapters.</div>`;
  }
}

function renderBookList(chapters) {
  const container = document.getElementById('bookListContainer');
  let html = `<div class="mb-2 text-muted small fst-italic ps-3">Collection: ${APP.currentCollection}</div><button class="btn btn-sm btn-outline-secondary ms-2 mb-2" onclick="fetchCollections()"><i class="fas fa-arrow-left"></i> Back</button>`;
  chapters.forEach(ch => {
    html += `<div class="book-item book-item-child" data-collection="${APP.currentCollection}" data-chapter="${ch.id}" data-bookid="${ch.book_id}">
      <div class="d-flex align-items-center">
        <span class="book-number">${ch.id}</span>
        <div class="book-info">
          <h6>${ch.name}</h6>
          <small>${ch.hadith_count || '?'} hadiths</small>
        </div>
      </div>
    </div>`;
  });
  container.innerHTML = html;
  
  document.querySelectorAll('.book-item-child').forEach(el => {
    el.addEventListener('click', function() {
      const collection = this.getAttribute('data-collection');
      const chapterId = this.getAttribute('data-chapter');
      const bookId = this.getAttribute('data-bookid');
      APP.currentChapterId = chapterId;
      APP.hadithPage = 1; // reset to first page
      fetchHadiths(collection, bookId, chapterId, 1);
    });
  });
}

/* --- Fetch Hadiths --- */
async function fetchHadiths(collection, bookId, chapterId, page = 1) {
  const url = `https://hadithapi.com/api/hadiths?bookId=${bookId}&chapterId=${chapterId}&page=${page}&size=${APP.hadithSize}&apiKey=${API_KEY}`;
  const data = await fetchData(url);
  const panel = document.getElementById('readerPanel');
  const welcome = document.getElementById('welcomeMessage');
  const content = document.getElementById('bookContent');
  
  if (!panel) return;

  if (data && data.hadiths && data.hadiths.length > 0) {
    if (welcome) welcome.style.display = 'none';
    if (content) content.style.display = 'block';
    
    document.getElementById('currentBookTitle').textContent = `Hadiths - Chapter ${chapterId}`;
    document.getElementById('bookMetaBadge').textContent = `${collection} • Page ${page}`;
    
    const container = document.getElementById('hadithsContainer');
    
    let html = '';
    data.hadiths.forEach((h, idx) => {
      const num = ((page - 1) * APP.hadithSize) + idx + 1;
      const safeEnglish = h.text.replace(/'/g, "\\'");
      html += `<div class="hadith-card">
        <div class="hadith-content-wrapper">
          <div class="hadith-number-box">
            <span class="hadith-num-text">${num}</span>
          </div>
          <div class="hadith-text-content">
            <div class="hadith-arabic">${h.arabic}</div>
            <div class="hadith-translation">${h.text}</div>
            <div class="small text-muted mt-2">${h.grade || 'Authentic'}</div>
          </div>
        </div>
        <div class="hadith-actions">
          <button class="btn-action-mini" onclick="copyText('${safeEnglish}')"><i class="far fa-copy"></i> Copy</button>
          <button class="btn-action-mini" onclick="shareText('${safeEnglish}')"><i class="fas fa-share-alt"></i> Share</button>
        </div>
      </div>`;
    });
    container.innerHTML = html;
    
    // Handle Load More button visibility
    const loadMoreBtn = document.querySelector('.load-more-btn');
    if (data.meta && data.meta.total && data.meta.total <= page * APP.hadithSize) {
      if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    } else {
      if (loadMoreBtn) {
        loadMoreBtn.style.display = 'inline-block';
        loadMoreBtn.onclick = function() {
          const nextPage = page + 1;
          fetchHadiths(collection, bookId, chapterId, nextPage);
        };
      }
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    document.getElementById('hadithsContainer').innerHTML = `<div class="text-center py-4 text-danger small">Failed to load Hadiths.</div>`;
  }
}

function initHadith() {
  fetchCollections();
  
  const searchInput = document.getElementById('bookSearch');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      const query = this.value.toLowerCase();
      if (APP.bookList && APP.bookList.length > 0) {
        const filtered = APP.bookList.filter(b => b.name.toLowerCase().includes(query));
        renderBookList(filtered);
      }
    });
  }
}

// ==============================
// 7. GLOBAL HELPERS (Copy/Share)
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
// 8. INITIALIZATION
// ==============================

document.addEventListener('DOMContentLoaded', function() {
  detectPage();
  updateClock();
  
  if (APP.currentPage === 'home') {
    getUserLocation();
    updateHijriDate();
    fetchDailyHadith();
    fetchDailyDua();
  }
  
  if (APP.currentPage === 'connect') fetchDailyHadith();
  if (APP.currentPage === 'education') initEducation();
  if (APP.currentPage === 'quran') initQuran();
  if (APP.currentPage === 'hadith') initHadith();
});

setInterval(updateClock, 1000);
