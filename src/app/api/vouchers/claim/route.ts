import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendVoucherClaimEmail } from '@/lib/email';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fullName, phoneNumber, email, city, visitDate, visitorCount } = body;

    if (!fullName || !phoneNumber || !email || !city || !visitDate || !visitorCount) {
      return NextResponse.json({ error: 'Semua field wajib diisi' }, { status: 400 });
    }

    // 0. Check if this phone number OR email has already claimed a voucher
    const existingClaim = await prisma.voucherClaim.findFirst({
      where: {
        OR: [
          { email: email },
          { phoneNumber: phoneNumber }
        ]
      }
    });

    if (existingClaim) {
      return NextResponse.json({ 
        error: 'Email atau Nomor WhatsApp ini sudah pernah digunakan untuk klaim voucher diskon 20%. Satu orang hanya dapat mengklaim satu kali.' 
      }, { status: 400 });
    }

    // 1. Generate Unique Voucher Code (e.g., TLM20-XXXXX)
    const randomStr = crypto.randomBytes(3).toString('hex').toUpperCase();
    const voucherCode = `TLM20-${randomStr}`;

    // 2. Save to Database
    const claim = await prisma.voucherClaim.create({
      data: {
        fullName,
        phoneNumber,
        email,
        city,
        visitDate: new Date(visitDate),
        visitorCount,
        voucherCode,
      },
    });

    // 3. Prepare Notification Content
    const waMessage = `Halo ${fullName},
 
 Terima kasih telah berkunjung ke The Lodge Maribaya. Berikut adalah E-Voucher Diskon 20% Anda:
 
 KODE: *${voucherCode}*
 
 *Syarat & Ketentuan:*
 - Diskon 20% untuk kunjungan berikutnya.
 - Berlaku untuk Tiket Basic, Regular, & Terusan.
 - Berlaku hingga 31 Juli 2026.
 - Maksimal 10 tiket per transaksi.
 - Gunakan di: family.thelodgegroup.id/booking atau bisa diklaim pada saat kunjungan langsung di loket tiket masuk.
 
 Sampai jumpa di The Lodge Maribaya!`;

    // 4. Send Email & WhatsApp (Async)
    try {
      await sendVoucherClaimEmail(email, fullName, voucherCode);
    } catch (err) {
      console.error('Email sending failed:', err);
    }

    try {
      await sendWhatsAppMessage(phoneNumber, waMessage);
    } catch (err) {
      console.error('WhatsApp sending failed:', err);
    }

    return NextResponse.json({ 
      success: true, 
      voucherCode,
      message: 'Voucher berhasil diklaim dan dikirim ke email & WhatsApp Anda.' 
    });

  } catch (error) {
    console.error('Error claiming voucher:', error);
    return NextResponse.json({ error: 'Gagal memproses klaim voucher' }, { status: 500 });
  }
}
