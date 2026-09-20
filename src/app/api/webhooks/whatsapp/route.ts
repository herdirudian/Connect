import { NextResponse } from 'next/server';
import { getSystemSettings } from '@/lib/systemSettings';
import { handleIncomingWhatsAppBotMessage } from '@/lib/whatsappBot';

/**
 * GET Handler: Verifikasi Webhook Meta Cloud API (Hub Verification)
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const settings = await getSystemSettings(['WA_META_VERIFY_TOKEN', 'WA_VERIFY_TOKEN']);
  const expectedToken =
    settings['WA_META_VERIFY_TOKEN'] ||
    settings['WA_VERIFY_TOKEN'] ||
    process.env.WHATSAPP_VERIFY_TOKEN ||
    'the-lodge-verify-token-2026';

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('[WhatsApp Webhook] Verification SUCCESS!');
    return new Response(challenge || '', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }

  console.warn('[WhatsApp Webhook] Verification FAILED: Invalid token or mode', { mode, token, expectedToken });
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

/**
 * POST Handler: Menerima Pesan WhatsApp Masuk dari Pelanggan (Meta Webhook / Relay CRM)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Format Meta Cloud API Standard Webhook
    if (body.object === 'whatsapp_business_account' || body.entry) {
      const entries = body.entry || [];
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value || {};
          const messages = value.messages || [];
          for (const msg of messages) {
            const from = msg.from || '';
            let text = '';

            if (msg.type === 'text') {
              text = msg.text?.body || '';
            } else if (msg.type === 'button') {
              text = msg.button?.text || msg.button?.payload || '';
            } else if (msg.type === 'interactive') {
              text =
                msg.interactive?.button_reply?.title ||
                msg.interactive?.button_reply?.id ||
                msg.interactive?.list_reply?.title ||
                msg.interactive?.list_reply?.id ||
                '';
            }

            if (from && text) {
              console.log(`[WhatsApp Webhook Meta] Received message from ${from}: "${text}"`);
              // Trigger Bot State Machine (Asynchronous)
              handleIncomingWhatsAppBotMessage(from, text).catch((err) => {
                console.error('[WhatsApp Webhook] Error in bot state machine:', err);
              });
            }
          }
        }
      }
      return NextResponse.json({ status: 'success' }, { status: 200 });
    }

    // 2. Format Relay Direct CRM (misal dari submit.thelodgegroup.id)
    const from = String(body.from || body.phone || body.to || body.sender || '').trim();
    const text = String(body.message || body.text || body.body || '').trim();

    if (from && text) {
      console.log(`[WhatsApp Webhook Relay] Received message from ${from}: "${text}"`);
      await handleIncomingWhatsAppBotMessage(from, text);
      return NextResponse.json({ status: 'success' }, { status: 200 });
    }

    return NextResponse.json({ status: 'no_processable_message' }, { status: 200 });
  } catch (error: any) {
    console.error('[WhatsApp Webhook] Error processing incoming payload:', error);
    return NextResponse.json({ error: error.message || 'Webhook processing failed' }, { status: 200 });
  }
}

