'use client';

import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Link from 'next/link';

export function NotificationBell() {
  const { hasNew, count, markAsRead } = useAdminNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-gray-500 hover:text-brand-dark hover:bg-brand-50 rounded-full h-10 w-10">
          <Bell size={20} />
          {hasNew && count > 0 && (
            <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-red-500 rounded-full ring-2 ring-white animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 mr-4">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-bold text-gray-900">Notifications</h4>
          {hasNew && (
            <Button variant="ghost" size="sm" onClick={markAsRead} className="text-xs h-auto py-1 px-2">
              Mark all read
            </Button>
          )}
        </div>
        
        {hasNew && count > 0 ? (
          <div className="space-y-3">
             <div className="p-3 bg-brand-50 rounded-lg border border-brand-100">
                <p className="text-sm font-medium text-brand-dark">
                  You have {count} new items!
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Check Bookings and Food Orders for new entries.
                </p>
             </div>
             <div className="grid grid-cols-2 gap-2">
                <Link href="/admin/bookings" className="block p-2 text-center text-xs font-bold bg-white border rounded hover:bg-gray-50" onClick={markAsRead}>
                    Bookings
                </Link>
                <Link href="/admin/food/orders" className="block p-2 text-center text-xs font-bold bg-white border rounded hover:bg-gray-50" onClick={markAsRead}>
                    Food Orders
                </Link>
             </div>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500 text-sm">
            <Bell className="mx-auto h-8 w-8 text-gray-300 mb-2" />
            No new notifications
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
