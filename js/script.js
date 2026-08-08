// ============================================================
//  API & Logic Script – Al-QURANITE
//  Organized into clear sections for maintainability.
// ============================================================

// ---------- GLOBAL VARIABLES ----------
let allSurahs = [];
let currentLanguage = 'en.sahih';
const apiBase = 'https://api.quran.com/api/v4';

let allBooks = [
    { id: 'bukhari', name_simple: 'Sahih Al-Bukhari', name_arabic: 'صحيح البخاري', desc: 'The most authentic book after the Quran.' },
    { id: 'muslim', name_simple: 'Sahih Muslim', name_arabic: 'صحيح مسلم', desc: 'Second most authentic collection.' },
    { id: 'abudawud', name_simple: 'Sunan Abi Dawud', name_arabic: 'سنن أبي داود', desc: 'Focuses on legal hadiths.' },
    { id: 'tirmidhi', name_simple: 'Jami At-Tirmidhi', name_arabic: 'جامع الترمذي', desc: 'Known for its commentary on reliability.' },
    { id: 'ibnmajah', name_simple: 'Sunan Ibn Majah', name_arabic: 'سنن ابن ماجه', desc: 'Contains many unique hadiths.' },
    { id: 'nasai', name_simple: 'Sunan An-Nasai', name_arabic: 'سنن النسائي', desc: 'Known for its strict criteria.' },
    { id: 'malik', name_simple: 'Muwatta Malik', name_arabic: 'موطأ مالك', desc: 'Earliest surviving book of hadith.' }
];

let currentBookId = null;
let currentStartIndex = 0;
const batchSize = 10;
let isLoading = false;
let allHadithsCache = [];

// UPDATED: Hadith API Base to v2 for stability
const HADITH_API_BASE = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@2/editions";
let currentDailyHadith = null;

// ---------- HELPER: Fetch with Timeout ----------
async function fetchWithTimeout(url, options = {}, timeout = 15000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

// ---------- 1. REAL-TIME CLOCK ----------
function updateClock() {
    const display = document.getElementById('current-time-display');
    if (!display) return;
    const now = new Date();
    display.innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
setInterval(updateClock, 1000);

// ---------- 2. PRAYER TIMES & LOCATION ----------
async function getPrayerTimes() {
    const locationDisplay = document.getElementById('location-display');
    const prayerList = document.getElementById('prayer-times-list');
    if (!locationDisplay || !prayerList) return;

    const cachedData = localStorage.getItem('noorAlHuda_prayers');
    const cacheTime = localStorage.getItem('noorAlHuda_prayerTime');
    const currentTime = new Date().getTime();

    if (cachedData && cacheTime && (currentTime - parseInt(cacheTime) < 86400000)) {
        renderPrayerTimes(JSON.parse(cachedData));
        locationDisplay.innerHTML = `<i class="fas fa-check-circle me-1 text-success"></i> Today's Times (Cached)`;
        return;
    }

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
            await fetchAndRender(position.coords.latitude, position.coords.longitude);
        }, () => {
            locationDisplay.innerHTML = `<i class="fas fa-exclamation-triangle me-1 text-warning"></i> Location denied. Using Default.`;
            fetchAndRender(51.5074, -0.1278);
        });
    } else {
        locationDisplay.innerText = "Geolocation not supported.";
        fetchAndRender(51.5074, -0.1278);
    }
}

window.refreshPrayerTimes = function() {
    localStorage.removeItem('noorAlHuda_prayers');
    localStorage.removeItem('noorAlHuda_prayerTime');
    const list = document.getElementById('prayer-times-list');
    if (list) {
        list.innerHTML = '<div class="text-center py-3"><i class="fas fa-spinner fa-spin text-emerald"></i> Loading...</div>';
    }
    getPrayerTimes();
};

async function fetchAndRender(lat, lng) {
    try {
        const date = new Date();
        const timestamp = Math.floor(date.getTime() / 1000);
        // Used fetchWithTimeout to prevent hanging
        const response = await fetchWithTimeout(
            `https://api.aladhan.com/v1/timings/${timestamp}?latitude=${lat}&longitude=${lng}&method=2`
        );
        const data = await response.json();

        if (data.code === 200) {
            const now = new Date().getTime();
            localStorage.setItem('noorAlHuda_prayers', JSON.stringify(data.data));
            localStorage.setItem('noorAlHuda_prayerTime', now);
            renderPrayerTimes(data.data);
        } else {
            throw new Error('Aladhan API returned an error');
        }
    } catch (error) {
        console.error('Prayer times error:', error);
        const list = document.getElementById('prayer-times-list');
        if (list) list.innerHTML = '<div class="text-center text-danger">Network error loading times.</div>';
    }
}

