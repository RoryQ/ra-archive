let rawData = [];
let index = null;
let currentFilter = 'all';
let filteredData = [];
let itemsToShow = 50;
const PAGE_SIZE = 50;
let loadingMore = false;

const searchInput = document.getElementById('search-input');
const resultsList = document.getElementById('results-list');
const resultsInfo = document.getElementById('results-info');
const loading = document.getElementById('loading');
const mainUI = document.getElementById('main-ui');
const filterBtns = document.querySelectorAll('.filter-btn');
const floatingCounter = document.getElementById('floating-counter');
const currentCountText = document.getElementById('current-count');
const totalCountText = document.getElementById('total-count');
const progressBarFill = document.getElementById('progress-bar-fill');

function updateCounter() {
    const total = filteredData.length;
    const shown = Math.min(itemsToShow, total);
    resultsInfo.innerText = total === 0 ? "No results found." : `Showing ${shown.toLocaleString()} of ${total.toLocaleString()} items.`;
    
    if (total > 0) {
        floatingCounter.classList.remove('hidden');
        totalCountText.innerText = total.toLocaleString();
    } else {
        floatingCounter.classList.add('hidden');
    }
    updateFloatingCounter();
}

function updateFloatingCounter() {
    const total = filteredData.length;
    if (total === 0) return;
    
    const scrollHeight = document.body.offsetHeight - window.innerHeight;
    const scrollPos = window.scrollY;
    const progress = scrollHeight > 0 ? Math.max(0, Math.min(100, (scrollPos / scrollHeight) * 100)) : 100;
    
    let currentIdx = 1;

    if (scrollPos >= scrollHeight - 10) {
        currentIdx = total;
    } else {
        const items = resultsList.querySelectorAll('.result-item');
        const headerHeight = mainUI.offsetHeight;
        
        for (let i = 0; i < items.length; i++) {
            if (items[i].getBoundingClientRect().top >= headerHeight - 20) {
                currentIdx = i + 1;
                break;
            }
            // Fallback: if we're past the item, keep track of it
            currentIdx = i + 1;
        }
    }
    
    currentCountText.innerText = currentIdx.toLocaleString();
    progressBarFill.style.height = `${progress}%`;
}

async function init() {
    try {
        const response = await fetch('data.json');
        const packed = await response.json();
        
        const labels = packed.l;
        const types = packed.t;
        const platforms = packed.p;

        rawData = packed.i.map(item => ({
            artist: item[0],
            title: item[1],
            desc: item[2],
            url: 'https://ra.co' + item[3],
            year: item[4],
            label: item[5] === -1 ? "" : labels[item[5]],
            releaseType: item[6] === -1 ? "" : types[item[6]],
            recommended: item[7] === 1,
            links: item[8].map(l => ({ platform: platforms[l[0]], url: l[1] }))
        }));
        
        index = new FlexSearch.Document({
            document: {
                id: "id",
                index: ["title", "artist", "desc", "label", "year", "releaseType"],
                store: false
            },
            tokenize: "forward",
            cache: true
        });

        for (let i = 0; i < rawData.length; i++) {
            index.add({ id: i, ...rawData[i] });
        }

        loading.classList.add('hidden');
        mainUI.classList.remove('hidden');
        filteredData = rawData;
        itemsToShow = PAGE_SIZE;
        renderResults(filteredData.slice(0, itemsToShow));
        updateCounter();
        setupListeners();
    } catch (e) {
        loading.innerText = "Error loading archive.";
        console.error(e);
    }
}

