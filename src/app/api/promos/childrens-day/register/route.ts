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
      agreedToPrivacy 
    } = body;

    // Validate input
    if (!parentName || !parentPhone || !parentEmail || !parentCity || !childName || childAge === undefined || !visitDate || !agreedToPrivacy) {
      return NextResponse.json({ error: 'Mohon lengkapi semua data dan setujui Kebijakan Privasi' }, { status: 400 });
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

    // Check quota (Maximum 3000 participants)
    const currentCount = await prisma.childrensDayRegistration.count();
    if (currentCount >= 3000) {
      return NextResponse.json({ error: 'Mohon maaf, kuota Promo Hari Anak Nasional (3000 peserta) telah terpenuhi.' }, { status: 403 });
    }

    // Check duplicate (optional, but good to have)
    const existingRegistration = await prisma.childrensDayRegistration.findFirst({
      where: {
        OR: [
          { parentEmail },
          { parentPhone }
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
        parentPhone,
        parentEmail,
        parentCity,
        childName,
        childAge: parseInt(childAge.toString(), 10),
        visitDate,
        agreedToPrivacy
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