function renderPrayerTimes(data) {
    const timings = data.timings;
    const hijri = data.date.hijri;
    const gregorian = data.date.readable;

    const locDisplay = document.getElementById('location-display');
    const hijriEl = document.getElementById('hijri-date');
    const gregEl = document.getElementById('gregorian-date');
    if (!locDisplay || !hijriEl || !gregEl) return;

    locDisplay.innerHTML = `<i class="fas fa-map-marker-alt me-1"></i> Times Loaded`;
    hijriEl.innerText = `${hijri.day} ${hijri.month.en} ${hijri.year}`;
    gregEl.innerText = gregorian;

    let html = '';
    const prayers = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    const icons = {
        'Fajr': 'fa-cloud-sun',
        'Sunrise': 'fa-sun',
        'Dhuhr': 'fa-sun',
        'Asr': 'fa-cloud-sun-rain',
        'Maghrib': 'fa-moon',
        'Isha': 'fa-star'
    };

    const currentHour = new Date().getHours();
    const currentMin = new Date().getMinutes();
    const currentTimeVal = currentHour * 60 + currentMin;

    let nextPrayerFound = false;

    prayers.forEach(p => {
        const timeParts = timings[p].split(':');
        const prayerTimeVal = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);

        let isNext = false;
        if (!nextPrayerFound && prayerTimeVal > currentTimeVal && p !== 'Sunrise') {
            isNext = true;
            nextPrayerFound = true;
        }

        if (!nextPrayerFound && p === 'Fajr' && currentTimeVal > (parseInt(timings['Isha'].split(':')[0]) * 60 + parseInt(timings['Isha'].split(':')[1]))) {
            isNext = true;
        }

        const activeClass = isNext ? 'active-prayer' : '';
        const icon = icons[p] || 'fa-clock';

        html += `
            <div class="prayer-row ${activeClass}">
                <span class="prayer-name"><i class="fas ${icon} me-2 text-muted small"></i>${p}</span>
                <span class="prayer-time">${timings[p]}</span>
            </div>
        `;
    });

    const list = document.getElementById('prayer-times-list');
    if (list) list.innerHTML = html;
}

// ---------- 3. QIBLA DIRECTION ----------
function calculateQibla() {
    const arrow = document.getElementById('qibla-arrow');
    const direction = document.getElementById('qibla-direction');
    if (!arrow || !direction) return;

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const lat = position.coords.latitude * (Math.PI / 180);
            const lng = position.coords.longitude * (Math.PI / 180);
            const qibla = getQiblaAngle(lat, lng);
            direction.innerText = `${Math.round(qibla)}°`;
            document.documentElement.style.setProperty('--qibla-deg', `${qibla}deg`);
            arrow.classList.remove('hidden');
        }, () => {
            console.log("Location access denied for Qibla.");
            direction.innerText = "N/A";
            arrow.classList.add('hidden');
        });
    }
}

// Manual Qibla calculation 
function calculateQiblaManual(latDeg, lngDeg) {
    const arrow = document.getElementById('qibla-arrow');
    const direction = document.getElementById('qibla-direction');
    if (!arrow || !direction) return;
    const lat = latDeg * (Math.PI / 180);
    const lng = lngDeg * (Math.PI / 180);
    const qibla = getQiblaAngle(lat, lng);
    direction.innerText = `${Math.round(qibla)}°`;
    document.documentElement.style.setProperty('--qibla-deg', `${qibla}deg`);
    arrow.classList.remove('hidden');
}

function getQiblaAngle(latRad, lngRad) {
    const kaabaLat = 21.4225 * (Math.PI / 180);
    const kaabaLng = 39.8262 * (Math.PI / 180);
    const y = Math.sin(kaabaLng - lngRad);
    const x = Math.cos(latRad) * Math.tan(kaabaLat) - Math.sin(latRad) * Math.cos(kaabaLng - lngRad);
    let qibla = Math.atan2(y, x) * (180 / Math.PI);
    qibla = (qibla + 360) % 360;
    return qibla;
}

// ---------- 4. DATE CONVERTER ----------
function convertDate(gregorianString) {
    const output = document.getElementById('converted-hijri');
    if (!output || !gregorianString) return;
    const dateObj = new Date(gregorianString);
    const timestamp = Math.floor(dateObj.getTime() / 1000);

    fetch(`https://api.aladhan.com/v1/gToH?date=${timestamp}`)
        .then(res => res.json())
        .then(data => {
            if (data.code === 200) {
                const h = data.data;
                output.innerText = `${h.day} ${h.month.en} ${h.year} AH`;
            }
        });
}

