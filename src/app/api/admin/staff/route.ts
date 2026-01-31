import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, hashPassword, generateReferralCode } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || '';
    const decoded = verifyToken(token) as any;

    if (!decoded || decoded.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, password, role, permissions, phoneNumber } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);
    const referralCode = generateReferralCode(name);

    let user;
    try {
        user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                permissions: JSON.stringify(permissions || []),
                phoneNumber,
                referralCode,
                isVerified: true,
            },
        });
    } catch (createError: any) {
        // Fallback for outdated Prisma Client
        if (createError.message && createError.message.includes('Unknown argument')) {
            console.warn('Prisma Client outdated, falling back to legacy create + raw update');
            
            user = await prisma.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    role,
                    // permissions omitted
                    phoneNumber,
                    referralCode,
                    isVerified: true,
                },
            });

            const permissionsJson = JSON.stringify(permissions || []);
            // Use raw query to update the permissions column directly
            await prisma.$executeRawUnsafe(
                `UPDATE User SET permissions = ? WHERE id = ?`,
                permissionsJson,
                user.id
            );
            
            (user as any).permissions = permissionsJson;
        } else {
            throw createError;
        }
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Create Staff Error:', error);
    return NextResponse.json({ 
        error: 'Failed to create staff account', 
        details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}

export async function GET(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value || '';
        const decoded = verifyToken(token) as any;
    
        if (!decoded || decoded.role !== 'ADMIN') {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    
        const users = await prisma.user.findMany({
          where: {
            role: {
                not: 'MEMBER'
            }
          },
          orderBy: { createdAt: 'desc' }
        });
    
        return NextResponse.json(users);
      } catch (error) {
        console.error('Fetch Staff Error:', error);
        return NextResponse.json({ error: 'Failed to fetch staff' }, { status: 500 });
      }
}
