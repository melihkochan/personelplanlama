import React from 'react';
import { Check, CheckCheck, Clock } from 'lucide-react';

const ChatMessage = ({ message, isOwn, currentUser, conversation }) => {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('tr-TR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getStatusIcon = () => {
    if (isOwn) {
      // WhatsApp tarzı durum ikonları
      switch (message.message_status) {
        case 'read':
          return (
            <div className="flex items-center gap-1">
              <CheckCheck className="w-4 h-4 text-blue-400 font-bold" />
              <span className="text-xs text-blue-400 font-medium">Görüldü</span>
            </div>
          );
        case 'delivered':
          return (
            <div className="flex items-center gap-1">
              <CheckCheck className="w-4 h-4 text-gray-300" />
              <span className="text-xs text-gray-300">İletildi</span>
            </div>
          );
        case 'sent':
        default:
          return (
            <div className="flex items-center gap-1">
              <Check className="w-4 h-4 text-gray-300" />
              <span className="text-xs text-gray-300">Gönderildi</span>
            </div>
          );
      }
    }
    return null;
  };

  const getSenderName = () => {
    // Mesaj gönderen kişinin adını al
    if (message.sender_id === currentUser?.id) {
      return currentUser?.user_metadata?.full_name || currentUser?.email?.split('@')[0] || 'Siz';
    }
    // Diğer kullanıcı için conversation'dan bilgi al
    if (conversation?.chat_participants) {
      const otherUser = conversation.chat_participants.find(p => p.user_id !== currentUser?.id);
      return otherUser?.full_name || otherUser?.email?.split('@')[0] || 'Kullanıcı';
    }
    return null;
  };

  const getSenderInitials = () => {
    const name = getSenderName();
    if (!name) {
      // Eğer isim yoksa, email'den al
      const email = message.sender_id === currentUser?.id ? currentUser?.email : 'diger@kullanici.com';
      return email?.split('@')[0]?.substring(0, 2).toUpperCase() || '?';
    }
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4 animate-fade-in`}>
      <div className={`flex items-end gap-3 max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse' : ''}`}>
        {/* Avatar */}
        {!isOwn && (
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-sm font-semibold shadow-lg">
              {getSenderInitials() || '?'}
            </div>
          </div>
        )}

        {/* Mesaj Balonu */}
        <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
          {/* Gönderen Adı - İki kişilik sohbette gizli, grup sohbetinde aktif */}
          {false && !isOwn && (
            <span className="text-xs text-gray-500 mb-1 px-2">
              {getSenderName()}
            </span>
          )}

          {/* Mesaj İçeriği */}
          <div
            className={`
              px-5 py-3 rounded-2xl max-w-full break-words transition-all duration-300 shadow-lg
              ${isOwn 
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-blue-200' 
                : 'bg-white border border-gray-100 text-gray-900 shadow-gray-100'
              }
            `}
          >
            {message.message_type === 'text' ? (
              <p className="text-sm leading-relaxed">
                {message.content}
              </p>
            ) : message.message_type === 'file' ? (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-white/20 rounded flex items-center justify-center">
                  <span className="text-xs">📎</span>
                </div>
                <div>
                  <p className="text-xs font-medium">{message.file_name}</p>
                  <p className="text-xs opacity-75">
                    {(message.file_size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            ) : message.message_type === 'image' ? (
              <div className="space-y-2">
                <img 
                  src={message.file_url} 
                  alt="Gönderilen resim"
                  className="rounded-lg max-w-full max-h-64 object-cover"
                />
                {message.content && (
                  <p className="text-sm leading-relaxed">{message.content}</p>
                )}
              </div>
            ) : (
              <p className="text-sm leading-relaxed">{message.content}</p>
            )}
          </div>

          {/* Zaman ve Durum */}
          <div className={`flex items-center gap-2 mt-2 px-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
            <span className={`text-xs font-medium ${
              isOwn ? 'text-gray-300' : 'text-gray-600'
            }`}>
              {formatTime(message.created_at)}
            </span>
            {getStatusIcon()}
            {message.message_status === 'read' && message.read_at && (
              <span className={`text-xs font-medium ${
                isOwn ? 'text-gray-300' : 'text-gray-700'
              }`}>
                • {new Date(message.read_at).toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatMessage; 