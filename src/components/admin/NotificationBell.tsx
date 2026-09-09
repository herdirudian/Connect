'use client';

import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { Bell, Volume2, ShieldAlert, Utensils, Brush, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Link from 'next/link';

export function NotificationBell() {
  const {
    hasNew,
    count,
    paidOrders,
    notificationPermission,
    requestPermission,
    markAsRead,
    playNotificationSound
  } = useAdminNotifications();

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
      <PopoverContent className="w-88 mr-4 p-4 shadow-xl border-emerald-100">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-emerald-600" />
            Notifikasi Staf
          </h4>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={playNotificationSound}
              className="text-xs h-7 px-2 text-emerald-700 hover:bg-emerald-50 gap-1"
              title="Test Suara Notifikasi"
            >
              <Volume2 className="w-3.5 h-3.5" />
              Tes Suara
            </Button>
            {hasNew && (
              <Button variant="ghost" size="sm" onClick={markAsRead} className="text-xs h-7 px-2 text-gray-500">
                Tandai dibaca
              </Button>
            )}
          </div>
        </div>

        {/* Permission Request Banner */}
        {notificationPermission !== 'granted' && (
          <div className="mb-3 p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-xs">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Aktifkan Notifikasi Browser</p>
                <p className="text-amber-700 mt-0.5">Izinkan notifikasi agar HP/Laptop berbunyi saat ada order lunas.</p>
                <Button
                  onClick={requestPermission}
                  size="sm"
                  className="mt-2 bg-amber-600 hover:bg-amber-700 text-white text-xs h-7 px-3 w-full font-semibold"
                >
                  Izinkan Notifikasi (Push &amp; Sound)
                </Button>
              </div>
            </div>
          </div>
        )}

        {hasNew && count > 0 ? (
          <div className="space-y-2">
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <p className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Ada {count} pesanan/booking lunas baru!
              </p>

              {/* Paid Orders List Preview */}
              {paidOrders.length > 0 && (
                <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
                  {paidOrders.map(order => (
                    <div key={order.id} className="p-2 bg-white rounded border border-emerald-100 text-xs">
                      <div className="flex justify-between font-bold text-gray-900">
                        <span>{order.typeLabel}</span>
                        <span className="text-emerald-700">Rp {order.amount.toLocaleString('id-ID')}</span>
                      </div>
                      <p className="text-gray-500 text-[11px] mt-0.5">
                        Pemesan: {order.guestName}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link
                href="/admin/food/orders-paid"
                className="block p-2 text-center text-xs font-bold bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition"
                onClick={markAsRead}
              >
                <Utensils className="w-3.5 h-3.5 inline mr-1" />
                Food Orders Paid
              </Link>
              <Link
                href="/admin/housekeeping/orders-paid"
                className="block p-2 text-center text-xs font-bold bg-white border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 transition"
                onClick={markAsRead}
              >
                <Brush className="w-3.5 h-3.5 inline mr-1" />
                Housekeeping Paid
              </Link>
            </div>
          </div>
        ) : (
          <div className="py-6 text-center text-gray-500 text-xs">
            <Bell className="mx-auto h-7 w-7 text-gray-300 mb-1.5" />
            Tidak ada notifikasi baru saat ini.
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
