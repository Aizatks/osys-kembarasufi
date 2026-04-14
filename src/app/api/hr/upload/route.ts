import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractTokenFromHeader, verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const payload = verifyToken(token);
    if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'hr-uploads';

    if (!file) {
      return NextResponse.json({ error: 'Tiada fail dipilih' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Jenis fail tidak dibenarkan. Sila guna JPG, PNG, GIF, WebP atau PDF.' }, { status: 400 });
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Saiz fail melebihi 10MB' }, { status: 400 });
    }

    const ext = file.name.split('.').pop();
    const fileName = `${folder}/${payload.userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from('hr-files')
      .upload(fileName, buffer, { contentType: file.type, upsert: true });

    if (uploadError) {
      // Try creating bucket if it doesn't exist
      try {
        await supabaseAdmin.storage.createBucket('hr-files', { public: true });
        const { error: retryError } = await supabaseAdmin.storage
          .from('hr-files')
          .upload(fileName, buffer, { contentType: file.type, upsert: true });
        if (retryError) throw retryError;
      } catch (bucketErr) {
        console.error('Upload error:', uploadError, bucketErr);
        return NextResponse.json({ error: 'Gagal upload fail' }, { status: 500 });
      }
    }

    const { data: urlData } = supabaseAdmin.storage
      .from('hr-files')
      .getPublicUrl(fileName);

    return NextResponse.json({ url: urlData.publicUrl, fileName });
  } catch (error: any) {
    console.error('HR upload error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
