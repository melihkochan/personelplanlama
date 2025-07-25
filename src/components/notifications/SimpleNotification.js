import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCircle } from 'lucide-react';

const SimpleNotification = ({ message, onClose, onViewNotifications }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animasyon için kısa gecikme
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    // 4 saniye sonra otomatik kapat
    const autoCloseTimer = setTimeout(() => {
      handleClose();
    }, 4000);

    return () => {
      clearTimeout(timer);
      clearTimeout(autoCloseTimer);
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 max-w-sm w-full
        transform transition-all duration-300 ease-out
        ${isVisible 
          ? 'translate-x-0 opacity-100 scale-100' 
          : 'translate-x-full opacity-0 scale-95'
        }
        bg-white border border-blue-200 rounded-xl shadow-2xl
        backdrop-blur-sm
      `}
    >
      <div className="p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-900">
                Yeni Bildirim
              </h4>
              <button
                onClick={handleClose}
                className="flex-shrink-0 ml-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mb-3">
              {message}
            </p>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={onViewNotifications}
                className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-1"
              >
                <Bell className="w-3 h-3" />
                <span>Bildirimleri Gör</span>
              </button>
              
              <span className="text-xs text-gray-500">
                {new Date().toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="h-1 bg-gray-200 rounded-b-xl overflow-hidden">
        <div 
          className="h-full bg-blue-500 transition-all duration-4000 ease-linear"
          style={{ width: isVisible ? '0%' : '100%' }}
        />
      </div>
    </div>
  );
};

export default SimpleNotification; 