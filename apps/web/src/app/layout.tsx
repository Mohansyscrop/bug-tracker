import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/auth-context';
import { NotificationsProvider } from '@/contexts/notifications-context';
import { ToastProvider } from '@/contexts/toast-context';

export const metadata: Metadata = {
  title: { default: 'BugTracker Pro', template: '%s | BugTracker Pro' },
  description: 'Enterprise-grade bug tracking for QA and engineering teams. Track defects, manage lifecycle, and ship quality software.',
  keywords: ['bug tracker', 'issue tracker', 'QA', 'defect management', 'software quality'],
  authors: [{ name: 'BugTracker Pro' }],
  robots: 'noindex',
};

export const viewport: Viewport = {
  themeColor: '#6366f1',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>
          <ToastProvider>
            <NotificationsProvider>
              {children}
            </NotificationsProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
