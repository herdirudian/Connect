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

        const users = await prisma.user.findMany({
            include: {
                _count: {
                    select: { 
                        bookings: true, 
                        foodOrders: true,
                        referrals: true 
                    }
                },
                referredBy: {
                    select: { name: true, referralCode: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Generate CSV
        const headers = [
            'User ID', 'Name', 'Email', 'Phone', 'Date of Birth', 
            'Role', 'Tier', 'Points', 'Referral Code', 'Referred By',
            'Total Referrals', 'Total Bookings', 'Total Food Orders', 
            'Verified', 'Join Date'
        ];

        const csvRows = [headers.join(',')];

        for (const user of users) {
            const row = [
                user.id,
                `"${user.name}"`,
                user.email,
                user.phoneNumber ? `"${user.phoneNumber}"` : '-',
                user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '-',
                user.role,
                user.tier,
                user.points,
                user.referralCode,
                user.referredBy ? `"${user.referredBy.name} (${user.referredBy.referralCode})"` : '-',
                user._count.referrals,
                user._count.bookings,
                user._count.foodOrders,
                user.isVerified ? 'Yes' : 'No',
                new Date(user.createdAt).toISOString().split('T')[0]
            ];
            csvRows.push(row.join(','));
        }

        const csvString = csvRows.join('\n');

        return new NextResponse(csvString, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="members_export_${new Date().toISOString().split('T')[0]}.csv"`
            }
        });

    } catch (error) {
        console.error('Export Error:', error);
        return NextResponse.json({ error: 'Failed to export users' }, { status: 500 });
    }
}
