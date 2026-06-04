import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getAuthUser } from '@/lib/serverAuth';

export async function GET(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const secure = process.env.SMTP_SECURE;
    const from = process.env.FROM_EMAIL;

    // Mask password
    const pass = process.env.SMTP_PASS ? '********' : 'NOT_SET';

    const config = {
      host,
      port,
      user: smtpUser,
      pass_status: pass,
      secure,
      from,
    };

    // Attempt connection verification
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === '1',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    let verifyResult = 'Pending';
    try {
        await transporter.verify();
        verifyResult = 'Success';
    } catch (e: any) {
        verifyResult = `Failed: ${e.message}`;
    }

    return NextResponse.json({
      config,
      verifyConnection: verifyResult,
      env_check: 'v1.0'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
