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
  | 'ENTER_GUEST_EMAIL'
  | 'CONFIRM_BOOKING'
  | 'CHANGE_FIELD';

export type BotSession = {
  step: BotStep;
  attractionId?: string;
  attractionName?: string;
  attractionPrice?: number;
  visitDate?: string;
  pax?: number;
  guestName?: string;
  guestEmail?: string;
  returnToConfirm?: boolean;
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

// High-performance in-memory session cache (1 hour TTL)
const sessionMemoryCache = new Map<string, { session: BotSession; expiresAt: number }>();
const SESSION_CACHE_TTL_MS = 60 * 60 * 1000;

// In-memory cache for WA-enabled attractions (60s TTL)
let cachedWaAttractions: any[] | null = null;
let attractionsCacheExpiresAt = 0;
const ATTRACTIONS_CACHE_TTL_MS = 60_000;

export async function getWaAttractions() {
  const now = Date.now();
  if (cachedWaAttractions && attractionsCacheExpiresAt > now) {
    return cachedWaAttractions;
  }
  try {
    const list = await prisma.attraction.findMany({
      where: { active: true, allowWaBooking: true },
      orderBy: { sortOrder: 'asc' },
      take: 10,
    });
    cachedWaAttractions = list;
    attractionsCacheExpiresAt = now + ATTRACTIONS_CACHE_TTL_MS;
    return list;
  } catch (err) {
    console.error('[WhatsApp Bot] Error querying attractions from DB:', err);
    return cachedWaAttractions || [];
  }
}

async function getBotSession(phone: string): Promise<BotSession> {
  const clean = phone.replace(/[^\d]/g, '');
  const cached = sessionMemoryCache.get(clean);
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.session };
  }

  const key = getSessionKey(clean);
  const settings = await getSystemSettings([key]);
  const raw = settings[key];
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      // Expire session if older than 24 hours
      if (Date.now() - (parsed.updatedAt || 0) < 86400000) {
        sessionMemoryCache.set(clean, { session: parsed, expiresAt: Date.now() + SESSION_CACHE_TTL_MS });
        return parsed;
      }
    } catch {}
  }
  const newSession: BotSession = { step: 'START', updatedAt: Date.now() };
  sessionMemoryCache.set(clean, { session: newSession, expiresAt: Date.now() + SESSION_CACHE_TTL_MS });
  return newSession;
}

async function saveBotSession(phone: string, session: BotSession) {
  const clean = phone.replace(/[^\d]/g, '');
  const key = getSessionKey(clean);
  session.updatedAt = Date.now();
  sessionMemoryCache.set(clean, { session: { ...session }, expiresAt: Date.now() + SESSION_CACHE_TTL_MS });

  // Persist asynchronously in background so message responses are not delayed
  upsertSystemSetting(key, JSON.stringify(session), `WhatsApp Bot session for ${phone}`).catch((err) => {
    console.error(`[WhatsApp Bot] Failed to persist session for ${phone}:`, err);
  });
}