function resetDate() {
    const input = document.getElementById('gregorian-input');
    const output = document.getElementById('converted-hijri');
    if (input) input.value = '';
    if (output) output.innerText = '';
}

// ---------- 5. DAILY WISDOM (Homepage) ----------
function loadDailyWisdom() {
    const hadithEl = document.getElementById('daily-hadith');
    const hadithSource = document.getElementById('hadith-source');
    const duaEl = document.getElementById('daily-dua');
    const duaSource = document.getElementById('dua-source');
    if (!hadithEl || !hadithSource || !duaEl || !duaSource) return;

    const hadiths = [
        { text: "The best among you are those who have the best manners and character.", source: "Sahih Al-Bukhari" },
        { text: "Kindness is a mark of faith, and whoever is not kind has no faith.", source: "Sahih Muslim" },
        { text: "Smiling in the face of your brother is charity.", source: "Jami` at-Tirmidhi" },
        { text: "None of you will have faith till he wishes for his (Muslim) brother what he likes for himself.", source: "Sahih Al-Bukhari" }
    ];

    const duas = [
        { text: "Our Lord! Give us in this world that which is good and in the Hereafter that which is good, and save us from the torment of the Fire!", source: "Surah Al-Baqarah 2:201" },
        { text: "O Allah, I ask You for knowledge that is of benefit, a good provision, and deeds that will be accepted.", source: "Sunan Ibn Majah" },
        { text: "My Lord, expand for me my breast [with assurance] and ease for me my task.", source: "Surah Taha 20:25-26" }
    ];

    const dayOfMonth = new Date().getDate();
    const hadithIndex = dayOfMonth % hadiths.length;
    const duaIndex = dayOfMonth % duas.length;

    hadithEl.innerText = `"${hadiths[hadithIndex].text}"`;
    hadithSource.innerText = `- ${hadiths[hadithIndex].source}`;
    duaEl.innerText = `"${duas[duaIndex].text}"`;
    duaSource.innerText = `- ${duas[duaIndex].source}`;
}

// ---------- 6. ZAKAT CALCULATOR ----------
function calculateZakat() {
    const cash = document.getElementById('cash-assets');
    const gold = document.getElementById('gold-assets');
    const business = document.getElementById('business-assets');
    const output = document.getElementById('zakat-output');
    const totalDisplay = document.getElementById('zakat-total');
    if (!cash || !gold || !business || !output || !totalDisplay) return;

    const cashVal = parseFloat(cash.value) || 0;
    const goldVal = parseFloat(gold.value) || 0;
    const businessVal = parseFloat(business.value) || 0;
    const totalAssets = cashVal + goldVal + businessVal;
    const zakat = totalAssets * 0.025;

    if (totalAssets > 0) {
        output.classList.add('show');
        totalDisplay.innerText = `$${zakat.toFixed(2)}`;
    } else {
        alert("Please enter valid asset values.");
    }
}

// ---------- 7. QURAN LOGIC ----------
function applyQuranFilters() {
    const input = document.getElementById('surahSearch');
    if (!input) return;
    const term = input.value.toLowerCase();
    const filtered = allSurahs.filter(s =>
        (s.name_simple && s.name_simple.toLowerCase().includes(term)) ||
        (s.translated_name && s.translated_name.name && s.translated_name.name.toLowerCase().includes(term)) ||
        s.id.toString().includes(term)
    );
    renderSurahList(filtered);
}

async function fetchSurahList() {
    const container = document.getElementById('surahListContainer');
    if (!container) return;

    const cachedList = localStorage.getItem('quran_surah_list');
    if (cachedList) {
        try {
            allSurahs = JSON.parse(cachedList);
            renderSurahList(allSurahs);
            return;
        } catch (e) { console.warn("Cached list corrupted, refetching...", e); }
    }

    try {
        // Added timeout wrapper
        const cloudResponse = await fetchWithTimeout('https://api.alquran.cloud/v1/surah');
        const cloudData = await cloudResponse.json();
        if (cloudData && cloudData.code === 200 && cloudData.data) {
            allSurahs = cloudData.data.map(s => ({
                id: s.number,
                name_simple: s.englishName,
                name_arabic: s.name,
                translated_name: { name: s.englishNameTranslation || "Translation not available" },
                revelation_place: s.revelationType
            }));
            localStorage.setItem('quran_surah_list', JSON.stringify(allSurahs));
            renderSurahList(allSurahs);
        }
    } catch (error) {
        console.error("Error loading surah list:", error);
        container.innerHTML = `
            <div class="text-danger text-center p-3">
                <i class="fas fa-exclamation-circle mb-2"></i><br>
                Error loading list. Please check your connection.<br>
                <button class="btn btn-sm btn-outline-danger mt-2" onclick="fetchSurahList()">Retry</button>
            </div>`;
    }
}

