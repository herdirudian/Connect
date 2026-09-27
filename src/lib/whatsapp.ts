import { prisma } from '@/lib/prisma';
import { getSystemSettings } from '@/lib/systemSettings';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

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
  // Gateway 1: Staff Order Alerts (OpenWA / Watzap)
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

  // Gateway 2: Customer Ticketing & E-Voucher (Meta Cloud API)
  metaEnabled: 'WA_META_ENABLED',
  metaUrl: 'WA_META_URL',
  metaMethod: 'WA_META_METHOD',
  metaApiKey: 'WA_META_API_KEY',
  metaHeadersJson: 'WA_META_HEADERS_JSON',

  // Bot Ticket Purchasing Service Control
  botEnabled: 'WA_BOT_ENABLED',
  botMaintenanceMsg: 'WA_BOT_MAINTENANCE_MSG',
  botSilentMaintenance: 'WA_BOT_SILENT_MAINTENANCE',
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

function renderTemplateJson(str: string, vars: Record<string, string>) {
  return str.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const s = JSON.stringify(String(vars[key] ?? ''));
    return s.length >= 2 ? s.slice(1, -1) : '';
  });
}

async function getConfig(): Promise<WhatsAppConfig> {
  const map = await getSystemSettings(Object.values(KEYS));
  const defaultHeadersJson = JSON.stringify({ 'Content-Type': 'application/json' });
  const defaultBodyTemplateJson = JSON.stringify({
    api_key: '{{apiKey}}',
    number_key: '{{numberKey}}',
    phone_no: '{{to}}',
    message: '{{message}}',
  });
  return {
    enabled: parseBoolean(map[KEYS.enabled]),
    url: String(map[KEYS.url] || '').trim(),
    method: String(map[KEYS.method] || 'POST').trim().toUpperCase(),
    apiKey: String(map[KEYS.apiKey] || '').trim(),
    numberKey: String(map[KEYS.numberKey] || 'ALL').trim(),
    headersJson: String(map[KEYS.headersJson] || defaultHeadersJson).trim(),
    bodyTemplateJson: String(map[KEYS.bodyTemplateJson] || defaultBodyTemplateJson).trim(),
    restaurantTo: String(map[KEYS.restaurantTo] || '').trim(),
    housekeepingTo: String(map[KEYS.housekeepingTo] || '').trim(),
    timeoutMs: Math.max(1000, parseInt(String(map[KEYS.timeoutMs] || '8000'), 10) || 8000),
  };
}

/**
 * OpenWA / Watzap Gateway Provider for Internal Staff Alerts (Online Dine In & Housekeeping)
 */
