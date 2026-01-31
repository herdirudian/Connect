import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import Xendit from 'xendit-node';

const xenditClient = new Xendit({
  secretKey: process.env.XENDIT_SECRET_KEY as string,
});
const { Invoice } = xenditClient;

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    const decoded = verifyToken(token) as any;

    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { restaurantId, items, totalAmount } = body; 

    // Check if orders are allowed
    const restaurant = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
        select: { allowOrders: true }
    });

    if (!restaurant) {
        return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    if (!restaurant.allowOrders) {
        return NextResponse.json({ error: 'Food ordering is currently disabled for this restaurant' }, { status: 400 });
    }

    const order = await prisma.foodOrder.create({
      data: {
        userId: decoded.userId,
        restaurantId,
        status: 'PENDING',
        totalAmount,
        items: {
            create: items.map((item: any) => ({
                menuItemId: item.menuItemId,
                quantity: item.quantity,
                price: item.price
            }))
        }
      },
      include: {
          user: true
      }
    });

    // Create Xendit Invoice
    try {
        const invoice = await Invoice.createInvoice({
            data: {
                externalId: `FOOD-${order.id}`,
                amount: order.totalAmount,
                payerEmail: order.user.email,
                description: `Food Order #${order.id.substring(0,8)}`,
                invoiceDuration: 86400,
                currency: 'IDR',
            }
        });
        
        // Update Order with Payment Info
        await prisma.foodOrder.update({
            where: { id: order.id },
            data: {
                paymentId: invoice.id,
                paymentUrl: invoice.invoiceUrl,
                paymentStatus: 'PENDING'
            }
        });

        return NextResponse.json({ ...order, paymentUrl: invoice.invoiceUrl });
    } catch (e: any) {
        console.error('Xendit Error:', e);
        // Return order but with warning? Or fail?
        // If payment creation fails, order is still PENDING but user can't pay.
        // Maybe we should delete the order or return error.
        // For now, let's return error so frontend knows.
        return NextResponse.json({ error: 'Failed to initiate payment' }, { status: 500 });
    }
    
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

export async function GET(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value || '';
        const decoded = verifyToken(token) as any;

        if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const orders = await prisma.foodOrder.findMany({
            where: { userId: decoded.userId },
            include: { 
                restaurant: true, 
                items: { include: { menuItem: true } },
                review: { select: { id: true, rating: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        
        return NextResponse.json(orders);
    } catch (e) {
        return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }
}
