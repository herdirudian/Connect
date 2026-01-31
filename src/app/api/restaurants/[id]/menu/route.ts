import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        // Admin might want to see unavailable items too, but for now let's show all for admin?
        // This endpoint is used by User UI too (which filters available=true).
        // I should probably check query param or just keep it simple.
        // The user UI actually uses `/api/restaurants/[id]` which includes menu items.
        // This endpoint `/api/restaurants/[id]/menu` is not heavily used yet by User UI (it uses include).
        // So I can make this return ALL items for Admin usage if I want, or just filter in UI.
        
        const menuItems = await prisma.menuItem.findMany({
            where: { restaurantId: id }, // Return all for management
            orderBy: { category: 'asc' }
        });
        return NextResponse.json(menuItems);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch menu' }, { status: 500 });
    }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value || '';
        const decoded = verifyToken(token) as any;

        if (!decoded || decoded.role !== 'ADMIN') {
             return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { name, description, price, originalPrice, category, imageUrl, available } = body;

        const menuItem = await prisma.menuItem.create({
            data: {
                restaurantId: id,
                name,
                description,
                price: parseFloat(price),
                originalPrice: originalPrice ? parseFloat(originalPrice) : null,
                category,
                imageUrl,
                available: available ?? true
            }
        });

        return NextResponse.json(menuItem);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create menu item' }, { status: 500 });
    }
}