export async function sendOpenWAMessageRaw(config: WhatsAppConfig, to: string, message: string) {
  if (!config.enabled) {
    console.log('[WhatsApp OpenWA] Sending skipped: WA_ENABLED is false');
    return { ok: false, error: 'DISABLED' as const };
  }
  if (!config.url) {
    console.error('[WhatsApp OpenWA] Sending failed: No WA_URL configured');
    return { ok: false, error: 'NO_URL' as const };
  }

  const cleanedTo = to.replace(/[^\d+@.a-zA-Z]/g, '').trim();
  if (!cleanedTo) {
    console.error('[WhatsApp OpenWA] Sending failed: Empty recipient phone number');
    return { ok: false, error: 'NO_RECIPIENT' as const };
  }

  console.log(`[WhatsApp OpenWA] Sending order alert to ${cleanedTo}...`);

  const vars = {
    to: cleanedTo,
    message,
    apiKey: config.apiKey,
    numberKey: config.numberKey,
  };

  const delayMs = Math.floor(Math.random() * 2000) + 1000;
  await new Promise((resolve) => setTimeout(resolve, delayMs));

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
    api_key: config.apiKey,
    number_key: config.numberKey,
    phone_no: cleanedTo,
    message,
  };

  if (config.bodyTemplateJson) {
    try {
      const rendered = renderTemplateJson(config.bodyTemplateJson, vars);
      const parsed = JSON.parse(rendered);
      if (parsed !== null) body = parsed;
    } catch {}
  }

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
      console.error(`[WhatsApp OpenWA] HTTP Error ${httpStatus}:`, text);
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
      console.error(`[WhatsApp OpenWA] Provider Error:`, text);
      return { ok: false, error: 'PROVIDER_ERROR' as const, status: httpStatus, responseText: text, responseJson: parsed };
    }

    console.log(`[WhatsApp OpenWA] Success sending to ${cleanedTo}`);
    return { ok: true, status: httpStatus, responseText: text, responseJson: parsed };
  } catch (e: any) {
    console.error(`[WhatsApp OpenWA] Fetch Error:`, e);
    return { ok: false, error: 'FETCH_ERROR' as const, message: String(e?.message || e) };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Meta Cloud API Gateway for Customer Ticketing & E-Voucher Communications
 */
export async function sendWhatsAppPayload(payload: WhatsAppPayload) {
  const map = await getSystemSettings([
    KEYS.enabled,
    KEYS.metaEnabled,
    KEYS.url,
    KEYS.metaUrl,
    KEYS.metaMethod,
    KEYS.apiKey,
    KEYS.metaApiKey,
    KEYS.metaHeadersJson,
    KEYS.timeoutMs,
  ]);

  const enabled = parseBoolean(map[KEYS.metaEnabled]) || parseBoolean(map[KEYS.enabled]);
  if (!enabled) {
    console.log('[WhatsApp Meta Cloud] Sending skipped: Disabled');
    return { ok: false, error: 'DISABLED' as const };
  }

  const url = String(map[KEYS.metaUrl] || process.env.WA_API_ENDPOINT || map[KEYS.url] || '').trim();
  if (!url) {
    console.error('[WhatsApp Meta Cloud] Sending failed: No API endpoint URL configured');
    return { ok: false, error: 'NO_URL' as const };
  }

  const apiKey = String(map[KEYS.metaApiKey] || process.env.WA_API_KEY || map[KEYS.apiKey] || 'lodge_wa_api_key_2026').trim();
  const cleanedTo = payload.to.replace(/[^\d+]/g, '').trim();

  if (!cleanedTo) {
    console.error('[WhatsApp Meta Cloud] Sending failed: Empty recipient phone number');
    return { ok: false, error: 'NO_RECIPIENT' as const };
  }

  const method = String(map[KEYS.metaMethod] || 'POST').trim().toUpperCase();
  let headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
    headers['x-api-key'] = apiKey;
  }

  if (map[KEYS.metaHeadersJson]) {
    try {
      const vars = { to: cleanedTo, apiKey };
      const rendered = renderTemplateJson(map[KEYS.metaHeadersJson], vars);
      const parsed = JSON.parse(rendered);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        headers = { ...headers, ...parsed };
      }
    } catch {}
  }

  const cleanedPayload: any = { ...payload };
  if (cleanedPayload.mediaUrl && typeof cleanedPayload.mediaUrl === 'string') {
    cleanedPayload.mediaUrl = cleanedPayload.mediaUrl
      .replace(/https?:\/\/connect\.thelodgegroup\.id/g, 'https://family.thelodgegroup.id')
      .replace(/https?:\/\/localhost(:\d+)?/g, 'https://family.thelodgegroup.id');
  }

  const body = {
    ...cleanedPayload,
    to: cleanedTo,
  };

  console.log(`[WhatsApp Meta Cloud] Sending ${payload.type} message to ${cleanedTo}...`);

  const timeoutMs = Math.max(1000, parseInt(String(map[KEYS.timeoutMs] || '8000'), 10) || 8000);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: method === 'GET' ? undefined : JSON.stringify(body),
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
      console.error(`[WhatsApp Meta Cloud] HTTP Error ${httpStatus}:`, text);
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
      console.error(`[WhatsApp Meta Cloud] Provider Error:`, text);
      return { ok: false, error: 'PROVIDER_ERROR' as const, status: httpStatus, responseText: text, responseJson: parsed };
    }

    console.log(`[WhatsApp Meta Cloud] Success sending to ${cleanedTo}`);
    return { ok: true, status: httpStatus, responseText: text, responseJson: parsed };
  } catch (e: any) {
    console.error(`[WhatsApp Meta Cloud] Fetch Error:`, e);
    return { ok: false, error: 'FETCH_ERROR' as const, message: String(e?.message || e) };
  } finally {
    clearTimeout(t);
  }
}

