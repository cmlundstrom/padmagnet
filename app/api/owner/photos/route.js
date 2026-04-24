import { createServiceClient } from '../../../../lib/supabase';
import { getAuthUser } from '../../../../lib/auth-helpers';
import { checkRateLimit } from '../../../../lib/rate-limit';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_INPUT_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 15;
const FULL_WIDTH = 1600;
const THUMB_WIDTH = 400;
const ASPECT = 3 / 2;
const QUALITY = 80;
// Cap concurrent file processing to keep Vercel function RAM below the Hobby 1024MB ceiling
// 3 files * (16MB decoded full + 1MB thumb) ≈ ~50MB headroom, safe on Hobby tier
const CONCURRENCY = 3;

// Smart-crop to 3:2 using sharp's attention strategy. Runs full + thumb in
// parallel so the wall-clock cost per file is bounded by the slower of the two,
// not the sum. Never upscales.
async function processAt(buffer, meta, maxWidth) {
  const rotated = meta.orientation >= 5;
  const srcW = rotated ? meta.height : meta.width;
  const srcH = rotated ? meta.width : meta.height;
  const w = Math.min(maxWidth, srcW, Math.floor(srcH * ASPECT));
  const h = Math.round(w / ASPECT);
  return sharp(buffer)
    .rotate()
    .resize({
      width: w,
      height: h,
      fit: 'cover',
      position: sharp.strategy.attention,
    })
    .webp({ quality: QUALITY })
    .toBuffer();
}

async function processOneFile(file, userId, supabase) {
  const rawBuffer = Buffer.from(await file.arrayBuffer());
  const meta = await sharp(rawBuffer).metadata();
  const id = randomUUID();
  const fullPath = `${userId}/${id}.webp`;
  const thumbPath = `${userId}/${id}_thumb.webp`;

  // Sharp processing for full + thumb runs concurrently — independent CPU work
  const [fullBuffer, thumbBuffer] = await Promise.all([
    processAt(rawBuffer, meta, FULL_WIDTH),
    processAt(rawBuffer, meta, THUMB_WIDTH),
  ]);

  // Storage uploads run concurrently — independent network calls
  const [fullRes, thumbRes] = await Promise.all([
    supabase.storage.from('listing-photos').upload(fullPath, fullBuffer, {
      contentType: 'image/webp',
      upsert: false,
    }),
    supabase.storage.from('listing-photos').upload(thumbPath, thumbBuffer, {
      contentType: 'image/webp',
      upsert: false,
    }),
  ]);

  if (fullRes.error) {
    throw new Error(`Upload failed: ${fullRes.error.message}`);
  }
  // Thumb failure is non-blocking; log but don't fail the request
  if (thumbRes.error) {
    console.warn('[photos] thumb upload failed:', thumbRes.error.message);
  }

  const { data: fullUrl } = supabase.storage.from('listing-photos').getPublicUrl(fullPath);
  const { data: thumbUrl } = supabase.storage.from('listing-photos').getPublicUrl(thumbPath);

  return {
    url: fullUrl.publicUrl,
    thumb_url: thumbUrl.publicUrl,
    _fullPath: fullPath,
    _thumbPath: thumbPath,
  };
}

