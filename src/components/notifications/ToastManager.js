import React, { useState, useEffect } from 'react';
import ToastNotification from './ToastNotification';

const ToastManager = ({ onViewNotifications }) => {
  const [toasts, setToasts] = useState([]);

  // Bildirim dinleyicisi
  useEffect(() => {
    const handleNewNotification = (event) => {
      console.log('🔔 Toast event alındı:', event.detail);
      const notification = event.detail;
      addToast(notification);
    };

    console.log('🔔 Toast event listener eklendi');
    window.addEventListener('new-notification', handleNewNotification);
    
    return () => {
      console.log('🔔 Toast event listener kaldırıldı');
      window.removeEventListener('new-notification', handleNewNotification);
    };
  }, []);

  const addToast = (notification) => {
    console.log('🔔 Toast ekleniyor:', notification);
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      ...notification
    };
    
    console.log('🔔 Yeni toast:', newToast);
    setToasts(prev => {
      const newToasts = [...prev, newToast];
      console.log('🔔 Toplam toast sayısı:', newToasts.length);
      return newToasts;
    });
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const handleViewNotifications = () => {
    onViewNotifications();
    // Tüm toast'ları kapat
    setToasts([]);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            transform: `translateY(${index * 80}px)`,
            zIndex: 1000 - index
          }}
        >
          <ToastNotification
            notification={toast}
            onClose={() => removeToast(toast.id)}
            onViewNotifications={handleViewNotifications}
          />
        </div>
      ))}
    </div>
  );
};

export default ToastManager; 