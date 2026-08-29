import { NextResponse } from 'next/server';
import { sendMattaFairVoucherEmail } from '@/lib/email';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { fullName, whatsapp, email, city } = await req.json();

    if (!fullName || !whatsapp || !email || !city) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      );
    }

    // Save to database (optional, but good for tracking)
    // We'll use a generic contact or lead table if exists, or just send email
    try {
      await prisma.contactMessage.create({
        data: {
          name: fullName,
          email: email,
          subject: 'MATTA FAIR REGISTRATION',
          message: `WhatsApp: ${whatsapp} | City: ${city}`,
        }
      });
    } catch (dbError) {
      console.error('Database logging failed:', dbError);
      // Continue even if DB fails
    }

    // Send the e-voucher email
    await sendMattaFairVoucherEmail(email, fullName);

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
