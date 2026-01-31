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
        user: {
          select: {
            name: true,
            email: true,
            phoneNumber: true
          }
        },
        restaurant: {
          select: {
            name: true
          }
        },
        items: {
          include: {
            menuItem: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // CSV Header
    const headers = [
      'Order ID',
      'User Name',
      'User Phone',
      'Restaurant',
      'Items',
      'Total Amount',
      'Status',
      'Payment Status',
      'Payment ID',
      'Created At'
    ].join(',');

    // CSV Rows
    const rows = orders.map(order => {
      const createdAt = new Date(order.createdAt).toLocaleString('id-ID');
      
      const itemsString = order.items
        .map(item => `${item.menuItem.name} x${item.quantity}`)
        .join('; ');

      // Escape fields
      const name = `"${order.user.name.replace(/"/g, '""')}"`;
      const restaurant = `"${order.restaurant.name.replace(/"/g, '""')}"`;
      const items = `"${itemsString.replace(/"/g, '""')}"`;
      
      return [
        order.id,
        name,
        order.user.phoneNumber || '-',
        restaurant,
        items,
        order.totalAmount,
        order.status,
        order.paymentStatus,
        order.paymentId || '-',
        createdAt
      ].join(',');
    });

    const csvContent = [headers, ...rows].join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="food-orders-export-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export food orders' }, { status: 500 });
  }
}
