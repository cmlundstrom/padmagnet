import { createServiceClient } from '../../../../lib/supabase';
import { getAuthUser } from '../../../../lib/auth-helpers';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60s for sharp processing + upload

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_INPUT_SIZE = 10 * 1024 * 1024; // 10MB raw input (we compress server-side)
const MAX_FILES = 15;
const FULL_WIDTH = 1600;   // Max width for full-size photos
const THUMB_WIDTH = 400;   // Thumbnail width for grid/card views
const QUALITY = 80;        // WebP quality (visually indistinguishable from original)

/**
 * Process a raw image buffer through sharp:
 * 1. Strip EXIF/GPS metadata (privacy)
 * 2. Auto-rotate based on EXIF orientation
 * 3. Resize to max width (preserving aspect ratio)
 * 4. Convert to WebP (40-60% smaller than JPEG)
 */
async function processImage(buffer, maxWidth) {
  return sharp(buffer)
    .rotate()                          // Auto-rotate from EXIF orientation
    .resize(maxWidth, null, {          // Resize width, auto-height
      fit: 'inside',                   // Never upscale, preserve aspect ratio
      withoutEnlargement: true,
    })
    .webp({ quality: QUALITY })        // Convert to WebP
    .toBuffer();
}

// POST — upload photos to Supabase Storage (with sharp processing)
export async function POST(request) {
  try {
    const { user, error: authError, status } = await getAuthUser(request);
    if (authError) {
      return NextResponse.json({ error: authError }, { status });
    }

    const formData = await request.formData();
    const files = formData.getAll('photos');

    if (!files.length) {
      return NextResponse.json({ error: 'No photos provided' }, { status: 400 });
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `Maximum ${MAX_FILES} photos allowed` }, { status: 400 });
    }

    const supabase = createServiceClient();
    const uploaded = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP` },
          { status: 400 }
        );
      }

      if (file.size > MAX_INPUT_SIZE) {
        return NextResponse.json(
          { error: `File too large (max 10MB): ${file.name}` },
          { status: 400 }
        );
      }

      const rawBuffer = Buffer.from(await file.arrayBuffer());
      const id = randomUUID();

      // Process full-size image
      const fullBuffer = await processImage(rawBuffer, FULL_WIDTH);
      const fullPath = `${user.id}/${id}.webp`;

      const { error: fullError } = await supabase.storage
        .from('listing-photos')
        .upload(fullPath, fullBuffer, {
          contentType: 'image/webp',
          upsert: false,
        });

      if (fullError) {
        return NextResponse.json({ error: `Upload failed: ${fullError.message}` }, { status: 500 });
      }

      // Process thumbnail
      const thumbBuffer = await processImage(rawBuffer, THUMB_WIDTH);
      const thumbPath = `${user.id}/${id}_thumb.webp`;

      await supabase.storage
        .from('listing-photos')
        .upload(thumbPath, thumbBuffer, {
          contentType: 'image/webp',
          upsert: false,
        }).catch(() => {}); // Thumbnail failure is non-blocking

      const { data: urlData } = supabase.storage
        .from('listing-photos')
        .getPublicUrl(fullPath);

      const { data: thumbUrlData } = supabase.storage
        .from('listing-photos')
        .getPublicUrl(thumbPath);

      uploaded.push({
        url: urlData.publicUrl,
        thumb_url: thumbUrlData.publicUrl,
        order: i,
      });
    }

    return NextResponse.json(uploaded, { status: 201 });
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

    // Extract file paths from URLs (path after bucket name)
    const paths = [];
    for (const url of urls) {
      const match = url.match(/listing-photos\/(.+)$/);
      if (match) {
        paths.push(match[1]);
        // Also delete the thumbnail if it exists
        const thumbPath = match[1].replace('.webp', '_thumb.webp');
        if (thumbPath !== match[1]) paths.push(thumbPath);
      }
    }

    if (!paths.length) {
      return NextResponse.json({ error: 'No valid paths found' }, { status: 400 });
    }

    // Verify all paths belong to this user
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
