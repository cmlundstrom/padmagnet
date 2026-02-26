'use client';

import { useState } from 'react';

export default function ConfirmDialog({ message, showReason, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
        <p className="confirm-message">{message}</p>
        {showReason && (
          <textarea
            className="confirm-reason"
            placeholder="Reason (optional)…"
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
          />
        )}
        <div className="confirm-actions">
          <button className="confirm-btn cancel" onClick={onCancel}>Cancel</button>
          <button className="confirm-btn confirm" onClick={() => onConfirm(reason)}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
