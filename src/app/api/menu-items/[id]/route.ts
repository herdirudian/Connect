import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { getAuthUser } from '@/lib/serverAuth';

async function canManage() {
    const auth = await getAuthUser();
    if (!auth) return false;
    if (auth.role === 'ADMIN') return true;
    return auth.permissions.includes(PERMISSIONS.MANAGE_FOOD);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        if (!(await canManage())) {
             return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { name, description, price, originalPrice, category, imageUrl, available, stock, soldOut, minOrderQty } = body;
        const minQty = Math.max(1, parseInt(String(minOrderQty ?? 1), 10) || 1);

        const menuItem = await prisma.menuItem.update({
            where: { id },
            data: {
                name,
                description,
                price: parseFloat(price),
                originalPrice: originalPrice ? parseFloat(originalPrice) : null,
                category,
                imageUrl,
                available,
                stock: stock === '' || stock === null || typeof stock === 'undefined' ? null : parseInt(String(stock), 10),
                soldOut: !!soldOut,
                minOrderQty: minQty
            }
        });

        return NextResponse.json(menuItem);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update menu item' }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        if (!(await canManage())) {
             return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        try {
            await prisma.menuItem.delete({
                where: { id }
            });
        } catch (err: any) {
            // Handle FK constraint (item dipakai di order)
            if (err?.code === 'P2003' || /foreign key/i.test(String(err?.message))) {
                return NextResponse.json({ error: 'Item sudah dipakai di pesanan. Nonaktifkan saja (Available = false / Sold Out).'}, { status: 409 });
            }
            throw err;
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete menu item' }, { status: 500 });
    }
}
