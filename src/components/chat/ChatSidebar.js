import React, { useState, useEffect } from 'react';
import { Plus, MessageCircle, X, Check, CheckCheck } from 'lucide-react';
import { supabase, getChatUsers } from '../../services/supabase';

const ChatSidebar = ({ 
  conversations, 
  currentConversation, 
  onSelectConversation, 
  onCreateConversation,
  onlineUsers,
  currentUser,
  onClose 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [showUserList, setShowUserList] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    if (currentUser?.id && allUsers.length === 0) {
      loadAllUsers();
    }
  }, [currentUser?.id]);

  const loadAllUsers = async () => {
    try {
      const result = await getChatUsers(currentUser.id);
      
      if (result.success && result.data.length > 0) {
        // Duplicate'leri kaldır ve current user'ı filtrele
        const uniqueUsers = result.data
          .filter((user, index, self) => 
            index === self.findIndex(u => u.id === user.id)
          )
          .filter(user => user.id !== currentUser.id);
        
        setAllUsers(uniqueUsers);
      } else {
        setAllUsers([]);
      }
    } catch (error) {
      console.error('❌ Kullanıcılar yüklenirken hata:', error);
      setAllUsers([]);
    }
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setShowUserList(false);
    
    // Önce mevcut sohbetlerde bu kullanıcıyla olan sohbeti ara
    const existingConv = conversations.find(conv => {
      const participants = conv.chat_participants || [];
      return participants.some(p => p.user_id === currentUser.id) && 
             participants.some(p => p.user_id === user.id);
    });

    if (existingConv) {
      onSelectConversation(existingConv);
    } else {
      onCreateConversation([currentUser.id, user.id]);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAvatarColor = (email) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 
      'bg-indigo-500', 'bg-yellow-500', 'bg-red-500', 'bg-teal-500'
    ];
    const index = email.length % colors.length;
    return colors[index];
  };

  const isOnline = (user) => {
    // Users tablosundan gelen is_online bilgisini kullan
    return user?.is_online || false;
  };

  const filteredUsers = allUsers
    .filter(user => user.id !== currentUser.id) // Önce current user'ı filtrele
    .filter(user => {
      // Sonra search term'e göre filtrele
      const searchLower = searchTerm.toLowerCase();
      return (
        user.user_metadata?.full_name?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower)
      );
    })
    .filter((user, index, self) => 
      // Duplicate'leri kaldır (aynı ID'ye sahip kullanıcıları)
      index === self.findIndex(u => u.id === user.id)
    );

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-semibold text-gray-900">Mesajlar</h2>
            {conversations.reduce((total, conv) => {
              const unreadMessages = conv.messages?.filter(msg => 
                msg.is_read === false && msg.sender_id !== currentUser.id
              ) || [];
              return total + unreadMessages.length;
            }, 0) > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold bg-red-500 text-white">
                {conversations.reduce((total, conv) => {
                  const unreadMessages = conv.messages?.filter(msg => 
                    msg.is_read === false && msg.sender_id !== currentUser.id
                  ) || [];
                  return total + unreadMessages.length;
                }, 0)}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowUserList(!showUserList)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              title="Yeni Sohbet"
            >
              <Plus className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {showUserList ? (
          /* User Selection */
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Yeni Sohbet</h3>
              <button
                onClick={() => setShowUserList(false)}
                className="text-sm text-purple-600 hover:text-purple-700"
              >
                İptal
              </button>
            </div>
            
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className="flex items-center p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${getAvatarColor(user.email)}`}>
                      {getInitials(user.user_metadata?.full_name)}
                    </div>
                    {isOnline(user) && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">
                        {user.full_name || user.user_metadata?.full_name || user.email?.split('@')[0]}
                      </h4>
                      <span className="text-xs text-gray-500">
                        {isOnline(user) ? 'Çevrimiçi' : 'Çevrimdışı'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : conversations.length === 0 ? (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz sohbet yok</h3>
            <p className="text-gray-500 mb-4">
              Yeni bir sohbet başlatmak için + butonuna tıklayın
            </p>
            <button
              onClick={() => setShowUserList(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Yeni Sohbet Başlat
            </button>
          </div>
        ) : (
          /* Conversation List */
          <div className="p-4 space-y-2">
            {conversations.map((conversation) => {
              // Diğer kullanıcıyı bul
              const otherUser = conversation.chat_participants?.find(p => p.user_id !== currentUser.id);
              const otherUserName = otherUser?.full_name || 'Bilinmeyen Kullanıcı';
              
              // Son mesajı bul
              const lastMessage = conversation.messages?.[conversation.messages.length - 1];
              const isLastMessageFromMe = lastMessage?.sender_id === currentUser.id;
              
              // Okunmamış mesaj sayısı
              const unreadCount = conversation.messages?.filter(msg => 
                msg.is_read === false && msg.sender_id !== currentUser.id
              ).length || 0;

              return (
                <div
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation)}
                  className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                    currentConversation?.id === conversation.id 
                      ? 'bg-purple-100 border border-purple-200' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${getAvatarColor(otherUser?.email || '')}`}>
                      {getInitials(otherUserName)}
                    </div>
                    {isOnline(otherUser?.user_id) && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900 truncate">
                        {otherUserName}
                      </h4>
                      <span className={`text-xs ${unreadCount > 0 ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
                        {lastMessage?.created_at ? 
                          new Date(lastMessage.created_at).toLocaleTimeString('tr-TR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          }) : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <p className="text-sm text-gray-500 truncate">
                          {isLastMessageFromMe ? 'Siz: ' : ''}
                          {lastMessage?.content || 'Henüz mesaj yok'}
                        </p>
                        {/* Mesaj durumu - sadece kendi mesajlarımız için */}
                        {isLastMessageFromMe && lastMessage && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {lastMessage.message_status === 'read' ? (
                              <div className="flex items-center gap-1">
                                <CheckCheck className="w-3 h-3 text-blue-600" />
                                <span className="text-xs text-blue-600 font-medium">Görüldü</span>
                              </div>
                            ) : lastMessage.message_status === 'delivered' ? (
                              <div className="flex items-center gap-1">
                                <CheckCheck className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-400">İletildi</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <Check className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-400">Gönderildi</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold bg-red-500 text-white">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar; 