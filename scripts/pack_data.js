const fs = require('fs');

const bestOfData = JSON.parse(fs.readFileSync('data/archive_full_v2.json', 'utf8'));
const reviewsData = JSON.parse(fs.readFileSync('data/reviews_archive_unique.json', 'utf8'));

const labels = [];
const labelMap = {};
function getLabelId(l) {
    if (!l) return -1;
    if (!(l in labelMap)) {
        labelMap[l] = labels.length;
        labels.push(l);
    }
    return labelMap[l];
}

const types = [];
const typeMap = {};
function getTypeId(t) {
    if (!t) return -1;
    if (!(t in typeMap)) {
        typeMap[t] = types.length;
        types.push(t);
    }
    return typeMap[t];
}

const platforms = ['Bandcamp', 'Spotify', 'Apple Music', 'SoundCloud', 'YouTube'];
const platformMap = { 'Bandcamp': 0, 'Spotify': 1, 'Apple Music': 2, 'SoundCloud': 3, 'YouTube': 4 };

const formatPlayerLinks = (links) => {
    if (!links) return [];
    return links.map(l => {
        const name = l.audioService.name;
        const id = l.sourceId;
        if (name.includes('Bandcamp')) return [0, name.includes('Album') ? `https://bandcamp.com/EmbeddedPlayer/album=${id}` : `https://bandcamp.com/EmbeddedPlayer/track=${id}`];
        if (name.includes('Spotify')) return [1, `https://open.spotify.com/embed/album/${id}`];
        if (name.includes('SoundCloud')) return [3, `https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/${id}`];
        return null;
    }).filter(Boolean);
};

const allItems = [];

bestOfData.forEach(article => {
    const dateObj = new Date(article.date);
    const dateNum = parseInt(dateObj.toISOString().slice(0, 10).replace(/-/g, ''));
    article.items.forEach(item => {
        const itemLinks = (item.links || []).map(l => [platformMap[l.p], l.u]);
        allItems.push({
            dNum: dateNum,
            p: [
                item.artist || "",
                item.title || item.text || "",
                item.description || "",
                (item.url || article.url).replace('https://ra.co', ''),
                dateObj.getFullYear(),
                getLabelId(item.label),
                getTypeId(item.type || 'List Item'),
                0,
                itemLinks
            ]
        });
    });
});

reviewsData.forEach(review => {
    const dateObj = new Date(review.date);
    const dateNum = parseInt(dateObj.toISOString().slice(0, 10).replace(/-/g, ''));
    allItems.push({
        dNum: dateNum,
        p: [
            "", 
            review.title,
            review.content || review.blurb || "",
            review.contentUrl.replace('https://ra.co', ''),
            dateObj.getFullYear(),
            getLabelId(review.label),
            getTypeId(review.type),
            review.recommended ? 1 : 0,
            formatPlayerLinks(review.playerLinks)
        ]
    });
});

allItems.sort((a, b) => b.dNum - a.dNum);

const finalData = {
    l: labels,
    t: types,
    p: platforms,
    i: allItems.map(x => x.p)
};

fs.writeFileSync('data.json', JSON.stringify(finalData));
console.log(`Packed and sorted ${allItems.length} items into data.json`);
