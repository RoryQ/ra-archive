const fs = require('fs');

const bestOfData = JSON.parse(fs.readFileSync('data/archive_full_v2.json', 'utf8'));
const reviewsData = JSON.parse(fs.readFileSync('data/reviews_archive_unique.json', 'utf8'));

const combined = [];
const getYear = (dateStr) => {
    try { return new Date(dateStr).getFullYear().toString(); } 
    catch (e) { return "Unknown"; }
};

const formatPlayerLinks = (links) => {
    if (!links) return [];
    return links.map(l => {
        const name = l.audioService.name;
        const id = l.sourceId;
        if (name.includes('Bandcamp')) return { p: 'Bandcamp', u: name.includes('Album') ? `https://bandcamp.com/EmbeddedPlayer/album=${id}` : `https://bandcamp.com/EmbeddedPlayer/track=${id}` };
        if (name.includes('Spotify')) return { p: 'Spotify', u: `https://open.spotify.com/embed/album/${id}` };
        if (name.includes('SoundCloud')) return { p: 'SoundCloud', u: `https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/${id}` };
        return null;
    }).filter(Boolean);
};

bestOfData.forEach(article => {
    const year = getYear(article.date);
    article.items.forEach(item => {
        const title = item.title || item.text || "";
        const artist = item.artist || "";
        combined.push({
            t: artist ? `${artist} - ${title}` : title,
            d: item.description || "",
            u: item.url || article.url,
            y: year,
            l: item.label || "",
            r: false,
            ty: item.type || 'list',
            links: item.links || []
        });
    });
});

reviewsData.forEach(review => {
    combined.push({
        t: review.title,
        d: review.content || review.blurb || "",
        u: `https://ra.co${review.contentUrl}`,
        y: getYear(review.date),
        l: review.label || "",
        r: !!review.recommended,
        ty: review.type || 'review',
        links: formatPlayerLinks(review.playerLinks)
    });
});

fs.writeFileSync('site_data.json', JSON.stringify(combined));
console.log(`Merged ${combined.length} items.`);
