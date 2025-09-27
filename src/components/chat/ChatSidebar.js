import React, { useState, useEffect } from 'react';
import { Plus, MessageCircle, X, Check, CheckCheck } from 'lucide-react';
import { supabase, getChatUsers, avatarService } from '../../services/supabase';

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
    if (currentUser?.id) {
      loadAllUsers();
    }
  }, [currentUser?.id]);

  // Real-time user status updates
  useEffect(() => {
    if (!currentUser?.id) return;
    
    const subscription = supabase
      .channel('user_status_updates')
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users'
        },
        (payload) => {
          // Online status değişikliklerini dinle
          if (payload.new.is_online !== payload.old.is_online || 
              payload.new.last_seen !== payload.old.last_seen) {
            // Sadece allUsers state'ini güncelle
            setAllUsers(prevUsers => {
              return prevUsers.map(user => {
                if (user.id === payload.new.id) {
                  return {
                    ...user,
                    is_online: payload.new.is_online,
                    last_seen: payload.new.last_seen
                  };
                }
                return user;
              });
            });
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
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
    )
    .sort((a, b) => {
      // Role göre sıralama
      const roleOrder = {
        'admin': 1,
        'yönetici': 2,
        'kullanıcı': 3
      };
      
      const aRole = a.user_metadata?.role || a.role || 'kullanıcı';
      const bRole = b.user_metadata?.role || b.role || 'kullanıcı';
      
      const aOrder = roleOrder[aRole] || 6;
      const bOrder = roleOrder[bRole] || 6;
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      
      // Aynı role sahipse alfabetik sırala
      const aName = a.user_metadata?.full_name || a.email || '';
      const bName = b.user_metadata?.full_name || b.email || '';
      return aName.localeCompare(bName, 'tr');
    });

  return (
    <div className="w-80 bg-gradient-to-b from-white to-gray-50 border-r border-gray-200 flex flex-col h-full shadow-lg">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Sohbetler</h2>
              <div className="flex items-center gap-1">
                <p className="text-xs text-gray-500">{conversations.length} sohbet</p>
                {conversations.reduce((total, conv) => {
                  const unreadMessages = conv.messages?.filter(msg => 
                    msg.is_read === false && msg.sender_id !== currentUser.id
                  ) || [];
                  return total + unreadMessages.length;
                }, 0) > 0 && (
                  <span className="text-xs text-red-500 font-medium">
                    • {conversations.reduce((total, conv) => {
                      const unreadMessages = conv.messages?.filter(msg => 
                        msg.is_read === false && msg.sender_id !== currentUser.id
                      ) || [];
                      return total + unreadMessages.length;
                    }, 0)} okunmamış
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowUserList(!showUserList)}
            className="p-2 bg-gradient-to-r from-green-500 to-blue-600 text-white rounded-lg hover:from-green-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-md"
            title="Yeni Sohbet"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {showUserList ? (
          /* User Selection */
          <div className="p-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-base font-semibold text-gray-900">Yeni Sohbet</h3>
              </div>
              <button
                onClick={() => setShowUserList(false)}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium hover:bg-purple-50 px-3 py-1 rounded-lg transition-colors"
              >
                İptal
              </button>
            </div>
            
            <div className="space-y-3">
              {filteredUsers.map((user, index) => (
                <div
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className="group flex items-center p-4 rounded-xl cursor-pointer hover:bg-white hover:shadow-md border border-transparent hover:border-gray-200 transition-all duration-300 transform hover:scale-[1.02]"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="relative">
                    {user.avatar_url ? (
                      <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg">
                        <img 
                          src={avatarService.getAvatarUrl(user.avatar_url)} 
                          alt="Avatar" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div className={`w-full h-full rounded-xl flex items-center justify-center text-white font-semibold text-sm shadow-lg ${getAvatarColor(user.email)}`} style={{display: 'none'}}>
                          {getInitials(user.user_metadata?.full_name)}
                        </div>
                      </div>
                    ) : (
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-semibold text-sm shadow-lg ${getAvatarColor(user.email)}`}>
                        {getInitials(user.user_metadata?.full_name)}
                      </div>
                    )}
                    {isOnline(user) && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-3 border-white rounded-full animate-pulse"></div>
                    )}
                  </div>
                  
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-gray-900 group-hover:text-purple-600 transition-colors truncate">
                        {user.full_name || user.user_metadata?.full_name || 'Kullanıcı'}
                      </h4>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        isOnline(user) 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {isOnline(user) ? 'Çevrimiçi' : 'Çevrimdışı'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">
                      {(() => {
                        const role = user.user_metadata?.role || user.role || 'kullanıcı';
                        const roleNames = {
                          'admin': 'Admin',
                          'yönetici': 'Yönetici',
                          'kullanıcı': 'Kullanıcı'
                        };
                        return roleNames[role] || 'Kullanıcı';
                      })()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : conversations.length === 0 ? (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <MessageCircle className="w-10 h-10 text-purple-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Henüz sohbet yok</h3>
            <p className="text-sm text-gray-600 mb-6 max-w-sm">
              Yeni bir sohbet başlatmak için yukarıdaki + butonuna tıklayın
            </p>
            <button
              onClick={() => setShowUserList(true)}
              className="bg-gradient-to-r from-purple-500 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg font-medium"
            >
              Yeni Sohbet Başlat
            </button>
          </div>
        ) : (
          /* Conversation List */
          <div className="p-2 space-y-1">
            {conversations.map((conversation, index) => {
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
                  className={`group flex items-center p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-50 ${
                    currentConversation?.id === conversation.id 
                      ? 'bg-green-50 border border-green-200' 
                      : 'border-b border-gray-100'
                  }`}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="relative">
                    {otherUser?.avatar_url ? (
                      <div className="w-10 h-10 rounded-full overflow-hidden">
                        <img 
                          src={avatarService.getAvatarUrl(otherUser.avatar_url)} 
                          alt="Avatar" 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                        <div className={`w-full h-full rounded-full flex items-center justify-center text-white font-semibold text-sm ${getAvatarColor(otherUser?.email || '')}`} style={{display: 'none'}}>
                          {getInitials(otherUserName)}
                        </div>
                      </div>
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${getAvatarColor(otherUser?.email || '')}`}>
                        {getInitials(otherUserName)}
                      </div>
                    )}
                    {isOnline(otherUser) && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {otherUserName}
                      </h4>
                      <span className={`text-xs ${unreadCount > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                        {lastMessage?.created_at ? 
                          new Date(lastMessage.created_at).toLocaleTimeString('tr-TR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          }) : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <p className="text-xs text-gray-500 truncate">
                          {isLastMessageFromMe ? 'Siz: ' : ''}
                          {lastMessage?.content || 'Henüz mesaj yok'}
                        </p>
                        {/* Mesaj durumu - sadece kendi mesajlarımız için */}
                        {isLastMessageFromMe && lastMessage && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {lastMessage.message_status === 'read' ? (
                              <CheckCheck className="w-3 h-3 text-blue-500" />
                            ) : lastMessage.message_status === 'delivered' ? (
                              <CheckCheck className="w-3 h-3 text-gray-400" />
                            ) : (
                              <Check className="w-3 h-3 text-gray-400" />
                            )}
                          </div>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full text-xs font-bold bg-green-500 text-white">
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