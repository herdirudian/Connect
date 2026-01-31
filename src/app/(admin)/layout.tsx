import Link from 'next/link';
import Image from 'next/image';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission, ROLE_DEFAULT_PERMISSIONS, PERMISSIONS } from '@/lib/permissions';
import { 
  LayoutDashboard, 
  CalendarCheck,
  Ticket, 
  Utensils, 
  Tent, 
  LogOut, 
  Settings,
  Gift,
  ScanLine,
  Users,
  Shield,
  Home,
  Megaphone,
  Crown,
  Share2
} from 'lucide-react';
import { NotificationBell } from '@/components/admin/NotificationBell';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value || '';
  const payload = verifyToken(token) as any;
  let role: string = '';
  let userPermissions: string[] = [];
  if (payload) {
    role = payload.role;
    let permsStr: string | null = (payload.permissions as string) ?? null;
    if (!permsStr && payload.userId) {
      const u = await prisma.user.findUnique({ where: { id: payload.userId }, select: { permissions: true } });
      permsStr = u?.permissions ?? null;
    }
    if (permsStr) {
      try { userPermissions = JSON.parse(permsStr); } catch { userPermissions = []; }
    }
    if (userPermissions.length === 0 && role in ROLE_DEFAULT_PERMISSIONS) {
      userPermissions = ROLE_DEFAULT_PERMISSIONS[role as keyof typeof ROLE_DEFAULT_PERMISSIONS];
    }
  }
  const can = (perm: string) => hasPermission(userPermissions, perm);
  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 hidden md:flex flex-col shadow-sm z-30">
        <div className="h-20 flex items-center justify-center border-b border-gray-100 px-6">
           <Link href="/admin" className="transition-transform hover:scale-105">
             <Image src="/logotlm.png" alt="The Lodge" width={140} height={52} className="h-12 w-auto object-contain" />
           </Link>
        </div>
        
        <div className="px-6 py-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Main Menu</p>
            <nav className="space-y-1">
              <NavLink href="/admin" icon={LayoutDashboard}>Admin Overview</NavLink>
              {can(PERMISSIONS.MANAGE_BOOKINGS) && <NavLink href="/admin/bookings" icon={CalendarCheck}>Manage Bookings</NavLink>}
              {can(PERMISSIONS.MANAGE_USERS) && <NavLink href="/admin/users" icon={Users}>Manajemen Member</NavLink>}
              {can(PERMISSIONS.MANAGE_ROLES) && <NavLink href="/admin/staff" icon={Shield}>Manajemen Staff</NavLink>}
              {can(PERMISSIONS.MANAGE_REFERRALS) && <NavLink href="/admin/referrals" icon={Share2}>Referral Settings</NavLink>}
              {can(PERMISSIONS.MANAGE_PROMOS) && <NavLink href="/admin/promos" icon={Megaphone}>Partner Promos</NavLink>}
            </nav>
        </div>

        <div className="px-6 py-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Service Management</p>
            <nav className="space-y-1">
              {can(PERMISSIONS.MANAGE_ATTRACTIONS) && <NavLink href="/admin/attractions" icon={Ticket}>Attractions</NavLink>}
              {can(PERMISSIONS.MANAGE_FOOD) && <NavLink href="/admin/food" icon={Utensils}>Food & Beverage</NavLink>}
              {can(PERMISSIONS.MANAGE_STAY) && <NavLink href="/admin/stay" icon={Tent}>Accommodations</NavLink>}
              {can(PERMISSIONS.MANAGE_REWARDS) && <NavLink href="/admin/rewards" icon={Gift}>Rewards System</NavLink>}
              {can(PERMISSIONS.MANAGE_TIERS) && <NavLink href="/admin/tiers" icon={Crown}>Membership Tiers</NavLink>}
              {can(PERMISSIONS.SCAN_TICKETS) && <NavLink href="/admin/scan" icon={ScanLine}>Scan Voucher</NavLink>}
            </nav>
        </div>

        <div className="mt-auto p-4 border-t border-gray-100">
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-2.5 w-full text-gray-500 hover:text-brand-dark hover:bg-brand-50 rounded-lg transition mb-1 font-medium text-sm">
            <Home size={18} />
            <span>Back to User View</span>
          </Link>
          <button className="flex items-center gap-3 px-4 py-2.5 w-full text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition font-medium text-sm">
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-200/50 flex items-center justify-between px-8 sticky top-0 z-20">
          <div>
            <h1 className="text-2xl font-black text-brand-dark tracking-tight uppercase">Admin Portal</h1>
            <p className="text-xs font-medium text-gray-500 tracking-wide">Manage your application efficiently</p>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-gray-900 leading-none">Administrator</p>
                <p className="text-xs text-brand font-semibold mt-1">Super Admin</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-brand-dark flex items-center justify-center text-white font-bold shadow-md ring-4 ring-gray-50">
                A
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-8 scroll-smooth">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavLink({ href, icon: Icon, children }: { href: string; icon: any; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-600 hover:bg-brand-50 hover:text-brand-dark transition group">
      <Icon size={18} className="text-gray-400 group-hover:text-brand transition-colors" />
      <span className="font-medium text-sm">{children}</span>
    </Link>
  );
}
