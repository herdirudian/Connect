import { NextResponse } from 'next/server';
import { notifyRoomServiceOrderPaid } from '@/lib/whatsapp';
import { prisma } from '@/lib/prisma';
import { getSystemSettings } from '@/lib/systemSettings';
import { WHATSAPP_SETTING_KEYS } from '@/lib/whatsapp';
import { PERMISSIONS } from '@/lib/permissions';
import { getAuthUser } from '@/lib/serverAuth';

async function canResend() {
  const auth = await getAuthUser();
  if (!auth) return false;
  if (auth.role === 'ADMIN') return true;
  return auth.permissions.includes(PERMISSIONS.MANAGE_WHATSAPP);
}

function splitRecipients(v?: string) {
  return String(v || '')
    .split(/[,;\n\r\t ]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

async function resolveId(prefixOrId: string, model: 'foodOrder' | 'housekeepingOrder') {
  const trimmed = String(prefixOrId || '').trim();
  if (!trimmed) return { ok: false as const, error: 'EMPTY' as const };

  if (trimmed.length >= 20) {
    const found = model === 'foodOrder'
      ? await prisma.foodOrder.findUnique({ where: { id: trimmed }, select: { id: true } })
      : await prisma.housekeepingOrder.findUnique({ where: { id: trimmed }, select: { id: true } });
    if (!found) return { ok: false as const, error: 'NOT_FOUND' as const };
    return { ok: true as const, id: found.id };
  }

  const list = model === 'foodOrder'
    ? await prisma.foodOrder.findMany({ where: { id: { startsWith: trimmed } }, select: { id: true }, take: 2 })
    : await prisma.housekeepingOrder.findMany({ where: { id: { startsWith: trimmed } }, select: { id: true }, take: 2 });

  if (list.length === 0) return { ok: false as const, error: 'NOT_FOUND' as const };
  if (list.length > 1) return { ok: false as const, error: 'AMBIGUOUS' as const, matches: list.map((x) => x.id) };
  return { ok: true as const, id: list[0].id };
}

export async function POST(req: Request) {
  if (!(await canResend())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await req.json();
    const foodOrderInput = body.foodOrderId ? String(body.foodOrderId).trim() : '';
    const hkOrderInput = body.hkOrderId ? String(body.hkOrderId).trim() : '';

    if (!foodOrderInput && !hkOrderInput) {
      return NextResponse.json({ error: 'foodOrderId atau hkOrderId wajib diisi' }, { status: 400 });
    }

    const resolvedFood = foodOrderInput ? await resolveId(foodOrderInput, 'foodOrder') : null;
    const resolvedHK = hkOrderInput ? await resolveId(hkOrderInput, 'housekeepingOrder') : null;

    if (resolvedFood && !resolvedFood.ok) {
      return NextResponse.json({ error: `Food Order ID tidak ditemukan/ambigu: ${resolvedFood.error}`, details: resolvedFood }, { status: 400 });
    }
    if (resolvedHK && !resolvedHK.ok) {
      return NextResponse.json({ error: `Housekeeping Order ID tidak ditemukan/ambigu: ${resolvedHK.error}`, details: resolvedHK }, { status: 400 });
    }

    const foodOrderId = resolvedFood && resolvedFood.ok ? resolvedFood.id : null;
    const hkOrderId = resolvedHK && resolvedHK.ok ? resolvedHK.id : null;

    const settings = await getSystemSettings([
      WHATSAPP_SETTING_KEYS.restaurantTo,
      WHATSAPP_SETTING_KEYS.housekeepingTo,
    ]);

    const restoRecipients = splitRecipients(settings[WHATSAPP_SETTING_KEYS.restaurantTo]);
    const hkRecipients = splitRecipients(settings[WHATSAPP_SETTING_KEYS.housekeepingTo]);

    const warnings: string[] = [];
    if (foodOrderId && restoRecipients.length === 0) warnings.push('Nomor WhatsApp Team Restoran masih kosong');
    if (hkOrderId && hkRecipients.length === 0) warnings.push('Nomor WhatsApp Team Housekeeping masih kosong');

    const result = await notifyRoomServiceOrderPaid({ foodOrderId, hkOrderId });
    if (!result.ok) {
      return NextResponse.json({ success: false, resolved: { foodOrderId, hkOrderId }, warnings, ...result }, { status: 400 });
    }

    if ((result as any).results?.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tidak ada pesan yang dikirim (results kosong)',
          resolved: { foodOrderId, hkOrderId },
          warnings,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, resolved: { foodOrderId, hkOrderId }, warnings, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to resend' }, { status: 500 });
  }
}
