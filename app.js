let rawData = [];
let index = null;
let currentFilter = 'all';

const searchInput = document.getElementById('search-input');
const resultsList = document.getElementById('results-list');
const resultsInfo = document.getElementById('results-info');
const loading = document.getElementById('loading');
const mainUI = document.getElementById('main-ui');
const filterBtns = document.querySelectorAll('.filter-btn');

async function init() {
    try {
        const response = await fetch('data.json');
        const packed = await response.json();
        
        const labels = packed.l;
        rawData = packed.i.map(item => ({
            artist: item[0],
            title: item[1],
            desc: item[2],
            url: 'https://ra.co' + item[3],
            year: item[4],
            label: item[5] === -1 ? "" : labels[item[5]],
            type: item[6] === 1 ? 'review' : 'list',
            recommended: item[7] === 1
        }));
        
        index = new FlexSearch.Document({
            document: {
                id: "id",
                index: ["title", "artist", "desc", "label", "year"],
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
        renderResults(rawData.slice(0, 50));
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

    if (currentFilter === 'review') results = results.filter(item => item.type === 'review');
    else if (currentFilter === 'list') results = results.filter(item => item.type === 'list');
    else if (currentFilter === 'recommended') results = results.filter(item => item.recommended);

    resultsInfo.innerText = `Found ${results.length} items.`;
    renderResults(results.slice(0, 100));
}

function renderResults(items) {
    if (items.length === 0) {
        resultsList.innerHTML = '<div class="result-item">No results found.</div>';
        return;
    }

    resultsList.innerHTML = items.map(item => `
        <div class="result-item">
            <div class="result-meta">
                <span class="tag">${item.type === 'review' ? 'Review' : 'List Item'}</span>
                <span>${item.year}</span>
                ${item.label ? `<span class="tag">${item.label}</span>` : ''}
                ${item.recommended ? '<span class="recommended">🌟 RA RECOMMENDS</span>' : ''}
            </div>
            <h2 class="result-title"><a href="${item.url}" target="_blank">${item.artist ? item.artist + ' - ' : ''}${item.title}</a></h2>
            <div class="result-desc">${item.desc}</div>
        </div>
    `).join('');
}

init();
