import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value || '';
        const decoded = verifyToken(token) as any;

        if (!decoded || decoded.role !== 'ADMIN') {
             return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const orders = await prisma.foodOrder.findMany({
            include: {
                user: { select: { name: true, email: true } },
                restaurant: { select: { name: true } },
                items: { include: { menuItem: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(orders);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value || '';
        const decoded = verifyToken(token) as any;

        if (!decoded || decoded.role !== 'ADMIN') {
             return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { id, status } = body;

        const order = await prisma.foodOrder.update({
            where: { id },
            data: { status }
        });

        return NextResponse.json(order);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }
}
