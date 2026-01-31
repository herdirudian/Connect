import { useState, useEffect } from 'react';

export function useAdminNotifications() {
  const [hasNew, setHasNew] = useState(false);
  const [count, setCount] = useState(0);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  useEffect(() => {
    // Initial check
    checkNotifications();

    // Poll every minute
    const interval = setInterval(checkNotifications, 60000);

    return () => clearInterval(interval);
  }, []);

  const checkNotifications = async () => {
    try {
      // Get the last checked time from local storage or default to now
      const storedLastChecked = localStorage.getItem('adminLastNotificationCheck');
      const since = storedLastChecked || new Date().toISOString();

      const res = await fetch(`/api/admin/notifications/latest?since=${since}`);
      if (res.ok) {
        const data = await res.json();
        setHasNew(data.hasNew);
        setCount(data.count);
        
        // Only play sound if there are NEW notifications since last check
        if (data.hasNew && data.count > 0) {
            playNotificationSound();
        }
      }
    } catch (error) {
      console.error('Failed to check notifications', error);
    }
  };

  const markAsRead = () => {
    setHasNew(false);
    setCount(0);
    const now = new Date().toISOString();
    setLastChecked(now);
    localStorage.setItem('adminLastNotificationCheck', now);
  };

  const playNotificationSound = () => {
    try {
        const audio = new Audio('/sounds/notification.mp3');
        audio.play().catch(e => console.log('Audio play failed', e));
    } catch (e) {
        // Ignore audio errors (e.g. user hasn't interacted with document)
    }
  }

  return { hasNew, count, markAsRead, checkNotifications };
}
