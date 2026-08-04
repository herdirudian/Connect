'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Ticket, Gift, User, Tent, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    {
      name: 'Home',
      href: '/dashboard',
      icon: LayoutDashboard,
      active: pathname === '/dashboard'
    },
    {
      name: 'Tickets',
      href: '/dashboard/tickets',
      icon: Ticket,
      active: pathname.startsWith('/dashboard/tickets')
    },
    {
      name: 'Rewards',
      href: '/dashboard/rewards',
      icon: Gift,
      active: pathname.startsWith('/dashboard/rewards')
    },
    {
      name: 'Profile',
      href: '/dashboard/profile',
      icon: User,
      active: pathname.startsWith('/dashboard/profile')
    },
    {
      name: 'Community',
      href: '/dashboard/community',
      icon: Users,
      active: pathname.startsWith('/dashboard/community')
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-safe md:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200",
              item.active 
                ? "text-brand" 
                : "text-gray-400 hover:text-gray-600"
            )}
          >
            <item.icon 
              className={cn(
                "h-6 w-6 transition-all duration-200",
                item.active ? "scale-110 stroke-[2.5px]" : "stroke-2"
              )} 
            />
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-wide",
              item.active ? "text-brand" : "text-gray-400"
            )}>
              {item.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