function renderSurahList(surahs) {
    const container = document.getElementById('surahListContainer');
    if (!container) return;
    container.innerHTML = '';
    if (!surahs || surahs.length === 0) {
        container.innerHTML = '<div class="text-muted text-center p-3">No Surahs found</div>';
        return;
    }
    surahs.forEach(surah => {
        const div = document.createElement('div');
        div.className = 'surah-item';
        div.id = `surah-item-${surah.id}`;
        div.onclick = () => loadSurah(surah.id);
        div.innerHTML = `
            <div class="d-flex align-items-center">
                <span class="surah-number">${surah.id}</span>
                <div class="surah-info">
                    <h6>${surah.name_simple || 'Unknown'}</h6>
                    <small>${surah.translated_name?.name || ''}</small>
                </div>
            </div>
            <div class="surah-name-ar">${surah.name_arabic || ''}</div>
        `;
        container.appendChild(div);
    });
}

async function loadSurah(id) {
    const welcomeMsg = document.getElementById('welcomeMessage');
    const surahContent = document.getElementById('surahContent');
    const versesContainer = document.getElementById('versesContainer');
    const currentTitle = document.getElementById('currentSurahTitle');
    const metaBadge = document.getElementById('surahMetaBadge');
    if (!welcomeMsg || !surahContent || !versesContainer || !currentTitle || !metaBadge) return;

    welcomeMsg.style.display = 'none';
    surahContent.style.display = 'block';
    versesContainer.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-success"></div><p class="mt-2">Loading...</p></div>';

    document.querySelectorAll('.surah-item').forEach(el => el.classList.remove('active'));
    const activeItem = document.getElementById(`surah-item-${id}`);
    if (activeItem) activeItem.classList.add('active');

    const cacheKey = `quran_content_${id}_${currentLanguage}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
        try {
            const parsed = JSON.parse(cached);
            const surahInfo = allSurahs.find(s => s.id === id);
            if (surahInfo) {
                currentTitle.innerText = surahInfo.name_simple;
                metaBadge.innerText = `${surahInfo.revelation_place ? surahInfo.revelation_place.toUpperCase() : ''} • ${surahInfo.translated_name?.name || ''}`;
            }
            renderVersesUI(parsed, versesContainer);
            scrollToContent();
            return;
        } catch (e) { console.warn("Cache corrupted, refetching...", e); }
    }

    try {
        // Added timeout wrappers for both API calls
        const [arRes, enRes] = await Promise.all([
            fetchWithTimeout(`https://api.alquran.cloud/v1/surah/${id}`),
            fetchWithTimeout(`https://api.alquran.cloud/v1/surah/${id}/${currentLanguage}`)
        ]);
        const arData = await arRes.json();
        const enData = await enRes.json();
        if (arData.code === 200 && enData.code === 200 && arData.data && enData.data) {
            const unified = {
                verses: arData.data.ayahs.map((ayah, idx) => ({
                    verse_key: `${id}:${ayah.numberInSurah}`,
                    text_uthmani: ayah.text,
                    translations: [{ text: enData.data.ayahs[idx]?.text || "Translation not available" }]
                }))
            };
            localStorage.setItem(cacheKey, JSON.stringify(unified));
            const surahInfo = allSurahs.find(s => s.id === id);
            if (surahInfo) {
                currentTitle.innerText = surahInfo.name_simple;
                metaBadge.innerText = `${surahInfo.revelation_place ? surahInfo.revelation_place.toUpperCase() : ''} • ${surahInfo.translated_name?.name || ''}`;
            }
            renderVersesUI(unified, versesContainer);
            scrollToContent();
        } else {
            throw new Error("Failed to fetch surah data");
        }
    } catch (error) {
        console.error("Error loading surah:", error);
        versesContainer.innerHTML = `
            <div class="text-danger text-center p-3">
                <i class="fas fa-exclamation-circle mb-2"></i><br>
                Error loading Surah content.<br>
                <button class="btn btn-sm btn-outline-danger mt-2" onclick="loadSurah(${id})">Retry</button>
            </div>`;
    }
}

