import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendHariAnakNasionalVoucherEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      parentName, 
      parentPhone, 
      parentEmail, 
      parentCity, 
      childName, 
      childAge, 
      visitDate, 
      agreedToPrivacy,
      sponsor = 'NONE'
    } = body;

    // Validate input
    if (!parentName || !parentEmail || !parentCity || !childName || childAge === undefined || !visitDate || !agreedToPrivacy) {
      return NextResponse.json({ error: 'Mohon lengkapi semua data dan setujui Kebijakan Privasi' }, { status: 400 });
    }
    
    if (sponsor === 'NONE' && !parentPhone) {
      return NextResponse.json({ error: 'Nomor WhatsApp wajib diisi' }, { status: 400 });
    }

    // Validate date
    const allowedDates = [
      '2026-07-23', // Kamis
      '2026-07-24', // Jum'at
      '2026-07-25', // Sabtu
      '2026-07-26', // Minggu
    ];

    if (!allowedDates.includes(visitDate)) {
      return NextResponse.json({ error: 'Tanggal kunjungan tidak valid' }, { status: 400 });
    }

    // Get dynamic quota setting
    const settingKey = sponsor === 'BIODEF' ? 'promo_childrens_day_biodef_quota' : 'promo_childrens_day_quota';
    const defaultQuota = sponsor === 'BIODEF' ? 100 : 3000;
    
    const quotaSetting = await prisma.systemSetting.findUnique({
      where: { key: settingKey }
    });
    const maxQuota = quotaSetting ? parseInt(quotaSetting.value, 10) : defaultQuota;

    // Check quota
    const currentCount = await prisma.childrensDayRegistration.count({
      where: { sponsor }
    });
    if (currentCount >= maxQuota) {
      return NextResponse.json({ error: `Mohon maaf, kuota Promo Hari Anak Nasional (${maxQuota} peserta) telah terpenuhi.` }, { status: 403 });
    }

    // Check duplicate (optional, but good to have)
    const existingRegistration = await prisma.childrensDayRegistration.findFirst({
      where: {
        sponsor,
        OR: [
          { parentEmail },
          ...(parentPhone ? [{ parentPhone }] : [])
        ]
      }
    });

    if (existingRegistration) {
      return NextResponse.json({ error: 'Email atau Nomor WhatsApp ini sudah terdaftar untuk Promo Hari Anak Nasional.' }, { status: 400 });
    }

    // Create registration
    const registration = await prisma.childrensDayRegistration.create({
      data: {
        parentName,
        parentPhone: parentPhone || null,
        parentEmail,
        parentCity,
        childName,
        childAge: parseInt(childAge.toString(), 10),
        visitDate,
        agreedToPrivacy,
        sponsor
      }
    });

    // Send the E-Voucher via email
    await sendHariAnakNasionalVoucherEmail(
      parentEmail,
      parentName,
      childName,
      visitDate,
      registration.id
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Registrasi berhasil',
      registrationId: registration.id
    });

  } catch (error: any) {
    console.error('Childrens Day Registration Error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server. Silakan coba lagi.' }, { status: 500 });
  }
}
