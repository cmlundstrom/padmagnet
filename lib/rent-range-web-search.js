/**
 * Rent-Range Tool — Web Search Pipeline
 *
 * Uses Brave Search API for supplemental rental market data.
 * Standalone — no PadMagnet app dependencies.
 */

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const BRAVE_SEARCH_URL = 'https://api.search.brave.com/res/v1/web/search';

// Source quality tiers
const SOURCE_QUALITY = {
  high: ['costar.com', 'cbre.com', 'marcusmillichap.com', 'zillow.com/research',
    'apartmentlist.com/research', 'rentcafe.com/average-rent-market-trends',
    'redfin.com/news', 'nar.realtor', 'freddiemac.com'],
  medium: ['zillow.com', 'realtor.com', 'redfin.com', 'apartments.com',
    'rentcafe.com', 'zumper.com', 'hotpads.com', 'rent.com',
    'apartmentlist.com', 'noradarealestate.com'],
  low: ['craigslist.org', 'facebook.com', 'reddit.com', 'quora.com',
    'apartmenthomeliving.com'],
};

/**
 * Run the full web search pipeline for a property.
 *
 * @param {Object} subject - { city, county, state, zip, beds, propertySubType, subdivision }
 * @returns {Object} { webComps, marketData, sources }
 */
export async function runWebSearchPipeline(subject) {
  if (!BRAVE_API_KEY) {
    console.warn('BRAVE_API_KEY not set — skipping web search');
    return { webComps: [], marketData: {}, sources: [] };
  }

  const year = new Date().getFullYear();
  const month = new Date().toLocaleString('en-US', { month: 'long' });
  const searches = buildSearchQueries(subject, year, month);

  const allResults = [];
  const allSources = [];

  for (const search of searches) {
    try {
      const results = await braveSearch(search.query);
      const scored = results.map(r => ({
        ...r,
        qualityScore: scoreSourceQuality(r.url),
        searchType: search.type,
      })).filter(r => r.qualityScore > 0); // drop blocked sources

      allResults.push(...scored);
      allSources.push(...scored.map(r => ({
        url: r.url,
        title: r.title,
        quality_score: r.qualityScore,
        type: search.type,
      })));
    } catch (err) {
      console.error(`Web search failed for "${search.query}":`, err.message);
    }
  }

  // Extract rental data from search results
  const webComps = extractRentalComps(allResults, subject);
  const marketData = extractMarketData(allResults);

  return { webComps, marketData, sources: deduplicateSources(allSources) };
}

function buildSearchQueries(subject, year, month) {
  const queries = [
    {
      type: 'market_context',
      query: `${subject.county || subject.city} FL rental market report ${year}`,
    },
    {
      type: 'asking_rents',
      query: `${subject.city} FL ${subject.beds} bedroom ${normalizeType(subject.propertySubType)} for rent`,
    },
    {
      type: 'trends',
      query: `${subject.zip} rental prices trends ${year}`,
    },
    {
      type: 'hyperlocal',
      query: `${subject.subdivision || subject.city} ${subject.city} FL rentals ${month} ${year}`,
    },
  ];

  // Property-type specific searches
  const type = normalizeType(subject.propertySubType);
  if (['duplex', 'triplex', 'quadplex'].includes(type)) {
    queries.push({
      type: 'property_specific',
      query: `${subject.county || subject.city} FL ${type} rental rates ${year}`,
    });
  } else if (subject.gated || subject.subdivision) {
    queries.push({
      type: 'property_specific',
      query: `${subject.subdivision || ''} ${subject.city} FL homes for rent`,
    });
  }

  return queries;
}

