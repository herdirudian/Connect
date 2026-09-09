import { useState, useEffect, useRef, useCallback } from 'react';

export interface PaidOrderNotification {
  id: string;
  category: string;
  typeLabel: string;
  guestName: string;
  tableNumber?: string | null;
  roomNumber?: string | null;
  amount: number;
  restaurantName?: string;
  updatedAt: string;
}

export function useAdminNotifications() {
  const [hasNew, setHasNew] = useState(false);
  const [count, setCount] = useState(0);
  const [paidOrders, setPaidOrders] = useState<PaidOrderNotification[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const lastProcessedOrderIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission;
    }
    return 'denied' as NotificationPermission;
  };

  // Web Audio API Synthesizer chime for reliable cross-browser audio playback
  const playWebAudioChime = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      const ctx = new AudioContextClass();
      const now = ctx.currentTime;

      // Create a 3-note chime (C5 -> E5 -> G5)
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.12);

        gain.gain.setValueAtTime(0, now + index * 0.12);
        gain.gain.linearRampToValueAtTime(0.3, now + index * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.12 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + index * 0.12);
        osc.stop(now + index * 0.12 + 0.45);
      });
    } catch (e) {
      console.warn('Web Audio playback failed', e);
    }
  }, []);

  const playNotificationSound = useCallback(() => {
    // 1. Play Web Audio Synthesizer Chime
    playWebAudioChime();

    // 2. Play Audio MP3 File Fallback
    try {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.8;
      audio.play().catch(e => console.log('MP3 Audio play blocked by browser', e));
    } catch (e) {
      // ignore
    }
  }, [playWebAudioChime]);

  const triggerBrowserNotification = useCallback((order: PaidOrderNotification) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      const title = `🔔 PESANAN BARU LUNAS!`;
      const body = `${order.typeLabel}\n${order.guestName ? 'Pemesan: ' + order.guestName + ' • ' : ''}Total: Rp ${order.amount.toLocaleString('id-ID')}`;

      try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(title, {
              body,
              icon: '/icons/icon-192x192.png',
              badge: '/icons/icon-192x192.png',
              tag: `order-${order.id}`,
              data: { url: '/admin/food/orders-paid' }
            });
          });
        } else {
          const n = new Notification(title, {
            body,
            icon: '/icons/icon-192x192.png',
            tag: `order-${order.id}`
          });
          n.onclick = () => {
            window.focus();
            window.location.href = '/admin/food/orders-paid';
          };
        }
      } catch (err) {
        console.error('System notification error:', err);
      }
    }
  }, []);

  const checkNotifications = useCallback(async () => {
    try {
      const storedLastChecked = localStorage.getItem('adminLastNotificationCheck');
      // Default to 10 minutes ago if no stored timestamp
      const since = storedLastChecked || new Date(Date.now() - 10 * 60 * 1000).toISOString();

      const res = await fetch(`/api/admin/notifications/latest?since=${encodeURIComponent(since)}`);
      if (res.ok) {
        const data = await res.json();
        setHasNew(data.hasNew);
        setCount(data.count);
        setPaidOrders(data.paidOrders || []);

        if (data.hasNew && data.latestPaidOrder) {
          const latestOrder: PaidOrderNotification = data.latestPaidOrder;
          if (latestOrder.id !== lastProcessedOrderIdRef.current) {
            lastProcessedOrderIdRef.current = latestOrder.id;

            // Trigger Sound & OS Push Notification
            playNotificationSound();
            triggerBrowserNotification(latestOrder);
          }
        }
      }
    } catch (error) {
      console.error('Failed to check notifications', error);
    }
  }, [playNotificationSound, triggerBrowserNotification]);

  useEffect(() => {
    // Initial check
    checkNotifications();

    // Fast polling every 10 seconds for real-time order alerts
    const interval = setInterval(checkNotifications, 10000);

    return () => clearInterval(interval);
  }, [checkNotifications]);

  const markAsRead = () => {
    setHasNew(false);
    setCount(0);
    setPaidOrders([]);
    const now = new Date().toISOString();
    localStorage.setItem('adminLastNotificationCheck', now);
  };

  return {
    hasNew,
    count,
    paidOrders,
    notificationPermission,
    requestPermission,
    markAsRead,
    checkNotifications,
    playNotificationSound
  };
}
