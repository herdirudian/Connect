import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { cookies } from 'next/headers';

// GET allotments for a specific month/range
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'startDate and endDate are required' }, { status: 400 });
    }

    const allotments = await prisma.accommodationAllotment.findMany({
      where: {
        accommodationId: id,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
    });

    return NextResponse.json(allotments);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch allotments' }, { status: 500 });
  }
}

// POST to update allotments for a range
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    
    // Debug logging
    console.log('Allotment POST: Token received:', token ? 'Yes' : 'No');
    
    const decoded = verifyToken(token);
    console.log('Allotment POST: Decoded token:', decoded ? 'Yes' : 'No', decoded);
    
    if (!decoded || (decoded as any).role !== 'ADMIN') {
      console.log('Allotment POST: Unauthorized access attempt');
      return NextResponse.json({ 
        error: 'Session expired or invalid. Please login again.',
        details: !decoded ? 'Invalid token' : 'Insufficient permissions'
      }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { date, quota } = body; // Can be single date or range in future

    // Simple implementation: Update single date or list of dates
    // Expecting body: { updates: [{ date: '2024-01-01', quota: 5 }, ...] } or single { date, quota }
    
    // Let's support bulk update
    const updates = body.updates || [{ date, quota }];

    const results = [];
    for (const update of updates) {
      // Normalize date to start of day UTC or specific timezone to match database unique constraint
      // Assuming simple date string YYYY-MM-DD from client
      const dateStr = update.date.split('T')[0];
      const d = new Date(dateStr); 
      
      if (isNaN(d.getTime())) {
        throw new Error(`Invalid date format: ${update.date}`);
      }
      
      const q = parseInt(update.quota);
      if (isNaN(q)) {
        throw new Error(`Invalid quota value: ${update.quota}`);
      }
      
      const p = update.price !== undefined && update.price !== null && update.price !== '' ? parseFloat(update.price) : null;

      // Check if accommodation exists
      const accommodation = await prisma.accommodation.findUnique({
        where: { id }
      });

      if (!accommodation) {
        throw new Error(`Accommodation not found: ${id}`);
      }

      // We need to use findFirst because date comparison might be tricky with timezones
      // Or better, ensure d is exactly 00:00:00.000 Z
      
      // Try to find existing allotment first
      const existing = await prisma.accommodationAllotment.findFirst({
        where: {
          accommodationId: id,
          date: d,
        }
      });

      let result;
      if (q < 0) {
        // Signal to DELETE the allotment (revert to base stock)
        if (existing) {
          result = await prisma.accommodationAllotment.delete({
            where: { id: existing.id }
          });
        } else {
          result = { message: 'Nothing to delete' };
        }
      } else if (existing) {
        result = await prisma.accommodationAllotment.update({
          where: { id: existing.id },
          data: { 
            quota: q,
            price: p 
          }
        });
      } else {
        result = await prisma.accommodationAllotment.create({
          data: {
            accommodationId: id,
            date: d,
            quota: q,
            price: p
          }
        });
      }
      results.push(result);
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    console.error('Error updating allotments:', error);
    return NextResponse.json({ error: error.message || 'Failed to update allotments' }, { status: 500 });
  }
}
