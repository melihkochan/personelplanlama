import React from 'react';
import { useAuth } from '../../context/AuthContext';

const SessionTimeoutModal = () => {
  const { showSessionTimeout, sessionTimeoutCountdown, extendSession } = useAuth();

  if (!showSessionTimeout) return null;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all duration-300 scale-100 animate-pulse">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Oturum Zaman Aşımı
          </h2>
          <p className="text-gray-600">
            Güvenlik nedeniyle oturumunuz yakında sonlanacak
          </p>
        </div>

        {/* Countdown */}
        <div className="text-center mb-6">
          <div className="text-4xl font-bold text-orange-600 mb-2">
            {formatTime(sessionTimeoutCountdown)}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-orange-500 h-2 rounded-full transition-all duration-1000 ease-linear"
              style={{ 
                width: `${(sessionTimeoutCountdown / 60) * 100}%`,
                backgroundColor: sessionTimeoutCountdown <= 10 ? '#ef4444' : '#f97316'
              }}
            ></div>
          </div>
        </div>

        {/* Warning Message */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-orange-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="text-sm text-orange-800">
              <p className="font-medium">Oturumunuz sonlanıyor!</p>
              <p className="mt-1">Devam etmek için herhangi bir yere tıklayın veya aşağıdaki butona basın.</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col space-y-3">
          <button
            onClick={extendSession}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Oturumu Uzat
            </div>
          </button>
          
          <button
            onClick={extendSession}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Herhangi bir yere tıklayın
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            Güvenlik için oturumunuz 15 dakika hareketsizlik sonrası sonlanır
          </p>
        </div>
      </div>
    </div>
  );
};

export default SessionTimeoutModal; 