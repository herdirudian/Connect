import { prisma } from '@/lib/prisma';
import { getSystemSettings } from '@/lib/systemSettings';

type WhatsAppChannel = 'RESTAURANT' | 'HOUSEKEEPING';

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
    // Mengizinkan angka, tanda +, dan akhiran @c.us atau @g.us
    const cleaned = r.replace(/[^\d+@.a-zA-Z]/g, '');
    if (cleaned) out.push(cleaned);
  }
  return Array.from(new Set(out));
}

function renderTemplate(str: string, vars: Record<string, string>) {
  return str.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    return vars[key] ?? '';
  });
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

async function sendWhatsAppMessageRaw(config: WhatsAppConfig, to: string, message: string) {
  if (!config.enabled) {
    console.log('[WhatsApp] Sending skipped: Disabled');
    return { ok: false, error: 'DISABLED' as const };
  }
  if (!config.url) {
    console.error('[WhatsApp] Sending failed: No URL configured');
    return { ok: false, error: 'NO_URL' as const };
  }

  console.log(`[WhatsApp] Sending message to ${to}...`);

  const vars = {
    to,
    message,
    apiKey: config.apiKey,
    numberKey: config.numberKey,
  };

  // DELAY UNTUK MENCEGAH SPAM / BOT DETECTION
  // Memberikan jeda acak antara 3000ms (3 detik) sampai 7000ms (7 detik) sebelum request dikirim
  const delayMs = Math.floor(Math.random() * 4000) + 3000;
  console.log(`[WhatsApp] Applying anti-spam delay of ${delayMs}ms before sending to ${to}...`);
  await new Promise((resolve) => setTimeout(resolve, delayMs));

  let headers: Record<string, string> = { 'Content-Type': 'application/json' };
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
    phone_no: to,
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
      console.error(`[WhatsApp] HTTP Error ${httpStatus}:`, text);
      return { ok: false, error: 'HTTP_ERROR' as const, status: httpStatus, responseText: text, responseJson: parsed };
    }

    const providerOk =
      parsed === null
        ? true
        : parsed === true
          ? true
          : typeof parsed === 'object'
            ? parsed.status === true ||
              parsed.status === '200' ||
              parsed.ack === 'successfully' ||
              parsed.message === 'Successfully'
            : true;

    if (!providerOk) {
      console.error(`[WhatsApp] Provider Error:`, text);
      return { ok: false, error: 'PROVIDER_ERROR' as const, status: httpStatus, responseText: text, responseJson: parsed };
    }

    console.log(`[WhatsApp] Success sending to ${to}`);
    return { ok: true, status: httpStatus, responseText: text, responseJson: parsed };
  } catch (e: any) {
    console.error(`[WhatsApp] Fetch Error:`, e);
    return { ok: false, error: 'FETCH_ERROR' as const, message: String(e?.message || e) };
  } finally {
    clearTimeout(t);
  }
}

export async function sendWhatsAppMessage(to: string, message: string) {
  const config = await getConfig();
  return sendWhatsAppMessageRaw(config, to, message);
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
    lines.push(`DINE IN ORDER (PAID)`);
  } else {
    lines.push(`ROOM SERVICE - FOOD (PAID)`);
  }
  lines.push(`Order: #${String(order.id).slice(0, 8)}`);
  if (order.tableNumber) lines.push(`Meja: ${safeText(order.tableNumber)}`);
  if (order.roomNumber) lines.push(`Kamar: ${safeText(order.roomNumber)}`);
  if (order.guestName) lines.push(`Tamu: ${safeText(order.guestName)}`);
  if (order.guestPhone) lines.push(`HP: ${safeText(order.guestPhone)}`);
  if (order.restaurant?.name) lines.push(`Resto: ${safeText(order.restaurant.name)}`);
  if (order.deliveryNotes) lines.push(`Metode: ${safeText(order.deliveryNotes)}`);
  lines.push('');
  lines.push('Item:');
  for (const it of order.items || []) {
    const name = it.menuItem?.name || 'Item';
    const qty = it.quantity || 0;
    const note = safeText(it.requestNote);
    lines.push(`- ${qty}x ${name}${note ? ` (${note})` : ''}`);
  }
  lines.push('');
  lines.push(`Total: ${formatMoneyIDR(Number(order.totalAmount || 0))}`);
  return lines.join('\n');
}

function formatHousekeepingOrderMessage(order: any) {
  const lines: string[] = [];
  lines.push(`ROOM SERVICE - HOUSEKEEPING (PAID)`);
  lines.push(`Order: #${String(order.id).slice(0, 8)}`);
  if (order.roomNumber) lines.push(`Kamar: ${safeText(order.roomNumber)}`);
  if (order.guestName) lines.push(`Tamu: ${safeText(order.guestName)}`);
  if (order.guestPhone) lines.push(`HP: ${safeText(order.guestPhone)}`);
  lines.push('');
  lines.push('Item:');
  for (const it of order.items || []) {
    const name = it.item?.name || 'Item';
    const qty = it.quantity || 0;
    const note = safeText(it.requestNote);
    lines.push(`- ${qty}x ${name}${note ? ` (${note})` : ''}`);
  }
  lines.push('');
  lines.push(`Total: ${formatMoneyIDR(Number(order.totalAmount || 0))}`);
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
        // Jeda tambahan antar nomor secara sekuensial (untuk bulk sending)
        if (i > 0) {
            const bulkDelay = Math.floor(Math.random() * 5000) + 5000; // 5-10 detik
            console.log(`[WhatsApp] Waiting ${bulkDelay}ms before sending to next recipient...`);
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
        // Jeda tambahan antar nomor secara sekuensial (untuk bulk sending)
        if (i > 0) {
            const bulkDelay = Math.floor(Math.random() * 5000) + 5000; // 5-10 detik
            console.log(`[WhatsApp] Waiting ${bulkDelay}ms before sending to next recipient...`);
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

export async function sendWhatsAppTest(input: { to: string; message: string }) {
  const config = await getConfig();
  const to = String(input.to || '').trim();
  const message = String(input.message || '').trim();
  if (!to) return { ok: false, error: 'NO_RECIPIENT' as const };
  if (!message) return { ok: false, error: 'NO_MESSAGE' as const };
  const r = await sendWhatsAppMessageRaw(config, to, message);
  return r;
}
