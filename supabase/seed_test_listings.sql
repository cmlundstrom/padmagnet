-- Test listings for PadMagnet development
-- Run in Supabase SQL Editor to populate swipe cards
-- DELETE these before going live: DELETE FROM listings WHERE listing_key LIKE 'TEST-%';

INSERT INTO listings (
  listing_key, listing_id, source, street_number, street_name,
  city, state_or_province, postal_code, county,
  latitude, longitude,
  property_type, property_sub_type, list_price,
  bedrooms_total, bathrooms_total, living_area, year_built,
  pets_allowed, furnished, hoa_fee,
  listing_agent_name, listing_office_name,
  photos, is_active
) VALUES
(
  'TEST-001', 'PM-10001', 'mls', '100', 'SE Ocean Blvd',
  'Stuart', 'FL', '34994', 'Martin',
  27.1975, -80.2528,
  'Residential Lease', 'Condo', 2200.00,
  2, 2, 1100, 2018,
  true, false, 350.00,
  'Jane Smith', 'Treasure Coast Realty',
  '[{"url":"https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800","caption":"Living Room","order":0},{"url":"https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800","caption":"Kitchen","order":1}]',
  true
),
(
  'TEST-002', 'PM-10002', 'mls', '450', 'SW Bayshore Blvd',
  'Port Saint Lucie', 'FL', '34983', 'St. Lucie',
  27.2939, -80.3503,
  'Residential Lease', 'Single Family', 2800.00,
  3, 2, 1650, 2005,
  true, false, 0.00,
  'Mike Johnson', 'PSL Homes',
  '[{"url":"https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800","caption":"Front","order":0},{"url":"https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800","caption":"Bathroom","order":1}]',
  true
),
(
  'TEST-003', 'PM-10003', 'mls', '77', 'NE Jensen Beach Blvd',
  'Jensen Beach', 'FL', '34957', 'Martin',
  27.2545, -80.2290,
  'Residential Lease', 'Townhouse', 1900.00,
  2, 2.5, 1350, 2015,
  false, false, 275.00,
  'Lisa Park', 'Coastal Living Realty',
  '[{"url":"https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800","caption":"Exterior","order":0},{"url":"https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800","caption":"Interior","order":1}]',
  true
),
(
  'TEST-004', 'PM-10004', 'mls', '312', 'SE Dixie Hwy',
  'Stuart', 'FL', '34994', 'Martin',
  27.1890, -80.2445,
  'Residential Lease', 'Single Family', 3500.00,
  4, 3, 2200, 1998,
  true, true, 0.00,
  'Tom Rivera', 'Stuart Real Estate Group',
  '[{"url":"https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800","caption":"Pool","order":0},{"url":"https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800","caption":"Backyard","order":1}]',
  true
),
(
  'TEST-005', 'PM-10005', 'mls', '55', 'Bridge Rd',
  'Hobe Sound', 'FL', '33455', 'Martin',
  27.0594, -80.1363,
  'Residential Lease', 'Condo', 1600.00,
  1, 1, 750, 2020,
  false, true, 400.00,
  'Sara Williams', 'Hobe Sound Properties',
  '[{"url":"https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800","caption":"Studio","order":0},{"url":"https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800","caption":"View","order":1}]',
  true
),
(
  'TEST-006', 'PM-10006', 'mls', '201', 'SW Martin Downs Blvd',
  'Palm City', 'FL', '34990', 'Martin',
  27.1681, -80.2878,
  'Residential Lease', 'Single Family', 3200.00,
  3, 2.5, 1900, 2010,
  true, false, 150.00,
  'David Chen', 'Palm City Realty',
  '[{"url":"https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800","caption":"Front","order":0},{"url":"https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800","caption":"Kitchen","order":1}]',
  true
),
(
  'TEST-007', 'PM-10007', 'mls', '800', 'Orange Ave',
  'Fort Pierce', 'FL', '34950', 'St. Lucie',
  27.4467, -80.3256,
  'Residential Lease', 'Condo', 1400.00,
  2, 1, 900, 2001,
  true, false, 200.00,
  'Karen Brown', 'Fort Pierce Homes',
  '[{"url":"https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=800","caption":"Living","order":0}]',
  true
),
(
  'TEST-008', 'PM-10008', 'mls', '1500', 'SW Tradition Pkwy',
  'Tradition', 'FL', '34987', 'St. Lucie',
  27.2100, -80.4100,
  'Residential Lease', 'Townhouse', 2500.00,
  3, 2.5, 1700, 2022,
  true, false, 125.00,
  'Alex Turner', 'Tradition Living',
  '[{"url":"https://images.unsplash.com/photo-1600585153490-76fb20a32601?w=800","caption":"Modern","order":0},{"url":"https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800","caption":"Bedroom","order":1}]',
  true
);
