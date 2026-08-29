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

    /* 
    // Save to database (Optional: Add MattaFairRegistration model to schema if needed)
    try {
      // For now, we skip database logging to avoid build errors 
      // as the model ContactMessage does not exist in the schema.
    } catch (dbError) {
      console.error('Database logging failed:', dbError);
    }
    */

    // Generate unique QR code for Matta Fair redemption
    const qrCode = `MTF-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

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