function setupListeners() {
    let lastScrollY = window.scrollY;
    window.addEventListener('scroll', () => {
        const currentScrollY = window.scrollY;
        if (currentScrollY > 50) mainUI.classList.add('compact');
        else mainUI.classList.remove('compact');

        if (currentScrollY > lastScrollY && currentScrollY > 100) mainUI.classList.add('header-hidden');
        else mainUI.classList.remove('header-hidden');
        lastScrollY = currentScrollY;

        // Infinite scroll
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 1000) {
            loadMore();
        }
        updateFloatingCounter();
    });

    searchInput.addEventListener('input', (e) => performSearch(e.target.value));

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.type;
            performSearch(searchInput.value);
        });
    });

    // Delegate player clicks
    resultsList.addEventListener('click', (e) => {
        const btn = e.target.closest('.play-btn');
        if (btn) {
            const url = btn.dataset.url;
            const container = btn.closest('.result-item').querySelector('.player-container');
            const platform = btn.dataset.platform;
            
            let height = 120;
            let finalUrl = url;

            if (platform === 'Spotify') {
                height = 80;
            } else if (platform === 'Bandcamp') {
                // Force size=small for bandcamp
                finalUrl = url.replace('size=large', 'size=small');
                height = 120;
            } else if (platform === 'SoundCloud') {
                height = 120;
            } else if (platform === 'Apple Music') {
                height = 150;
            } else if (platform === 'YouTube') {
                height = 315;
            }

            container.insertAdjacentHTML('beforeend', `<iframe src="${finalUrl}" height="${height}" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>`);
            container.classList.remove('hidden');
            btn.remove();
        }
    });
}

function loadMore() {
    if (loadingMore || itemsToShow >= filteredData.length) return;
    loadingMore = true;
    
    const nextSet = filteredData.slice(itemsToShow, itemsToShow + PAGE_SIZE);
    itemsToShow += PAGE_SIZE;
    renderResults(nextSet, true);
    updateCounter();
    
    loadingMore = false;
}

function isEmbed(url) {
    return url.includes('EmbeddedPlayer') || url.includes('open.spotify.com/embed') || url.includes('w.soundcloud.com/player') || url.includes('embed.music.apple.com') || url.includes('youtube.com/embed');
}

function performSearch(query) {
    let results = [];
    if (!query.trim()) {
        results = rawData;
    } else {
        const searchResults = index.search(query, { limit: 1000 });
        const ids = new Set();
        searchResults.forEach(res => res.result.forEach(id => ids.add(id)));
        results = Array.from(ids).sort((a, b) => a - b).map(id => rawData[id]);
    }

    if (currentFilter === 'review') results = results.filter(item => item.url.includes('/reviews/'));
    else if (currentFilter === 'list') results = results.filter(item => !item.url.includes('/reviews/'));
    else if (currentFilter === 'recommended') results = results.filter(item => item.recommended);

    filteredData = results;
    itemsToShow = PAGE_SIZE;
    renderResults(filteredData.slice(0, itemsToShow));
    updateCounter();
}

function renderResults(items, append = false) {
    if (items.length === 0 && !append) {
        resultsList.innerHTML = '<div class="result-item">No results found.</div>';
        return;
    }

    const html = items.map(item => {
        const embedLinks = item.links.filter(l => isEmbed(l.url));
        const otherLinks = item.links.filter(l => !isEmbed(l.url));

        return `
            <div class="result-item">
                <div class="result-meta">
                    <span class="tag">${item.releaseType || 'Article'}</span>
                    <span>${item.year}</span>
                    ${item.label ? `<span class="tag">${item.label}</span>` : ''}
                    ${item.recommended ? '<span class="recommended">🌟 RA RECOMMENDS</span>' : ''}
                </div>
                <h2 class="result-title"><a href="${item.url}" target="_blank">${item.artist ? item.artist + ' - ' : ''}${item.title}</a></h2>
                <div class="result-desc">${item.desc}</div>
                <div class="result-links">
                    ${embedLinks.map(l => `<button class="link-btn play-btn" data-url="${l.url}" data-platform="${l.platform}">▶ Show ${l.platform} Player</button>`).join('')}
                    ${otherLinks.map(l => `<a href="${l.url}" target="_blank" class="link-btn">${l.platform}</a>`).join('')}
                </div>
                <div class="player-container hidden"></div>
            </div>
        `;
    }).join('');

    if (append) {
        resultsList.insertAdjacentHTML('beforeend', html);
    } else {
        resultsList.innerHTML = html;
    }
}

init();
