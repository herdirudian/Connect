import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { getAuthUser } from '@/lib/serverAuth';

function canRead(role: string, perms: string[]) {
    if (role === 'ADMIN') return true;
    return (
        perms.includes(PERMISSIONS.MANAGE_FOOD) ||
        perms.includes(PERMISSIONS.VIEW_RS_ORDERS) ||
        perms.includes(PERMISSIONS.PROCESS_RS_ORDERS)
    );
}

function canWrite(role: string, perms: string[]) {
    if (role === 'ADMIN') return true;
    return perms.includes(PERMISSIONS.MANAGE_FOOD) || perms.includes(PERMISSIONS.PROCESS_RS_ORDERS);
}

export async function GET(req: Request) {
    try {
        const auth = await getAuthUser();
        if (!auth || !canRead(auth.role, auth.permissions)) {
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
        const auth = await getAuthUser();
        if (!auth || !canWrite(auth.role, auth.permissions)) {
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