// Bounded-concurrency parallel map — processes up to `limit` items at a time.
async function parallelMap(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

// POST — upload photos.
// Body: multipart/form-data
//   photos[]       — image files
//   listing_id     — optional. When provided, the server atomically appends
//                    the new photos to listings.photos and returns the full
//                    updated array. Eliminates the client-side second PUT.
export async function POST(request) {
  const t0 = Date.now();
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const rl = await checkRateLimit('photos', user.id);
    if (rl.limited) {
      return NextResponse.json({ error: 'Upload limit reached. Please try again later.' }, { status: 429, headers: rl.headers });
    }

    const formData = await request.formData();
    const files = formData.getAll('photos');
    const listingId = formData.get('listing_id') || null;

    if (!files.length) {
      return NextResponse.json({ error: 'No photos provided' }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `Maximum ${MAX_FILES} photos allowed` }, { status: 400 });
    }
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP` }, { status: 400 });
      }
      if (file.size > MAX_INPUT_SIZE) {
        return NextResponse.json({ error: `File too large (max 10MB): ${file.name}` }, { status: 400 });
      }
    }

    const supabase = createServiceClient();

    // Process files in parallel with bounded concurrency
    const processed = await parallelMap(files, CONCURRENCY, (f) => processOneFile(f, user.id, supabase));
    const tUploads = Date.now();

    // If a listing_id is provided, atomically append to listings.photos so the
    // client doesn't need a second roundtrip. Verify ownership first; on failure
    // remove the freshly-uploaded files so we don't leave orphans.
    if (listingId) {
      const { data: existing, error: fetchErr } = await supabase
        .from('listings')
        .select('photos, owner_user_id, source')
        .eq('id', listingId)
        .single();

      const authorized = !fetchErr && existing && existing.source === 'owner' && existing.owner_user_id === user.id;
      if (!authorized) {
        // Clean up orphans from the storage uploads we just made
        const paths = processed.flatMap(p => [p._fullPath, p._thumbPath]);
        await supabase.storage.from('listing-photos').remove(paths).catch(() => {});
        return NextResponse.json({ error: 'Not authorized for this listing' }, { status: 403 });
      }

      const currentPhotos = existing.photos || [];
      const newPhotos = processed.map((p, i) => ({
        url: p.url,
        thumb_url: p.thumb_url,
        caption: '',
        order: currentPhotos.length + i,
      }));
      const updatedPhotos = [...currentPhotos, ...newPhotos];

      const { error: updateErr } = await supabase
        .from('listings')
        .update({ photos: updatedPhotos })
        .eq('id', listingId);

      if (updateErr) {
        const paths = processed.flatMap(p => [p._fullPath, p._thumbPath]);
        await supabase.storage.from('listing-photos').remove(paths).catch(() => {});
        return NextResponse.json({ error: `Listing update failed: ${updateErr.message}` }, { status: 500 });
      }

      return NextResponse.json(
        { uploaded: newPhotos, photos: updatedPhotos },
        {
          status: 201,
          headers: {
            'Server-Timing': `uploads;dur=${tUploads - t0}, total;dur=${Date.now() - t0}`,
          },
        }
      );
    }

    // Legacy mode (no listing_id): return the array of uploaded photos.
    // Preserved for callers like mobile/app/owner/create.js that don't have a
    // listing row yet and stage photos in client-side draft state.
    const legacyResponse = processed.map((p, i) => ({
      url: p.url,
      thumb_url: p.thumb_url,
      order: i,
    }));
    return NextResponse.json(legacyResponse, {
      status: 201,
      headers: {
        'Server-Timing': `uploads;dur=${tUploads - t0}, total;dur=${Date.now() - t0}`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — remove photos from Supabase Storage (full + thumbnail)
export async function DELETE(request) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const { urls } = await request.json();
    if (!urls?.length) {
      return NextResponse.json({ error: 'No URLs provided' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const bucket = 'listing-photos';

    const paths = [];
    for (const url of urls) {
      const match = url.match(/listing-photos\/(.+)$/);
      if (match) {
        paths.push(match[1]);
        const thumbPath = match[1].replace('.webp', '_thumb.webp');
        if (thumbPath !== match[1]) paths.push(thumbPath);
      }
    }

    if (!paths.length) {
      return NextResponse.json({ error: 'No valid paths found' }, { status: 400 });
    }

    const unauthorized = paths.filter(p => !p.startsWith(user.id + '/'));
    if (unauthorized.length > 0) {
      return NextResponse.json({ error: 'Cannot delete photos you do not own' }, { status: 403 });
    }

    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ deleted: paths.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
