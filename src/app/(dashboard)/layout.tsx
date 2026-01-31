import Link from 'next/link';
import Image from 'next/image';
import { 
  LayoutDashboard, 
  Ticket, 
  Utensils, 
  Tent, 
  Users, 
  LogOut, 
  Menu,
  Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import NotificationDropdown from '@/components/NotificationDropdown';
import MobileNav from '@/components/MobileNav';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  let user = null;

  if (token) {
    const payload = verifyToken(token) as any;
    if (payload?.userId) {
      user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          name: true,
          tier: true,
          avatarUrl: true
        }
      });
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 relative">
        <header className="h-20 bg-white border-b border-gray-100 shadow-sm z-50 relative">
          <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="transition-transform hover:scale-105">
                 <Image src="/logotlm.png" alt="The Lodge" width={140} height={52} className="h-14 w-auto object-contain" />
              </Link>
              <div className="h-8 w-px bg-gray-200 mx-2 hidden sm:block"></div>
              <div>
                <h1 className="text-xl font-black text-brand-dark tracking-tight uppercase hidden sm:block">Overview</h1>
                <p className="text-xs font-medium text-gray-400 tracking-wide uppercase mt-0.5 hidden sm:block">Welcome to your adventure</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <NotificationDropdown />

              <Link href="/dashboard/profile" className="flex items-center gap-3 pl-4 border-l border-gray-100 ml-2 group cursor-pointer hover:bg-gray-50 rounded-l-full py-1 transition-colors">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-gray-900 leading-none group-hover:text-brand transition-colors">{user?.name || 'Guest'}</p>
                  <p className="text-xs text-brand font-semibold mt-1">{user?.tier || 'MEMBER'}</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-brand flex items-center justify-center text-white font-bold shadow-md ring-4 ring-brand-50 group-hover:ring-brand-100 transition-all overflow-hidden">
                  {user?.avatarUrl ? (
                    <img 
                      src={user.avatarUrl} 
                      alt={user.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    user?.name?.charAt(0).toUpperCase() || 'U'
                  )}
                </div>
              </Link>

              <Link href="/login">
                <Button variant="ghost" size="icon" className="text-gray-500 hover:text-red-600">
                  <LogOut className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto scroll-smooth pb-20 md:pb-0">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
