'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiBell, FiX, FiCheck } from 'react-icons/fi';
import { useNotifications } from './NotificationProvider';
import { formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

export default function NotificationList() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const toggleNotifications = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={toggleNotifications}
        className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none"
      >
        <FiBell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-lg overflow-hidden z-50"
          >
            <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
              <h3 className="font-semibold">Notifications</h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs flex items-center hover:bg-white/10 rounded px-2 py-1"
                  >
                    <FiCheck className="mr-1" />
                    Tout marquer comme lu
                  </button>
                )}
                <button
                  onClick={toggleNotifications}
                  className="hover:bg-white/10 rounded p-1"
                >
                  <FiX />
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Aucune notification
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex justify-between">
                        <h4 className="font-medium text-sm">{notification.title}</h4>
                        <span className="text-xs text-gray-500">
                          {formatDate(notification.createdAt.toDate())}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      {!notification.read && (
                        <div className="mt-2 flex justify-end">
                          <Button
                            variant="outline"
                            className="text-xs py-1 px-2"
                            onClick={() => markAsRead(notification.id)}
                          >
                            Marquer comme lu
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
