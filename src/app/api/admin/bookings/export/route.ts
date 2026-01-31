import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};
    
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const csvRows = [
      ['ID', 'Date', 'Customer Name', 'Customer Email', 'Phone', 'Type', 'Amount', 'Status', 'Payment Status', 'Payment Method'],
    ];

    bookings.forEach((booking) => {
      csvRows.push([
        booking.id,
        format(booking.createdAt, 'yyyy-MM-dd HH:mm:ss'),
        `"${booking.user.name}"`, // Quote to handle commas
        booking.user.email,
        booking.user.phoneNumber ? `"${booking.user.phoneNumber}"` : '',
        booking.type,
        booking.amount.toString(),
        booking.status,
        booking.paymentStatus,
        booking.paymentId || '-',
      ]);
    });

    const csvString = csvRows.map((row) => row.join(',')).join('\n');

    return new NextResponse(csvString, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="bookings-report-${format(new Date(), 'yyyy-MM-dd')}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
