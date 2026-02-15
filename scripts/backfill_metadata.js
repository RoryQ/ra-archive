const axios = require('axios');
const fs = require('fs');

const GQL_URL = 'https://ra.co/graphql';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const QUERY = `
  query GetReview($id: ID!) {
    review(id: $id) {
      type
      playerLinks {
        sourceId
        audioService { name }
      }
    }
  }
`;

async function fetchMetadata(id) {
  try {
    const response = await axios.post(GQL_URL, {
      operationName: 'GetReview',
      query: QUERY,
      variables: { id }
    }, {
      headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'application/json' },
      timeout: 10000
    });
    return response.data.data.review;
  } catch (error) {
    return null;
  }
}

async function main() {
  const reviews = JSON.parse(fs.readFileSync('data/reviews_archive_unique.json', 'utf8'));
  const toUpdate = reviews.filter(r => !r.type);
  
  console.log(`Updating metadata (type/links) for ${toUpdate.length} reviews...`);

  for (let i = 0; i < toUpdate.length; i++) {
    const r = toUpdate[i];
    if (i % 100 === 0) {
        console.log(`  Progress: ${i}/${toUpdate.length}`);
        // Save every 100 to prevent data loss
        fs.writeFileSync('data/reviews_archive_unique.json', JSON.stringify(reviews, null, 2));
    }
    
    const meta = await fetchMetadata(r.id);
    if (meta) {
        r.type = meta.type;
        r.playerLinks = meta.playerLinks;
    }
    
    // Minimal throttle for metadata
    if (i % 20 === 0) await new Promise(r => setTimeout(r, 200));
  }

  fs.writeFileSync('data/reviews_archive_unique.json', JSON.stringify(reviews, null, 2));
  console.log("Metadata update complete.");
}

main();