function scrollToContent() {
    const readerPanel = document.getElementById('readerPanel');
    if (readerPanel) {
        setTimeout(() => {
            const y = readerPanel.getBoundingClientRect().top + window.scrollY - 80;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }, 100);
    }
}

function renderVersesUI(content, container) {
    if (!container) return;
    container.innerHTML = '';
    if (!content || !content.verses || content.verses.length === 0) {
        container.innerHTML = '<div class="text-muted text-center p-3">No verses available</div>';
        return;
    }
    content.verses.forEach(verse => {
        const verseDiv = document.createElement('div');
        verseDiv.className = 'verse-card';
        const arabicText = verse.text_uthmani;
        const transText = verse.translations && verse.translations[0] ? verse.translations[0].text : '';
        const fullText = `${arabicText}\n\n${transText}`;
        const verseNum = verse.verse_key.split(':')[1];
        verseDiv.innerHTML = `
            <div class="verse-content-wrapper">
                <div class="verse-number-box">
                    <span class="verse-num-text">${verseNum}</span>
                </div>
                <div class="verse-text-content">
                    <div class="verse-arabic">${arabicText}</div>
                    <div class="verse-translation">${transText || 'Translation not available'}</div>
                </div>
            </div>
            <div class="verse-actions">
                <button class="btn-action-mini" onclick="copyToClipboard(this, \`${encodeURIComponent(fullText)}\`)" aria-label="Copy Verse">
                    <i class="far fa-copy"></i>
                </button>
                <button class="btn-action-mini" onclick="shareVerse('${encodeURIComponent(arabicText)}', '${encodeURIComponent(transText)}')" aria-label="Share Verse">
                    <i class="fas fa-share-alt"></i>
                </button>
            </div>
        `;
        container.appendChild(verseDiv);
    });
}

// ---------- 8. HADITH LIBRARY LOGIC ----------
function applyHadithFilters() {
    const input = document.getElementById('bookSearch');
    if (!input) return;
    const term = input.value.toLowerCase();
    const filtered = allBooks.filter(b =>
        (b.name_simple && b.name_simple.toLowerCase().includes(term)) ||
        (b.name_arabic && b.name_arabic.includes(term))
    );
    renderBookList(filtered);
}

function renderBookList(books) {
    const container = document.getElementById('bookListContainer');
    if (!container) return;
    container.innerHTML = '';
    if (!books || books.length === 0) {
        container.innerHTML = '<div class="text-muted text-center p-3">No Books found</div>';
        return;
    }
    books.forEach((book, index) => {
        const div = document.createElement('div');
        div.className = 'book-item';
        div.id = `book-item-${book.id}`;
        div.onclick = () => loadBook(book.id);
        div.innerHTML = `
            <div class="d-flex align-items-center">
                <span class="book-number">${index + 1}</span>
                <div class="book-info">
                    <h6>${book.name_simple || 'Unknown'}</h6>
                    <small>${book.desc || ''}</small>
                </div>
            </div>
            <div class="book-name-ar">${book.name_arabic || ''}</div>
        `;
        container.appendChild(div);
    });
}

async function loadBook(id) {
    currentBookId = id;
    const welcomeMsg = document.getElementById('welcomeMessage');
    const bookContent = document.getElementById('bookContent');
    const hadithsContainer = document.getElementById('hadithsContainer');
    const currentTitle = document.getElementById('currentBookTitle');
    const metaBadge = document.getElementById('bookMetaBadge');
    if (!welcomeMsg || !bookContent || !hadithsContainer || !currentTitle || !metaBadge) return;

    welcomeMsg.style.display = 'none';
    bookContent.style.display = 'block';
    hadithsContainer.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-success"></div><p class="mt-2">Loading...</p></div>';

    document.querySelectorAll('.book-item').forEach(el => el.classList.remove('active'));
    const activeItem = document.getElementById(`book-item-${id}`);
    if (activeItem) activeItem.classList.add('active');

    const bookInfo = allBooks.find(b => b.id === id);
    if (bookInfo) {
        currentTitle.innerText = bookInfo.name_simple;
        metaBadge.innerText = `Collection • ${bookInfo.name_arabic}`;
    }

    currentStartIndex = 0;
    allHadithsCache = [];
    hadithsContainer.innerHTML = '';
    await fetchAndRenderBatch(true);
    scrollToContent();
}

