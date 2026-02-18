/**
 * Notifications List Component
 * Recent notifications/alerts
 */

'use client';

import { useState } from 'react';

interface Notification {
  id: string;
  type: 'info' | 'alert' | 'deal';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export function NotificationsList() {
  // Mock notifications (replace with real data later)
  const [notifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'deal',
      title: 'New Deal Available',
      message: '50% off flights to Europe',
      timestamp: '2h ago',
      read: false,
    },
    {
      id: '2',
      type: 'alert',
      title: 'Weather Alert',
      message: 'Heavy rain expected in Tokyo',
      timestamp: '5h ago',
      read: true,
    },
    {
      id: '3',
      type: 'info',
      title: 'Feed Updated',
      message: 'New travel articles available',
      timestamp: '1d ago',
      read: true,
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gp-text font-semibold text-sm">Notifications</h3>
        {unreadCount > 0 && (
          <span className="bg-gp-primary text-black text-xs font-semibold px-2 py-0.5 rounded-full">
            {unreadCount}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-3 rounded-lg border transition-colors ${
                notification.read
                  ? 'bg-gp-bg border-gray-200'
                  : 'bg-gp-primary/5 border-gp-primary/30'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-sm mt-0.5">
                  {notification.type === 'deal' && '💰'}
                  {notification.type === 'alert' && '⚠️'}
                  {notification.type === 'info' && 'ℹ️'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-gp-text text-xs font-semibold mb-0.5">
                    {notification.title}
                  </p>
                  <p className="text-gp-muted text-xs line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-gp-muted text-[10px] mt-1">
                    {notification.timestamp}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-gp-muted text-xs text-center py-4">No notifications</p>
        )}
      </div>
    </div>
  );
}
