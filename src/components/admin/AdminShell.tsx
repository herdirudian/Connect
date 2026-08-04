'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  CalendarCheck,
  Ticket, 
  Utensils, 
  Tent, 
  LogOut, 
  Gift,
  ScanLine,
  Users,
  Shield,
  Home,
  Megaphone,
  Crown,
  Share2,
  Menu,
  X,
  MessageSquare,
  Percent,
  Brush,
  BadgePercent,
  LayoutPanelTop,
  Settings2
} from 'lucide-react';
import { NotificationBell } from '@/components/admin/NotificationBell';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';
import { cn } from '@/lib/utils';

interface AdminShellProps {
  children: React.ReactNode;
  userPermissions: string[];
}

export function AdminShell({ children, userPermissions }: AdminShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  const can = (perm: string) => hasPermission(userPermissions, perm);

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:static inset-y-0 left-0 w-64 bg-white border-r border-gray-100 flex flex-col shadow-sm z-50 transition-transform duration-200 ease-in-out md:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-20 flex items-center justify-between border-b border-gray-100 px-6">
           <Link href="/admin" className="transition-transform hover:scale-105">
             <Image src="/logotlm.png" alt="The Lodge" width={140} height={52} className="h-12 w-auto object-contain" />
           </Link>
           <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-500">
             <X size={24} />
           </button>
        </div>
        
        <div className="px-6 py-4 flex-1 overflow-y-auto">
            <div className="mb-6">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Main Menu</p>
                <nav className="space-y-1">
                  <NavLink href="/admin" icon={LayoutDashboard} active={pathname === '/admin'}>Admin Overview</NavLink>
                  {can(PERMISSIONS.MANAGE_PROMOS) && <NavLink href="/admin/promotions" icon={LayoutPanelTop} active={pathname.startsWith('/admin/promotions')}>Explore Banners</NavLink>}
                  {can(PERMISSIONS.MANAGE_PROMOS) && <NavLink href="/admin/explore-settings" icon={Settings2} active={pathname.startsWith('/admin/explore-settings')}>Explore Settings</NavLink>}
                  {can(PERMISSIONS.MANAGE_ATTRACTIONS) && <NavLink href="/admin/attractions" icon={Ticket} active={pathname.startsWith('/admin/attractions')}>Explore Products</NavLink>}
                  {can(PERMISSIONS.MANAGE_BOOKINGS) && <NavLink href="/admin/bookings" icon={CalendarCheck} active={pathname.startsWith('/admin/bookings')}>Manage Bookings</NavLink>}
                  {can(PERMISSIONS.MANAGE_USERS) && <NavLink href="/admin/users" icon={Users} active={pathname.startsWith('/admin/users')}>Manajemen Member</NavLink>}
                  {can(PERMISSIONS.MANAGE_ROLES) && <NavLink href="/admin/staff" icon={Shield} active={pathname.startsWith('/admin/staff')}>Manajemen Staff</NavLink>}
                  {can(PERMISSIONS.MANAGE_REFERRALS) && <NavLink href="/admin/referrals" icon={Share2} active={pathname.startsWith('/admin/referrals')}>Referral Settings</NavLink>}
                  {can(PERMISSIONS.MANAGE_PROMOS) && <NavLink href="/admin/promos" icon={Megaphone} active={pathname.startsWith('/admin/promos')}>Partner Promos</NavLink>}
                  {can(PERMISSIONS.MANAGE_PROMOS) && <NavLink href="/admin/promocodes" icon={Percent} active={pathname.startsWith('/admin/promocodes')}>Promo Codes</NavLink>}
                  {can(PERMISSIONS.MANAGE_PROMOS) && <NavLink href="/admin/childrens-day" icon={Users} active={pathname.startsWith('/admin/childrens-day') && !pathname.startsWith('/admin/childrens-day-biodef')}>Promo Hari Anak</NavLink>}
                  {can(PERMISSIONS.MANAGE_PROMOS) && <NavLink href="/admin/childrens-day-biodef" icon={Users} active={pathname.startsWith('/admin/childrens-day-biodef')}>Promo Biodef</NavLink>}
                  {can(PERMISSIONS.MANAGE_PROMOS) && <NavLink href="/admin/special-giveaway-biodef" icon={Gift} active={pathname.startsWith('/admin/special-giveaway-biodef')}>Giveaway Biodef</NavLink>}
                  {can(PERMISSIONS.MANAGE_PROMOS) && <NavLink href="/admin/vouchers" icon={Ticket} active={pathname.startsWith('/admin/vouchers')}>Voucher Klaim</NavLink>}
                  {can(PERMISSIONS.VIEW_REPORTS) && <NavLink href="/admin/reports/daily-sales" icon={LayoutDashboard} active={pathname.startsWith('/admin/reports')}>Reports System</NavLink>}
                </nav>
            </div>

            <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Service Management</p>
                <nav className="space-y-1">
                  {(can(PERMISSIONS.MANAGE_FOOD) || can(PERMISSIONS.PROCESS_RS_ORDERS) || can(PERMISSIONS.VIEW_RS_ORDERS)) && (
                    <NavLink href="/admin/food" icon={Utensils} active={pathname.startsWith('/admin/food')}>Food & Beverage</NavLink>
                  )}
                  {(can(PERMISSIONS.MANAGE_FOOD) || can(PERMISSIONS.PROCESS_RS_ORDERS) || can(PERMISSIONS.VIEW_RS_ORDERS)) && (
                    <NavLink href="/admin/housekeeping/orders-paid" icon={Brush} active={pathname.startsWith('/admin/housekeeping/orders-paid')}>Housekeeping Paid</NavLink>
                  )}
                  {(can(PERMISSIONS.MANAGE_FOOD) || can(PERMISSIONS.MANAGE_HK_CATALOG)) && (
                    <NavLink href="/admin/housekeeping" icon={Brush} active={pathname === '/admin/housekeeping'}>Housekeeping Catalog</NavLink>
                  )}
                  {(can(PERMISSIONS.MANAGE_FOOD) || can(PERMISSIONS.MANAGE_WHATSAPP)) && (
                    <NavLink href="/admin/whatsapp" icon={MessageSquare} active={pathname.startsWith('/admin/whatsapp')}>WhatsApp Settings</NavLink>
                  )}
                  {can(PERMISSIONS.MANAGE_STAY) && <NavLink href="/admin/stay" icon={Tent} active={pathname.startsWith('/admin/stay')}>Accommodations</NavLink>}
                  {can(PERMISSIONS.MANAGE_REVIEWS) && <NavLink href="/admin/reviews" icon={MessageSquare} active={pathname.startsWith('/admin/reviews')}>Reviews</NavLink>}
                  {can(PERMISSIONS.MANAGE_REWARDS) && <NavLink href="/admin/rewards" icon={Gift} active={pathname.startsWith('/admin/rewards')}>Rewards System</NavLink>}
                  {can(PERMISSIONS.MANAGE_REWARDS) && <NavLink href="/admin/gamification" icon={Crown} active={pathname.startsWith('/admin/gamification')}>Gamification</NavLink>}
                  {can(PERMISSIONS.MANAGE_USERS) && <NavLink href="/admin/community" icon={Users} active={pathname.startsWith('/admin/community')}>Community</NavLink>}
                  {can(PERMISSIONS.MANAGE_TIERS) && <NavLink href="/admin/tiers" icon={Crown} active={pathname.startsWith('/admin/tiers')}>Membership Tiers</NavLink>}
                  {can(PERMISSIONS.SCAN_TICKETS) && <NavLink href="/admin/scan" icon={ScanLine} active={pathname.startsWith('/admin/scan')}>Scan Voucher</NavLink>}
                </nav>
            </div>
        </div>

        <div className="p-4 border-t border-gray-100">
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-2.5 w-full text-gray-500 hover:text-brand-dark hover:bg-brand-50 rounded-lg transition mb-1 font-medium text-sm">
            <Home size={18} />
            <span>Back to User View</span>
          </Link>
          <button 
            onClick={() => window.location.href = '/api/auth/logout'}
            className="flex items-center gap-3 px-4 py-2.5 w-full text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition font-medium text-sm"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-200/50 flex items-center justify-between px-4 md:px-8 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg md:hidden"
            >
              <Menu size={24} />
            </button>
            <div>
                <h1 className="text-xl md:text-2xl font-black text-brand-dark tracking-tight uppercase">Admin Portal</h1>
                <p className="text-xs font-medium text-gray-500 tracking-wide hidden sm:block">Manage your application efficiently</p>
            </div>
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
        <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavLink({ href, icon: Icon, children, active }: { href: string; icon: any; children: React.ReactNode; active?: boolean }) {
  return (
    <Link 
      href={href} 
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 rounded-lg transition group",
        active 
          ? "bg-brand-50 text-brand-dark font-semibold" 
          : "text-gray-600 hover:bg-brand-50 hover:text-brand-dark"
      )}
    >
      <Icon size={18} className={cn("transition-colors", active ? "text-brand" : "text-gray-400 group-hover:text-brand")} />
      <span className="text-sm">{children}</span>
    </Link>
  );
}
