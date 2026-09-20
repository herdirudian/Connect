import { prisma } from '@/lib/prisma';
import { getSystemSettings, upsertSystemSetting } from '@/lib/systemSettings';
import { sendWhatsAppPayload } from '@/lib/whatsapp';
import { Invoice } from '@/lib/xendit';

export type BotStep =
  | 'START'
  | 'SELECT_ATTRACTION'
  | 'SELECT_DATE'
  | 'SELECT_PAX'
  | 'ENTER_GUEST_NAME'
  | 'ENTER_GUEST_EMAIL';

export type BotSession = {
  step: BotStep;
  attractionId?: string;
  attractionName?: string;
  attractionPrice?: number;
  visitDate?: string;
  pax?: number;
  guestName?: string;
  guestEmail?: string;
  updatedAt: number;
};

function formatIDR(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function getSessionKey(phone: string) {
  const clean = phone.replace(/[^\d]/g, '');
  return `WA_BOT_SESSION_${clean}`;
}

async function getBotSession(phone: string): Promise<BotSession> {
  const key = getSessionKey(phone);
  const settings = await getSystemSettings([key]);
  const raw = settings[key];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      // Expire session if older than 24 hours
      if (Date.now() - (parsed.updatedAt || 0) < 86400000) {
        return parsed;
      }
    } catch {}
  }
  return { step: 'START', updatedAt: Date.now() };
}

async function saveBotSession(phone: string, session: BotSession) {
  const key = getSessionKey(phone);
  session.updatedAt = Date.now();
  await upsertSystemSetting(key, JSON.stringify(session), `WhatsApp Bot session for ${phone}`);
}

async function clearBotSession(phone: string) {
  const key = getSessionKey(phone);
  await upsertSystemSetting(key, '', `WhatsApp Bot session for ${phone}`);
}

function parseDateInput(input: string): string | null {
  const txt = input.trim().toLowerCase();
  const today = new Date();

  if (txt === 'hari ini' || txt === 'today') {
    return today.toISOString().split('T')[0];
  }
  if (txt === 'besok' || txt === 'tomorrow') {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }
  if (txt === 'lusa') {
    const d = new Date(today);
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  }

  // Regex YYYY-MM-DD
  const isoMatch = txt.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10) - 1;
    const d = parseInt(isoMatch[3], 10);
    const dateObj = new Date(y, m, d);
    if (!isNaN(dateObj.getTime())) return dateObj.toISOString().split('T')[0];
  }

  // Regex DD/MM/YYYY or DD-MM-YYYY
  const idMatch = txt.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (idMatch) {
    const d = parseInt(idMatch[1], 10);
    const m = parseInt(idMatch[2], 10) - 1;
    const y = parseInt(idMatch[3], 10);
    const dateObj = new Date(y, m, d);
    if (!isNaN(dateObj.getTime())) return dateObj.toISOString().split('T')[0];
  }

  return null;
}

