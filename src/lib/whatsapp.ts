import { prisma } from '@/lib/prisma';
import { getSystemSettings } from '@/lib/systemSettings';

type WhatsAppChannel = 'RESTAURANT' | 'HOUSEKEEPING';

export type WhatsAppPayload =
  | {
      to: string;
      type: 'text';
      message: string;
      name?: string;
    }
  | {
      to: string;
      type: 'template';
      templateName: string;
      languageCode?: string;
      components?: any[];
    }
  | {
      to: string;
      type: 'image' | 'document' | 'audio' | 'video';
      mediaUrl: string;
      caption?: string;
    };

type WhatsAppConfig = {
  enabled: boolean;
  url: string;
  method: string;
  apiKey: string;
  numberKey: string;
  headersJson: string;
  bodyTemplateJson: string;
  restaurantTo: string;
  housekeepingTo: string;
  timeoutMs: number;
};

const KEYS = {
  enabled: 'WA_ENABLED',
  url: 'WA_URL',
  method: 'WA_METHOD',
  apiKey: 'WA_API_KEY',
  numberKey: 'WA_NUMBER_KEY',
  headersJson: 'WA_HEADERS_JSON',
  bodyTemplateJson: 'WA_BODY_TEMPLATE_JSON',
  restaurantTo: 'WA_RESTO_TO',
  housekeepingTo: 'WA_HK_TO',
  timeoutMs: 'WA_TIMEOUT_MS',
} as const;

export const WHATSAPP_SETTING_KEYS = KEYS;

function parseBoolean(v?: string) {
  const x = String(v || '').trim().toLowerCase();
  return x === '1' || x === 'true' || x === 'yes' || x === 'on';
}

function splitRecipients(v?: string) {
  const raw = String(v || '')
    .split(/[,;\n\r\t ]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const r of raw) {
    const cleaned = r.replace(/[^\d+@.a-zA-Z]/g, '');
    if (cleaned) out.push(cleaned);
  }
  return Array.from(new Set(out));
}

function escapeForJsonString(value: string) {
  const s = JSON.stringify(String(value ?? ''));
  return s.length >= 2 ? s.slice(1, -1) : '';
}

function renderTemplateJson(str: string, vars: Record<string, string>) {
  return str.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    return escapeForJsonString(vars[key] ?? '');
  });
}

async function getConfig(): Promise<WhatsAppConfig> {
  const map = await getSystemSettings(Object.values(KEYS));
  const defaultHeadersJson = JSON.stringify({
    'Content-Type': 'application/json',
    Authorization: 'Bearer {{apiKey}}',
  });
  const defaultBodyTemplateJson = JSON.stringify({
    to: '{{to}}',
    type: 'text',
    message: '{{message}}',
  });
  return {
    enabled: parseBoolean(map[KEYS.enabled]),
    url: String(map[KEYS.url] || '').trim(),
    method: String(map[KEYS.method] || 'POST').trim().toUpperCase(),
    apiKey: String(map[KEYS.apiKey] || 'lodge_wa_api_key_2026').trim(),
    numberKey: String(map[KEYS.numberKey] || 'ALL').trim(),
    headersJson: String(map[KEYS.headersJson] || defaultHeadersJson).trim(),
    bodyTemplateJson: String(map[KEYS.bodyTemplateJson] || defaultBodyTemplateJson).trim(),
    restaurantTo: String(map[KEYS.restaurantTo] || '').trim(),
    housekeepingTo: String(map[KEYS.housekeepingTo] || '').trim(),
    timeoutMs: Math.max(1000, parseInt(String(map[KEYS.timeoutMs] || '8000'), 10) || 8000),
  };
}

