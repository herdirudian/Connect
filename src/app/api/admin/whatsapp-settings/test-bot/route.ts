import { NextResponse } from 'next/server';
import { handleIncomingWhatsAppBotMessage } from '@/lib/whatsappBot';
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
    const phone = String(body.phone || body.to || '').trim();
    const message = String(body.message || 'Beli Tiket').trim();

    if (!phone) return NextResponse.json({ error: 'Nomor WhatsApp tujuan wajib diisi' }, { status: 400 });

    console.log(`[Test Bot Admin] Triggering WhatsApp bot for ${phone} with message: "${message}"`);
    await handleIncomingWhatsAppBotMessage(phone, message);

    return NextResponse.json({ success: true, message: `Bot WhatsApp dipicu untuk nomor ${phone} dengan pesan "${message}". Cek pesan di WhatsApp Anda.` });
  } catch (e: any) {
    console.error('[Test Bot Admin] Error:', e);
    return NextResponse.json({ error: e.message || 'Gagal memicu bot WhatsApp' }, { status: 500 });
  }
}

