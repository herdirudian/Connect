import { NextResponse } from 'next/server';
import { sendMattaFairVoucherEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { fullName, whatsapp, email, city } = await req.json();

    if (!fullName || !whatsapp || !email || !city) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      );
    }

    // Generate unique QR code for Matta Fair redemption
    const qrCode = `MTF-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Save to database
    try {
      await prisma.mattaFairRegistration.create({
        data: {
          fullName: fullName,
          whatsapp: whatsapp,
          email: email,
          city: city,
          voucherCode: qrCode,
        }
      });
    } catch (dbError) {
      console.error('Database logging failed:', dbError);
      // Continue even if DB fails, as long as email is sent
    }

    // Send the e-voucher email
    await sendMattaFairVoucherEmail(email, fullName, qrCode);

    return NextResponse.json({ 
      message: 'Registration successful! Please check your email for the e-voucher.' 
    });
  } catch (error) {
    console.error('Matta Fair API Error:', error);
    return NextResponse.json(
      { message: 'Internal server error. Please try again later.' },
      { status: 500 }
    );
  }
}
