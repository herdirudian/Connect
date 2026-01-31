import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value || '';
        const decoded = verifyToken(token) as any;

        if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const reservations = await prisma.restaurantReservation.findMany({
            where: { userId: decoded.userId },
            include: { restaurant: true },
            orderBy: { date: 'desc' }
        });
        
        return NextResponse.json(reservations);
    } catch (e) {
        return NextResponse.json({ error: 'Failed to fetch reservations' }, { status: 500 });
    }
}
