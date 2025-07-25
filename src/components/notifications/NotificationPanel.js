import React, { useState, useEffect } from 'react';
import { Bell, X, Check, Trash2, Info, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { getNotifications, markNotificationAsRead, deleteNotification, getUnreadNotificationCount } from '../../services/supabase';

const NotificationPanel = ({ currentUser, isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isOpen && currentUser) {
      
      loadNotifications();
      loadUnreadCount();
    }
  }, [isOpen, currentUser]);

  // Panel kapandığında state'i temizle
  useEffect(() => {
    if (!isOpen) {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const result = await getNotifications(currentUser.id, { limit: 50 });
      if (result.success) {
        setNotifications(result.data);
      }
    } catch (error) {
      
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const result = await getUnreadNotificationCount(currentUser.id);
      if (result.success) {
        setUnreadCount(result.count);
      }
    } catch (error) {
     
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const result = await markNotificationAsRead(notificationId, currentUser.id);
      if (result.success) {
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, is_read: true, read_at: new Date().toISOString() }
              : notif
          )
        );
        loadUnreadCount();
      }
    } catch (error) {
     
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    try {
     
      const result = await deleteNotification(notificationId, currentUser.id);
      if (result.success) {
       
        // State'i güncelle
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
        // Okunmamış sayısını yenile
        loadUnreadCount();
        // Kısa bir süre sonra bildirimleri yeniden yükle
        setTimeout(() => {
          loadNotifications();
        }, 500);
      } else {
      
        alert('Bildirim silinemedi: ' + result.error);
      }
    } catch (error) {
    
      alert('Bildirim silme hatası: ' + error.message);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'audit':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Info className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return `${diffInMinutes} dakika önce`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} saat önce`;
    } else {
      return date.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Bildirimler
              {unreadCount > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full min-w-[20px] flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </h3>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">Bildirimler yükleniyor...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">Bildirim bulunamadı</p>
              <p className="text-gray-600">Henüz hiç bildiriminiz yok.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border transition-all duration-200 ${
                    notification.is_read
                      ? 'bg-gray-50 border-gray-200'
                      : 'bg-blue-50 border-blue-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-semibold text-gray-900">
                            {notification.title}
                          </h4>
                          {!notification.is_read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>{formatDate(notification.created_at)}</span>
                          {notification.action_type && (
                            <span className="px-2 py-1 bg-gray-100 rounded">
                              {notification.action_type}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1 ml-2">
                      {!notification.is_read && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="p-1 text-gray-400 hover:text-green-500 transition-colors"
                          title="Okundu işaretle"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteNotification(notification.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Bildirimi sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel; 