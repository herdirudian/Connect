'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Check, Loader2 } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    try {
      const res = await fetch('/api/notifications?limit=50');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id: string) {
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
    } catch (error) {
       console.error(error);
    }
  }

  async function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
    } catch (error) {
       console.error(error);
    }
  }

  if (loading) return <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-brand" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-brand-dark uppercase tracking-tight">Notifications</h2>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wide mt-1">Stay updated with your latest activities</p>
        </div>
        {notifications.some(n => !n.isRead) && (
            <Button onClick={markAllRead} variant="outline" className="text-xs">
                Mark All as Read
            </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
           {notifications.length === 0 ? (
               <div className="p-12 text-center text-gray-500">
                   <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                   <h3 className="text-lg font-semibold text-gray-900">No notifications yet</h3>
                   <p className="text-sm">We'll notify you when something important happens.</p>
               </div>
           ) : (
               <div className="divide-y divide-gray-100">
                   {notifications.map((n) => (
                       <div 
                          key={n.id} 
                          onClick={() => !n.isRead && markAsRead(n.id)}
                          className={`p-6 flex gap-4 transition-colors ${n.isRead ? 'bg-white' : 'bg-brand-50/10 cursor-pointer hover:bg-brand-50/20'}`}
                       >
                           <div className={`mt-1 h-3 w-3 rounded-full flex-shrink-0 ${n.isRead ? 'bg-gray-200' : 'bg-brand shadow-sm shadow-brand/50'}`}></div>
                           <div className="flex-1 space-y-1">
                               <div className="flex justify-between items-start">
                                   <h4 className={`text-base ${n.isRead ? 'font-semibold text-gray-900' : 'font-bold text-brand-dark'}`}>
                                       {n.title}
                                   </h4>
                                   <span className="text-xs font-medium text-gray-400 whitespace-nowrap ml-4">
                                       {new Date(n.createdAt).toLocaleDateString('id-ID', { 
                                           day: 'numeric', 
                                           month: 'short',
                                           hour: '2-digit',
                                           minute: '2-digit'
                                       })}
                                   </span>
                               </div>
                               <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">{n.message}</p>
                           </div>
                       </div>
                   ))}
               </div>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
