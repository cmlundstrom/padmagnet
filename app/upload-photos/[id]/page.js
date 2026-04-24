'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createSupabaseBrowser } from '../../../lib/supabase-browser';
import styles from './upload-photos.module.css';

const MAX_FILES = 15;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
// Browser-side downscale settings. 2400px max long-edge + JPEG q85 normalizes
// any source (phone, DSLR, 20MB RAW export) to ~500KB–1.5MB before upload.
// Server pipeline still smart-crops to 3:2 @ 1600px for final storage, so
// 2400px is comfortable headroom.
const CLIENT_MAX_DIMENSION = 2400;
const CLIENT_JPEG_QUALITY = 0.85;
// Absolute safety cap — catches someone dropping a 2GB video by mistake.
// Normal photos (even 48MP DSLR RAW exports) land under this.
const ABSOLUTE_MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
// Parallel compression slots. Each concurrent compression peaks at ~source*4
// bytes of RGBA in memory; 3 keeps browser responsive on modest laptops.
const COMPRESS_CONCURRENCY = 3;

// Resize + re-encode a File in the browser.
// - Respects EXIF orientation (portrait phone photos render correctly)
// - Preserves aspect ratio, never upscales
// - Always outputs JPEG (server pipeline already converts to WebP)
async function compressImage(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const { width, height } = bitmap;
  const longEdge = Math.max(width, height);
  const scale = Math.min(1, CLIENT_MAX_DIMENSION / longEdge);
  const targetW = Math.round(width * scale);
  const targetH = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  bitmap.close();

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('canvas toBlob returned null'))),
      'image/jpeg',
      CLIENT_JPEG_QUALITY,
    );
  });

  // Rename to .jpg since we forced JPEG re-encoding
  const newName = file.name.replace(/\.(heic|heif|png|webp|tiff?)$/i, '.jpg');
  return new File([blob], newName, { type: 'image/jpeg', lastModified: Date.now() });
}

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

  // Upload files — two-stage pipeline:
  //   1. "Preparing" — browser-side downscale to 2400px JPEG q85 (in parallel,
  //      bounded by COMPRESS_CONCURRENCY). Any source size becomes ~1MB.
  //   2. "Uploading" — one-at-a-time POST to server (avoids Vercel body limit).
  // Per-file status lets the user see both phases on screen.
  const handleUpload = useCallback(async (files) => {
    const fileList = Array.from(files);
    const currentCount = photos.length;
    const remaining = MAX_FILES - currentCount;

    if (remaining <= 0) {
      alert(`Maximum ${MAX_FILES} photos allowed.`);
      return;
    }

    const toUpload = fileList.slice(0, remaining);

    // Type check + absolute-max sanity guard. No per-file size rejection —
    // the compress step handles arbitrary sizes up to the browser's own
    // memory ceiling.
    for (const file of toUpload) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        alert(`Unsupported file type: ${file.name}. Use JPEG, PNG, or WebP.`);
        return;
      }
      if (file.size > ABSOLUTE_MAX_FILE_SIZE) {
        alert(`${file.name} is ${Math.round(file.size / 1024 / 1024)}MB — that's beyond the 100MB safety limit. Please re-export at a smaller size.`);
        return;
      }
    }

    setUploading(true);
    setUploadProgress(toUpload.map(f => ({ name: f.name, stage: 'queued', done: false })));

    // ── Stage 1: compress in parallel with bounded concurrency ──
    const compressed = new Array(toUpload.length);
    let nextIndex = 0;
    const workers = Array(Math.min(COMPRESS_CONCURRENCY, toUpload.length))
      .fill(0)
      .map(async () => {
        while (true) {
          const i = nextIndex++;
          if (i >= toUpload.length) return;
          setUploadProgress(prev => prev.map((p, idx) => idx === i ? { ...p, stage: 'preparing' } : p));
          try {
            compressed[i] = await compressImage(toUpload[i]);
          } catch (err) {
            // Fall back to the original file — server pipeline still handles it,
            // just may hit size/body limits. Better than failing the batch.
            console.warn('[upload] compress failed for', toUpload[i].name, err.message);
            compressed[i] = toUpload[i];
          }
        }
      });
    await Promise.all(workers);

    // ── Stage 2: upload sequentially (Vercel body limit is per-request) ──
    const token = await getToken();
    const allUploaded = [];
    try {
      for (let i = 0; i < compressed.length; i++) {
        setUploadProgress(prev => prev.map((p, idx) => idx === i ? { ...p, stage: 'uploading' } : p));

        const formData = new FormData();
        formData.append('photos', compressed[i]);

        const res = await fetch('/api/owner/photos', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (!res.ok) {
          const text = await res.text();
          let message = 'Upload failed';
          try { message = JSON.parse(text).error || message; } catch { message = text || message; }
          throw new Error(`${toUpload[i].name}: ${message}`);
        }

        const uploaded = await res.json();
        allUploaded.push(...uploaded);
        setUploadProgress(prev => prev.map((p, idx) => idx === i ? { ...p, stage: 'done', done: true } : p));
      }

      // Append to photos array and update listing
      const newPhotos = [...photos, ...allUploaded.map((u, i) => ({
        url: u.url,
        thumb_url: u.thumb_url,
        caption: '',
        order: currentCount + i,
      }))];

      const token2 = await getToken();
      const updateRes = await fetch(`/api/owner/listings/${listingId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token2}`,
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
            <p className={styles.dropzoneText}>Drop your listing photos. We automatically prep them for mobile-fast display.</p>
            <p className={styles.dropzoneHint}>Very large photos may take a few moments to process.</p>
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
              {uploadProgress.map((item, i) => {
                const label = item.stage === 'preparing'
                  ? 'Preparing'
                  : item.stage === 'uploading'
                    ? 'Uploading'
                    : item.stage === 'queued'
                      ? 'Queued'
                      : 'Done';
                return (
                  <div key={i} className={styles.progressItem}>
                    <span className={styles.progressName}>
                      {item.name}
                      {!item.done && <span style={{ opacity: 0.6, fontSize: '0.85em', marginLeft: 8 }}>· {label}</span>}
                    </span>
                    {item.done ? (
                      <span className={styles.progressDone}>✓</span>
                    ) : (
                      <div className={styles.progressBar}>
                        <div className={styles.progressFill} />
                      </div>
                    )}
                  </div>
                );
              })}
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
