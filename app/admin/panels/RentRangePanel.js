'use client';

import { COLORS } from '../shared';

export default function RentRangePanel() {
  return (
    <div>
      <div style={{
        background: COLORS.surface, borderRadius: '10px', border: `1px dashed ${COLORS.border}`,
        padding: 40, textAlign: 'center',
      }}>
        <div style={{ fontSize: '40px', marginBottom: 12 }}>🏷️</div>
        <h3 style={{ color: COLORS.text, margin: '0 0 8px' }}>Rent-Range Finder</h3>
        <p style={{ color: COLORS.textDim, fontSize: '14px', maxWidth: 500, margin: '0 auto', lineHeight: 1.6 }}>
          Coming soon. This tool will help admins analyze competitive rent pricing across South Florida markets.
        </p>
      </div>
    </div>
  );
}
