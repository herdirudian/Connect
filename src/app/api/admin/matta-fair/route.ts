import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const registrations = await prisma.mattaFairRegistration.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(registrations);
  } catch (error) {
    console.error('Error fetching matta fair registrations:', error);
    return NextResponse.json({ error: 'Gagal mengambil data registrasi' }, { status: 500 });
  }
}