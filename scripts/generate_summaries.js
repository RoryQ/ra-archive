const fs = require('fs');

function cleanText(text) {
    if (!text) return '';
    return text.replace(/\s+/g, ' ').trim();
}

function generateBestOf() {
    const data = JSON.parse(fs.readFileSync('data/archive_full_v2.json', 'utf8'));
    let md = `# Resident Advisor Best Of Lists Archive\n\n`;
    md += `Total articles archived: ${data.length}\n`;
    md += `Total items found: ${data.reduce((sum, a) => sum + a.items.length, 0)}\n\n`;

    data.forEach(article => {
        md += `## [${article.title}](${article.url})\n`;
        md += `Date: ${article.date}\n\n`;
        if (article.items.length === 0) {
            md += `*No structured items found.*\n\n`;
        } else {
            article.items.forEach(item => {
                const artist = cleanText(item.artist || '');
                const title = cleanText(item.title || item.text || '');
                const label = cleanText(item.label || '');
                const description = cleanText(item.description || '');
                md += `### ${artist ? `**${artist}** - ` : ''}${title} ${label ? `(${label})` : ''}\n`;
                if (description) md += `> ${description}\n\n`;
                else md += `\n`;
            });
        }
    });
    fs.writeFileSync('ARCHIVE.md', md);
}

function generateReviews() {
    const unique = JSON.parse(fs.readFileSync('data/reviews_archive_unique.json', 'utf8'));
    unique.sort((a, b) => new Date(b.date) - new Date(a.date));

    let md = `# Resident Advisor Music Reviews Archive\n\n`;
    md += `Total reviews archived: ${unique.length}\n\n`;

    const byYear = {};
    unique.forEach(r => {
        const year = new Date(r.date).getFullYear();
        if (!byYear[year]) byYear[year] = [];
        byYear[year].push(r);
    });

    Object.keys(byYear).sort((a, b) => b - a).forEach(year => {
        md += `## ${year} (${byYear[year].length} reviews)\n\n`;
        byYear[year].slice(0, 50).forEach(r => {
            const date = new Date(r.date).toLocaleDateString();
            md += `- **${date}**: [${r.title}](https://ra.co${r.contentUrl}) ${r.recommended ? '🌟' : ''}\n`;
        });
        if (byYear[year].length > 50) {
            md += `\n*... and ${byYear[year].length - 50} more reviews in ${year}.*\n\n`;
        }
    });
    fs.writeFileSync('REVIEWS_ARCHIVE.md', md);
}

generateBestOf();
generateReviews();
console.log("Markdown summaries updated.");