export async function handleIncomingWhatsAppBotMessage(fromPhone: string, text: string) {
  const cleanPhone = fromPhone.replace(/[^\d]/g, '');
  const trimmedText = text.trim();
  const lowerText = trimmedText.toLowerCase();

  // Check Maintenance / Service Enabled Status
  const botSettings = await getSystemSettings(['WA_BOT_ENABLED', 'WA_META_ENABLED', 'WA_BOT_MAINTENANCE_MSG']);
  const isBotEnabled = (botSettings['WA_BOT_ENABLED'] ?? 'true').toLowerCase();
  const isMetaEnabled = (botSettings['WA_META_ENABLED'] ?? 'true').toLowerCase();

  if (isBotEnabled === 'false' || isBotEnabled === '0' || isMetaEnabled === 'false' || isMetaEnabled === '0') {
    const maintenanceMessage =
      botSettings['WA_BOT_MAINTENANCE_MSG'] ||
      '⚠️ Mohon maaf, layanan pemesanan tiket via WhatsApp sedang nonaktif / maintenance sementara waktu. Silakan melakukan pemesanan tiket melalui website kami di https://family.thelodgegroup.id/booking/tickets. Terima kasih!';

    await sendWhatsAppPayload({
      to: cleanPhone,
      type: 'text',
      message: maintenanceMessage,
    });
    return;
  }

  // Handle reset commands
  if (['batal', 'reset', 'ulang', 'cancel', 'menu'].includes(lowerText)) {
    await clearBotSession(cleanPhone);
  }

  let session = await getBotSession(cleanPhone);

  // If initial message or reset, show attractions catalog
  if (session.step === 'START' || ['halo', 'hi', 'tiket', 'pesan', 'beli', 'help', 'start'].includes(lowerText)) {
    const attractions = await prisma.attraction.findMany({
      where: { active: true, allowWaBooking: true },
      orderBy: { sortOrder: 'asc' },
      take: 10,
    });

    if (attractions.length === 0) {
      await sendWhatsAppPayload({
        to: cleanPhone,
        type: 'text',
        message: 'Mohon maaf, saat ini belum ada tiket wisata yang tersedia untuk dipesan. Silakan hubungi customer service kami.',
      });
      return;
    }

    const lines: string[] = [];
    lines.push('🌲 *Selamat Datang di Pemesanan Tiket WhatsApp - The Lodge Maribaya!* 🌲');
    lines.push('');
    lines.push('Silakan pilih tiket/paket wisata yang ingin Anda pesan:');
    lines.push('');

    attractions.forEach((item, idx) => {
      lines.push(`${idx + 1}. *${item.name}* - ${formatIDR(item.price)}`);
    });

    lines.push('');
    lines.push('✍️ *Balas dengan angka nomor pilihan Anda* (Contoh: *1* atau *2*).');

    session.step = 'SELECT_ATTRACTION';
    await saveBotSession(cleanPhone, session);

    await sendWhatsAppPayload({
      to: cleanPhone,
      type: 'text',
      message: lines.join('\n'),
    });
    return;
  }

  // STEP 1: SELECT ATTRACTION
  if (session.step === 'SELECT_ATTRACTION') {
    const attractions = await prisma.attraction.findMany({
      where: { active: true, allowWaBooking: true },
      orderBy: { sortOrder: 'asc' },
      take: 10,
    });

    const choiceIdx = parseInt(trimmedText, 10) - 1;
    let selected = attractions[choiceIdx];

    if (!selected) {
      // Try matching by name
      selected = attractions.find((a) => a.name.toLowerCase().includes(lowerText)) as any;
    }

    if (!selected) {
      await sendWhatsAppPayload({
        to: cleanPhone,
        type: 'text',
        message: '❌ Nomor atau pilihan tiket tidak valid. Silakan balas dengan nomor tiket (1, 2, dst) dari daftar di atas.',
      });
      return;
    }

    session.attractionId = selected.id;
    session.attractionName = selected.name;
    session.attractionPrice = selected.price;
    session.step = 'SELECT_DATE';
    await saveBotSession(cleanPhone, session);

    await sendWhatsAppPayload({
      to: cleanPhone,
      type: 'text',
      message: `Pilihan Anda: *${selected.name}* (${formatIDR(selected.price)})\n\n📅 *Langkah 2 dari 4: Tanggal Kunjungan*\nSilakan ketik tanggal kunjungan Anda (Format: *YYYY-MM-DD* atau *DD/MM/YYYY*, Contoh: *2026-09-25* atau ketik *hari ini* / *besok*).`,
    });
    return;
  }

  // STEP 2: SELECT DATE
  if (session.step === 'SELECT_DATE') {
    const parsedDate = parseDateInput(trimmedText);
    if (!parsedDate) {
      await sendWhatsAppPayload({
        to: cleanPhone,
        type: 'text',
        message: '❌ Format tanggal tidak dapat dikenali. Silakan ketik tanggal dengan format *YYYY-MM-DD* (misal: *2026-09-25*) atau ketik *besok*.',
      });
      return;
    }

    const selectedDateObj = new Date(parsedDate);
    const nowObj = new Date();
    nowObj.setHours(0, 0, 0, 0);

    if (selectedDateObj < nowObj) {
      await sendWhatsAppPayload({
        to: cleanPhone,
        type: 'text',
        message: '❌ Tanggal kunjungan tidak boleh tanggal yang sudah lewat. Silakan ketik tanggal kunjungan untuk hari ini atau besok.',
      });
      return;
    }

    session.visitDate = parsedDate;
    session.step = 'SELECT_PAX';
    await saveBotSession(cleanPhone, session);

    const formattedDisplayDate = selectedDateObj.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    await sendWhatsAppPayload({
      to: cleanPhone,
      type: 'text',
      message: `Tanggal Kunjungan: *${formattedDisplayDate}*\n\n👥 *Langkah 3 dari 4: Jumlah Tiket*\nBerapa jumlah tiket/pax yang ingin dipesan? (Silakan ketik angka, contoh: *2* atau *4*).`,
    });
    return;
  }

  // STEP 3: SELECT PAX
  if (session.step === 'SELECT_PAX') {
    const paxNum = parseInt(trimmedText, 10);
    if (isNaN(paxNum) || paxNum <= 0 || paxNum > 100) {
      await sendWhatsAppPayload({
        to: cleanPhone,
        type: 'text',
        message: '❌ Jumlah tiket harus berupa angka (1 - 100). Silakan ketik angka jumlah tiket.',
      });
      return;
    }

    session.pax = paxNum;
    session.step = 'ENTER_GUEST_NAME';
    await saveBotSession(cleanPhone, session);

    const totalEst = (session.attractionPrice || 0) * paxNum;

    await sendWhatsAppPayload({
      to: cleanPhone,
      type: 'text',
      message: `Jumlah Tiket: *${paxNum} pax* (Total: ${formatIDR(totalEst)})\n\n👤 *Langkah 4 dari 4: Nama Pemesan*\nSilakan ketik *Nama Lengkap* Anda untuk dicantumkan pada E-Voucher (Contoh: *Budi Santoso*).`,
    });
    return;
  }

  // STEP 4: ENTER GUEST NAME
  if (session.step === 'ENTER_GUEST_NAME') {
    if (trimmedText.length < 2) {
      await sendWhatsAppPayload({
        to: cleanPhone,
        type: 'text',
        message: '❌ Mohon masukkan nama lengkap Anda minimal 2 karakter.',
      });
      return;
    }

    session.guestName = trimmedText;
    session.step = 'ENTER_GUEST_EMAIL';
    await saveBotSession(cleanPhone, session);

    await sendWhatsAppPayload({
      to: cleanPhone,
      type: 'text',
      message: `Nama Pemesan: *${trimmedText}*\n\n📧 *Terakhir: Alamat Email*\nSilakan ketik alamat *Email* Anda untuk penerimaan invoice & E-Voucher (Contoh: *budi@gmail.com*).`,
    });
    return;
  }

  // STEP 5: ENTER GUEST EMAIL & GENERATE INVOICE
  if (session.step === 'ENTER_GUEST_EMAIL') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedText)) {
      await sendWhatsAppPayload({
        to: cleanPhone,
        type: 'text',
        message: '❌ Alamat email tidak valid. Silakan ketik alamat email Anda dengan benar (Contoh: *nama@gmail.com*).',
      });
      return;
    }

    session.guestEmail = trimmedText;
    const totalPrice = (session.attractionPrice || 0) * (session.pax || 1);

    // Find or create user
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ phoneNumber: cleanPhone }, { email: trimmedText }],
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: trimmedText,
          password: 'WA_GUEST_NO_PASSWORD',
          name: session.guestName || 'Tamu WhatsApp',
          phoneNumber: cleanPhone,
          role: 'MEMBER',
          referralCode: `WA-${cleanPhone.slice(-6)}-${Math.floor(Math.random() * 1000)}`,
        },
      });
    }

    // Create Booking
    const booking = await prisma.booking.create({
      data: {
        userId: user.id,
        type: 'WAHANA',
        amount: totalPrice,
        date: new Date(session.visitDate || new Date()),
        status: 'PENDING',
        paymentStatus: 'PENDING',
        details: JSON.stringify({
          guestName: session.guestName,
          guestPhone: cleanPhone,
          guestEmail: trimmedText,
          items: [
            {
              id: session.attractionId,
              name: session.attractionName,
              title: session.attractionName,
              qty: session.pax,
              price: session.attractionPrice,
            },
          ],
          channel: 'WHATSAPP_BOT',
        }),
      },
    });

    // Create Xendit Invoice
    let paymentUrl = '';
    let paymentId = '';
    try {
      const invoiceResult = await Invoice.createInvoice({
        data: {
          externalId: booking.id,
          amount: totalPrice,
          description: `Pemesanan ${session.pax}x ${session.attractionName} - The Lodge Maribaya`,
          invoiceDuration: 86400, // 24 hours
          customer: {
            givenNames: session.guestName,
            email: trimmedText,
            mobileNumber: '+' + cleanPhone,
          },
          currency: 'IDR',
        },
      });
      paymentUrl = (invoiceResult as any).invoiceUrl || (invoiceResult as any).invoice_url || '';
      paymentId = (invoiceResult as any).id || '';

      if (paymentUrl) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            paymentUrl,
            paymentId,
          },
        });
      }
    } catch (invoiceErr: any) {
      console.error('[WhatsApp Bot] Error creating Xendit invoice:', invoiceErr);
    }

    const formattedVisitDate = new Date(session.visitDate || new Date()).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const lines: string[] = [];
    lines.push('🎉 *PEMESANAN TIKET BERHASIL DIBUAT!*');
    lines.push('');
    lines.push('📋 *Ringkasan Detail Pemesanan:*');
    lines.push(`• Booking ID: #${String(booking.id).slice(0, 8)}`);
    lines.push(`• Jenis Tiket: *${session.attractionName}*`);
    lines.push(`• Tanggal Kunjungan: *${formattedVisitDate}*`);
    lines.push(`• Jumlah Tiket: *${session.pax} pax*`);
    lines.push(`• Total Pembayaran: *${formatIDR(totalPrice)}*`);
    lines.push('');
    lines.push(`👤 Pemesan: *${session.guestName}*`);
    lines.push(`📧 Email: *${trimmedText}*`);
    lines.push('');

    if (paymentUrl) {
      lines.push('💳 *Link Pembayaran Resmi (Xendit):*');
      lines.push(paymentUrl);
      lines.push('');
      lines.push('⚠️ *Catatan:* Silakan selesaikan pembayaran melalui link di atas. Setelah pembayaran terverifikasi, E-Voucher & QR Code tiket akan otomatis dikirimkan ke nomor WhatsApp ini.');
    } else {
      lines.push('⚠️ Gagal membuat link pembayaran otomatis. Tim CS kami akan segera membantu menyelesaikan pesanan Anda.');
    }

    await clearBotSession(cleanPhone);

    await sendWhatsAppPayload({
      to: cleanPhone,
      type: 'text',
      message: lines.join('\n'),
    });
  }
}