export async function sendWhatsAppMessageRaw(config: WhatsAppConfig, to: string, message: string) {
  return sendOpenWAMessageRaw(config, to, message);
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

/**
 * Notifikasi Pesanan Makanan & Room Service untuk Tim Internal Staf (via OpenWA / Watzap)
 */
export async function notifyRoomServiceOrderPaid(input: { foodOrderId?: string | null; hkOrderId?: string | null }) {
  console.log('[WhatsApp OpenWA] notifyRoomServiceOrderPaid triggered', input);
  const config = await getConfig();
  if (!config.enabled) {
    console.log('[WhatsApp OpenWA] Notification skipped: WA_ENABLED is false');
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
      console.log(`[WhatsApp OpenWA] Sending Food Order ${order.id} to ${recipients.length} recipients`);
      for (let i = 0; i < recipients.length; i++) {
        const to = recipients[i];
        if (i > 0) {
          const bulkDelay = Math.floor(Math.random() * 2000) + 1000;
          await new Promise((resolve) => setTimeout(resolve, bulkDelay));
        }

        const r = await sendOpenWAMessageRaw(config, to, message);
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
      console.warn(`[WhatsApp OpenWA] Food Order ${input.foodOrderId} not found`);
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
      console.log(`[WhatsApp OpenWA] Sending HK Order ${order.id} to ${recipients.length} recipients`);
      for (let i = 0; i < recipients.length; i++) {
        const to = recipients[i];
        if (i > 0) {
          const bulkDelay = Math.floor(Math.random() * 2000) + 1000;
          await new Promise((resolve) => setTimeout(resolve, bulkDelay));
        }
        const r = await sendOpenWAMessageRaw(config, to, message);
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
      console.warn(`[WhatsApp OpenWA] HK Order ${input.hkOrderId} not found`);
    }
  }

  console.log(`[WhatsApp OpenWA] Finished sending notifications. Success: ${results.every((r) => r.ok)}`);
  return { ok: results.every((r) => r.ok), results };
}

/**
 * Notifikasi E-Voucher Tiket & Booking untuk Tamu/Pelanggan (via Meta Cloud API Dashboard)
 */
export async function notifyBookingPaidWhatsApp(bookingId: string) {
  console.log('[WhatsApp Meta Cloud] notifyBookingPaidWhatsApp triggered for booking:', bookingId);
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { user: true },
    });

    if (!booking) {
      console.warn(`[WhatsApp Meta Cloud] Booking ${bookingId} not found`);
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
      console.log(`[WhatsApp Meta Cloud] Skipped: No phone number found for booking ${bookingId}`);
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
        const title = item.name || item.title || 'Tiket';
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
    lines.push(`📄 *Dokumen E-Voucher Resmi (PDF) dilampirkan bersama pesan ini.*`);
    lines.push(`Silakan simpan file PDF tersebut dan tunjukkan QR Code tiket kepada petugas di gate/loket masuk saat kunjungan.`);

    const textMessage = lines.join('\n');

    // Kirim konfirmasi pesan teks WhatsApp ke tamu via Meta Cloud API
    const textResult = await sendWhatsAppPayload({
      to: recipientPhone,
      type: 'text',
      message: textMessage,
      name: guestName,
    });

    // Generate Dokumen PDF E-Voucher Resmi & simpan ke public/uploads/vouchers
    const fileName = `voucher-${String(booking.id).slice(0, 8)}.pdf`;
    const publicDir = path.join(process.cwd(), 'public', 'uploads', 'vouchers');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    const filePath = path.join(publicDir, fileName);

    const envAppUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const appUrl =
      envAppUrl && !envAppUrl.includes('connect.thelodgegroup.id') && !envAppUrl.includes('localhost')
        ? envAppUrl.replace(/\/+$/, '')
        : 'https://family.thelodgegroup.id';
    let voucherPdfUrl = `${appUrl}/uploads/vouchers/${fileName}`;

    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const w = doc.internal.pageSize.getWidth();
      const h = doc.internal.pageSize.getHeight();
      const margin = 36;
      const contentWidth = w - margin * 2;

      // 1. Top Decorative Brand Accent Line (Forest Green)
      doc.setFillColor(26, 67, 50); // #1a4332
      doc.rect(0, 0, w, 4, 'F');

      // 2. Official Brand Logo on Crisp White Canvas
      const logoPath = path.join(process.cwd(), 'public', 'logotlm.png');
      if (fs.existsSync(logoPath)) {
        try {
          const logoBuf = fs.readFileSync(logoPath);
          doc.addImage(logoBuf, 'PNG', margin, 18, 71, 55, undefined, 'FAST');
        } catch {}
      }

      // Address subtitle below logo
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text('Jl. Maribaya No. 149/252, Cibodas, Lembang, Kab. Bandung Barat', margin, 85);

      // 3. Right Header: Official Document Title & Metadata
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(26, 67, 50);
      doc.text('E-VOUCHER TIKET RESMI', w - margin, 30, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`KODE BOOKING: #${String(booking.id).slice(0, 8)}`, w - margin, 44, { align: 'right' });

      const issueDateStr = new Date(booking.createdAt || Date.now()).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`Diterbitkan: ${issueDateStr}`, w - margin, 56, { align: 'right' });

      // Status Badge (Understated, clean border pill)
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(187, 247, 208);
      doc.setLineWidth(0.75);
      doc.roundedRect(w - margin - 90, 64, 90, 18, 3, 3, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(22, 101, 52);
      doc.text('STATUS: LUNAS', w - margin - 45, 76, { align: 'center' });

      // 4. Subtle Header Divider Line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.8);
      doc.line(margin, 95, w - margin, 95);

      // 5. Visitor & Pass Section
      const cardsY = 108;
      const leftW = contentWidth - 165;
      const rightW = 155;
      const cardH = 130;

      // Left Card: Customer & Visit Information
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, cardsY, leftW, cardH, 4, 4, 'FD');

      doc.setFillColor(241, 245, 249);
      doc.roundedRect(margin, cardsY, leftW, 22, 4, 4, 'F');
      doc.rect(margin, cardsY + 18, leftW, 4, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, cardsY + 22, margin + leftW, cardsY + 22);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text('INFORMASI PENGUNJUNG & JADWAL', margin + 12, cardsY + 15);

      const drawRow = (label: string, val: string, yPos: number, isBold = false) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(label, margin + 12, yPos);
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        doc.setTextColor(15, 23, 42);
        doc.text(val, margin + 115, yPos);
      };

      drawRow('Nama Pemesan', guestName, cardsY + 42, true);
      drawRow('No. Telepon / WA', recipientPhone, cardsY + 63);
      drawRow('Tgl. Kunjungan', formattedDate, cardsY + 84, true);
      drawRow('Tipe Booking', displayType, cardsY + 105);

      // Right Card: High-Contrast QR Code Pass
      const qrX = w - margin - rightW;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(qrX, cardsY, rightW, cardH, 4, 4, 'FD');

      doc.setFillColor(26, 67, 50);
      doc.roundedRect(qrX, cardsY, rightW, 22, 4, 4, 'F');
      doc.rect(qrX, cardsY + 18, rightW, 4, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('SCAN QR DI GATE MASUK', qrX + rightW / 2, cardsY + 15, { align: 'center' });

      try {
        const qrDataUrl = await QRCode.toDataURL(String(booking.id), {
          margin: 1,
          color: { dark: '#1a4332', light: '#ffffff' },
        });
        doc.addImage(qrDataUrl, 'PNG', qrX + (rightW - 74) / 2, cardsY + 28, 74, 74, undefined, 'FAST');
      } catch {}

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(`#${String(booking.id).slice(0, 8)}`, qrX + rightW / 2, cardsY + 117, { align: 'center' });

      // 6. Rincian Tiket Table
      const tableY = 250;
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, tableY, contentWidth, 22, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text('NO.', margin + 12, tableY + 14);
      doc.text('DESKRIPSI TIKET / WAHANA', margin + 45, tableY + 14);
      doc.text('QTY', w - margin - 190, tableY + 14, { align: 'center' });
      doc.text('HARGA', w - margin - 110, tableY + 14, { align: 'right' });
      doc.text('TOTAL', w - margin - 12, tableY + 14, { align: 'right' });

      let curY = tableY + 22;
      const list: Array<{ name: string; qty: number; price: number }> = [];
      if (details.items && Array.isArray(details.items)) {
        for (const item of details.items) {
          list.push({
            name: item.name || item.title || 'Tiket',
            qty: Number(item.qty || item.quantity || 1),
            price: Number(item.price || 0),
          });
        }
      }
      if (list.length === 0) {
        list.push({
          name: displayType,
          qty: Number(details.pax || details.guests || (booking as any).guests || 1),
          price: Number(booking.amount || 0),
        });
      }

      list.forEach((it, idx) => {
        const subtotal = it.qty * it.price;
        const isEven = idx % 2 === 0;
        doc.setFillColor(isEven ? 255 : 250, isEven ? 255 : 250, isEven ? 255 : 250);
        doc.rect(margin, curY, contentWidth, 22, 'F');
        doc.setDrawColor(241, 245, 249);
        doc.line(margin, curY + 22, w - margin, curY + 22);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        doc.text(String(idx + 1), margin + 12, curY + 14);
        doc.text(it.name, margin + 45, curY + 14);
        doc.text(String(it.qty), w - margin - 190, curY + 14, { align: 'center' });
        doc.text(formatMoneyIDR(it.price), w - margin - 110, curY + 14, { align: 'right' });
        doc.text(formatMoneyIDR(subtotal), w - margin - 12, curY + 14, { align: 'right' });
        curY += 22;
      });

      // 7. Total Summary Row
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(187, 247, 208);
      doc.rect(margin, curY, contentWidth, 30, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(22, 101, 52);
      doc.text('TOTAL PEMBAYARAN (LUNAS)', margin + 12, curY + 19);

      doc.setFontSize(12);
      doc.setTextColor(21, 128, 61);
      doc.text(formatMoneyIDR(Number(booking.amount || 0)), w - margin - 12, curY + 20, { align: 'right' });

      curY += 42;

      // 8. Syarat & Ketentuan Kunjungan
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, curY, contentWidth, 75, 4, 4, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text('SYARAT & KETENTUAN KUNJUNGAN:', margin + 12, curY + 15);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      const terms = [
        '1. Tunjukkan QR Code pada e-voucher ini langsung dari layar ponsel Anda kepada petugas di pintu masuk/loket.',
        '2. E-Voucher ini sah dan berlaku hanya pada tanggal kunjungan yang tertera sesuai dengan jumlah pax terdaftar.',
        '3. Tiket yang sudah dibeli bersifat non-refundable (tidak dapat diuangkan atau dibatalkan kembali).',
        '4. Harap menjaga kebersihan area wisata dan selalu mematuhi petunjuk keselamatan staf The Lodge Maribaya.',
      ];
      terms.forEach((t, i) => {
        doc.text(t, margin + 12, curY + 28 + i * 11);
      });

      // 11. Official Footer
      const footerY = h - 45;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(margin, footerY - 8, w - margin, footerY - 8);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text('The Lodge Maribaya • Jl. Maribaya No. 149/252, Cibodas, Lembang, Kab. Bandung Barat, Jawa Barat 40391', w / 2, footerY + 4, { align: 'center' });
      doc.text('WhatsApp Service: +62 811-2264-808 • Website Resmi: https://family.thelodgegroup.id', w / 2, footerY + 16, { align: 'center' });
      doc.text('Dokumen elektronik ini diterbitkan secara otomatis dan sah tanpa tanda tangan basah.', w / 2, footerY + 28, { align: 'center' });

      const pdfBuffer = doc.output('arraybuffer');
      fs.writeFileSync(filePath, Buffer.from(pdfBuffer));

      // Simpan voucherPdfUrl ke booking.details
      try {
        details.voucherPdfUrl = voucherPdfUrl;
        await prisma.booking.update({
          where: { id: booking.id },
          data: { details: JSON.stringify(details) },
        });
      } catch {}
    } catch (pdfErr) {
      console.error('[WhatsApp] Error generating PDF ticket:', pdfErr);
    }

    // Kirim File PDF E-Voucher ke WhatsApp Pelanggan
    if (voucherPdfUrl) {
      await sendWhatsAppPayload({
        to: recipientPhone,
        type: 'document',
        mediaUrl: voucherPdfUrl,
        caption: `E-Voucher Tiket #${String(booking.id).slice(0, 8)} - The Lodge Maribaya`,
      });
    }

    return textResult;
  } catch (error: any) {
    console.error('[WhatsApp Meta Cloud] Error in notifyBookingPaidWhatsApp:', error);
    return { ok: false, error: error.message };
  }
}

export async function sendWhatsAppTest(input: { to: string; message: string; gateway?: 'STAFF' | 'META' }) {
  const to = String(input.to || '').trim();
  const message = String(input.message || '').trim();
  const gateway = input.gateway || 'STAFF';

  if (!to) return { ok: false, error: 'NO_RECIPIENT' as const };
  if (!message) return { ok: false, error: 'NO_MESSAGE' as const };

  if (gateway === 'META') {
    const r = await sendWhatsAppPayload({
      to,
      type: 'text',
      message,
    });
    return r;
  } else {
    const config = await getConfig();
    const r = await sendOpenWAMessageRaw(config, to, message);
    return r;
  }
}
