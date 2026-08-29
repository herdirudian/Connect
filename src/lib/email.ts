import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === '1', // Handle 'true' string or '1'
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function sendVerificationEmail(to: string, code: string) {
  const mailOptions = {
    from: process.env.FROM_EMAIL,
    to,
    subject: 'Kode Verifikasi - The Lodge Maribaya',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${APP_URL}/logotlm.png" alt="The Lodge Maribaya" style="height: 48px; margin-bottom: 8px;" />
          <h2 style="color: #1b5e20; margin: 0;">The Lodge Maribaya</h2>
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
    subject: 'Reset Password - The Lodge Maribaya',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${APP_URL}/logotlm.png" alt="The Lodge Maribaya" style="height: 48px; margin-bottom: 8px;" />
          <h2 style="color: #1b5e20; margin: 0;">The Lodge Maribaya</h2>
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
      subject: `Tiket/Voucher Anda: ${rewardName} - The Lodge Maribaya`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${APP_URL}/logotlm.png" alt="The Lodge Maribaya" style="height: 48px; margin-bottom: 8px;" />
            <h2 style="color: #1b5e20; margin: 0;">The Lodge Maribaya</h2>
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
      subject: `Voucher Promo Partner: ${promoTitle} - The Lodge Maribaya`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${APP_URL}/logotlm.png" alt="The Lodge Maribaya" style="height: 48px; margin-bottom: 8px;" />
            <h2 style="color: #1b5e20; margin: 0;">The Lodge Maribaya</h2>
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
    subject: `Menunggu Pembayaran - The Lodge Maribaya`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${APP_URL}/logotlm.png" alt="The Lodge Maribaya" style="height: 48px; margin-bottom: 8px;" />
          <h2 style="color: #1b5e20; margin: 0;">E‑Voucher The Lodge Maribaya</h2>
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

export async function sendBookingSuccessEmail(
  to: string,
  userName: string,
  bookingId: string,
  type: string,
  amount: number,
  items?: Array<{ name: string; qty: number; price: number }>,
  meta?: { ktpPromo?: { province?: string; regency?: string; district?: string; visitDate?: string } }
) {
  try {
    // Generate QR Code for Booking ID
    const qrCodeDataUrl = await QRCode.toDataURL(bookingId);
    const displayType = type === 'WAHANA' ? 'E-Voucher Tiket The Lodge Maribaya' : type;
    const domicileLine = meta?.ktpPromo?.province || meta?.ktpPromo?.regency || meta?.ktpPromo?.district
      ? `${meta?.ktpPromo?.province || '-'}, ${meta?.ktpPromo?.regency || '-'}, ${meta?.ktpPromo?.district || '-'}`
      : '';
    const visitDateLine = meta?.ktpPromo?.visitDate ? String(meta.ktpPromo.visitDate) : '';
    // Generate simple PDF receipt
    let pdfBuffer: Buffer | null = null;
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const margin = 40;
      const w = doc.internal.pageSize.getWidth();
      const line = (y: number) => doc.line(margin, y, w - margin, y);

      doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
      doc.text('INVOICE - THE LODGE MARIBAYA', margin, 60);
      doc.setFontSize(10);
      doc.text(`Nomor: ${bookingId}`, margin, 80);
      doc.text(`Tanggal: ${new Date().toLocaleString('id-ID')}`, margin, 95);
      line(110);

      doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
      doc.text('DETAIL PEMBAYARAN', margin, 130);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
      doc.text(`Metode: Gateway Xendit`, margin, 150);
      doc.text(`Status: Lunas`, margin, 165);
      line(180);

      doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
      doc.text('DATA PEMESAN', margin, 200);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
      doc.text(`Nama: ${userName}`, margin, 220);
      doc.text(`Email: ${to}`, margin, 235);

      doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
      doc.text('DETAIL PERUSAHAAN', w / 2, 200);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
      doc.text(`Nama: The Lodge Maribaya`, w / 2, 220);
      doc.text(`Alamat: Maribaya, Bandung`, w / 2, 235);
      line(255);

      doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
      doc.text('DETAIL PRODUK', margin, 275);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
      doc.text(`Jenis: ${displayType}`, margin, 295);
      let infoY = 310;
      doc.text(`Booking ID: ${bookingId}`, margin, infoY);
      infoY += 15;
      if (visitDateLine) {
        doc.text(`Tanggal Kunjungan: ${visitDateLine}`, margin, infoY);
        infoY += 15;
      }
      if (domicileLine) {
        doc.text(`Domisili KTP: ${domicileLine}`, margin, infoY);
        infoY += 15;
      }
      const dividerY = infoY + 10;
      line(dividerY);

      const purchaseHeaderY = dividerY + 20;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
      doc.text('DETAIL PEMBELIAN', margin, purchaseHeaderY);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
      const tableY = purchaseHeaderY + 20;
      doc.text('No.', margin, tableY);
      doc.text('Deskripsi', margin + 40, tableY);
      doc.text('Jml', w - 200, tableY);
      doc.text('Harga', w - 140, tableY);
      doc.text('Total', w - 80, tableY);

      // Draw itemized rows
      let pdfTotal = 0;
      const list = (items && items.length > 0) ? items : [{ name: displayType, qty: 1, price: amount }];
      doc.setFont('helvetica', 'normal');
      let y = tableY + 20;
      for (let i = 0; i < list.length; i++) {
        const it = list[i];
        const subtotal = (it.qty || 1) * (it.price || 0);
        pdfTotal += subtotal;
        doc.text(String(i + 1), margin, y);
        doc.text(String(it.name || '-'), margin + 40, y);
        doc.text(String(it.qty || 1), w - 200, y);
        const priceStr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(it.price || 0);
        const subStr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(subtotal);
        doc.text(priceStr, w - 140, y);
        doc.text(subStr, w - 80, y);
        y += 20;
      }
      line(y);
      doc.setFont('helvetica', 'bold');
      const totalStr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(pdfTotal || amount);
      const totalText = `JUMLAH PEMBAYARAN: ${totalStr}`;
      doc.text(totalText, w - 80 - doc.getTextWidth(totalText), y + 20);
      

      // Place QR code below totals without overlapping
      let qrY = y + 40;
      const pageH = doc.internal.pageSize.getHeight();
      if (qrY + 160 > pageH - 40) { 
        doc.addPage();
        qrY = 60;
      }
      try { doc.addImage(qrCodeDataUrl, 'PNG', w - 200, qrY, 140, 140); } catch {}
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      doc.text('Tunjukkan QR Code ini saat kedatangan.', w - 200, qrY + 160);

      const arr = doc.output('arraybuffer') as ArrayBuffer;
      pdfBuffer = Buffer.from(arr);
    } catch {
      pdfBuffer = null;
    }
    
    // Build itemized HTML
    const currency = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
    const list = (items && items.length > 0) ? items : [{ name: displayType, qty: 1, price: amount }];
    const rows = list.map((it) => `
      <tr>
        <td style="padding:8px 10px; border-bottom:1px solid #eee;">${it.name}</td>
        <td style="padding:8px 10px; border-bottom:1px solid #eee; text-align:center;">${it.qty || 1}</td>
        <td style="padding:8px 10px; border-bottom:1px solid #eee; text-align:right;">${currency(it.price || 0)}</td>
        <td style="padding:8px 10px; border-bottom:1px solid #eee; text-align:right;">${currency((it.qty || 1) * (it.price || 0))}</td>
      </tr>
    `).join('');
    const htmlTotal = list.reduce((sum, it) => sum + (it.qty || 1) * (it.price || 0), 0);

    const extraMetaHtml = (visitDateLine || domicileLine) ? `
      <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 16px 0; border: 1px solid #ddd;">
        <h3 style="margin:0 0 10px 0; color:#1b5e20;">Data KTP</h3>
        ${visitDateLine ? `<p style="margin:0 0 6px 0; font-size:14px;"><strong>Tanggal Kunjungan:</strong> ${visitDateLine}</p>` : ''}
        ${domicileLine ? `<p style="margin:0; font-size:14px;"><strong>Domisili (KTP):</strong> ${domicileLine}</p>` : ''}
      </div>
    ` : '';

    const mailOptions = {
      from: process.env.FROM_EMAIL,
      to,
      subject: `E‑Voucher The Lodge Maribaya`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${APP_URL}/logotlm.png" alt="The Lodge Maribaya" style="height: 48px; margin-bottom: 8px;" />
            <h2 style="color: #1b5e20; margin: 0;">E‑Voucher The Lodge Maribaya</h2>
          </div>
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; text-align: center;">
            <p style="margin-top: 0; font-size: 16px;">Halo <strong>${userName}</strong>,</p>
            <p>Pembayaran Anda telah berhasil dikonfirmasi!</p>
            
            <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px dashed #2e7d32;">
              <h3 style="color: #1b5e20; margin: 0 0 5px 0;">${displayType}</h3>
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Booking ID: ${bookingId}</p>
              
              <div style="margin-top: 20px;">
                <img src="cid:qrcode" alt="QR Code" style="width: 200px; height: 200px;" />
              </div>
              <p style="font-size: 12px; color: #888; margin-top: 10px;">Tunjukkan QR Code ini di loket masuk.</p>
            </div>
            
            <p style="font-size: 14px;">Total Dibayar: <strong>${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)}</strong></p>
          </div>

          ${extraMetaHtml}
          
          <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 16px 0; border: 1px solid #ddd;">
            <h3 style="margin:0 0 10px 0; color:#1b5e20;">Detail Pembelian</h3>
            <table style="width:100%; border-collapse: collapse; font-size: 14px;">
              <thead>
                <tr style="background:#f9f9f9;">
                  <th style="text-align:left; padding:8px 10px; border-bottom:1px solid #eee;">Nama Tiket</th>
                  <th style="text-align:center; padding:8px 10px; border-bottom:1px solid #eee;">Qty</th>
                  <th style="text-align:right; padding:8px 10px; border-bottom:1px solid #eee;">Harga</th>
                  <th style="text-align:right; padding:8px 10px; border-bottom:1px solid #eee;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="padding:10px; text-align:right; font-weight:bold;">Total</td>
                  <td style="padding:10px; text-align:right; font-weight:bold;">${currency(htmlTotal || amount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p style="margin-top: 20px; font-size: 13px; color: #888; text-align: center;">
            Simpan email ini sebagai bukti pembayaran Anda.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: 'qrcode.png',
          content: qrCodeDataUrl.split('base64,')[1],
          encoding: 'base64',
          cid: 'qrcode'
        },
        ...(pdfBuffer ? [{
          filename: `Invoice-TheLodgeMaribaya-${bookingId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }] : [])
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
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${APP_URL}/logotlm.png" alt="The Lodge Maribaya" style="height: 40px; margin-bottom: 8px;" />
            <h2 style="color: #1b5e20; margin: 0;">New Booking Notification</h2>
          </div>
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

export async function sendHariAnakNasionalVoucherEmail(
  to: string,
  parentName: string,
  childName: string,
  visitDate: string,
  registrationId: string,
  sponsor: string = 'NONE'
) {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(registrationId);
    
    // Format date properly
    let formattedDate = visitDate;
    if (visitDate === '2026-07-23') formattedDate = 'Kamis, 23 Juli 2026';
    else if (visitDate === '2026-07-24') formattedDate = "Jum'at, 24 Juli 2026";
    else if (visitDate === '2026-07-25') formattedDate = 'Sabtu, 25 Juli 2026';
    else if (visitDate === '2026-07-26') formattedDate = 'Minggu, 26 Juli 2026';
    else if (visitDate === '2026-08-31') formattedDate = 'Sampai dengan 31 Agustus 2026';

    const title = sponsor === 'GIVEAWAY_BIODEF' ? '30 Pemenang Special Giveaway Package' : 
                  sponsor === 'BIODEF' ? 'Promo Hari Anak x Biodef' : 
                  'Promo Hari Anak Nasional';
    
    let quotaText = '3.000';
    if (sponsor === 'BIODEF') quotaText = '100';
    if (sponsor === 'GIVEAWAY_BIODEF') quotaText = '30';

    const dateTncText = sponsor === 'GIVEAWAY_BIODEF' ? 'Voucher ini berlaku sampai tanggal 31 Agustus 2026' : 'Pilih tanggal kunjungan';
    const visitDateLabel = sponsor === 'GIVEAWAY_BIODEF' ? 'Masa Berlaku' : 'Tanggal Kunjungan';

    const mailOptions = {
      from: process.env.FROM_EMAIL,
      to,
      subject: `E-Voucher Promo Hari Anak Nasional - The Lodge Maribaya`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="${APP_URL}/logotlm.png" alt="The Lodge Maribaya" style="height: 48px; margin-bottom: 8px;" />
            <h2 style="color: #1b5e20; margin: 0;">${title}</h2>
          </div>
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; text-align: center;">
            <p style="margin-top: 0; font-size: 16px;">Halo <strong>${parentName}</strong>,</p>
            <p>Pendaftaran Anda berhasil! Berikut adalah E-Voucher tiket gratis untuk anak Anda:</p>
            
            <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px dashed #2e7d32;">
              <h3 style="color: #1b5e20; margin: 0 0 10px 0;">Tiket Anak Gratis</h3>
              <p style="margin: 5px 0; font-size: 14px; color: #666;">Nama Anak: <strong>${childName}</strong></p>
              <p style="margin: 5px 0 15px 0; font-size: 14px; color: #666;">${visitDateLabel}: <strong>${formattedDate}</strong></p>
              
              <div style="margin-top: 20px;">
                <img src="cid:qrcode" alt="QR Code" style="width: 200px; height: 200px;" />
              </div>
              <p style="font-size: 12px; color: #888; margin-top: 10px;">Tunjukkan QR Code ini kepada petugas tiket saat kedatangan.</p>
            </div>
            
            <p style="font-size: 14px; text-align: left;"><strong>Syarat & Ketentuan:</strong></p>
            <ul style="font-size: 12px; text-align: left; color: #666; padding-left: 20px;">
              <li>Berlaku untuk anak usia 5-17 tahun</li>
              <li>Registrasi dilakukan secara online</li>
              <li>1 Registrasi berlaku untuk 1 Anak + 1 Orang Tua/Pendamping</li>
              <li>${dateTncText}</li>
              <li>Kuota terbatas hanya ${quotaText} registrasi</li>
              <li>Berlaku selama periode promo</li>
              <li>Tidak dapat digabung dengan promo lain</li>
            </ul>
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
    console.log(`Hari Anak Nasional voucher email sent to ${to}`);
  } catch (error) {
    console.error('Error sending Hari Anak Nasional voucher email:', error);
  }
}

export async function sendVoucherClaimEmail(to: string, fullName: string, voucherCode: string) {
  const mailOptions = {
    from: process.env.FROM_EMAIL,
    to,
    subject: 'E-Voucher Diskon 20% - The Lodge Maribaya',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="${APP_URL}/logotlm.png" alt="The Lodge Maribaya" style="height: 48px; margin-bottom: 8px;" />
          <h2 style="color: #1b5e20; margin: 0;">E-Voucher Klaim Berhasil!</h2>
        </div>
        
        <p>Halo <strong>${fullName}</strong>,</p>
        <p>Terima kasih telah berkunjung. Berikut adalah kode voucher diskon 20% untuk kunjungan Anda berikutnya ke The Lodge Maribaya:</p>
        
        <div style="background-color: #f9f9f9; padding: 30px; border-radius: 15px; text-align: center; border: 2px dashed #1b5e20; margin: 20px 0;">
          <p style="margin-top: 0; font-size: 14px; color: #666;">KODE VOUCHER ANDA:</p>
          <h1 style="letter-spacing: 5px; color: #1b5e20; font-size: 36px; margin: 10px 0;">${voucherCode}</h1>
          <p style="color: #c62828; font-size: 14px; font-weight: bold;">DISKON 20%</p>
        </div>

        <div style="margin-top: 30px; padding: 20px; background-color: #fff8e1; border-radius: 10px; font-size: 13px;">
          <h3 style="margin-top: 0; color: #f57f17;">Syarat & Ketentuan:</h3>
          <ul style="padding-left: 20px; margin-bottom: 0;">
            <li>Voucher memberikan diskon 20% untuk kunjungan berikutnya ke The Lodge Maribaya.</li>
            <li>Diskon berlaku untuk pembelian Tiket Basic, Tiket Regular, dan Tiket Terusan.</li>
            <li>Voucher berlaku hingga <strong>31 Desember 2026</strong>.</li>
            <li>Satu voucher dapat digunakan untuk pembelian maksimal 10 tiket dalam satu transaksi.</li>
            <li>Voucher tidak dapat diuangkan atau ditukar dengan produk lainnya.</li>
            <li>Gunakan kode ini di: <a href="https://family.thelodgegroup.id/booking">family.thelodgegroup.id/booking</a> atau bisa diklaim pada saat kunjungan langsung di loket tiket masuk.</li>
          </ul>
        </div>

        <p style="margin-top: 30px; text-align: center;">
          <a href="https://family.thelodgegroup.id/booking" style="display: inline-block; background-color: #1b5e20; color: white; padding: 12px 30px; text-decoration: none; border-radius: 30px; font-weight: bold;">Gunakan Voucher Sekarang</a>
        </p>

        <p style="margin-top: 40px; font-size: 12px; color: #888; text-align: center; border-top: 1px solid #eee; pt-20px;">
          &copy; 2026 The Lodge Maribaya. All rights reserved.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Voucher claim email sent to ${to}`);
  } catch (error) {
    console.error('Error sending voucher claim email:', error);
    throw new Error('Gagal mengirim email voucher');
  }
}

export async function sendMattaFairVoucherEmail(to: string, fullName: string, qrCode: string) {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(qrCode);
    
    const mailOptions = {
      from: process.env.FROM_EMAIL,
      to,
      subject: 'E-Voucher The Lodge Maribaya x MATTA Fair',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <img src="cid:logo" alt="The Lodge Maribaya" style="height: 60px; margin-bottom: 8px;" />
            <h2 style="color: #1b5e20; margin: 0;">E-Voucher Rewards</h2>
            <p style="color: #666; font-size: 14px;">The Lodge Maribaya x MATTA Fair</p>
          </div>
          
          <p>Hi <strong>${fullName}</strong>,</p>
          <p>Thank you for participating in the MATTA Fair. Here is your special E-Voucher for your visit to The Lodge Maribaya:</p>
          
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 15px; text-align: center; border: 2px dashed #1b5e20; margin: 20px 0;">
            <p style="margin-top: 0; font-size: 14px; color: #666;">SCAN THIS QR CODE AT TICKET COUNTER:</p>
            <div style="margin: 15px 0;">
              <img src="cid:qrcode" alt="QR Code" style="width: 180px; height: 180px;" />
            </div>
            <p style="font-size: 12px; color: #888;">Unique Code: ${qrCode}</p>
          </div>

          <div style="background-color: #f0fdf4; padding: 20px; border-radius: 15px; text-align: center; border: 1px solid #bbf7d0; margin: 20px 0;">
            <p style="margin-top: 0; font-size: 14px; color: #166534; font-weight: bold;">STAY BOOKING PROMO CODE:</p>
            <h1 style="letter-spacing: 5px; color: #1b5e20; font-size: 32px; margin: 10px 0;">MATTA</h1>
            <p style="color: #666; font-size: 12px;">Use this code on our official website for stay reservations.</p>
          </div>

          <div style="margin-top: 30px; padding: 20px; background-color: #fff8e1; border-radius: 10px; font-size: 13px;">
            <h3 style="margin-top: 0; color: #f57f17;">Voucher Benefits:</h3>
            <ul style="padding-left: 20px; margin-bottom: 0;">
              <li><strong>Validity:</strong> September 7, 2026 - August 31, 2027</li>
              <li><strong>Free Access</strong> to The Lodge Maribaya</li>
              <li><strong>Free Sky Tree</strong> ride</li>
              <li><strong>20% Discount</strong> on F&B</li>
              <li><strong>10% Discount</strong> on stay at Camp & Village (Use code: <strong>MATTA</strong>)</li>
            </ul>
          </div>

          <div style="margin-top: 20px; font-size: 13px; color: #666;">
            <p><strong>Terms & Conditions:</strong></p>
            <ul style="padding-left: 20px;">
              <li>Please show this QR Code at our ticket counter upon arrival for redemption.</li>
              <li>Discount for stay can be claimed by using code <strong>MATTA</strong> on our official website.</li>
              <li>Official Website: <a href="https://thelodgegroup.id/" style="color: #1b5e20; font-weight: bold;">thelodgegroup.id</a></li>
            </ul>
          </div>

          <p style="margin-top: 40px; font-size: 12px; color: #888; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
            &copy; ${new Date().getFullYear()} The Lodge Maribaya. All rights reserved.
          </p>
        </div>
      `,
      attachments: [
        {
          filename: 'logo.png',
          path: 'c:/xampp/htdocs/familythelodge/public/logotlm.png',
          cid: 'logo'
        },
        {
          filename: 'qrcode.png',
          content: qrCodeDataUrl.split('base64,')[1],
          encoding: 'base64',
          cid: 'qrcode'
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    console.log(`Matta Fair voucher email sent to ${to}`);
  } catch (error) {
    console.error('Error sending Matta Fair voucher email:', error);
    throw new Error('Failed to send e-voucher email');
  }
}