async function fetchAndRenderBatch(isFreshLoad = false) {
    if (isLoading || !currentBookId) return;
    isLoading = true;

    const loadMoreBtn = document.querySelector('button[onclick="loadMoreHadiths()"]');
    if (loadMoreBtn && !isFreshLoad) {
        loadMoreBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Loading...';
    }

    try {
        if (isFreshLoad) {
            const apiFileMap = {
                'bukhari': 'eng-bukhari',
                'muslim': 'eng-muslim',
                'abudawud': 'eng-abudawud',
                'tirmidhi': 'eng-tirmidhi',
                'ibnmajah': 'eng-ibnmajah',
                'nasai': 'eng-nasai',
                'malik': 'eng-malik'
            };
            const apiFile = apiFileMap[currentBookId] || 'eng-bukhari';
            const url = `${HADITH_API_BASE}/${apiFile}.json`;
            
            // Added fetchWithTimeout
            const response = await fetchWithTimeout(url);
            if (!response.ok) throw new Error("Failed to fetch");
            const data = await response.json();
            allHadithsCache = data.hadiths || [];
        }

        const endIdx = currentStartIndex + batchSize;
        const batch = allHadithsCache.slice(currentStartIndex, endIdx);

        if (batch.length === 0) {
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            if (isFreshLoad) {
                const container = document.getElementById('hadithsContainer');
                if (container) container.innerHTML = '<p class="text-center text-muted">No hadiths found.</p>';
            }
            isLoading = false;
            return;
        }

        const container = document.getElementById('hadithsContainer');
        if (!container) { isLoading = false; return; }

        batch.forEach(hadith => {
            renderHadithEntry(hadith, container);
            currentStartIndex++;
        });

        if (currentStartIndex >= allHadithsCache.length) {
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        } else {
            if (loadMoreBtn) {
                loadMoreBtn.style.display = 'inline-block';
                loadMoreBtn.innerHTML = 'Load More <i class="fas fa-arrow-down ms-2"></i>';
            }
        }
    } catch (error) {
        console.error('Hadith load error:', error);
        const container = document.getElementById('hadithsContainer');
        if (container && isFreshLoad) {
            container.innerHTML = `<div class="alert alert-danger">Error loading hadiths. Please check your internet connection.</div>`;
        }
    } finally {
        isLoading = false;
    }
}

function loadMoreHadiths() {
    fetchAndRenderBatch(false);
}

