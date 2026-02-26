'use client';

import { useState } from 'react';

export default function NotesEditor({ notes, tags, onSaveNotes, onSaveTags }) {
  const [localNotes, setLocalNotes] = useState(notes || '');
  const [localTags, setLocalTags] = useState(tags || []);
  const [tagInput, setTagInput] = useState('');
  const [notesDirty, setNotesDirty] = useState(false);

  const handleNotesBlur = () => {
    if (notesDirty) {
      onSaveNotes(localNotes);
      setNotesDirty(false);
    }
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !localTags.includes(tag)) {
      const newTags = [...localTags, tag];
      setLocalTags(newTags);
      onSaveTags(newTags);
    }
    setTagInput('');
  };

  const removeTag = (tag) => {
    const newTags = localTags.filter(t => t !== tag);
    setLocalTags(newTags);
    onSaveTags(newTags);
  };

  return (
    <div className="notes-editor">
      <div className="notes-section">
        <label className="notes-label">Notes</label>
        <textarea
          className="notes-textarea"
          value={localNotes}
          onChange={e => { setLocalNotes(e.target.value); setNotesDirty(true); }}
          onBlur={handleNotesBlur}
          placeholder="Add notes…"
          rows={3}
        />
      </div>
      <div className="tags-section">
        <label className="notes-label">Tags</label>
        <div className="tags-list">
          {localTags.map(tag => (
            <span key={tag} className="tag-chip">
              {tag}
              <button className="tag-remove" onClick={() => removeTag(tag)}>&times;</button>
            </span>
          ))}
          <div className="tag-input-wrap">
            <input
              className="tag-input"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              placeholder="Add tag…"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
