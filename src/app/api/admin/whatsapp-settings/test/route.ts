import { NextResponse } from 'next/server';
import { sendWhatsAppTest } from '@/lib/whatsapp';
import { PERMISSIONS } from '@/lib/permissions';
import { getAuthUser } from '@/lib/serverAuth';

async function canSend() {
  const auth = await getAuthUser();
  if (!auth) return false;
  if (auth.role === 'ADMIN') return true;
  return auth.permissions.includes(PERMISSIONS.MANAGE_WHATSAPP);
}

export async function POST(req: Request) {
  if (!(await canSend())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const to = String(body.to || '').trim();
    const message = String(body.message || '').trim();
    const result = await sendWhatsAppTest({ to, message });
    if (!result.ok) {
      return NextResponse.json({ success: false, ...result }, { status: 400 });
    }
    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to send test' }, { status: 500 });
  }
}