export async function sendWhatsAppPayload(payload: WhatsAppPayload) {
  const config = await getConfig();
  if (!config.enabled) {
    console.log('[WhatsApp] Sending skipped: WA_ENABLED is false');
    return { ok: false, error: 'DISABLED' as const };
  }
  if (!config.url) {
    console.error('[WhatsApp] Sending failed: No WA_URL configured');
    return { ok: false, error: 'NO_URL' as const };
  }

  const cleanedTo = payload.to.replace(/[^\d+]/g, '').trim();
  if (!cleanedTo) {
    console.error('[WhatsApp] Sending failed: Empty recipient phone number');
    return { ok: false, error: 'NO_RECIPIENT' as const };
  }

  const vars = {
    to: cleanedTo,
    message: payload.type === 'text' ? payload.message : (payload as any).caption || '',
    apiKey: config.apiKey,
    numberKey: config.numberKey,
  };

  let headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
    headers['x-api-key'] = config.apiKey;
  }

  if (config.headersJson) {
    try {
      const rendered = renderTemplateJson(config.headersJson, vars);
      const parsed = JSON.parse(rendered);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        headers = { ...headers, ...parsed };
      }
    } catch {}
  }

  let body: any = {
    ...payload,
    to: cleanedTo,
  };

  console.log(`[WhatsApp] Sending ${payload.type} message to ${cleanedTo}...`);

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const res = await fetch(config.url, {
      method: config.method || 'POST',
      headers,
      body: config.method === 'GET' ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const httpStatus = res.status;
    const text = await res.text();
    let parsed: any = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }

    if (!res.ok) {
      console.error(`[WhatsApp] HTTP Error ${httpStatus}:`, text);
      return { ok: false, error: 'HTTP_ERROR' as const, status: httpStatus, responseText: text, responseJson: parsed };
    }

    const providerOk =
      parsed === null
        ? true
        : parsed === true
          ? true
          : typeof parsed === 'object'
            ? parsed.success === true ||
              parsed.status === true ||
              parsed.status === '200' ||
              parsed.ack === 'successfully' ||
              parsed.message === 'Successfully'
            : true;

    if (!providerOk) {
      console.error(`[WhatsApp] Provider Error:`, text);
      return { ok: false, error: 'PROVIDER_ERROR' as const, status: httpStatus, responseText: text, responseJson: parsed };
    }

    console.log(`[WhatsApp] Success sending to ${cleanedTo}`);
    return { ok: true, status: httpStatus, responseText: text, responseJson: parsed };
  } catch (e: any) {
    console.error(`[WhatsApp] Fetch Error:`, e);
    return { ok: false, error: 'FETCH_ERROR' as const, message: String(e?.message || e) };
  } finally {
    clearTimeout(t);
  }
}

export async function sendWhatsAppMessageRaw(config: WhatsAppConfig, to: string, message: string) {
  return sendWhatsAppPayload({
    to,
    type: 'text',
    message,
  });
}

export async function sendWhatsAppMessage(to: string, message: string, name?: string) {
  return sendWhatsAppPayload({
    to,
    type: 'text',
    message,
    name,
  });
}

export async function sendWhatsAppMedia(input: {
  to: string;
  type: 'image' | 'document' | 'audio' | 'video';
  mediaUrl: string;
  caption?: string;
}) {
  return sendWhatsAppPayload({
    to: input.to,
    type: input.type,
    mediaUrl: input.mediaUrl,
    caption: input.caption,
  });
}

export async function sendWhatsAppTemplate(input: {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: any[];
}) {
  return sendWhatsAppPayload({
    to: input.to,
    type: 'template',
    templateName: input.templateName,
    languageCode: input.languageCode || 'id',
    components: input.components || [],
  });
}

