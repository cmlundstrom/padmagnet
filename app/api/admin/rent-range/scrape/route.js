/**
 * Rent-Range Tool — County Property Appraiser Scraper
 *
 * FRAGILE: Parses HTML from county appraiser websites.
 * May break when sites redesign. May violate site Terms of Service.
 * Use manual lookup when possible.
 *
 * Currently supports: Martin County FL only.
 * Standalone — no PadMagnet app dependencies.
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/admin-auth';

export const dynamic = 'force-dynamic';

const SCRAPERS = {
  'Martin County': {
    searchUrl: 'https://www.pamartinfl.gov/app/search/real-property?format=json',
    detailUrl: 'https://www.pamartinfl.gov/app/search/view',
  },
};

// POST /api/admin/rent-range/scrape — fetch property data from county appraiser
export async function POST(request) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { county, address, appraiserUrl } = await request.json();

    if (!county || !SCRAPERS[county]) {
      return NextResponse.json({ error: `Scraper not available for ${county || 'unknown county'}` }, { status: 400 });
    }

    const scraper = SCRAPERS[county];

    // Strategy 1: If we have a direct appraiser URL with AIN, search by AIN to get full data
    if (appraiserUrl) {
      const ainMatch = appraiserUrl.match(/\/view\/(\d+)/);
      if (ainMatch) {
        const ain = ainMatch[1];
        // Search by AIN to get the JSON record (has address, value, subdivision)
        const searchRes = await fetch(`${scraper.searchUrl}&search=${ain}&limit=1&offset=0`);
        const searchData = searchRes.ok ? await searchRes.json() : { records: [] };
        const property = searchData.records?.[0];

        const detail = await fetchPropertyDetail(scraper.detailUrl, ain);

        if (property) {
          const parsed = parseAddress(property);
          return NextResponse.json({
            ...detail,
            address: parsed.streetAddress,
            city: parsed.city,
            state: 'FL',
            zip: parsed.zip,
            county: county,
            lat: property.YCoordinates ? parseFloat(property.YCoordinates) : null,
            lng: property.XCoordinates ? parseFloat(property.XCoordinates) : null,
            marketValue: property.TotalMarketValue,
            assessedValue: property.AssessedValue,
            landValue: property.LandMarketValue,
            improvementValue: property.ImprovementMarketValue,
            subdivision: property.Subdivision || detail.subdivision,
            neighborhood: property.NeighborhoodName,
            useClass: property.PropertyUseClass,
            legalDescription: property.LegalDescription,
            acres: property.LegalAcres,
            owner: property.PrimaryOwner,
            ain: property.AIN,
            pin: property.PIN,
            appraiserUrl: `${scraper.detailUrl}/${ain}`,
          });
        }
        // Fallback: just detail page data
        return NextResponse.json({ ...detail, appraiserUrl: `${scraper.detailUrl}/${ain}` });
      }
    }

    // Strategy 2: Search by address
    if (!address) {
      return NextResponse.json({ error: 'address or appraiserUrl with AIN required' }, { status: 400 });
    }

    // Search the appraiser JSON API
    const searchResults = await searchProperty(scraper.searchUrl, address);

    if (searchResults.length === 0) {
      return NextResponse.json({ error: 'No properties found matching that address' }, { status: 404 });
    }

    // If multiple results, return them for user selection
    if (searchResults.length > 1) {
      return NextResponse.json({
        multiple: true,
        results: searchResults.map(r => ({
          ain: r.AIN,
          address: r.SitusAddress,
          city: r.SitusCity,
          owner: r.PrimaryOwner,
          useClass: r.PropertyUseClass,
          marketValue: r.TotalMarketValue,
          subdivision: r.Subdivision,
        })),
      });
    }

    // Single result — fetch full detail
    const property = searchResults[0];
    const detail = await fetchPropertyDetail(scraper.detailUrl, property.AIN);

    // Merge search data (value, subdivision, address) with detail data (beds, baths, sqft)
    const parsed = parseAddress(property);
    return NextResponse.json({
      ...detail,
      // Address fields
      address: parsed.streetAddress,
      city: parsed.city,
      state: 'FL',
      zip: parsed.zip,
      county: county,
      lat: property.YCoordinates ? parseFloat(property.YCoordinates) : null,
      lng: property.XCoordinates ? parseFloat(property.XCoordinates) : null,
      // Property data
      marketValue: property.TotalMarketValue,
      assessedValue: property.AssessedValue,
      landValue: property.LandMarketValue,
      improvementValue: property.ImprovementMarketValue,
      subdivision: property.Subdivision || detail.subdivision,
      neighborhood: property.NeighborhoodName,
      useClass: property.PropertyUseClass,
      legalDescription: property.LegalDescription,
      acres: property.LegalAcres,
      owner: property.PrimaryOwner,
      ain: property.AIN,
      pin: property.PIN,
      appraiserUrl: `${scraper.detailUrl}/${property.AIN}`,
    });
  } catch (err) {
    console.error('Appraiser scrape error:', err);
    return NextResponse.json({ error: `Scrape failed: ${err.message}` }, { status: 500 });
  }
}

async function searchProperty(searchUrl, address) {
  // Clean address for search — remove FL, zip, etc.
  const cleanAddress = address
    .replace(/,?\s*(FL|Florida)\s*/i, ' ')
    .replace(/\d{5}(-\d{4})?/, '')
    .trim();

  const url = `${searchUrl}&search=${encodeURIComponent(cleanAddress)}&limit=5&offset=0&searchField=SitusAddress`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Appraiser search returned ${res.status}`);
  }

  const data = await res.json();
  return data.records || [];
}

async function fetchPropertyDetail(detailUrl, ain) {
  const url = `${detailUrl}/${ain}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Appraiser detail returned ${res.status}`);
  }

  const html = await res.text();

  // Parse building data from HTML <td><strong>Label</strong>Value</td> pattern
  const extract = (label) => {
    const regex = new RegExp(`<strong>${label}</strong>([^<]+)`, 'i');
    const match = html.match(regex);
    return match ? match[1].trim() : null;
  };

  const buildingType = extract('Building Type');
  const yearBuilt = extract('Year Built');
  const bedrooms = extract('Bedrooms');
  const fullBaths = extract('Full Baths');
  const halfBaths = extract('Half Baths');
  const finishedArea = extract('Finished Area');
  const numberOfUnits = extract('Number of Units');

  // Parse sqft — remove commas and "SF" suffix
  const sqft = finishedArea ? parseInt(finishedArea.replace(/[^0-9]/g, ''), 10) || null : null;

  // Map building type to our property sub-types
  const propertySubType = mapBuildingType(buildingType, numberOfUnits);

  return {
    propertySubType,
    beds: bedrooms ? parseInt(bedrooms, 10) : null,
    baths: (fullBaths ? parseInt(fullBaths, 10) : 0) + (halfBaths ? parseInt(halfBaths, 10) * 0.5 : 0) || null,
    sqft,
    yearBuilt: yearBuilt ? parseInt(yearBuilt, 10) : null,
    numberOfUnits: numberOfUnits ? parseInt(numberOfUnits, 10) : 1,
    buildingType,
    subdivision: null, // comes from search results, not detail page
  };
}

function parseAddress(property) {
  // SitusAddress: "966 SW MAGNOLIA BLUFF DR PALM CITY FL"
  // SitusCity: "PALM CITY"
  // MailCityStateZip: "PALM CITY FL 34990"
  const situs = property.SitusAddress || '';
  const city = property.SitusCity || '';
  const mailCSZ = property.MailCityStateZip || '';

  // Extract zip from MailCityStateZip (e.g., "PALM CITY FL 34990")
  const zipMatch = mailCSZ.match(/(\d{5}(-\d{4})?)\s*$/);
  const zip = zipMatch ? zipMatch[1] : '';

  // Street address = SitusAddress minus city and state
  let streetAddress = situs;
  if (city) {
    const cityIdx = streetAddress.toUpperCase().lastIndexOf(city.toUpperCase());
    if (cityIdx > 0) streetAddress = streetAddress.substring(0, cityIdx).trim();
  }
  // Remove trailing FL if present
  streetAddress = streetAddress.replace(/\s+FL\s*$/i, '').trim();

  // Title case the street address and city
  const titleCase = (s) => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

  return {
    streetAddress: titleCase(streetAddress),
    city: titleCase(city),
    zip,
  };
}

function mapBuildingType(type, units) {
  if (!type) return null;
  const t = type.toLowerCase();
  const unitCount = units ? parseInt(units, 10) : 1;

  if (t.includes('single family') || t.includes('residential')) {
    if (unitCount >= 4) return 'Quadruplex';
    if (unitCount === 3) return 'Triplex';
    if (unitCount === 2) return 'Duplex';
    return 'Single Family Residence';
  }
  if (t.includes('condo')) return 'Condominium';
  if (t.includes('townhouse') || t.includes('townhome')) return 'Townhouse';
  if (t.includes('duplex') || unitCount === 2) return 'Duplex';
  if (t.includes('triplex') || unitCount === 3) return 'Triplex';
  if (t.includes('quad') || unitCount >= 4) return 'Quadruplex';
  if (t.includes('apartment') || t.includes('multi')) return 'Condominium';
  return null;
}
