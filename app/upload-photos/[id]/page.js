'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createSupabaseBrowser } from '../../../lib/supabase-browser';
import styles from './upload-photos.module.css';

const MAX_FILES = 15;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (server compresses)
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function UploadPhotosPage({ params }) {
  const { id: listingId } = params;
  const supabase = createSupabaseBrowser();

  const [user, setUser] = useState(null);
  const [listing, setListing] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState([]);
  const [error, setError] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [done, setDone] = useState(false);
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  // Check auth + load listing
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('expired');
        setAuthLoading(false);
        return;
      }
      setUser(session.user);

      // Fetch listing to verify ownership + get address
      const res = await fetch(`/api/owner/listings/${listingId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        setError('not_found');
        setAuthLoading(false);
        return;
      }
      const data = await res.json();
      if (data.owner_user_id !== session.user.id) {
        setError('unauthorized');
        setAuthLoading(false);
        return;
      }
      setListing(data);
      setPhotos(data.photos || []);
      setAuthLoading(false);
    }
    init();
  }, [listingId]);

  // Get access token for API calls
  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  }, [supabase]);

  // Upload files
  const handleUpload = useCallback(async (files) => {
    const fileList = Array.from(files);
    const currentCount = photos.length;
    const remaining = MAX_FILES - currentCount;

    if (remaining <= 0) {
      alert(`Maximum ${MAX_FILES} photos allowed.`);
      return;
    }

    const toUpload = fileList.slice(0, remaining);

    // Validate
    for (const file of toUpload) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        alert(`Invalid file type: ${file.name}. Use JPEG, PNG, or WebP.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        alert(`File too large: ${file.name} (max 5MB).`);
        return;
      }
    }

    setUploading(true);
    setUploadProgress(toUpload.map(f => ({ name: f.name, progress: 0, done: false })));

    const token = await getToken();
    const formData = new FormData();
    toUpload.forEach(f => formData.append('photos', f));

    try {
      const res = await fetch('/api/owner/photos', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }

      const uploaded = await res.json();

      // Mark all as done
      setUploadProgress(prev => prev.map(p => ({ ...p, progress: 100, done: true })));

      // Append to photos array and update listing
      const newPhotos = [...photos, ...uploaded.map((u, i) => ({
        url: u.url,
        caption: '',
        order: currentCount + i,
      }))];

      const updateRes = await fetch(`/api/owner/listings/${listingId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ photos: newPhotos }),
      });

      if (!updateRes.ok) {
        throw new Error('Failed to save photos to listing');
      }

      setPhotos(newPhotos);
      setTimeout(() => setUploadProgress([]), 2000);
    } catch (err) {
      alert(err.message);
      setUploadProgress([]);
    } finally {
      setUploading(false);
    }
  }, [photos, listingId, getToken]);

  // Delete photo
  const handleDelete = useCallback(async (index) => {
    const photo = photos[index];
    const token = await getToken();

    try {
      await fetch('/api/owner/photos', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ urls: [photo.url] }),
      });
    } catch { /* best effort */ }

    const newPhotos = photos.filter((_, i) => i !== index).map((p, i) => ({ ...p, order: i }));

    const token2 = await getToken();
    await fetch(`/api/owner/listings/${listingId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token2}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ photos: newPhotos }),
    }).catch(() => {});

    setPhotos(newPhotos);
  }, [photos, listingId, getToken]);

  // Drag and drop handlers
  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files);
  };

  // Error / loading states
  if (authLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.logo}>🧲 PadMagnet</div>
          <p className={styles.loadingText}>Loading...</p>
        </div>
      </div>
    );
  }

  if (error === 'expired') {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.logo}>🧲 PadMagnet</div>
          <div className={styles.errorCard}>
            <h2>Link Expired</h2>
            <p>This upload link has expired. Open the PadMagnet app and tap &quot;Upload Photos from Computer&quot; to request a new link.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error === 'not_found' || error === 'unauthorized') {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.logo}>🧲 PadMagnet</div>
          <div className={styles.errorCard}>
            <h2>Listing Not Found</h2>
            <p>This listing doesn&apos;t exist or you don&apos;t have access to it.</p>
          </div>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.logo}>🧲 PadMagnet</div>
          <div className={styles.doneCard}>
            <h2>Photos Uploaded!</h2>
            <p>Your photos have been synced. You can close this tab and continue on your phone.</p>
          </div>
        </div>
      </div>
    );
  }

  const address = listing ? [listing.street_number, listing.street_name].filter(Boolean).join(' ') : '';
  const fullAddress = listing ? [address, listing.city, listing.state_or_province].filter(Boolean).join(', ') : '';

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.logo}>🧲 PadMagnet</div>

        <div className={styles.card}>
          <h1 className={styles.title}>Upload Photos</h1>
          {fullAddress && <p className={styles.address}>{fullAddress}</p>}
          <p className={styles.subtitle}>{photos.length} of {MAX_FILES} photos</p>

          {/* Drop zone */}
          <div
            className={`${styles.dropzone} ${dragOver ? styles.dropzoneActive : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className={styles.dropzoneIcon}>📁</div>
            <p className={styles.dropzoneText}>Drop photos here or click to select</p>
            <p className={styles.dropzoneHint}>JPEG, PNG, WebP · 5MB max per file</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className={styles.fileInput}
              onChange={(e) => handleUpload(e.target.files)}
            />
          </div>

          {/* Upload progress */}
          {uploadProgress.length > 0 && (
            <div className={styles.progressList}>
              {uploadProgress.map((item, i) => (
                <div key={i} className={styles.progressItem}>
                  <span className={styles.progressName}>{item.name}</span>
                  {item.done ? (
                    <span className={styles.progressDone}>✓</span>
                  ) : (
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Existing photos */}
          {photos.length > 0 && (
            <>
              <h3 className={styles.existingTitle}>Current Photos ({photos.length})</h3>
              <div className={styles.photoGrid}>
                {photos.map((photo, index) => (
                  <div key={index} className={styles.photoItem}>
                    <img src={photo.url} alt={`Photo ${index + 1}`} className={styles.photoImg} />
                    <button
                      className={styles.photoDelete}
                      onClick={() => handleDelete(index)}
                      title="Remove photo"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Done button */}
          <button className={styles.doneBtn} onClick={() => setDone(true)}>
            Done — Return to Mobile App
          </button>
          <p className={styles.syncNote}>Photos sync to your phone automatically.</p>
        </div>
      </div>
    </div>
  );
}
