import nodemailer from 'nodemailer';
import QRCode from 'qrcode';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendVerificationEmail(to: string, code: string) {
  const mailOptions = {
    from: process.env.FROM_EMAIL,
    to,
    subject: 'Kode Verifikasi - The Lodge Connect',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #2e7d32; margin: 0;">The Lodge Connect</h2>
        </div>
        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; text-align: center;">
          <p style="margin-top: 0;">Kode verifikasi Anda adalah:</p>
          <h1 style="letter-spacing: 5px; color: #1b5e20; font-size: 32px; margin: 10px 0;">${code}</h1>
          <p style="color: #666; font-size: 14px;">Kode ini akan kadaluarsa dalam 15 menit.</p>
        </div>
        <p style="margin-top: 20px; font-size: 13px; color: #888; text-align: center;">
          Jika Anda tidak meminta kode ini, silakan abaikan email ini.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${to}`);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Gagal mengirim email verifikasi');
  }
}

export async function sendPasswordResetEmail(to: string, resetLink: string) {
  const mailOptions = {
    from: process.env.FROM_EMAIL,
    to,
    subject: 'Reset Password - The Lodge Connect',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #2e7d32; margin: 0;">The Lodge Connect</h2>
        </div>
        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; text-align: center;">
          <p style="margin-top: 0;">Kami menerima permintaan untuk mereset password Anda.</p>
          <p>Klik tombol di bawah ini untuk membuat password baru:</p>
          
          <a href="${resetLink}" style="display: inline-block; background-color: #2e7d32; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0;">Reset Password</a>
          
          <p style="color: #666; font-size: 14px;">Atau salin link berikut ke browser Anda:</p>
          <p style="color: #666; font-size: 12px; word-break: break-all;">${resetLink}</p>
          
          <p style="color: #666; font-size: 14px; margin-top: 20px;">Link ini akan kadaluarsa dalam 1 jam.</p>
        </div>
        <p style="margin-top: 20px; font-size: 13px; color: #888; text-align: center;">
          Jika Anda tidak meminta reset password, abaikan email ini. Akun Anda tetap aman.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${to}`);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Gagal mengirim email reset password');
  }
}

export async function sendRewardClaimEmail(to: string, userName: string, rewardName: string, voucherCode: string) {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(voucherCode);
    
    const mailOptions = {
      from: process.env.FROM_EMAIL,
      to,
      subject: `Tiket/Voucher Anda: ${rewardName} - The Lodge Connect`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #2e7d32; margin: 0;">The Lodge Connect</h2>
          </div>
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; text-align: center;">
            <p style="margin-top: 0; font-size: 16px;">Halo <strong>${userName}</strong>,</p>
            <p>Terima kasih telah menukarkan poin Anda. Berikut adalah detail tiket/voucher Anda:</p>
            
            <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px dashed #2e7d32;">
              <h3 style="color: #1b5e20; margin: 0 0 10px 0;">${rewardName}</h3>
              <p style="margin: 5px 0; font-size: 14px; color: #666;">Kode Voucher:</p>
              <code style="background: #eee; padding: 5px 10px; border-radius: 4px; font-size: 18px; font-weight: bold; letter-spacing: 1px;">${voucherCode}</code>
              
              <div style="margin-top: 20px;">
                <img src="cid:qrcode" alt="QR Code" style="width: 200px; height: 200px;" />
              </div>
              <p style="font-size: 12px; color: #888; margin-top: 10px;">Tunjukkan QR Code ini kepada petugas kami untuk ditukarkan.</p>
            </div>
          </div>
          <p style="margin-top: 20px; font-size: 13px; color: #888; text-align: center;">
            Simpan email ini sebagai bukti penukaran Anda.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: 'qrcode.png',
          path: qrCodeDataUrl,
          cid: 'qrcode'
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    console.log(`Reward claim email sent to ${to}`);
  } catch (error) {
    console.error('Error sending reward claim email:', error);
    // Don't throw error here to avoid blocking the redemption process if email fails
  }
}

