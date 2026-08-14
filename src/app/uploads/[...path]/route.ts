import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Simple MIME type map to avoid external dependencies
const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: rawPathSegments } = await params;
    const pathSegments = rawPathSegments.map(segment => decodeURIComponent(segment));
    
    // Construct the file path
    const publicUploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
    const filePath = path.resolve(publicUploadsDir, ...pathSegments);

    // Logging for debugging
    const logMsg = `[${new Date().toISOString()}] Request: ${rawPathSegments.join('/')} -> Resolved: ${filePath}\n`;
    try {
        fs.appendFileSync(path.join(process.cwd(), 'uploads-debug.log'), logMsg);
    } catch (e) {}

    // Security check: Ensure we don't traverse up
    if (!filePath.startsWith(publicUploadsDir)) {
        return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    if (!fs.existsSync(filePath)) {
      // Fallback: check without 'public' if it's already in the path or something weird
      if (!fs.existsSync(filePath)) {
          return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
    }

    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
