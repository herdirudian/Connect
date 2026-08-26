import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token || !verifyToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const originalName = file.name.replace(/\.[^/.]+$/, "");
    const sanitizedName = originalName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const filename = `${sanitizedName}-${uniqueSuffix}${path.extname(file.name)}`;
    
    // Save to public/uploads/avatars
    const uploadDir = path.join(process.cwd(), 'public/uploads/avatars');
    
    // Ensure directory exists
    try {
        await require('fs/promises').mkdir(uploadDir, { recursive: true });
    } catch (error) {
        console.error('Error creating directory:', error);
    }
    
    const filepath = path.join(uploadDir, filename);
    
    await writeFile(filepath, buffer);
    
    const fileUrl = `/uploads/avatars/${filename}`;

    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
