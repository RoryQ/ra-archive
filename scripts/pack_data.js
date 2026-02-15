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

const allItems = [];

bestOfData.forEach(article => {
    const dateObj = new Date(article.date);
    const dateNum = parseInt(dateObj.toISOString().slice(0, 10).replace(/-/g, ''));
    article.items.forEach(item => {
        allItems.push({
            dNum: dateNum,
            p: [
                item.artist || "",
                item.title || item.text || "",
                item.description || "",
                (item.url || article.url).replace('https://ra.co', ''),
                dateObj.getFullYear(),
                getLabelId(item.label),
                0, // ty: list
                0  // r: false
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
            review.blurb || "",
            review.contentUrl.replace('https://ra.co', ''),
            dateObj.getFullYear(),
            -1,
            1, // ty: review
            review.recommended ? 1 : 0
        ]
    });
});

allItems.sort((a, b) => b.dNum - a.dNum);

const finalData = {
    l: labels,
    i: allItems.map(x => x.p)
};

fs.writeFileSync('data.json', JSON.stringify(finalData));
console.log(`Packed and sorted ${allItems.length} items into data.json`);
