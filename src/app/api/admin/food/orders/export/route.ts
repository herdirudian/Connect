import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PERMISSIONS } from '@/lib/permissions';
import { getAuthUser } from '@/lib/serverAuth';

function canExport(role: string, perms: string[]) {
  if (role === 'ADMIN') return true;
  return (
    perms.includes(PERMISSIONS.MANAGE_FOOD) ||
    perms.includes(PERMISSIONS.VIEW_RS_ORDERS) ||
    perms.includes(PERMISSIONS.PROCESS_RS_ORDERS)
  );
}

export async function GET(req: Request) {
  try {
    const auth = await getAuthUser();
    if (!auth || !canExport(auth.role, auth.permissions)) {
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
      'Channel',
      'Room Number',
      'Guest Name',
      'Guest Phone',
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
        .map(item => `${(item.menuItem?.name || 'Unknown Item').replace(/"/g, '""')} x${item.quantity}`)
        .join('; ');

      // Escape fields
      const displayNameRaw = (order.user?.name?.trim() || order.guestName?.trim() || '-');
      const name = `"${displayNameRaw.replace(/"/g, '""')}"`;
      const restaurant = `"${(order.restaurant?.name || '-').replace(/"/g, '""')}"`;
      const items = `"${itemsString.replace(/"/g, '""')}"`;
      
      return [
        order.id,
        name,
        order.user?.phoneNumber || order.guestPhone || '-',
        order.channel || 'MEMBER',
        order.roomNumber || '-',
        order.guestName ? `"${order.guestName.replace(/"/g, '""')}"` : '-',
        order.guestPhone || '-',
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
