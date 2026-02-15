const fs = require('fs');

const bestOfData = JSON.parse(fs.readFileSync('data/archive_full_v2.json', 'utf8'));
const reviewsData = JSON.parse(fs.readFileSync('data/reviews_archive_unique.json', 'utf8'));

const combined = [];
const getYear = (dateStr) => {
    try { return new Date(dateStr).getFullYear().toString(); } 
    catch (e) { return "Unknown"; }
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
            ty: 'list'
        });
    });
});

reviewsData.forEach(review => {
    combined.push({
        t: review.title,
        d: review.content || review.blurb || "",
        u: `https://ra.co${review.contentUrl}`,
        y: getYear(review.date),
        l: "",
        r: !!review.recommended,
        ty: 'review'
    });
});

fs.writeFileSync('site_data.json', JSON.stringify(combined));
console.log(`Merged ${combined.length} items.`);