function formatMoneyIDR(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function safeText(v: any) {
  return String(v ?? '').trim();
}

function formatFoodOrderMessage(order: any) {
  const lines: string[] = [];
  if (order.channel === 'DINE_IN') {
    lines.push(`ONLINE DINE IN ORDER (PAID)`);
  } else {
    lines.push(`ROOM SERVICE - FOOD (PAID)`);
  }
  lines.push(`Order ID: #${String(order.id).slice(0, 8)}`);
  if (order.tableNumber) lines.push(`Meja: ${safeText(order.tableNumber)}`);
  if (order.roomNumber) lines.push(`Kamar: ${safeText(order.roomNumber)}`);
  if (order.guestName) lines.push(`Nama Tamu: ${safeText(order.guestName)}`);
  if (order.guestPhone) lines.push(`No HP: ${safeText(order.guestPhone)}`);
  if (order.restaurant?.name) lines.push(`Restoran: ${safeText(order.restaurant.name)}`);
  if (order.deliveryNotes) {
    const isTakeAway = order.deliveryNotes === 'TAKE_AWAY';
    lines.push(`Tipe Layanan: ${isTakeAway ? 'Take Away (Bawa Pulang)' : 'Dine In (Makan di Tempat)'}`);
  }
  lines.push('');
  lines.push('Pesanan:');
  for (const it of order.items || []) {
    const name = it.menuItem?.name || 'Item';
    const qty = it.quantity || 0;
    const note = safeText(it.requestNote);
    lines.push(`- ${qty}x ${name}${note ? ` (${note})` : ''}`);
  }
  lines.push('');
  lines.push(`Total Pembayaran: ${formatMoneyIDR(Number(order.totalAmount || 0))}`);
  return lines.join('\n');
}

function formatHousekeepingOrderMessage(order: any) {
  const lines: string[] = [];
  lines.push(`ROOM SERVICE - HOUSEKEEPING (PAID)`);
  lines.push(`Order ID: #${String(order.id).slice(0, 8)}`);
  if (order.roomNumber) lines.push(`Kamar: ${safeText(order.roomNumber)}`);
  if (order.guestName) lines.push(`Nama Tamu: ${safeText(order.guestName)}`);
  if (order.guestPhone) lines.push(`No HP: ${safeText(order.guestPhone)}`);
  lines.push('');
  lines.push('Item:');
  for (const it of order.items || []) {
    const name = it.item?.name || 'Item';
    const qty = it.quantity || 0;
    const note = safeText(it.requestNote);
    lines.push(`- ${qty}x ${name}${note ? ` (${note})` : ''}`);
  }
  lines.push('');
  lines.push(`Total Pembayaran: ${formatMoneyIDR(Number(order.totalAmount || 0))}`);
  return lines.join('\n');
}

export async function notifyRoomServiceOrderPaid(input: { foodOrderId?: string | null; hkOrderId?: string | null }) {
  console.log('[WhatsApp] notifyRoomServiceOrderPaid triggered', input);
  const config = await getConfig();
  if (!config.enabled) {
    console.log('[WhatsApp] Notification skipped: WA_ENABLED is false');
    return { ok: true, skipped: true as const };
  }

  const results: Array<{
    channel: WhatsAppChannel;
    to: string;
    ok: boolean;
    status?: number;
    responseText?: string;
    responseJson?: any;
    error?: string;
  }> = [];

  if (input.foodOrderId) {
    const order = await prisma.foodOrder.findUnique({
      where: { id: input.foodOrderId },
      include: { restaurant: true, items: { include: { menuItem: true } } },
    });
    if (order) {
      const message = formatFoodOrderMessage(order);
      const recipients = splitRecipients(config.restaurantTo);
      console.log(`[WhatsApp] Sending Food Order ${order.id} to ${recipients.length} recipients`);
      for (let i = 0; i < recipients.length; i++) {
        const to = recipients[i];
        if (i > 0) {
          const bulkDelay = Math.floor(Math.random() * 2000) + 1000;
          await new Promise((resolve) => setTimeout(resolve, bulkDelay));
        }

        const r = await sendWhatsAppMessageRaw(config, to, message);
        results.push({
          channel: 'RESTAURANT',
          to,
          ok: r.ok,
          status: (r as any).status,
          responseText: (r as any).responseText,
          responseJson: (r as any).responseJson,
          error: (r as any).error,
        });
      }
    } else {
      console.warn(`[WhatsApp] Food Order ${input.foodOrderId} not found`);
    }
  }

  if (input.hkOrderId) {
    const order = await prisma.housekeepingOrder.findUnique({
      where: { id: input.hkOrderId },
      include: { items: { include: { item: true } } },
    });
    if (order) {
      const message = formatHousekeepingOrderMessage(order);
      const recipients = splitRecipients(config.housekeepingTo);
      console.log(`[WhatsApp] Sending HK Order ${order.id} to ${recipients.length} recipients`);
      for (let i = 0; i < recipients.length; i++) {
        const to = recipients[i];
        if (i > 0) {
          const bulkDelay = Math.floor(Math.random() * 2000) + 1000;
          await new Promise((resolve) => setTimeout(resolve, bulkDelay));
        }
        const r = await sendWhatsAppMessageRaw(config, to, message);
        results.push({
          channel: 'HOUSEKEEPING',
          to,
          ok: r.ok,
          status: (r as any).status,
          responseText: (r as any).responseText,
          responseJson: (r as any).responseJson,
          error: (r as any).error,
        });
      }
    } else {
      console.warn(`[WhatsApp] HK Order ${input.hkOrderId} not found`);
    }
  }

  console.log(`[WhatsApp] Finished sending notifications. Success: ${results.every((r) => r.ok)}`);
  return { ok: results.every((r) => r.ok), results };
}

export async function notifyBookingPaidWhatsApp(bookingId: string) {
  console.log('[WhatsApp] notifyBookingPaidWhatsApp triggered for booking:', bookingId);
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { user: true },
    });

    if (!booking) {
      console.warn(`[WhatsApp] Booking ${bookingId} not found`);
      return { ok: false, error: 'NOT_FOUND' };
    }

    let details: any = {};
    try {
      details = typeof booking.details === 'string' ? JSON.parse(booking.details) : booking.details || {};
    } catch (e) {
      details = {};
    }

    const recipientPhone =
      details.guestPhone ||
      details.recipientPhone ||
      details.phone ||
      booking.user?.phoneNumber ||
      '';

    if (!recipientPhone) {
      console.log(`[WhatsApp] Skipped: No phone number found for booking ${bookingId}`);
      return { ok: true, skipped: true, reason: 'NO_PHONE' };
    }

    const guestName = details.guestName || details.recipientName || booking.user?.name || 'Tamu';
    const displayType =
      booking.type === 'WAHANA'
        ? 'E-Voucher Tiket / Wahana'
        : booking.type === 'GLAMPING'
          ? 'Menginap / Glamping'
          : booking.type;

    const formattedDate = new Date(booking.date).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const itemsLines: string[] = [];
    if (details.items && Array.isArray(details.items)) {
      for (const item of details.items) {
        const title = item.title || item.name || 'Tiket';
        const qty = item.qty || item.quantity || 1;
        const price = item.price ? ` (${formatMoneyIDR(Number(item.price))})` : '';
        itemsLines.push(`- ${qty}x ${title}${price}`);
      }
    }

    const lines: string[] = [];
    lines.push(`🎉 PEMBAYARAN E-VOUCHER BERHASIL!`);
    lines.push(``);
    lines.push(`Halo *${guestName}*, terima kasih atas pemesanan Anda di *The Lodge Maribaya*.`);
    lines.push(``);
    lines.push(`📋 *Detail Booking:*`);
    lines.push(`• Booking ID: #${String(booking.id).slice(0, 8)}`);
    lines.push(`• Jenis: ${displayType}`);
    lines.push(`• Tanggal Kunjungan: ${formattedDate}`);
    if (itemsLines.length > 0) {
      lines.push(``);
      lines.push(`🎟️ *Rincian Tiket:*`);
      lines.push(...itemsLines);
    }
    lines.push(``);
    lines.push(`💰 *Total Pembayaran:* ${formatMoneyIDR(Number(booking.amount || 0))} (LUNAS)`);
    lines.push(``);
    lines.push(`Silakan tunjukkan pesan ini atau QR Code tiket Anda saat berada di gate/lokasi.`);
    lines.push(`Lihat e-voucher Anda online: https://family.thelodgegroup.id/booking/tickets`);

    const textMessage = lines.join('\n');

    // Kirim konfirmasi pesan teks WhatsApp
    const textResult = await sendWhatsAppPayload({
      to: recipientPhone,
      type: 'text',
      message: textMessage,
      name: guestName,
    });

    // Kirim Media E-Voucher Gambar / PDF jika URL tersedia
    if (details.qrImageUrl || details.voucherPdfUrl) {
      const mediaUrl = details.qrImageUrl || details.voucherPdfUrl;
      const mediaType = details.voucherPdfUrl ? 'document' : 'image';
      await sendWhatsAppPayload({
        to: recipientPhone,
        type: mediaType,
        mediaUrl: mediaUrl,
        caption: `E-Voucher QR Code #${String(booking.id).slice(0, 8)} - The Lodge Maribaya`,
      });
    }

    return textResult;
  } catch (error: any) {
    console.error('[WhatsApp] Error in notifyBookingPaidWhatsApp:', error);
    return { ok: false, error: error.message };
  }
}

export async function sendWhatsAppTest(input: { to: string; message: string }) {
  const to = String(input.to || '').trim();
  const message = String(input.message || '').trim();
  if (!to) return { ok: false, error: 'NO_RECIPIENT' as const };
  if (!message) return { ok: false, error: 'NO_MESSAGE' as const };
  const r = await sendWhatsAppPayload({
    to,
    type: 'text',
    message,
  });
  return r;
}
