import { createServiceClient } from '../../../../lib/supabase';
import { getAuthUser } from '../../../../lib/auth-helpers';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 10;

// POST — upload photos to Supabase Storage
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

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File too large (max 5MB): ${file.name}` },
          { status: 400 }
        );
      }

      const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1];
      const fileName = `${user.id}/${randomUUID()}.${ext}`;

      const buffer = Buffer.from(await file.arrayBuffer());
      const { error: uploadError } = await supabase.storage
        .from('listing-photos')
        .upload(fileName, buffer, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
      }

      const { data: urlData } = supabase.storage
        .from('listing-photos')
        .getPublicUrl(fileName);

      uploaded.push({
        url: urlData.publicUrl,
        order: i,
      });
    }

    return NextResponse.json(uploaded, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — remove photos from Supabase Storage
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
    const paths = urls.map(url => {
      const match = url.match(/listing-photos\/(.+)$/);
      return match ? match[1] : null;
    }).filter(Boolean);

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
