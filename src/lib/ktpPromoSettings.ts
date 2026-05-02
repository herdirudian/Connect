export const KTP_PROMO_SETTING_KEYS = {
  ACTIVE: 'KTP_PROMO_ACTIVE',
  TITLE: 'KTP_PROMO_TITLE',
  PRICE: 'KTP_PROMO_PRICE',
  TERMS: 'KTP_PROMO_TERMS',
  IMAGE_URL: 'KTP_PROMO_IMAGE_URL',
  START_DATE: 'KTP_PROMO_START_DATE',
  END_DATE: 'KTP_PROMO_END_DATE',
  REGIONS: 'KTP_PROMO_REGIONS',
  PROVINCES: 'KTP_PROMO_PROVINCES',
  REGENCIES: 'KTP_PROMO_REGENCIES',
  DISTRICTS: 'KTP_PROMO_DISTRICTS',
  PAYMENT_METHODS: 'KTP_PROMO_PAYMENT_METHODS',
} as const;

export type KtpPromoRegion = {
  province: string;
  regencies: Array<{
    name: string;
    districts: string[];
  }>;
};

export type KtpPromoSettings = {
  active: boolean;
  title: string;
  price: number;
  terms: string;
  imageUrl?: string;
  startDate?: string;
  endDate?: string;
  regions: KtpPromoRegion[];
  provinces: string[];
  regencies: string[];
  districts: string[];
  paymentMethods: string[];
};

export function normalizeLinesToList(input: string) {
  return String(input || '')
    .split(/\r?\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function safeJsonParse<T>(v: string | undefined, fallback: T): T {
  try {
    if (!v) return fallback;
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}

export function normalizeRegionTree(input: unknown): KtpPromoRegion[] {
  if (!Array.isArray(input)) return [];
  const regions: KtpPromoRegion[] = [];
  for (const r of input) {
    const province = String((r as any)?.province || '').trim();
    if (!province) continue;
    const regenciesRaw = Array.isArray((r as any)?.regencies) ? (r as any).regencies : [];
    const regencies: KtpPromoRegion['regencies'] = [];
    for (const g of regenciesRaw) {
      const name = String((g as any)?.name || '').trim();
      if (!name) continue;
      const districtsRaw = Array.isArray((g as any)?.districts) ? (g as any).districts : [];
      const districts = districtsRaw.map((d: any) => String(d || '').trim()).filter(Boolean);
      regencies.push({ name, districts });
    }
    regions.push({ province, regencies });
  }
  return regions;
}

export function deriveFlatListsFromRegions(regions: KtpPromoRegion[]) {
  const provinces = regions.map((r) => r.province);
  const regencies = regions.flatMap((r) => r.regencies.map((g) => g.name));
  const districts = regions.flatMap((r) => r.regencies.flatMap((g) => g.districts));
  return { provinces, regencies, districts };
}
