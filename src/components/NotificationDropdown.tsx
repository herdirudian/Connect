'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'promo' | 'info' | 'success';
}

import { useRouter } from 'next/navigation';

export default function NotificationDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        // Transform API data to match Notification interface
        const formattedData = data.map((item: any) => ({
          id: item.id,
          title: item.title,
          message: item.message,
          time: new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }), // Simple formatting
          read: item.isRead,
          type: 'info' // Default type for now, can be extended in DB
        }));
        setNotifications(formattedData);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: string) => {
    // Optimistic update
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));

    // API Call
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    // Optimistic update
    setNotifications(notifications.map(n => ({ ...n, read: true })));

    // API Call
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button 
        variant="ghost" 
        size="icon" 
        className={`text-gray-500 hover:text-brand-dark relative ${isOpen ? 'bg-gray-100 text-brand-dark' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-2.5 right-2.5 h-2 w-2 bg-red-500 rounded-full border border-white animate-pulse"></span>
        )}
      </Button>

      {isOpen && (
        <>
          {/* Mobile Overlay to close on click outside if needed, though click handler exists */}
          <div className="fixed inset-0 z-[90] bg-black/5 sm:hidden" onClick={() => setIsOpen(false)} />
          
          <div className="fixed left-4 right-4 top-20 mt-2 z-[100] sm:absolute sm:inset-auto sm:right-0 sm:mt-2 sm:w-96 transform transition-all duration-200 ease-out origin-top-right">
            <Card className="border-gray-100 shadow-2xl overflow-hidden bg-white ring-1 ring-black/5">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="font-black text-brand-dark uppercase tracking-tight text-sm">Notifications</h3>
                <p className="text-xs text-gray-500 font-medium">You have {unreadCount} unread messages</p>
              </div>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-xs font-bold text-brand hover:text-brand-dark hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm font-medium">No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {notifications.map((notification) => (
                    <div 
                      key={notification.id} 
                      className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer relative group ${notification.read ? 'opacity-60' : 'bg-brand-50/10'}`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex gap-3">
                        <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${notification.read ? 'bg-transparent' : 'bg-red-500'}`}></div>
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between items-start">
                            <p className={`text-sm ${notification.read ? 'font-semibold text-gray-700' : 'font-black text-gray-900'}`}>
                              {notification.title}
                            </p>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{notification.time}</span>
                          </div>
                          <p className="text-xs text-gray-500 leading-relaxed font-medium line-clamp-2">
                            {notification.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-3 border-t border-gray-100 bg-gray-50 text-center">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-brand-dark h-8"
                onClick={() => {
                   setIsOpen(false);
                   router.push('/dashboard/notifications');
                }}
              >
                View All Notifications
              </Button>
            </div>
          </Card>
        </div>
        </>
      )}
    </div>
  );
}
