import { NextResponse } from 'next/server';
import { getSystemSettings, upsertSystemSetting } from '@/lib/systemSettings';
import { WHATSAPP_SETTING_KEYS } from '@/lib/whatsapp';
import { PERMISSIONS } from '@/lib/permissions';
import { getAuthUser } from '@/lib/serverAuth';

function canReadSettings(role: string, perms: string[]) {
  return role === 'ADMIN' || perms.includes(PERMISSIONS.MANAGE_WHATSAPP) || perms.includes(PERMISSIONS.MANAGE_FOOD);
}

function canWriteSettings(role: string, perms: string[]) {
  return role === 'ADMIN' || perms.includes(PERMISSIONS.MANAGE_WHATSAPP);
}

function normalizeString(v: unknown) {
  return String(v ?? '').trim();
}

export async function GET() {
  const auth = await getAuthUser();
  if (!auth || !canReadSettings(auth.role, auth.permissions)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const keys = Object.values(WHATSAPP_SETTING_KEYS);
  const map = await getSystemSettings(keys);

  const defaultHeadersJson = JSON.stringify({ 'Content-Type': 'application/json' });
  const defaultBodyTemplateJson = JSON.stringify({
    api_key: '{{apiKey}}',
    number_key: '{{numberKey}}',
    phone_no: '{{to}}',
    message: '{{message}}',
  });
  const legacyHeadersJson = JSON.stringify({ Authorization: 'Bearer {{apiKey}}' });
  const legacyBodyTemplateJson = JSON.stringify({ to: '{{to}}', message: '{{message}}', apiKey: '{{apiKey}}' });

  const needsHeadersSeed =
    map[WHATSAPP_SETTING_KEYS.headersJson] === undefined || map[WHATSAPP_SETTING_KEYS.headersJson] === legacyHeadersJson;
  const needsBodySeed =
    map[WHATSAPP_SETTING_KEYS.bodyTemplateJson] === undefined || map[WHATSAPP_SETTING_KEYS.bodyTemplateJson] === legacyBodyTemplateJson;
  const needsNumberKeySeed = map[WHATSAPP_SETTING_KEYS.numberKey] === undefined;

  const missingUpserts: Array<Promise<any>> = [];
  if (map[WHATSAPP_SETTING_KEYS.method] === undefined) {
    missingUpserts.push(upsertSystemSetting(WHATSAPP_SETTING_KEYS.method, 'POST', 'WhatsApp provider HTTP method'));
  }
  if (map[WHATSAPP_SETTING_KEYS.timeoutMs] === undefined) {
    missingUpserts.push(upsertSystemSetting(WHATSAPP_SETTING_KEYS.timeoutMs, '8000', 'WhatsApp request timeout (ms)'));
  }
  if (needsHeadersSeed) {
    missingUpserts.push(upsertSystemSetting(WHATSAPP_SETTING_KEYS.headersJson, defaultHeadersJson, 'WhatsApp provider headers JSON'));
  }
  if (needsBodySeed) {
    missingUpserts.push(upsertSystemSetting(WHATSAPP_SETTING_KEYS.bodyTemplateJson, defaultBodyTemplateJson, 'WhatsApp provider body template JSON'));
  }
  if (needsNumberKeySeed) {
    missingUpserts.push(upsertSystemSetting(WHATSAPP_SETTING_KEYS.numberKey, 'ALL', 'WhatsApp provider number key (Watzap)'));
  }
  if (missingUpserts.length > 0) {
    await Promise.all(missingUpserts);
  }

  const headersJson = needsHeadersSeed ? defaultHeadersJson : (map[WHATSAPP_SETTING_KEYS.headersJson] ?? defaultHeadersJson);
  const bodyTemplateJson = needsBodySeed ? defaultBodyTemplateJson : (map[WHATSAPP_SETTING_KEYS.bodyTemplateJson] ?? defaultBodyTemplateJson);
  const numberKey = map[WHATSAPP_SETTING_KEYS.numberKey] ?? 'ALL';

  return NextResponse.json({
    enabled: map[WHATSAPP_SETTING_KEYS.enabled] ?? 'false',
    url: map[WHATSAPP_SETTING_KEYS.url] ?? '',
    method: map[WHATSAPP_SETTING_KEYS.method] ?? 'POST',
    apiKey: map[WHATSAPP_SETTING_KEYS.apiKey] ?? '',
    numberKey,
    headersJson,
    bodyTemplateJson,
    restaurantTo: map[WHATSAPP_SETTING_KEYS.restaurantTo] ?? '',
    housekeepingTo: map[WHATSAPP_SETTING_KEYS.housekeepingTo] ?? '',
    timeoutMs: map[WHATSAPP_SETTING_KEYS.timeoutMs] ?? '8000',
  });
}

export async function POST(req: Request) {
  const auth = await getAuthUser();
  if (!auth || !canWriteSettings(auth.role, auth.permissions)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();

    const enabled = normalizeString(body.enabled);
    const url = normalizeString(body.url);
    const method = normalizeString(body.method || 'POST').toUpperCase();
    const apiKey = normalizeString(body.apiKey);
    const numberKey = normalizeString(body.numberKey || 'ALL');
    const headersJson = normalizeString(body.headersJson);
    const bodyTemplateJson = normalizeString(body.bodyTemplateJson);
    const restaurantTo = normalizeString(body.restaurantTo);
    const housekeepingTo = normalizeString(body.housekeepingTo);
    const timeoutMs = normalizeString(body.timeoutMs || '8000');

    await Promise.all([
      upsertSystemSetting(WHATSAPP_SETTING_KEYS.enabled, enabled, 'Enable/disable WhatsApp notifications'),
      upsertSystemSetting(WHATSAPP_SETTING_KEYS.url, url, 'WhatsApp provider endpoint URL'),
      upsertSystemSetting(WHATSAPP_SETTING_KEYS.method, method, 'WhatsApp provider HTTP method'),
      upsertSystemSetting(WHATSAPP_SETTING_KEYS.apiKey, apiKey, 'WhatsApp provider API key/token'),
      upsertSystemSetting(WHATSAPP_SETTING_KEYS.numberKey, numberKey, 'WhatsApp provider number key (Watzap)'),
      upsertSystemSetting(WHATSAPP_SETTING_KEYS.headersJson, headersJson, 'WhatsApp provider headers JSON'),
      upsertSystemSetting(WHATSAPP_SETTING_KEYS.bodyTemplateJson, bodyTemplateJson, 'WhatsApp provider body template JSON'),
      upsertSystemSetting(WHATSAPP_SETTING_KEYS.restaurantTo, restaurantTo, 'Restaurant team recipients'),
      upsertSystemSetting(WHATSAPP_SETTING_KEYS.housekeepingTo, housekeepingTo, 'Housekeeping team recipients'),
      upsertSystemSetting(WHATSAPP_SETTING_KEYS.timeoutMs, timeoutMs, 'WhatsApp request timeout (ms)'),
    ]);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to save settings' }, { status: 500 });
  }
}
