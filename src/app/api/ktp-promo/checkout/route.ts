import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { hashPassword, generateReferralCode } from '@/lib/auth';
import { Invoice } from '@/lib/xendit';
import { createXenditPaymentRequest } from '@/lib/xendit-payment';
import { PAYMENT_METHODS, calculateFee } from '@/lib/fees';
import { sendBookingPendingEmail } from '@/lib/email';
import { getSystemSettings } from '@/lib/systemSettings';
import { KTP_PROMO_SETTING_KEYS, normalizeRegionTree, safeJsonParse } from '@/lib/ktpPromoSettings';
import { Prisma } from '@prisma/client';

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(6),
  province: z.string().min(1),
  regency: z.string().min(1),
  district: z.string().min(1),
  visitDate: z.string().min(1),
  paymentMethod: z.string().min(1),
  termsAccepted: z.boolean(),
});

function buildFieldErrorsFromZod(err: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = String(issue.path?.[0] || '');
    if (!key || out[key]) continue;
    if (issue.code === 'invalid_type' || issue.code === 'too_small') {
      out[key] = 'Wajib diisi';
      continue;
    }
    if (key === 'email') out[key] = 'Email tidak valid';
    else if (key === 'phone') out[key] = 'No HP minimal 6 digit';
    else if (key === 'termsAccepted') out[key] = 'Wajib dicentang';
    else out[key] = 'Wajib diisi';
  }
  return out;
}

function normalizeChoice(input: string, choices: string[]) {
  const t = String(input || '').trim();
  if (!t) return null;
  if (!choices || choices.length === 0) return t;
  const match = choices.find((c) => c.toLowerCase() === t.toLowerCase());
  return match || null;
}

