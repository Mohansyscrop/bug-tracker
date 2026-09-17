'use client';
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { notificationsApi } from '@/lib/api';
import { useAuth } from './auth-context';
import { io, Socket } from 'socket.io-client';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  bugId?: string;
  bugIssueKey?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  loading: boolean;
}

const NotificationsContext = createContext<NotificationsContextType | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    notificationsApi.list(1, 50)
      .then((res) => setNotifications(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));

    // WebSocket connection
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000';
    const socket = io(`${wsUrl}/notifications`, {
      auth: { userId: user.id },
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on('notification', (notification: Notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 100));
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    await notificationsApi.markRead(id).catch(console.error);
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await notificationsApi.markAllRead().catch(console.error);
  }, []);

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, loading }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