async function braveSearch(query) {
  const params = new URLSearchParams({
    q: query,
    count: '10',
    freshness: 'py', // past year
  });

  const res = await fetch(`${BRAVE_SEARCH_URL}?${params}`, {
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': BRAVE_API_KEY,
    },
  });

  if (!res.ok) {
    throw new Error(`Brave API ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  return (data.web?.results || []).slice(0, 5).map(r => ({
    title: r.title,
    url: r.url,
    description: r.description || '',
    age: r.age || '',
  }));
}

function scoreSourceQuality(url) {
  if (!url) return 0;
  const domain = url.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').split('/')[0];

  // Block low-quality sources
  for (const d of SOURCE_QUALITY.low) {
    if (domain.includes(d)) return 0;
  }

  // High quality
  for (const d of SOURCE_QUALITY.high) {
    if (url.toLowerCase().includes(d)) return 90;
  }

  // Medium quality
  for (const d of SOURCE_QUALITY.medium) {
    if (domain.includes(d)) return 60;
  }

  // Unknown — moderate default
  return 30;
}

function extractRentalComps(results, subject) {
  const comps = [];

  for (const result of results) {
    // Extract rent prices from descriptions/titles
    const priceMatches = [...(result.description || '').matchAll(/\$([0-9,]+)\s*(?:\/mo|per month|monthly|\/month|a month)/gi)];
    const titleMatches = [...(result.title || '').matchAll(/\$([0-9,]+)/g)];

    for (const match of [...priceMatches, ...titleMatches]) {
      const rent = parseInt(match[1].replace(/,/g, ''), 10);
      if (rent >= 500 && rent <= 50000) { // sanity check
        comps.push({
          rent,
          source_url: result.url,
          source_title: result.title,
          quality_score: result.qualityScore,
          search_type: result.searchType,
          _source: 'web',
          _score: Math.round(result.qualityScore * 0.4), // base score from quality
        });
      }
    }
  }

  // Deduplicate by rent value (keep highest quality)
  const seen = new Map();
  for (const comp of comps) {
    const key = comp.rent;
    if (!seen.has(key) || seen.get(key).quality_score < comp.quality_score) {
      seen.set(key, comp);
    }
  }

  return [...seen.values()].slice(0, 10);
}

function extractMarketData(results) {
  const data = {
    medianRents: [],
    vacancyRates: [],
    trendDirections: [],
    yoyChanges: [],
    keyDrivers: [],
  };

  for (const result of results) {
    const text = `${result.title} ${result.description}`.toLowerCase();

    // Extract YoY changes
    const yoyMatch = text.match(/([+-]?\d+\.?\d*)\s*%\s*(?:yoy|year.over.year|year over year|annually)/i);
    if (yoyMatch) {
      data.yoyChanges.push(parseFloat(yoyMatch[1]));
    }

    // Extract vacancy rates
    const vacMatch = text.match(/(\d+\.?\d*)\s*%\s*vacancy/i);
    if (vacMatch) {
      data.vacancyRates.push(parseFloat(vacMatch[1]));
    }

    // Detect trend direction
    if (/rents?\s+(rising|increasing|growing|climbing|surging)/i.test(text)) {
      data.trendDirections.push('rising');
    } else if (/rents?\s+(falling|declining|dropping|decreasing)/i.test(text)) {
      data.trendDirections.push('declining');
    }

    // Key drivers
    if (/new supply|new construction|new units/i.test(text)) data.keyDrivers.push('New supply entering market');
    if (/migration|population growth|relocat/i.test(text)) data.keyDrivers.push('Population growth/migration');
    if (/job growth|employment/i.test(text)) data.keyDrivers.push('Job growth');
    if (/insurance|regulation|policy/i.test(text)) data.keyDrivers.push('Insurance/regulation changes');
  }

  // Synthesize
  const avgYoy = data.yoyChanges.length > 0
    ? data.yoyChanges.reduce((s, v) => s + v, 0) / data.yoyChanges.length
    : null;

  const trendVotes = data.trendDirections.reduce((acc, d) => { acc[d] = (acc[d] || 0) + 1; return acc; }, {});
  const trend = Object.entries(trendVotes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'stable';

  return {
    trend: { direction: trend, magnitude: avgYoy ? Math.abs(avgYoy) : 0, yoyPct: avgYoy },
    vacancy: data.vacancyRates.length > 0 ? data.vacancyRates.reduce((s, v) => s + v, 0) / data.vacancyRates.length : null,
    keyDrivers: [...new Set(data.keyDrivers)].slice(0, 4),
  };
}

function deduplicateSources(sources) {
  const seen = new Set();
  return sources.filter(s => {
    if (seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });
}

function normalizeType(type) {
  if (!type) return 'home';
  const t = type.toLowerCase();
  if (t.includes('single family')) return 'house';
  if (t.includes('condo')) return 'condo';
  if (t.includes('townhouse') || t.includes('townhome')) return 'townhouse';
  if (t.includes('duplex')) return 'duplex';
  if (t.includes('triplex')) return 'triplex';
  if (t.includes('quad')) return 'quadplex';
  return 'home';
}
