import { NextResponse } from 'next/server';
import { getSystemSettings } from '@/lib/systemSettings';
import { KTP_PROMO_SETTING_KEYS, deriveFlatListsFromRegions, normalizeRegionTree, safeJsonParse } from '@/lib/ktpPromoSettings';

export async function GET() {
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
