import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

const DEFAULT_COMPARISON = [
  { name: 'Tiket Masuk Kawasan', bas: true, reg: true, ter: true },
  { name: 'Free Welcome Drink', bas: false, reg: true, ter: true },
  { name: 'Funicular (In & Out)', bas: false, reg: true, ter: true },
  { name: 'Akses Wahana Sky Hammock', bas: false, reg: false, ter: true },
  { name: 'Akses Wahana Zip Bike', bas: false, reg: false, ter: true },
  { name: 'Akses Wahana Valley Swing', bas: false, reg: false, ter: true },
  { name: 'Akses Wahana Hot Air Balloon', bas: false, reg: false, ter: true },
  { name: 'Meal Voucher (10k/50k)', bas: false, reg: false, ter: true },
  { name: 'Free 1 Soft File Photo', bas: false, reg: false, ter: true },
];

const DEFAULT_ITINERARY = [
  { startTime: '08:00', endTime: '11:00', route: 'Funicular → Sky Hammock → Zip Bike', note: 'Mumpung belum antre panjang' },
  { startTime: '11:00', endTime: '14:00', route: 'Makan Siang di Bamboo Resto → Valley Swing → Foto di Sky Tree', note: 'Waktu santai & istirahat' },
  { startTime: '14:00', endTime: '17:00', route: 'Hot Air Balloon → Trekking Pinus → Ngopi di Omah Bambu', note: 'Suasana sore yang sejuk' },
];

const DEFAULT_AMENITIES = [
  { id: 'toilet', name: 'Toilet Terdekat', location: 'Samping Loket Funicular & Area Resto', icon: 'Restroom' },
  { id: 'mushola', name: 'Mushola', location: 'Lantai 2 Area Bamboo Resto', icon: 'Mosque' },
  { id: 'p3k', name: 'Pos P3K', location: 'Dekat Pintu Keluar Utama', icon: 'FirstAid' },
  { id: 'nursing', name: 'Ruang Menyusui', location: 'Area Informasi (Depan)', icon: 'Baby' },
];

const DEFAULT_CALCULATOR = [
  { name: 'Tiket Masuk (Weekday)', price: 50000, category: 'TIKET' },
  { name: 'Tiket Masuk (Weekend)', price: 65000, category: 'TIKET' },
  { name: 'Paket Terusan', price: 165000, category: 'TIKET' },
  { name: 'Makan Siang Buffet', price: 75000, category: 'LAINNYA' },
  { name: 'Snack Box', price: 25000, category: 'LAINNYA' },
];

export async function GET() {
  try {
    let settings = await prisma.exploreSettings.findUnique({
      where: { id: 'singleton' }
    });

    if (!settings) {
      settings = await prisma.exploreSettings.create({
        data: {
          id: 'singleton',
          comparisonData: JSON.stringify(DEFAULT_COMPARISON),
          priceBasic: 'Rp 50.000',
          priceReguler: 'Rp 125.000',
          priceTerusan: 'Rp 165.000',
          itineraryData: JSON.stringify(DEFAULT_ITINERARY),
          amenitiesData: JSON.stringify(DEFAULT_AMENITIES),
          calculatorData: JSON.stringify(DEFAULT_CALCULATOR),
        }
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    const decoded = verifyToken(token);
    if (!decoded || (decoded as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { 
      comparisonData, 
      priceBasic, priceReguler, priceTerusan, 
      originalPriceBasic, originalPriceReguler, originalPriceTerusan,
      operationalStatus, weatherInfo, statusMessage, itineraryData, amenitiesData, mapImageUrl, calculatorData 
    } = body;

    const updated = await prisma.exploreSettings.upsert({
      where: { id: 'singleton' },
      update: {
        comparisonData: comparisonData ? (typeof comparisonData === 'string' ? comparisonData : JSON.stringify(comparisonData)) : undefined,
        priceBasic,
        priceReguler,
        priceTerusan,
        originalPriceBasic,
        originalPriceReguler,
        originalPriceTerusan,
        operationalStatus,
        weatherInfo,
        statusMessage,
        itineraryData: itineraryData ? (typeof itineraryData === 'string' ? itineraryData : JSON.stringify(itineraryData)) : undefined,
        amenitiesData: amenitiesData ? (typeof amenitiesData === 'string' ? amenitiesData : JSON.stringify(amenitiesData)) : undefined,
        mapImageUrl,
        calculatorData: calculatorData ? (typeof calculatorData === 'string' ? calculatorData : JSON.stringify(calculatorData)) : undefined,
      },
      create: {
        id: 'singleton',
        comparisonData: comparisonData ? (typeof comparisonData === 'string' ? comparisonData : JSON.stringify(comparisonData)) : JSON.stringify([]),
        priceBasic: priceBasic || 'Rp 0',
        priceReguler: priceReguler || 'Rp 0',
        priceTerusan: priceTerusan || 'Rp 0',
        originalPriceBasic: originalPriceBasic || '',
        originalPriceReguler: originalPriceReguler || '',
        originalPriceTerusan: originalPriceTerusan || '',
        operationalStatus: operationalStatus || 'NORMAL',
        weatherInfo: weatherInfo || 'Cerah',
        statusMessage: statusMessage || 'Seluruh Wahana Beroperasi Normal',
        itineraryData: itineraryData ? (typeof itineraryData === 'string' ? itineraryData : JSON.stringify(itineraryData)) : JSON.stringify(DEFAULT_ITINERARY),
        amenitiesData: amenitiesData ? (typeof amenitiesData === 'string' ? amenitiesData : JSON.stringify(amenitiesData)) : JSON.stringify(DEFAULT_AMENITIES),
        mapImageUrl: mapImageUrl || '/map-placeholder.jpg',
        calculatorData: calculatorData ? (typeof calculatorData === 'string' ? calculatorData : JSON.stringify(calculatorData)) : JSON.stringify(DEFAULT_CALCULATOR),
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
