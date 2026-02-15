const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const { execSync } = require('child_process');

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Reusable scraper logic from our previous work
async function scrapeFeature(url, title, date) {
    console.log(`  Scraping new feature: ${title}...`);
    try {
        const response = await axios.get(url, { headers: { 'User-Agent': USER_AGENT }, timeout: 20000 });
        const $ = cheerio.load(response.data);
        const nextData = JSON.parse($('#__NEXT_DATA__').html());
        const feature = Object.values(nextData.props.apolloState).find(v => v.__typename === 'Feature');
        
        if (!feature || !feature.content) return null;

        const items = [];
        const seen = new Set();
        const addItem = (item) => {
            const key = `${item.artist}|${item.title}|${item.text}`.toLowerCase().trim();
            if (key && key !== '||' && !seen.has(key)) { items.push(item); seen.add(key); }
        };

        const parseContent = async (html, source) => {
            const c$ = cheerio.load(html);
            // EOY
            c$('.eoy__section').each((i, el) => {
                addItem({ type: 'EOY Item', artist: c$(el).find('.eoy__artist').text().trim(), title: c$(el).find('.eoy__track').text().trim(), label: c$(el).find('.eoy__label').text().trim(), description: c$(el).find('.eoy__text').text().trim(), source });
            });
            // BM 2025
            c$('[class*="bm__entry-wrapper"], [class*="bm__section"]').each((i, el) => {
                addItem({ type: 'Best Music Item', artist: c$(el).find('[class*="artist"], [class*="label"]').first().text().trim(), title: c$(el).find('[class*="title"]').text().trim(), label: c$(el).find('[class*="label"]').last().text().trim(), description: c$(el).find('[class*="text"]').text().trim(), source });
            });
            // Poll
            c$('.poll li').each((i, el) => {
                const h2 = c$(el).find('h2').text().trim();
                const h4 = c$(el).find('h4').text().trim();
                if (h2) addItem({ type: 'Poll Item', text: h2, label: h4, source });
            });
        };

        await parseContent(feature.content, url);

        // Handle Lazy Loading
        const initial$ = cheerio.load(feature.content);
        const lazyFiles = [];
        initial$('[data-file]').each((i, el) => lazyFiles.push(initial$(el).attr('data-file')));
        for (const file of lazyFiles) {
            try {
                const res = await axios.get(file);
                await parseContent(res.data, file);
            } catch (e) {}
        }

        return { id: url.split('/').pop(), title, url, date, items };
    } catch (e) {
        console.error(`  Error: ${e.message}`);
        return null;
    }
}

async function updateFeatures() {
    console.log("Checking for new 'Best Of' features...");
    const existing = JSON.parse(fs.readFileSync('data/archive_full_v2.json', 'utf8'));
    const existingUrls = new Set(existing.map(f => f.url));
    
    const series = ['/features/series/bestmusic', '/features/series/poll'];
    const newOnes = [];

    for (const s of series) {
        const res = await axios.get('https://ra.co' + s, { headers: { 'User-Agent': USER_AGENT } });
        const $ = cheerio.load(res.data);
        const nextData = JSON.parse($('#__NEXT_DATA__').html());
        const features = Object.values(nextData.props.apolloState).filter(v => v.__typename === 'Feature');
        
        for (const f of features) {
            const url = 'https://ra.co' + f.contentUrl;
            if (!existingUrls.has(url) && (f.title.toLowerCase().includes('best') || f.title.toLowerCase().includes('releases of'))) {
                const scraped = await scrapeFeature(url, f.title, f.date);
                if (scraped) newOnes.push(scraped);
            }
        }
    }

    if (newOnes.length > 0) {
        console.log(`Added ${newOnes.length} new features.`);
        fs.writeFileSync('data/archive_full_v2.json', JSON.stringify([...newOnes, ...existing], null, 2));
    } else {
        console.log("No new features found.");
    }
}

async function updateReviews() {
    console.log("Checking for new reviews...");
    const existing = JSON.parse(fs.readFileSync('data/reviews_archive_unique.json', 'utf8'));
    const lastId = existing[0].id;
    const newReviews = [];
    let page = 1;
    let foundExisting = false;

    const query = `query GetReviews($page: Int, $filters: [FilterInput]) {
        listing(indices: [REVIEW], page: $page, pageSize: 20, filters: $filters, sortField: REVIEWDATE, sortOrder: DESCENDING) {
            data { ... on Review { id title date contentUrl blurb recommended } }
        }
    }`;

    while (!foundExisting && page < 10) { // Safety cap of 10 pages
        const res = await axios.post('https://ra.co/graphql', {
            query, variables: { page, filters: [{ type: "LANGUAGE", value: "ENGLISH" }] }
        }, { headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'application/json' } });

        const data = res.data.data.listing.data;
        for (const r of data) {
            if (r.id === lastId) {
                foundExisting = true;
                break;
            }
            newReviews.push(r);
        }
        if (data.length < 20) break;
        page++;
    }

    if (newReviews.length > 0) {
        console.log(`Added ${newReviews.length} new reviews.`);
        fs.writeFileSync('data/reviews_archive_unique.json', JSON.stringify([...newReviews, ...existing], null, 2));
    } else {
        console.log("No new reviews found.");
    }
}

async function run() {
    await updateFeatures();
    await updateReviews();
    console.log("Updating site data index and summaries...");
    // Run from root context
    execSync('node scripts/merge_data.js');
    execSync('node scripts/pack_data.js');
    execSync('node scripts/generate_summaries.js');
    console.log("Update complete. Ready to push to GitHub.");
}

run();
