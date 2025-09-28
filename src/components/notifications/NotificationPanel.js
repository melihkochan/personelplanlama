import React, { useState, useEffect } from 'react';
import { Bell, X, Check, Trash2, Info, AlertCircle, CheckCircle, XCircle, CheckCheck, Trash } from 'lucide-react';
import { getNotifications, markNotificationAsRead, deleteNotification, getUnreadNotificationCount, markAllNotificationsAsRead, deleteAllNotifications } from '../../services/supabase';

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

  // Tüm bildirimleri okundu olarak işaretle
  const handleMarkAllAsRead = async () => {
    try {
      const result = await markAllNotificationsAsRead(currentUser.id);
      if (result.success) {
        // Tüm bildirimleri okundu olarak güncelle
        setNotifications(prev => 
          prev.map(notif => ({ 
            ...notif, 
            is_read: true, 
            read_at: new Date().toISOString() 
          }))
        );
        setUnreadCount(0);
      } else {
        alert('Bildirimler okundu işaretlenemedi: ' + result.error);
      }
    } catch (error) {
      alert('Bildirim işaretleme hatası: ' + error.message);
    }
  };

  // Tüm bildirimleri sil
  const handleClearAllNotifications = async () => {
    if (!window.confirm('Tüm bildirimleri silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      return;
    }

    try {
      const result = await deleteAllNotifications(currentUser.id);
      if (result.success) {
        setNotifications([]);
        setUnreadCount(0);
      } else {
        alert('Bildirimler silinemedi: ' + result.error);
      }
    } catch (error) {
      alert('Bildirim silme hatası: ' + error.message);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'audit':
        return <Info className="w-4 h-4 text-blue-500" />;
      case 'info':
        return <Info className="w-4 h-4 text-blue-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-500" />;
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
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white flex items-center">
              <Bell className="w-4 h-4 mr-2" />
              Bildirimler
              {unreadCount > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[18px] flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </h3>
            <div className="flex items-center space-x-2">
              {notifications.length > 0 && (
                <>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-white hover:text-green-200 transition-colors p-1 rounded"
                      title="Tümünü okundu yap"
                    >
                      <CheckCheck className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={handleClearAllNotifications}
                    className="text-white hover:text-red-200 transition-colors p-1 rounded"
                    title="Tümünü temizle"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="text-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Bildirimler yükleniyor...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-6">
              <Bell className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900 mb-1">Bildirim bulunamadı</p>
              <p className="text-xs text-gray-600">Henüz hiç bildiriminiz yok.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border transition-all duration-200 ${
                    notification.is_read
                      ? 'bg-gray-50 border-gray-200'
                      : 'bg-blue-50 border-blue-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-2 flex-1">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </h4>
                          {!notification.is_read && (
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mb-2 leading-relaxed">
                          {notification.message}
                        </p>
                        <div className="flex items-center space-x-3 text-xs text-gray-500">
                          <span>{formatDate(notification.created_at)}</span>
                          {notification.action_type && (
                            <span className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">
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
                          <Check className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteNotification(notification.id)}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Bildirimi sil"
                      >
                        <Trash2 className="w-3 h-3" />
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