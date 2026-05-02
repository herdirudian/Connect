import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/serverAuth';
import { PERMISSIONS } from '@/lib/permissions';
import { getSystemSettings, upsertSystemSetting } from '@/lib/systemSettings';
import { KTP_PROMO_SETTING_KEYS, deriveFlatListsFromRegions, normalizeRegionTree, safeJsonParse } from '@/lib/ktpPromoSettings';

function canManage(role: string, perms: string[]) {
  if (role === 'ADMIN') return true;
  return perms.includes(PERMISSIONS.MANAGE_PROMOS);
}

export async function GET() {
  const auth = await getAuthUser();
  if (!auth || !canManage(auth.role, auth.permissions)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const keys = Object.values(KTP_PROMO_SETTING_KEYS);
  const map = await getSystemSettings(keys);

  const regionsRaw = safeJsonParse<any>(map[KTP_PROMO_SETTING_KEYS.REGIONS], []);
  const regions = normalizeRegionTree(regionsRaw);
  const flat = deriveFlatListsFromRegions(regions);

  return NextResponse.json({
    active: String(map[KTP_PROMO_SETTING_KEYS.ACTIVE] || 'false') === 'true',
    title: String(map[KTP_PROMO_SETTING_KEYS.TITLE] || 'Promo KTP'),
    price: Number(map[KTP_PROMO_SETTING_KEYS.PRICE] || 0) || 0,
    terms: String(map[KTP_PROMO_SETTING_KEYS.TERMS] || ''),
    imageUrl: String(map[KTP_PROMO_SETTING_KEYS.IMAGE_URL] || ''),
    startDate: String(map[KTP_PROMO_SETTING_KEYS.START_DATE] || ''),
    endDate: String(map[KTP_PROMO_SETTING_KEYS.END_DATE] || ''),
    regions,
    provinces: regions.length ? flat.provinces : safeJsonParse<string[]>(map[KTP_PROMO_SETTING_KEYS.PROVINCES], []),
    regencies: regions.length ? flat.regencies : safeJsonParse<string[]>(map[KTP_PROMO_SETTING_KEYS.REGENCIES], []),
    districts: regions.length ? flat.districts : safeJsonParse<string[]>(map[KTP_PROMO_SETTING_KEYS.DISTRICTS], []),
    paymentMethods: safeJsonParse<string[]>(map[KTP_PROMO_SETTING_KEYS.PAYMENT_METHODS], []),
  });
}

export async function POST(req: Request) {
  const auth = await getAuthUser();
  if (!auth || !canManage(auth.role, auth.permissions)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const active = !!body.active;
  const title = String(body.title || 'Promo KTP').trim();
  const price = Number(body.price || 0) || 0;
  const terms = String(body.terms || '');
  const imageUrl = String(body.imageUrl || '').trim();
  const startDate = String(body.startDate || '').trim();
  const endDate = String(body.endDate || '').trim();
  const regions = normalizeRegionTree(body.regions);
  const flat = deriveFlatListsFromRegions(regions);
  const provinces = regions.length ? flat.provinces : (Array.isArray(body.provinces) ? body.provinces.map(String).map((s: string) => s.trim()).filter(Boolean) : []);
  const regencies = regions.length ? flat.regencies : (Array.isArray(body.regencies) ? body.regencies.map(String).map((s: string) => s.trim()).filter(Boolean) : []);
  const districts = regions.length ? flat.districts : (Array.isArray(body.districts) ? body.districts.map(String).map((s: string) => s.trim()).filter(Boolean) : []);
  const paymentMethods = Array.isArray(body.paymentMethods) ? body.paymentMethods.map(String).map((s: string) => s.trim()).filter(Boolean) : [];

  await Promise.all([
    upsertSystemSetting(KTP_PROMO_SETTING_KEYS.ACTIVE, active ? 'true' : 'false', 'Enable/disable KTP promo ticket'),
    upsertSystemSetting(KTP_PROMO_SETTING_KEYS.TITLE, title, 'KTP promo ticket title'),
    upsertSystemSetting(KTP_PROMO_SETTING_KEYS.PRICE, String(price), 'KTP promo ticket price (IDR)'),
    upsertSystemSetting(KTP_PROMO_SETTING_KEYS.TERMS, terms, 'KTP promo terms and conditions'),
    upsertSystemSetting(KTP_PROMO_SETTING_KEYS.IMAGE_URL, imageUrl, 'KTP promo image URL'),
    upsertSystemSetting(KTP_PROMO_SETTING_KEYS.START_DATE, startDate, 'KTP promo period start date (YYYY-MM-DD)'),
    upsertSystemSetting(KTP_PROMO_SETTING_KEYS.END_DATE, endDate, 'KTP promo period end date (YYYY-MM-DD)'),
    upsertSystemSetting(KTP_PROMO_SETTING_KEYS.REGIONS, JSON.stringify(regions), 'KTP promo region tree'),
    upsertSystemSetting(KTP_PROMO_SETTING_KEYS.PROVINCES, JSON.stringify(provinces), 'KTP promo provinces list'),
    upsertSystemSetting(KTP_PROMO_SETTING_KEYS.REGENCIES, JSON.stringify(regencies), 'KTP promo regencies list'),
    upsertSystemSetting(KTP_PROMO_SETTING_KEYS.DISTRICTS, JSON.stringify(districts), 'KTP promo districts list'),
    upsertSystemSetting(KTP_PROMO_SETTING_KEYS.PAYMENT_METHODS, JSON.stringify(paymentMethods), 'KTP promo allowed payment methods'),
  ]);

  return NextResponse.json({ success: true });
}