export async function sendPartnerPromoEmail(to: string, userName: string, promoTitle: string, promoCode: string) {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(promoCode);
    
    const mailOptions = {
      from: process.env.FROM_EMAIL,
      to,
      subject: `Voucher Promo Partner: ${promoTitle} - The Lodge Connect`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #2e7d32; margin: 0;">The Lodge Connect</h2>
          </div>
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; text-align: center;">
            <p style="margin-top: 0; font-size: 16px;">Halo <strong>${userName}</strong>,</p>
            <p>Selamat! Anda telah mengklaim promo partner berikut:</p>
            
            <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px dashed #2e7d32;">
              <h3 style="color: #1b5e20; margin: 0 0 10px 0;">${promoTitle}</h3>
              <p style="margin: 5px 0; font-size: 14px; color: #666;">Kode Promo:</p>
              <code style="background: #eee; padding: 5px 10px; border-radius: 4px; font-size: 18px; font-weight: bold; letter-spacing: 1px;">${promoCode}</code>
              
              <div style="margin-top: 20px;">
                <img src="cid:qrcode" alt="QR Code" style="width: 200px; height: 200px;" />
              </div>
              <p style="font-size: 12px; color: #888; margin-top: 10px;">Tunjukkan QR Code atau Kode Promo ini ke partner kami.</p>
            </div>
            
            <p style="font-size: 14px;">Terima kasih telah menjadi bagian dari The Lodge Connect.</p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
            &copy; ${new Date().getFullYear()} The Lodge Group. All rights reserved.
          </div>
        </div>
      `,
      attachments: [
        {
          filename: 'qrcode.png',
          content: qrCodeDataUrl.split('base64,')[1],
          encoding: 'base64',
          cid: 'qrcode' 
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    console.log(`Partner promo email sent to ${to}`);
  } catch (error) {
    console.error('Error sending partner promo email:', error);
    // Don't throw error to avoid failing the claim process if email fails
  }
}

export async function sendBookingPendingEmail(to: string, userName: string, bookingId: string, amount: number, paymentUrl: string) {
  const mailOptions = {
    from: process.env.FROM_EMAIL,
    to,
    subject: `Menunggu Pembayaran - Family The Lodge`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #2e7d32; margin: 0;">Family The Lodge</h2>
        </div>
        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; text-align: center;">
          <p style="margin-top: 0; font-size: 16px;">Halo <strong>${userName}</strong>,</p>
          <p>Terima kasih atas pemesanan Anda. Mohon segera selesaikan pembayaran Anda.</p>
          
          <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #ddd;">
            <p style="margin: 5px 0; font-size: 14px; color: #666;">Booking ID:</p>
            <p style="font-weight: bold; margin-bottom: 10px;">${bookingId}</p>
            
            <p style="margin: 5px 0; font-size: 14px; color: #666;">Total Tagihan:</p>
            <h3 style="color: #1b5e20; margin: 0 0 15px 0;">${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)}</h3>
            
            <a href="${paymentUrl}" style="display: inline-block; background-color: #2e7d32; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Bayar Sekarang</a>
          </div>
          
          <p style="font-size: 13px; color: #666;">
            Jika tombol di atas tidak berfungsi, silakan klik link berikut:<br>
            <a href="${paymentUrl}" style="color: #2e7d32;">${paymentUrl}</a>
          </p>
        </div>
        <p style="margin-top: 20px; font-size: 13px; color: #888; text-align: center;">
          Harap selesaikan pembayaran dalam 24 jam.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Pending booking email sent to ${to}`);
  } catch (error) {
    console.error('Error sending pending booking email:', error);
  }
}

export async function sendBookingSuccessEmail(to: string, userName: string, bookingId: string, type: string, amount: number) {
  try {
    // Generate QR Code for Booking ID
    const qrCodeDataUrl = await QRCode.toDataURL(bookingId);
    
    const mailOptions = {
      from: process.env.FROM_EMAIL,
      to,
      subject: `Pembayaran Berhasil - The Lodge Connect`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #2e7d32; margin: 0;">The Lodge Connect</h2>
          </div>
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; text-align: center;">
            <p style="margin-top: 0; font-size: 16px;">Halo <strong>${userName}</strong>,</p>
            <p>Pembayaran Anda telah berhasil dikonfirmasi!</p>
            
            <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px dashed #2e7d32;">
              <h3 style="color: #1b5e20; margin: 0 0 5px 0;">${type}</h3>
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Booking ID: ${bookingId}</p>
              
              <div style="margin-top: 20px;">
                <img src="cid:qrcode" alt="QR Code" style="width: 200px; height: 200px;" />
              </div>
              <p style="font-size: 12px; color: #888; margin-top: 10px;">Tunjukkan QR Code ini di loket masuk.</p>
            </div>
            
            <p style="font-size: 14px;">Total Dibayar: <strong>${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)}</strong></p>
          </div>
          <p style="margin-top: 20px; font-size: 13px; color: #888; text-align: center;">
            Simpan email ini sebagai bukti pembayaran Anda.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: 'qrcode.png',
          path: qrCodeDataUrl,
          cid: 'qrcode'
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    console.log(`Success booking email sent to ${to}`);
  } catch (error) {
    console.error('Error sending success booking email:', error);
  }
}

export async function sendBookingNotificationToReception(
  to: string,
  customerName: string,
  customerPhone: string,
  bookingId: string,
  checkInDate: string,
  items: any[]
) {
  try {
    const itemsHtml = items.map(item => `
      <div style="margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
        <strong>${item.name}</strong><br>
        Qty: ${item.qty} | Price: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(item.price)}
      </div>
    `).join('');

    const mailOptions = {
      from: process.env.FROM_EMAIL,
      to,
      subject: `New Booking Alert - ${customerName} - ${bookingId}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #2e7d32;">New Booking Notification</h2>
          <p>You have received a new booking.</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px;">
            <p><strong>Booking ID:</strong> ${bookingId}</p>
            <p><strong>Customer Name:</strong> ${customerName}</p>
            <p><strong>Customer Phone:</strong> ${customerPhone}</p>
            <p><strong>Check-in Date:</strong> ${checkInDate}</p>
          </div>

          <h3>Booking Details:</h3>
          <div style="background-color: white; padding: 15px; border: 1px solid #ddd; border-radius: 8px;">
            ${itemsHtml}
          </div>
          
          <p style="font-size: 12px; color: #888; margin-top: 20px;">
            Please check the admin dashboard for more actions.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Reception notification email sent to ${to}`);
  } catch (error) {
    console.error('Error sending reception notification email:', error);
  }
}