function findCaseInsensitive(input: string, choices: string[]) {
  const t = String(input || '').trim();
  if (!t) return null;
  const match = choices.find((c) => String(c).toLowerCase() === t.toLowerCase());
  return match || null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    const map = await getSystemSettings(Object.values(KTP_PROMO_SETTING_KEYS));
    const active = String(map[KTP_PROMO_SETTING_KEYS.ACTIVE] || 'false') === 'true';
    if (!active) return NextResponse.json({ error: 'Promo tidak aktif' }, { status: 400 });

    const title = String(map[KTP_PROMO_SETTING_KEYS.TITLE] || 'Promo KTP').trim();
    const price = Number(map[KTP_PROMO_SETTING_KEYS.PRICE] || 0) || 0;
    if (!Number.isFinite(price) || price <= 0) return NextResponse.json({ error: 'Harga promo belum diset' }, { status: 400 });

    const startDate = String(map[KTP_PROMO_SETTING_KEYS.START_DATE] || '').trim();
    const endDate = String(map[KTP_PROMO_SETTING_KEYS.END_DATE] || '').trim();
    const regions = normalizeRegionTree(safeJsonParse<any>(map[KTP_PROMO_SETTING_KEYS.REGIONS], []));
    const provinces = safeJsonParse<string[]>(map[KTP_PROMO_SETTING_KEYS.PROVINCES], []);
    const regencies = safeJsonParse<string[]>(map[KTP_PROMO_SETTING_KEYS.REGENCIES], []);
    const districts = safeJsonParse<string[]>(map[KTP_PROMO_SETTING_KEYS.DISTRICTS], []);
    const allowedMethods = safeJsonParse<string[]>(map[KTP_PROMO_SETTING_KEYS.PAYMENT_METHODS], []);
    const terms = String(map[KTP_PROMO_SETTING_KEYS.TERMS] || '');

    if (!data.termsAccepted) {
      return NextResponse.json(
        { error: 'Wajib menyetujui Terms & Conditions', fieldErrors: { termsAccepted: 'Wajib dicentang' } },
        { status: 400 }
      );
    }

    const visitStr = String(data.visitDate || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(visitStr)) {
      return NextResponse.json(
        { error: 'Tanggal kunjungan tidak valid', fieldErrors: { visitDate: 'Tanggal kunjungan tidak valid' } },
        { status: 400 }
      );
    }
    const visitDate = new Date(`${visitStr}T00:00:00.000Z`);
    if (isNaN(visitDate.getTime())) {
      return NextResponse.json(
        { error: 'Tanggal kunjungan tidak valid', fieldErrors: { visitDate: 'Tanggal kunjungan tidak valid' } },
        { status: 400 }
      );
    }
    if (startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      const start = new Date(`${startDate}T00:00:00.000Z`);
      if (visitDate < start) {
        return NextResponse.json(
          { error: 'Tanggal kunjungan di luar periode promo', fieldErrors: { visitDate: 'Tanggal kunjungan di luar periode promo' } },
          { status: 400 }
        );
      }
    }
    if (endDate && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      const end = new Date(`${endDate}T23:59:59.999Z`);
      if (visitDate > end) {
        return NextResponse.json(
          { error: 'Tanggal kunjungan di luar periode promo', fieldErrors: { visitDate: 'Tanggal kunjungan di luar periode promo' } },
          { status: 400 }
        );
      }
    }

    let province = '';
    let regency = '';
    let district = '';

    if (regions.length > 0) {
      const provinceMatch = regions.find((r) => String(r.province).toLowerCase() === String(data.province).trim().toLowerCase());
      if (!provinceMatch) {
        return NextResponse.json({ error: 'Provinsi tidak valid', fieldErrors: { province: 'Provinsi tidak valid' } }, { status: 400 });
      }
      province = provinceMatch.province;

      const regencyMatch = provinceMatch.regencies.find((g) => String(g.name).toLowerCase() === String(data.regency).trim().toLowerCase());
      if (!regencyMatch) {
        return NextResponse.json({ error: 'Kabupaten/Kota tidak valid', fieldErrors: { regency: 'Kabupaten/Kota tidak valid' } }, { status: 400 });
      }
      regency = regencyMatch.name;

      const districtMatch = findCaseInsensitive(data.district, regencyMatch.districts || []);
      if (!districtMatch) {
        return NextResponse.json({ error: 'Kecamatan tidak valid', fieldErrors: { district: 'Kecamatan tidak valid' } }, { status: 400 });
      }
      district = districtMatch;
    } else {
      const p = normalizeChoice(data.province, provinces);
      const r = normalizeChoice(data.regency, regencies);
      const d = normalizeChoice(data.district, districts);
      if (!p) return NextResponse.json({ error: 'Provinsi tidak valid', fieldErrors: { province: 'Provinsi tidak valid' } }, { status: 400 });
      if (!r) return NextResponse.json({ error: 'Kabupaten/Kota tidak valid', fieldErrors: { regency: 'Kabupaten/Kota tidak valid' } }, { status: 400 });
      if (!d) return NextResponse.json({ error: 'Kecamatan tidak valid', fieldErrors: { district: 'Kecamatan tidak valid' } }, { status: 400 });
      province = p;
      regency = r;
      district = d;
    }

    const paymentMethod = String(data.paymentMethod).trim();
    if (allowedMethods.length > 0 && !allowedMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Metode pembayaran tidak diizinkan', fieldErrors: { paymentMethod: 'Metode pembayaran tidak diizinkan' } },
        { status: 400 }
      );
    }
    const methodConfig = PAYMENT_METHODS.find((m) => m.id === paymentMethod);
    if (!methodConfig) {
      return NextResponse.json(
        { error: 'Metode pembayaran tidak valid', fieldErrors: { paymentMethod: 'Metode pembayaran tidak valid' } },
        { status: 400 }
      );
    }

    let user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
      const hashedPassword = await hashPassword(tempPassword);
      let newReferralCode = generateReferralCode(data.name);
      let retries = 0;
      while (retries < 5 && (await prisma.user.findUnique({ where: { referralCode: newReferralCode } }))) {
        newReferralCode = generateReferralCode(data.name);
        retries++;
      }
      user = await prisma.user.create({
        data: {
          name: data.name,
          email: data.email,
          password: hashedPassword,
          phoneNumber: data.phone,
          role: 'MEMBER',
          referralCode: newReferralCode,
          isVerified: false,
        },
      });
    }

    const subtotal = price;
    const adminFee = calculateFee(subtotal, paymentMethod);
    const finalAmount = subtotal + adminFee;

    const bookingDetails = {
      recipientEmail: data.email,
      guestName: data.name,
      guestPhone: data.phone,
      items: [{ id: 'KTP_PROMO', name: title, qty: 1, price }],
      adminFee,
      originalSubtotal: subtotal,
      originalAmount: subtotal + adminFee,
      ktpPromo: {
        province,
        regency,
        district,
        visitDate: visitStr,
        termsSnapshot: terms,
        acceptedAt: new Date().toISOString(),
      },
    };

    const booking = await prisma.$transaction(
      async (tx) => {
        return tx.booking.create({
          data: {
            userId: user!.id,
            type: 'WAHANA',
            details: JSON.stringify(bookingDetails),
            date: visitDate,
            status: 'PENDING',
            paymentStatus: 'PENDING',
            amount: finalAmount,
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      }
    );

    let paymentId = '';
    let paymentUrl = '';
    let paymentInfo: any = null;
    let paymentRequest: any = null;

    const envUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const defaultUrl = 'https://family.thelodgegroup.id';
    const appUrl = /connect\.thelodgegroup\.id/.test(envUrl) || !envUrl ? defaultUrl : envUrl;
    const successRedirectUrl = `${appUrl}/promo/ktp?status=success&bookingId=${booking.id}`;
    const failureRedirectUrl = `${appUrl}/promo/ktp?status=failed&bookingId=${booking.id}`;

    try {
      const pr = await createXenditPaymentRequest(
        booking.id,
        booking.amount,
        paymentMethod,
        { id: user.id, email: user.email, name: user.name, phone: user.phoneNumber || undefined },
        `${title} - ${user.name}`,
        { success: successRedirectUrl, failure: failureRedirectUrl }
      );

      if (pr) {
        paymentRequest = pr;
        paymentId = pr.id;
        const action = pr.actions?.find((a: any) => a.action === 'PRESENT_TO_CUSTOMER');
        if (action?.url) paymentUrl = action.url;

        let vaNumber = '';
        let qrString = '';
        let otcCode = '';
        if (pr.paymentMethod?.virtualAccount?.channelProperties?.virtualAccountNumber) {
          vaNumber = pr.paymentMethod.virtualAccount.channelProperties.virtualAccountNumber;
        }
        if (pr.paymentMethod?.qrCode?.channelProperties?.qrString) {
          qrString = pr.paymentMethod.qrCode.channelProperties.qrString;
        }
        if (pr.paymentMethod?.overTheCounter && (pr.paymentMethod.overTheCounter as any).channelProperties?.paymentCode) {
          otcCode = (pr.paymentMethod.overTheCounter as any).channelProperties.paymentCode;
        }
        if (!paymentUrl) paymentUrl = `${appUrl}/dashboard/bookings`;

        paymentInfo = { method: paymentMethod, vaNumber, qrString, otcCode, isPaymentRequest: true };
      }
    } catch {}

    if (!paymentRequest) {
      const xenditPaymentMethods = methodConfig?.xenditCodes;
      const invoice = await Invoice.createInvoice({
        data: {
          externalId: booking.id,
          amount: booking.amount,
          payerEmail: user.email,
          description: `${title} - ${user.name}`,
          invoiceDuration: 86400,
          currency: 'IDR',
          paymentMethods: xenditPaymentMethods,
          successRedirectUrl,
          failureRedirectUrl,
        },
      });
      paymentId = invoice.id || '';
      paymentUrl = invoice.invoiceUrl || '';
    }

    const detailsObj = JSON.parse(booking.details);
    if (paymentInfo) detailsObj.paymentInfo = paymentInfo;
    const updatedBooking = await prisma.booking.update({
      where: { id: booking.id },
      data: { paymentId, paymentUrl, details: JSON.stringify(detailsObj) },
    });

    await sendBookingPendingEmail(data.email, user.name, booking.id, booking.amount, paymentUrl);

    return NextResponse.json({ booking: updatedBooking, paymentUrl });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Data belum lengkap', fieldErrors: buildFieldErrorsFromZod(error) },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message || 'Gagal membuat booking' }, { status: 500 });
  }
}
