/**
 * Static service-area data for PadMagnet's 5-county South Florida coverage.
 * Add entries here when expanding to new areas — no API or DB changes needed.
 */

const SERVICE_AREA_CITIES = [
  // ── St. Lucie County ──────────────────────────────────────────────
  { name: 'Fort Pierce', county: 'St. Lucie', lat: 27.4467, lng: -80.3256, zips: ['34946', '34947', '34948', '34949', '34950', '34951', '34982'] },
  { name: 'Port St. Lucie', county: 'St. Lucie', lat: 27.2730, lng: -80.3582, zips: ['34952', '34953', '34983', '34984', '34986', '34987', '34988'] },
  { name: 'Tradition', county: 'St. Lucie', lat: 27.3050, lng: -80.4700, zips: ['34987'] },
  { name: 'St. Lucie West', county: 'St. Lucie', lat: 27.2800, lng: -80.4200, zips: ['34986'] },
  { name: 'Lakewood Park', county: 'St. Lucie', lat: 27.5433, lng: -80.3822, zips: ['34951'] },
  { name: 'White City', county: 'St. Lucie', lat: 27.3756, lng: -80.3320, zips: ['34957'] },
  { name: 'Hutchinson Island', county: 'St. Lucie', lat: 27.3500, lng: -80.2200, zips: ['34949'] },

  // ── Martin County ─────────────────────────────────────────────────
  { name: 'Stuart', county: 'Martin', lat: 27.1975, lng: -80.2528, zips: ['34994', '34995', '34996', '34997'] },
  { name: 'Jensen Beach', county: 'Martin', lat: 27.2547, lng: -80.2297, zips: ['34957'] },
  { name: 'Palm City', county: 'Martin', lat: 27.1686, lng: -80.2739, zips: ['34990', '34991'] },
  { name: 'Hobe Sound', county: 'Martin', lat: 27.0597, lng: -80.1364, zips: ['33455'] },
  { name: 'Indiantown', county: 'Martin', lat: 27.0267, lng: -80.4856, zips: ['34956'] },
  { name: 'Sewall\'s Point', county: 'Martin', lat: 27.1953, lng: -80.2042, zips: ['34996'] },
  { name: 'Jupiter Island', county: 'Martin', lat: 27.0461, lng: -80.1003, zips: ['33455'] },
  { name: 'Ocean Breeze', county: 'Martin', lat: 27.2522, lng: -80.2264, zips: ['34957'] },
  { name: 'Port Salerno', county: 'Martin', lat: 27.1439, lng: -80.1836, zips: ['34992'] },
  { name: 'Rio', county: 'Martin', lat: 27.1747, lng: -80.2272, zips: ['34994'] },

  // ── Palm Beach County ─────────────────────────────────────────────
  { name: 'West Palm Beach', county: 'Palm Beach', lat: 26.7153, lng: -80.0534, zips: ['33401', '33402', '33403', '33404', '33405', '33406', '33407', '33409', '33410', '33411', '33412', '33413', '33414', '33415', '33416', '33417'] },
  { name: 'Boca Raton', county: 'Palm Beach', lat: 26.3683, lng: -80.1289, zips: ['33427', '33428', '33429', '33431', '33432', '33433', '33434', '33486', '33487', '33496', '33497', '33498', '33499'] },
  { name: 'Delray Beach', county: 'Palm Beach', lat: 26.4615, lng: -80.0728, zips: ['33444', '33445', '33446', '33447', '33448', '33482', '33483', '33484'] },
  { name: 'Boynton Beach', county: 'Palm Beach', lat: 26.5254, lng: -80.0661, zips: ['33424', '33425', '33426', '33435', '33436', '33437', '33472', '33473', '33474'] },
  { name: 'Jupiter', county: 'Palm Beach', lat: 26.9342, lng: -80.0942, zips: ['33458', '33468', '33469', '33477', '33478'] },
  { name: 'Palm Beach Gardens', county: 'Palm Beach', lat: 26.8234, lng: -80.1387, zips: ['33408', '33410', '33418', '33420'] },
  { name: 'Lake Worth Beach', county: 'Palm Beach', lat: 26.6168, lng: -80.0567, zips: ['33449', '33460', '33461', '33462', '33463', '33467'] },
  { name: 'Royal Palm Beach', county: 'Palm Beach', lat: 26.7084, lng: -80.2306, zips: ['33411', '33414'] },
  { name: 'Wellington', county: 'Palm Beach', lat: 26.6587, lng: -80.2414, zips: ['33414', '33449'] },
  { name: 'Greenacres', county: 'Palm Beach', lat: 26.6276, lng: -80.1251, zips: ['33413', '33415', '33454', '33463', '33467'] },
  { name: 'Riviera Beach', county: 'Palm Beach', lat: 26.7753, lng: -80.0581, zips: ['33403', '33404', '33407', '33419'] },
  { name: 'Palm Beach', county: 'Palm Beach', lat: 26.7056, lng: -80.0364, zips: ['33480'] },
  { name: 'Lantana', county: 'Palm Beach', lat: 26.5865, lng: -80.0517, zips: ['33462'] },
  { name: 'Tequesta', county: 'Palm Beach', lat: 26.9692, lng: -80.1078, zips: ['33469'] },
  { name: 'North Palm Beach', county: 'Palm Beach', lat: 26.8176, lng: -80.0817, zips: ['33408', '33410'] },
  { name: 'Juno Beach', county: 'Palm Beach', lat: 26.8795, lng: -80.0534, zips: ['33408'] },
  { name: 'Palm Springs', county: 'Palm Beach', lat: 26.6359, lng: -80.0961, zips: ['33406', '33461'] },
  { name: 'Loxahatchee', county: 'Palm Beach', lat: 26.6832, lng: -80.3428, zips: ['33470'] },
  { name: 'Belle Glade', county: 'Palm Beach', lat: 26.6845, lng: -80.6676, zips: ['33430'] },
  { name: 'Pahokee', county: 'Palm Beach', lat: 26.8201, lng: -80.6649, zips: ['33476'] },
  { name: 'South Bay', county: 'Palm Beach', lat: 26.6653, lng: -80.7173, zips: ['33493'] },
  { name: 'Glen Ridge', county: 'Palm Beach', lat: 26.5068, lng: -80.0942, zips: ['33435'] },
  { name: 'Highland Beach', county: 'Palm Beach', lat: 26.3999, lng: -80.0656, zips: ['33487'] },
  { name: 'Gulf Stream', county: 'Palm Beach', lat: 26.4063, lng: -80.0622, zips: ['33483'] },
  { name: 'Manalapan', county: 'Palm Beach', lat: 26.5635, lng: -80.0444, zips: ['33462'] },

  // ── Broward County ────────────────────────────────────────────────
  { name: 'Fort Lauderdale', county: 'Broward', lat: 26.1224, lng: -80.1373, zips: ['33301', '33304', '33305', '33306', '33308', '33309', '33310', '33311', '33312', '33313', '33314', '33315', '33316', '33334'] },
  { name: 'Hollywood', county: 'Broward', lat: 26.0112, lng: -80.1495, zips: ['33019', '33020', '33021', '33022', '33023', '33024', '33025', '33026', '33027', '33029'] },
  { name: 'Pembroke Pines', county: 'Broward', lat: 26.0128, lng: -80.2241, zips: ['33023', '33024', '33025', '33026', '33027', '33028', '33029', '33082', '33084'] },
  { name: 'Coral Springs', county: 'Broward', lat: 26.2712, lng: -80.2706, zips: ['33065', '33067', '33071', '33073', '33075', '33076', '33077'] },
  { name: 'Miramar', county: 'Broward', lat: 25.9860, lng: -80.2322, zips: ['33023', '33025', '33027', '33029'] },
  { name: 'Pompano Beach', county: 'Broward', lat: 26.2379, lng: -80.1248, zips: ['33060', '33061', '33062', '33063', '33064', '33066', '33067', '33068', '33069', '33072', '33073', '33074', '33075', '33076', '33077'] },
  { name: 'Davie', county: 'Broward', lat: 26.0765, lng: -80.2331, zips: ['33024', '33314', '33317', '33324', '33325', '33326', '33328', '33329', '33330', '33331'] },
  { name: 'Plantation', county: 'Broward', lat: 26.1276, lng: -80.2331, zips: ['33313', '33317', '33322', '33323', '33324', '33325', '33388'] },
  { name: 'Sunrise', county: 'Broward', lat: 26.1670, lng: -80.2562, zips: ['33313', '33321', '33322', '33323', '33325', '33345', '33351'] },
  { name: 'Deerfield Beach', county: 'Broward', lat: 26.3184, lng: -80.0998, zips: ['33441', '33442', '33443'] },
  { name: 'Lauderhill', county: 'Broward', lat: 26.1403, lng: -80.2134, zips: ['33309', '33311', '33313', '33319', '33321', '33351'] },
  { name: 'Tamarac', county: 'Broward', lat: 26.2129, lng: -80.2498, zips: ['33309', '33319', '33320', '33321', '33351'] },
  { name: 'Weston', county: 'Broward', lat: 26.1004, lng: -80.3998, zips: ['33326', '33327', '33331', '33332'] },
  { name: 'Margate', county: 'Broward', lat: 26.2445, lng: -80.2064, zips: ['33063', '33068', '33093'] },
  { name: 'Coconut Creek', county: 'Broward', lat: 26.2517, lng: -80.1789, zips: ['33063', '33066', '33073', '33097'] },
  { name: 'Oakland Park', county: 'Broward', lat: 26.1723, lng: -80.1320, zips: ['33304', '33306', '33309', '33311', '33334'] },
  { name: 'North Lauderdale', county: 'Broward', lat: 26.2173, lng: -80.2259, zips: ['33068', '33319'] },
  { name: 'Lauderdale Lakes', county: 'Broward', lat: 26.1665, lng: -80.2056, zips: ['33309', '33311', '33313', '33319'] },
  { name: 'Hallandale Beach', county: 'Broward', lat: 25.9813, lng: -80.1484, zips: ['33008', '33009'] },
  { name: 'Cooper City', county: 'Broward', lat: 26.0573, lng: -80.2717, zips: ['33024', '33026', '33328', '33330'] },
  { name: 'Lighthouse Point', county: 'Broward', lat: 26.2756, lng: -80.0873, zips: ['33064'] },
  { name: 'Wilton Manors', county: 'Broward', lat: 26.1595, lng: -80.1392, zips: ['33305', '33311', '33334'] },
  { name: 'Parkland', county: 'Broward', lat: 26.3109, lng: -80.2373, zips: ['33067', '33073', '33076'] },
  { name: 'Southwest Ranches', county: 'Broward', lat: 26.0573, lng: -80.3406, zips: ['33325', '33330', '33331', '33332'] },
  { name: 'Dania Beach', county: 'Broward', lat: 26.0565, lng: -80.1437, zips: ['33004', '33312', '33314'] },
  { name: 'Lauderdale-By-The-Sea', county: 'Broward', lat: 26.1920, lng: -80.0964, zips: ['33062', '33308'] },

  // ── Miami-Dade County ─────────────────────────────────────────────
  { name: 'Miami', county: 'Miami-Dade', lat: 25.7617, lng: -80.1918, zips: ['33125', '33126', '33127', '33128', '33129', '33130', '33131', '33132', '33133', '33134', '33135', '33136', '33137', '33138', '33142', '33143', '33144', '33145', '33146', '33147', '33150', '33155', '33156', '33157', '33158', '33161', '33162', '33165', '33166', '33167', '33168', '33169', '33170', '33172', '33173', '33174', '33175', '33176', '33177', '33178', '33179', '33180', '33181', '33182', '33183', '33184', '33185', '33186', '33187', '33189', '33190', '33193', '33194', '33196', '33197', '33199'] },
  { name: 'Miami Beach', county: 'Miami-Dade', lat: 25.7907, lng: -80.1300, zips: ['33109', '33139', '33140', '33141', '33154'] },
  { name: 'Hialeah', county: 'Miami-Dade', lat: 25.8576, lng: -80.2781, zips: ['33010', '33011', '33012', '33013', '33014', '33015', '33016', '33018'] },
  { name: 'Coral Gables', county: 'Miami-Dade', lat: 25.7215, lng: -80.2684, zips: ['33114', '33124', '33133', '33134', '33143', '33146', '33156', '33158'] },
  { name: 'Homestead', county: 'Miami-Dade', lat: 25.4687, lng: -80.4776, zips: ['33030', '33031', '33032', '33033', '33034', '33035', '33039'] },
  { name: 'North Miami', county: 'Miami-Dade', lat: 25.8901, lng: -80.1867, zips: ['33161', '33162', '33167', '33168', '33169', '33181'] },
  { name: 'North Miami Beach', county: 'Miami-Dade', lat: 25.9331, lng: -80.1625, zips: ['33160', '33162', '33169', '33179', '33180', '33181'] },
  { name: 'Doral', county: 'Miami-Dade', lat: 25.8195, lng: -80.3553, zips: ['33122', '33166', '33172', '33178'] },
  { name: 'Kendall', county: 'Miami-Dade', lat: 25.6795, lng: -80.3117, zips: ['33156', '33176', '33183', '33186', '33193', '33196'] },
  { name: 'Aventura', county: 'Miami-Dade', lat: 25.9564, lng: -80.1392, zips: ['33160', '33180'] },
  { name: 'Miami Gardens', county: 'Miami-Dade', lat: 25.9420, lng: -80.2456, zips: ['33054', '33055', '33056', '33169', '33179'] },
  { name: 'Cutler Bay', county: 'Miami-Dade', lat: 25.5808, lng: -80.3467, zips: ['33157', '33170', '33189', '33190'] },
  { name: 'Miami Lakes', county: 'Miami-Dade', lat: 25.9087, lng: -80.3084, zips: ['33014', '33015', '33016', '33018'] },
  { name: 'Palmetto Bay', county: 'Miami-Dade', lat: 25.6215, lng: -80.3228, zips: ['33157', '33158', '33176'] },
  { name: 'Sunny Isles Beach', county: 'Miami-Dade', lat: 25.9507, lng: -80.1228, zips: ['33160'] },
  { name: 'Pinecrest', county: 'Miami-Dade', lat: 25.6648, lng: -80.3081, zips: ['33143', '33156', '33158'] },
  { name: 'Key Biscayne', county: 'Miami-Dade', lat: 25.6938, lng: -80.1626, zips: ['33149'] },
  { name: 'South Miami', county: 'Miami-Dade', lat: 25.7076, lng: -80.2934, zips: ['33143', '33155', '33156'] },
  { name: 'Surfside', county: 'Miami-Dade', lat: 25.8785, lng: -80.1256, zips: ['33154'] },
  { name: 'Bal Harbour', county: 'Miami-Dade', lat: 25.8913, lng: -80.1273, zips: ['33154'] },
  { name: 'Bay Harbor Islands', county: 'Miami-Dade', lat: 25.8879, lng: -80.1323, zips: ['33154'] },
  { name: 'Opa-locka', county: 'Miami-Dade', lat: 25.9023, lng: -80.2498, zips: ['33054', '33055', '33056'] },
  { name: 'Hialeah Gardens', county: 'Miami-Dade', lat: 25.8648, lng: -80.3242, zips: ['33016', '33018'] },
  { name: 'Sweetwater', county: 'Miami-Dade', lat: 25.7631, lng: -80.3731, zips: ['33144', '33165', '33172', '33174', '33182', '33184'] },
  { name: 'Florida City', county: 'Miami-Dade', lat: 25.4479, lng: -80.4795, zips: ['33034'] },
  { name: 'Medley', county: 'Miami-Dade', lat: 25.8610, lng: -80.3406, zips: ['33166', '33178'] },
  { name: 'Westchester', county: 'Miami-Dade', lat: 25.7550, lng: -80.3270, zips: ['33144', '33155', '33165', '33174'] },
  { name: 'The Hammocks', county: 'Miami-Dade', lat: 25.6715, lng: -80.4448, zips: ['33177', '33196'] },
  { name: 'Tamiami', county: 'Miami-Dade', lat: 25.7579, lng: -80.3984, zips: ['33165', '33175', '33184', '33185'] },
  { name: 'Country Walk', county: 'Miami-Dade', lat: 25.6332, lng: -80.4367, zips: ['33177', '33196'] },
  { name: 'Richmond West', county: 'Miami-Dade', lat: 25.6115, lng: -80.4295, zips: ['33177', '33196'] },
];

