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

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const csvRows = [
      ['ID', 'Date', 'Member Name', 'Member Email', 'Type', 'Description', 'Source', 'Amount'],
    ];

    transactions.forEach((tx) => {
      csvRows.push([
        tx.id,
        format(tx.createdAt, 'yyyy-MM-dd HH:mm:ss'),
        `"${tx.user.name}"`,
        tx.user.email,
        tx.type,
        `"${tx.description}"`,
        tx.source || 'SYSTEM',
        tx.amount.toString(),
      ]);
    });

    const csvString = csvRows.map((row) => row.join(',')).join('\n');

    return new NextResponse(csvString, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="points-transactions-${format(new Date(), 'yyyy-MM-dd')}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