async function clearBotSession(phone: string) {
  const clean = phone.replace(/[^\d]/g, '');
  const key = getSessionKey(clean);
  sessionMemoryCache.delete(clean);

  // Clear in DB in background
  upsertSystemSetting(key, '', `WhatsApp Bot session for ${phone}`).catch((err) => {
    console.error(`[WhatsApp Bot] Failed to clear session for ${phone}:`, err);
  });
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

function isBackCommand(text: string): boolean {
  const t = text.trim().toLowerCase();
  return (
    t === '0' ||
    t === 'kembali' ||
    t === 'back' ||
    t === '0 kembali' ||
    t === '0. kembali' ||
    t === '0.kembali'
  );
}

// 1. Send Ticket Catalog
async function sendAttractionsCatalog(cleanPhone: string, session: BotSession, isChange: boolean = false) {
  const attractions = await getWaAttractions();

  if (attractions.length === 0) {
    await sendWhatsAppPayload({
      to: cleanPhone,
      type: 'text',
      message: 'Mohon maaf, saat ini belum ada tiket wisata yang tersedia untuk dipesan. Silakan hubungi customer service kami.',
    });
    return;
  }

  const lines: string[] = [];
  if (isChange) {
    lines.push('🌲 *Silakan Pilih Tiket / Paket Wisata yang Baru:* 🌲');
  } else {
    lines.push('🌲 *Selamat Datang di Pemesanan Tiket WhatsApp - The Lodge Maribaya!* 🌲');
    lines.push('');
    lines.push('Silakan pilih tiket/paket wisata yang ingin Anda pesan:');
  }
  lines.push('');

  attractions.forEach((item, idx) => {
    lines.push(`${idx + 1}. *${item.name}* - ${formatIDR(item.price)}`);
  });

  lines.push('');
  lines.push('✍️ *Balas dengan angka nomor pilihan Anda* (Contoh: *1* atau *2*).');

  if (session.returnToConfirm) {
    lines.push('');
    lines.push('───────────────');
    lines.push('*0. Kembali ke Konfirmasi*');
  }

  session.step = 'SELECT_ATTRACTION';
  await saveBotSession(cleanPhone, session);

  await sendWhatsAppPayload({
    to: cleanPhone,
    type: 'text',
    message: lines.join('\n'),
  });
}

// 2. Send Confirmation Summary
async function sendConfirmationSummary(cleanPhone: string, session: BotSession) {
  session.step = 'CONFIRM_BOOKING';
  session.returnToConfirm = false;
  await saveBotSession(cleanPhone, session);

  const totalPrice = (session.attractionPrice || 0) * (session.pax || 1);
  const formattedVisitDate = new Date(session.visitDate || new Date()).toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const lines: string[] = [];
  lines.push('📋 *RINGKASAN DETAIL PEMESANAN*');
  lines.push('');
  lines.push('Harap periksa kembali detail pesanan Anda sebelum lanjut ke pembayaran:');
  lines.push(`• Tiket: *${session.attractionName}*`);
  lines.push(`• Tanggal Kunjungan: *${formattedVisitDate}*`);
  lines.push(`• Jumlah: *${session.pax} pax* (${formatIDR(session.attractionPrice || 0)} / pax)`);
  lines.push(`• Nama Pemesan: *${session.guestName}*`);
  lines.push(`• Email: *${session.guestEmail}*`);
  lines.push(`💰 *Total Pembayaran:* *${formatIDR(totalPrice)}*`);
  lines.push('');
  lines.push('───────────────');
  lines.push('Apakah rincian pesanan di atas sudah sesuai?');
  lines.push('👉 Balas *1* : Ya, Lanjut Pembayaran');
  lines.push('👉 Balas *0* : Kembali (Ubah Rincian Pesanan)');

  await sendWhatsAppPayload({
    to: cleanPhone,
    type: 'text',
    message: lines.join('\n'),
  });
}

// 3. Send Change Field Menu
async function sendChangeMenu(cleanPhone: string, session: BotSession) {
  session.step = 'CHANGE_FIELD';
  session.returnToConfirm = true;
  await saveBotSession(cleanPhone, session);

  const formattedVisitDate = new Date(session.visitDate || new Date()).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const lines: string[] = [];
  lines.push('✏️ *UBAH RINCIAN PESANAN*');
  lines.push('');
  lines.push('Silakan pilih nomor bagian yang ingin Anda ubah:');
  lines.push(`1. Pilihan Tiket (*${session.attractionName}*)`);
  lines.push(`2. Tanggal Kunjungan (*${formattedVisitDate}*)`);
  lines.push(`3. Jumlah Tiket (*${session.pax} pax*)`);
  lines.push(`4. Nama Pemesan (*${session.guestName}*)`);
  lines.push(`5. Alamat Email (*${session.guestEmail}*)`);
  lines.push('');
  lines.push('───────────────');
  lines.push('*0. Kembali ke Konfirmasi*');
  lines.push('✍️ *Balas dengan angka 1 - 5 untuk mengubah pilihan.*');

  await sendWhatsAppPayload({
    to: cleanPhone,
    type: 'text',
    message: lines.join('\n'),
  });
}

// 4. Process Booking & Create Invoice
async function processBookingPayment(cleanPhone: string, session: BotSession) {
  const totalPrice = (session.attractionPrice || 0) * (session.pax || 1);

  // Find or create user
  let user = await prisma.user.findFirst({
    where: {
      OR: [{ phoneNumber: cleanPhone }, { email: session.guestEmail }],
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: session.guestEmail || `${cleanPhone}@guest.thelodgegroup.id`,
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
        guestEmail: session.guestEmail,
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
          email: session.guestEmail,
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
  lines.push(`📧 Email: *${session.guestEmail}*`);
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

export async function handleIncomingWhatsAppBotMessage(fromPhone: string, text: string) {
  const cleanPhone = fromPhone.replace(/[^\d]/g, '');
  const trimmedText = text.trim();
  const lowerText = trimmedText.toLowerCase();

  // Check Maintenance / Service Enabled Status
  const botSettings = await getSystemSettings(['WA_BOT_ENABLED', 'WA_META_ENABLED', 'WA_BOT_MAINTENANCE_MSG', 'WA_BOT_SILENT_MAINTENANCE']);
  const isBotEnabled = (botSettings['WA_BOT_ENABLED'] ?? 'true').toLowerCase();
  const isMetaEnabled = (botSettings['WA_META_ENABLED'] ?? 'true').toLowerCase();
  const isSilentMaintenance = (botSettings['WA_BOT_SILENT_MAINTENANCE'] ?? 'false').toLowerCase();

  if (isBotEnabled === 'false' || isBotEnabled === '0' || isMetaEnabled === 'false' || isMetaEnabled === '0') {
    // If silent mode is enabled, drop message without any reply
    if (isSilentMaintenance === 'true' || isSilentMaintenance === '1' || isSilentMaintenance === 'yes') {
      console.log(`[WhatsApp Bot Maintenance] Silent mode active. Suppressing reply to ${cleanPhone}`);
      return;
    }

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

  // Handle hard reset commands
  if (['reset', 'ulang', 'restart', 'menu'].includes(lowerText)) {
    await clearBotSession(cleanPhone);
  }

  let session = await getBotSession(cleanPhone);

  // If initial message or reset, show attractions catalog
  if (session.step === 'START' || ['halo', 'hi', 'tiket', 'pesan', 'beli', 'help', 'start'].includes(lowerText)) {
    await sendAttractionsCatalog(cleanPhone, session);
    return;
  }

  // STEP 1: SELECT ATTRACTION
  if (session.step === 'SELECT_ATTRACTION') {
    if (isBackCommand(trimmedText)) {
      if (session.returnToConfirm) {
        await sendConfirmationSummary(cleanPhone, session);
        return;
      }
      await sendAttractionsCatalog(cleanPhone, session);
      return;
    }

    const attractions = await getWaAttractions();

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

    if (session.returnToConfirm) {
      await sendConfirmationSummary(cleanPhone, session);
      return;
    }

    session.step = 'SELECT_DATE';
    await saveBotSession(cleanPhone, session);

    const todayStr = new Date().toISOString().split('T')[0];
    await sendWhatsAppPayload({
      to: cleanPhone,
      type: 'text',
      message: `Pilihan Tiket: *${selected.name}* (${formatIDR(selected.price)})\n\n📅 *Langkah 2 dari 4: Tanggal Kunjungan*\nSilakan ketik tanggal kunjungan Anda:\n• Contoh: *${todayStr}* (Format: *YYYY-MM-DD* atau *DD/MM/YYYY*)\n• Atau ketik *hari ini* / *besok* / *lusa*\n\n───────────────\n*0. Kembali* (Ubah pilihan tiket)`,
    });
    return;
  }

  // STEP 2: SELECT DATE
  if (session.step === 'SELECT_DATE') {
    if (isBackCommand(trimmedText)) {
      if (session.returnToConfirm) {
        await sendConfirmationSummary(cleanPhone, session);
        return;
      }
      await sendAttractionsCatalog(cleanPhone, session);
      return;
    }

    const parsedDate = parseDateInput(trimmedText);
    if (!parsedDate) {
      await sendWhatsAppPayload({
        to: cleanPhone,
        type: 'text',
        message: '❌ Format tanggal tidak dapat dikenali. Silakan ketik tanggal dengan format *YYYY-MM-DD* (misal: *2026-09-30*) atau ketik *besok*.\n\n───────────────\n*0. Kembali* (Ubah pilihan tiket)',
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
        message: '❌ Tanggal kunjungan tidak boleh tanggal yang sudah lewat. Silakan ketik tanggal kunjungan untuk hari ini atau tanggal berikutnya.\n\n───────────────\n*0. Kembali* (Ubah pilihan tiket)',
      });
      return;
    }

    session.visitDate = parsedDate;

    if (session.returnToConfirm) {
      await sendConfirmationSummary(cleanPhone, session);
      return;
    }

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
      message: `Tiket: *${session.attractionName}*\nTanggal Kunjungan: *${formattedDisplayDate}*\n\n👥 *Langkah 3 dari 4: Jumlah Tiket*\nBerapa jumlah tiket/pax yang ingin dipesan?\nSilakan ketik angka jumlah tiket (Contoh: *2* atau *4*).\n\n───────────────\n*0. Kembali* (Ubah tanggal kunjungan)`,
    });
    return;
  }

  // STEP 3: SELECT PAX
  if (session.step === 'SELECT_PAX') {
    if (isBackCommand(trimmedText)) {
      if (session.returnToConfirm) {
        await sendConfirmationSummary(cleanPhone, session);
        return;
      }
      session.step = 'SELECT_DATE';
      await saveBotSession(cleanPhone, session);

      const todayStr = new Date().toISOString().split('T')[0];
      await sendWhatsAppPayload({
        to: cleanPhone,
        type: 'text',
        message: `Tiket: *${session.attractionName}*\n\n📅 *Langkah 2 dari 4: Tanggal Kunjungan*\nSilakan ketik tanggal kunjungan Anda yang baru:\n• Contoh: *${todayStr}* atau *besok*\n\n───────────────\n*0. Kembali* (Ubah pilihan tiket)`,
      });
      return;
    }

    const paxNum = parseInt(trimmedText, 10);
    if (isNaN(paxNum) || paxNum <= 0 || paxNum > 100) {
      await sendWhatsAppPayload({
        to: cleanPhone,
        type: 'text',
        message: '❌ Jumlah tiket harus berupa angka (1 - 100). Silakan ketik angka jumlah tiket yang valid.\n\n───────────────\n*0. Kembali* (Ubah tanggal kunjungan)',
      });
      return;
    }

    session.pax = paxNum;

    if (session.returnToConfirm) {
      await sendConfirmationSummary(cleanPhone, session);
      return;
    }

    session.step = 'ENTER_GUEST_NAME';
    await saveBotSession(cleanPhone, session);

    const totalEst = (session.attractionPrice || 0) * paxNum;

    await sendWhatsAppPayload({
      to: cleanPhone,
      type: 'text',
      message: `Tiket: *${session.attractionName}*\nJumlah: *${paxNum} pax* (Total: ${formatIDR(totalEst)})\n\n👤 *Langkah 4 dari 4: Nama Pemesan*\nSilakan ketik *Nama Lengkap* Anda untuk dicantumkan pada E-Voucher (Contoh: *Budi Santoso*).\n\n───────────────\n*0. Kembali* (Ubah jumlah tiket)`,
    });
    return;
  }

  // STEP 4: ENTER GUEST NAME
  if (session.step === 'ENTER_GUEST_NAME') {
    if (isBackCommand(trimmedText)) {
      if (session.returnToConfirm) {
        await sendConfirmationSummary(cleanPhone, session);
        return;
      }
      session.step = 'SELECT_PAX';
      await saveBotSession(cleanPhone, session);

      await sendWhatsAppPayload({
        to: cleanPhone,
        type: 'text',
        message: `Tiket: *${session.attractionName}*\n\n👥 *Langkah 3 dari 4: Jumlah Tiket*\nSilakan ketik ulang jumlah tiket/pax yang ingin dipesan (Contoh: *2*).\n\n───────────────\n*0. Kembali* (Ubah tanggal kunjungan)`,
      });
      return;
    }

    if (trimmedText.length < 2) {
      await sendWhatsAppPayload({
        to: cleanPhone,
        type: 'text',
        message: '❌ Mohon masukkan nama lengkap Anda minimal 2 karakter.\n\n───────────────\n*0. Kembali* (Ubah jumlah tiket)',
      });
      return;
    }

    session.guestName = trimmedText;

    if (session.returnToConfirm) {
      await sendConfirmationSummary(cleanPhone, session);
      return;
    }

    session.step = 'ENTER_GUEST_EMAIL';
    await saveBotSession(cleanPhone, session);

    await sendWhatsAppPayload({
      to: cleanPhone,
      type: 'text',
      message: `Nama Pemesan: *${trimmedText}*\n\n📧 *Langkah Terakhir: Alamat Email*\nSilakan ketik alamat *Email* Anda untuk pengiriman invoice & E-Voucher (Contoh: *budi@gmail.com*).\n\n───────────────\n*0. Kembali* (Ubah nama pemesan)`,
    });
    return;
  }

  // STEP 5: ENTER GUEST EMAIL
  if (session.step === 'ENTER_GUEST_EMAIL') {
    if (isBackCommand(trimmedText)) {
      if (session.returnToConfirm) {
        await sendConfirmationSummary(cleanPhone, session);
        return;
      }
      session.step = 'ENTER_GUEST_NAME';
      await saveBotSession(cleanPhone, session);

      await sendWhatsAppPayload({
        to: cleanPhone,
        type: 'text',
        message: `👤 *Langkah 4 dari 4: Nama Pemesan*\nSilakan ketik ulang Nama Lengkap Anda (Contoh: *Budi Santoso*).\n\n───────────────\n*0. Kembali* (Ubah jumlah tiket)`,
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedText)) {
      await sendWhatsAppPayload({
        to: cleanPhone,
        type: 'text',
        message: '❌ Alamat email tidak valid. Silakan ketik alamat email Anda dengan benar (Contoh: *nama@gmail.com*).\n\n───────────────\n*0. Kembali* (Ubah nama pemesan)',
      });
      return;
    }

    session.guestEmail = trimmedText;
    await sendConfirmationSummary(cleanPhone, session);
    return;
  }

  // STEP 6: CONFIRM BOOKING
  if (session.step === 'CONFIRM_BOOKING') {
    if (['1', 'ya', 'lanjut', 'bayar', 'ok', 'benar', 'deal'].includes(lowerText)) {
      await processBookingPayment(cleanPhone, session);
      return;
    }

    if (isBackCommand(trimmedText) || ['ubah', 'edit', 'ganti', 'salah'].includes(lowerText)) {
      await sendChangeMenu(cleanPhone, session);
      return;
    }

    await sendWhatsAppPayload({
      to: cleanPhone,
      type: 'text',
      message: '❌ Pilihan tidak dikenali.\n• Balas *1* untuk lanjut proses pembayaran.\n• Balas *0* untuk kembali dan mengubah rincian pesanan.',
    });
    return;
  }

  // STEP 7: CHANGE FIELD MENU
  if (session.step === 'CHANGE_FIELD') {
    if (isBackCommand(trimmedText)) {
      await sendConfirmationSummary(cleanPhone, session);
      return;
    }

    if (trimmedText === '1') {
      await sendAttractionsCatalog(cleanPhone, session, true);
      return;
    }

    if (trimmedText === '2') {
      session.step = 'SELECT_DATE';
      await saveBotSession(cleanPhone, session);

      const todayStr = new Date().toISOString().split('T')[0];
      await sendWhatsAppPayload({
        to: cleanPhone,
        type: 'text',
        message: `📅 *Ubah Tanggal Kunjungan*\nSilakan ketik tanggal kunjungan baru Anda:\n• Contoh: *${todayStr}* (Format: *YYYY-MM-DD* atau *DD/MM/YYYY*)\n• Atau ketik *hari ini* / *besok* / *lusa*\n\n───────────────\n*0. Kembali ke Konfirmasi*`,
      });
      return;
    }

    if (trimmedText === '3') {
      session.step = 'SELECT_PAX';
      await saveBotSession(cleanPhone, session);

      await sendWhatsAppPayload({
        to: cleanPhone,
        type: 'text',
        message: `👥 *Ubah Jumlah Tiket*\nBerapa jumlah tiket/pax yang ingin dipesan? (Silakan ketik angka, contoh: *2* atau *4*).\n\n───────────────\n*0. Kembali ke Konfirmasi*`,
      });
      return;
    }

    if (trimmedText === '4') {
      session.step = 'ENTER_GUEST_NAME';
      await saveBotSession(cleanPhone, session);

      await sendWhatsAppPayload({
        to: cleanPhone,
        type: 'text',
        message: `👤 *Ubah Nama Pemesan*\nSilakan ketik Nama Lengkap Anda yang baru (Contoh: *Budi Santoso*).\n\n───────────────\n*0. Kembali ke Konfirmasi*`,
      });
      return;
    }

    if (trimmedText === '5') {
      session.step = 'ENTER_GUEST_EMAIL';
      await saveBotSession(cleanPhone, session);

      await sendWhatsAppPayload({
        to: cleanPhone,
        type: 'text',
        message: `📧 *Ubah Alamat Email*\nSilakan ketik alamat Email baru Anda (Contoh: *budi@gmail.com*).\n\n───────────────\n*0. Kembali ke Konfirmasi*`,
      });
      return;
    }

    await sendWhatsAppPayload({
      to: cleanPhone,
      type: 'text',
      message: '❌ Pilihan tidak valid. Silakan balas dengan angka 1 sampai 5 untuk memilih bagian yang ingin diubah, atau balas *0* untuk kembali ke konfirmasi.',
    });
    return;
  }
}