/**
 * Search service-area cities by name or zip prefix.
 * @param {string} text - Search query (city name or zip code)
 * @returns {Array<{name: string, county: string, lat: number, lng: number}>} Up to 8 matches
 */
export function searchServiceAreas(text) {
  const q = text.trim().toLowerCase();
  if (q.length < 2) return [];

  const matches = SERVICE_AREA_CITIES.filter(city =>
    city.name.toLowerCase().startsWith(q) ||
    city.zips.some(zip => zip.startsWith(q))
  );

  return matches.slice(0, 8).map(({ name, county, lat, lng }) => ({
    name, county, lat, lng,
  }));
}

/**
 * Find the nearest cities to a GPS coordinate.
 * @param {number} lat - Device latitude
 * @param {number} lng - Device longitude
 * @param {number} count - Number of cities to return (default 4)
 * @returns {Array<{name: string, county: string, lat: number, lng: number}>}
 */
export function getNearestCities(lat, lng, count = 4) {
  if (!lat || !lng) return [];

  const withDist = SERVICE_AREA_CITIES.map(city => {
    const dLat = city.lat - lat;
    const dLng = city.lng - lng;
    return { ...city, dist: dLat * dLat + dLng * dLng };
  });

  withDist.sort((a, b) => a.dist - b.dist);

  return withDist.slice(0, count).map(({ name, county, lat, lng }) => ({
    name, county, lat, lng,
  }));
}

export default SERVICE_AREA_CITIES;