function renderHadithEntry(data, container) {
    if (!container) return;
    let arabicText = data.arabic || data.arab || "";
    let arabicHtml = arabicText ? `<div class="hadith-arabic">${arabicText}</div>` : '';
    let translationText = data.text || data.hadith_english || data.translation || "";
    let translationHtml = translationText ? `<div class="hadith-translation">${translationText}</div>` : '';
    const hadithNumber = data.hadithnumber || data.number || data.reference || data.hadith || "N/A";

    const html = `
        <div class="hadith-card">
            <div class="hadith-content-wrapper">
                <div class="hadith-number-box">
                    <span class="hadith-num-text">${hadithNumber}</span>
                </div>
                <div class="hadith-text-content">
                    ${arabicHtml}
                    ${translationHtml}
                </div>
            </div>
            <div class="hadith-actions">
                <button class="btn-action-mini" onclick="copyToClipboard(this, \`${encodeURIComponent(translationText)}\`)" aria-label="Copy Hadith">
                    <i class="far fa-copy"></i>
                </button>
                <button class="btn-action-mini" onclick="shareHadith('${encodeURIComponent(arabicText)}', '${encodeURIComponent(translationText)}')" aria-label="Share Hadith">
                    <i class="fas fa-share-alt"></i>
                </button>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
}

async function shareHadith(encodedArabic, encodedTrans) {
    const arabic = decodeURIComponent(encodedArabic);
    const trans = decodeURIComponent(encodedTrans);
    const shareData = {
        title: 'Hadith',
        text: `${arabic}\n\n${trans}`,
        url: window.location.href
    };
    try {
        if (navigator.share) await navigator.share(shareData);
        else {
            copyToClipboard({querySelector: () => {}}, encodeURIComponent(shareData.text));
            alert('Hadith copied to clipboard!');
        }
    } catch (err) { console.log('Error sharing:', err); }
}

// ---------- 9. DAILY HADITH API (Connect page) ----------
async function fetchDailyHadith() {
    const loader = document.getElementById('hadithLoader');
    const content = document.getElementById('hadithContent');
    const arabic = document.getElementById('apiArabic');
    const english = document.getElementById('apiEnglish');
    const source = document.getElementById('apiSource');
    const dateEl = document.getElementById('hadithDate');
    if (!loader || !content || !arabic || !english || !source || !dateEl) return;

    try {
        // UPDATED URL to @2
        const url = `${HADITH_API_BASE}/eng-bukhari.min.json`;
        const response = await fetchWithTimeout(url);
        if (!response.ok) throw new Error("Network response was not ok");
        const data = await response.json();
        const hadiths = data.hadiths;
        if (hadiths && hadiths.length > 0) {
            const randomIndex = Math.floor(Math.random() * hadiths.length);
            const selected = hadiths[randomIndex];
            arabic.textContent = selected.arabic || "Arabic text unavailable in this edition.";
            english.textContent = selected.text || "Translation unavailable.";
            const hadithNum = selected.hadithnumber || selected.number || '';
            source.textContent = `Sahih Al-Bukhari ${hadithNum}`;
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dateEl.textContent = new Date().toLocaleDateString('en-US', options);
            currentDailyHadith = selected;
            loader.style.display = 'none';
            content.style.display = 'block';
        } else {
            throw new Error("No hadiths found in data");
        }
    } catch (error) {
        console.error("Hadith API Error", error);
        loader.innerHTML = '<span class="text-danger">Failed to load Hadith. Please refresh.</span>';
    }
}

function copyDailyHadith() {
    if (!currentDailyHadith) return;
    const hadithNum = currentDailyHadith.hadithnumber || currentDailyHadith.number || '';
    const text = `${currentDailyHadith.arabic || ''}\n\n${currentDailyHadith.text || ''}\n- Sahih Al-Bukhari ${hadithNum}`;
    navigator.clipboard.writeText(text).then(() => alert("Hadith copied to clipboard!"));
}

function shareDailyHadith() {
    if (!currentDailyHadith) return;
    const hadithNum = currentDailyHadith.hadithnumber || currentDailyHadith.number || '';
    if (navigator.share) {
        navigator.share({
            title: 'Daily Hadith',
            text: `${currentDailyHadith.text} - Sahih Al-Bukhari ${hadithNum}`,
            url: window.location.href
        }).catch(console.error);
    } else {
        copyDailyHadith();
    }
}

// ---------- 10. CONTACT FORM ----------
async function handleFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const btn = form.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    btn.disabled = true;

    try {
        const formData = new FormData(form);
        const response = await fetch(form.action, {
            method: 'POST',
            body: formData
        });
        if (response.ok) {
            btn.innerHTML = '<i class="fas fa-check"></i> Message Sent!';
            btn.classList.remove('btn-submit');
            btn.classList.add('btn-success');
            form.reset();
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.disabled = false;
                btn.classList.add('btn-submit');
                btn.classList.remove('btn-success');
            }, 3000);
        } else {
            throw new Error('Server responded with error');
        }
    } catch (error) {
        console.error('Form submission error:', error);
        btn.innerHTML = '<i class="fas fa-times"></i> Error. Please try again.';
        btn.classList.remove('btn-submit');
        btn.classList.add('btn-danger');
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
            btn.classList.add('btn-submit');
            btn.classList.remove('btn-danger');
        }, 3000);
    }
}

// ---------- 11. 99-NAMES SEARCH (Education article) ----------
function init99NamesSearch() {
    const searchInput = document.getElementById('namesSearch');
    if (!searchInput) return;
    const newInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newInput, searchInput);
    newInput.addEventListener('keyup', function() {
        const filter = this.value.toLowerCase();
        const cards = document.querySelectorAll('.name-card');
        cards.forEach(card => {
            const text = card.getAttribute('data-name');
            card.style.display = (text && text.toLowerCase().indexOf(filter) > -1) ? '' : 'none';
        });
    });
}

// ---------- 12. DYNAMIC CONTENT LOADER (Education page) ----------
function resolvePath(relativePath) {
    if (relativePath.startsWith('/') || relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
        return relativePath;
    }
    let path = window.location.pathname;
    const lastSlash = path.lastIndexOf('/');
    if (lastSlash !== -1) {
        const lastSegment = path.substring(lastSlash + 1);
        if (lastSegment.includes('.')) {
            path = path.substring(0, lastSlash + 1);
        } else if (!path.endsWith('/')) {
            path += '/';
        }
    } else {
        path = '/';
    }
    if (!path.endsWith('/')) path += '/';
    return (path + relativePath).replace(/\/{2,}/g, '/');
}

function initDynamicLoader() {
    const dynamicLinks = document.querySelectorAll('.dynamic-link');
    const contentWrapper = document.getElementById('dynamic-content');
    if (!contentWrapper) return;

    dynamicLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const rawUrl = this.getAttribute('data-src') || this.getAttribute('href');
            if (!rawUrl) return;
            const url = resolvePath(rawUrl);
            contentWrapper.innerHTML = '<div class="text-center p-5"><i class="fas fa-spinner fa-spin fa-3x text-emerald"></i><p class="mt-3 text-muted">Loading knowledge...</p></div>';
            fetch(url)
                .then(response => {
                    if (!response.ok) throw new Error('Network response was not ok');
                    return response.text();
                })
                .then(html => {
                    contentWrapper.innerHTML = html;
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    document.querySelectorAll('.book-item').forEach(a => a.classList.remove('active'));
                    this.classList.add('active');
                    init99NamesSearch();
                })
                .catch(error => {
                    console.error('Error loading article:', error);
                    contentWrapper.innerHTML = `
                        <div class="alert alert-danger text-center p-5">
                            <i class="fas fa-exclamation-circle fa-3x mb-3"></i>
                            <h4>Failed to load article</h4>
                            <p>Please ensure you are running this website on a local server (e.g., VS Code Live Server) rather than opening the file directly.</p>
                            <small class="text-muted">Error: ${error.message}</small>
                        </div>`;
                });
        });
    });
}

// ---------- 13. SHARED HELPERS ----------
function copyToClipboard(btn, encodedText) {
    const text = decodeURIComponent(encodedText);
    navigator.clipboard.writeText(text).then(() => {
        const icon = btn.querySelector('i');
        const originalClass = icon.className;
        icon.className = 'fas fa-check';
        setTimeout(() => {
            icon.className = originalClass;
        }, 2000);
    }).catch(err => console.error('Failed to copy: ', err));
}

async function shareVerse(encodedArabic, encodedTrans) {
    const arabic = decodeURIComponent(encodedArabic);
    const trans = decodeURIComponent(encodedTrans);
    const shareData = {
        title: 'Quran Verse',
        text: `${arabic}\n\n${trans}`,
        url: window.location.href
    };
    try {
        if (navigator.share) await navigator.share(shareData);
        else {
            copyToClipboard({querySelector: () => {}}, encodeURIComponent(shareData.text));
            alert('Verse copied to clipboard!');
        }
    } catch (err) { console.log('Error sharing:', err); }
}

// ---------- 14. INITIALIZATION ----------
document.addEventListener("DOMContentLoaded", () => {
    // Core features
    updateClock();
    getPrayerTimes();
    calculateQibla();
    loadDailyWisdom();

    // Quran page
    fetchSurahList();
    const surahSearchInput = document.getElementById('surahSearch');
    if (surahSearchInput) {
        surahSearchInput.addEventListener('input', applyQuranFilters);
    }

    // Hadith page – only run renderBookList and attach filter if on hadith.html
    const isHadithPage = window.location.pathname.includes("hadith.html");
    if (isHadithPage) {
        renderBookList(allBooks);
        const bookSearchInput = document.getElementById('bookSearch');
        if (bookSearchInput) {
            bookSearchInput.addEventListener('input', applyHadithFilters);
        }
    } else {
        // For Education page (and others), attach a simple filter for static .book-item elements
        const bookSearchInput = document.getElementById('bookSearch');
        if (bookSearchInput) {
            bookSearchInput.addEventListener('input', function() {
                const term = this.value.toLowerCase();
                const items = document.querySelectorAll('.book-item');
                items.forEach(item => {
                    const title = item.querySelector('h6')?.innerText.toLowerCase() || '';
                    const desc = item.querySelector('small')?.innerText.toLowerCase() || '';
                    item.style.display = (title.includes(term) || desc.includes(term)) ? 'flex' : 'none';
                });
            });
        }
    }

    // Connect page – daily Hadith widget
    fetchDailyHadith();

    // Education page – dynamic article loader
    initDynamicLoader();

    // Auto-load article if URL has ?article=...
    const urlParams = new URLSearchParams(window.location.search);
    const articleToLoad = urlParams.get('article');
    if (articleToLoad) {
        const targetLink = document.querySelector(`.dynamic-link[data-src="${articleToLoad}.html"]`);
        if (targetLink) {
            targetLink.click();
        }
    }

    // Navbar scroll effect
    window.addEventListener('scroll', function() {
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            if (window.scrollY > 50) {
                navbar.style.padding = "0.3rem 0";
                navbar.style.backgroundColor = "rgba(0, 191, 255, 0.98)";
            } else {
                navbar.style.padding = "0.5rem 0";
                navbar.style.backgroundColor = "rgba(0, 191, 255, 0.95)";
            }
        }
    });
});