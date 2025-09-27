import React, { useState, useEffect } from 'react';
import { Plus, MessageCircle, X, Check, CheckCheck, Search, Loader2 } from 'lucide-react';
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
  const [conversationSearchTerm, setConversationSearchTerm] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [showUserList, setShowUserList] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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
      setIsLoading(true);
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
    } finally {
      setIsLoading(false);
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
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-sm">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Sohbetler</h2>
              <div className="flex items-center gap-1">
                <p className="text-sm text-gray-500">{conversations.length} sohbet</p>
                {conversations.reduce((total, conv) => {
                  const unreadMessages = conv.messages?.filter(msg => 
                    msg.is_read === false && msg.sender_id !== currentUser.id
                  ) || [];
                  return total + unreadMessages.length;
                }, 0) > 0 && (
                  <span className="text-sm text-green-600 font-medium">
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
            className="p-2.5 bg-green-500 text-white rounded-full hover:bg-green-600 transition-all duration-200 shadow-sm hover:shadow-md"
            title="Yeni Sohbet"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        
        {/* Sohbet Arama Kutusu */}
        {!showUserList && (
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={conversationSearchTerm}
              onChange={(e) => setConversationSearchTerm(e.target.value)}
              placeholder="Sohbet ara..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
            />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {showUserList ? (
          /* User Selection */
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-sm">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Yeni Sohbet</h3>
              </div>
              <button
                onClick={() => setShowUserList(false)}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
              >
                İptal
              </button>
            </div>
            
            {/* Arama Kutusu */}
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Kullanıcı ara..."
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50 focus:bg-white transition-colors"
              />
            </div>
            
            <div className="space-y-2">
              {filteredUsers.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Search className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">Kullanıcı bulunamadı</p>
                  <p className="text-xs text-gray-400 mt-1">Farklı bir arama terimi deneyin</p>
                </div>
              ) : (
                filteredUsers.map((user, index) => (
                  <div
                    key={user.id}
                    onClick={() => handleUserSelect(user)}
                    className="group flex items-center p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-all duration-200 border border-transparent hover:border-gray-200"
                  >
                    <div className="relative">
                      {user.avatar_url ? (
                        <div className="w-10 h-10 rounded-full overflow-hidden shadow-sm">
                          <img 
                            src={avatarService.getAvatarUrl(user.avatar_url)} 
                            alt="Avatar" 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <div className={`w-full h-full rounded-full flex items-center justify-center text-white font-semibold text-sm ${getAvatarColor(user.email)}`} style={{display: 'none'}}>
                            {getInitials(user.user_metadata?.full_name)}
                          </div>
                        </div>
                      ) : (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm ${getAvatarColor(user.email)}`}>
                          {getInitials(user.user_metadata?.full_name)}
                        </div>
                      )}
                      {isOnline(user) && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
                      )}
                    </div>
                  
                    <div className="ml-3 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium text-gray-900 group-hover:text-green-600 transition-colors truncate">
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
                ))
              )}
            </div>
          </div>
        ) : isLoading ? (
          /* Loading State */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sohbetler yükleniyor...</h3>
            <p className="text-sm text-gray-500">Lütfen bekleyin</p>
          </div>
        ) : conversations.length === 0 ? (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <MessageCircle className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Henüz sohbet yok</h3>
            <p className="text-sm text-gray-600 mb-6 max-w-sm">
              Yeni bir sohbet başlatmak için yukarıdaki + butonuna tıklayın
            </p>
            <button
              onClick={() => setShowUserList(true)}
              className="bg-green-500 text-white px-6 py-3 rounded-full hover:bg-green-600 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
            >
              Yeni Sohbet Başlat
            </button>
          </div>
        ) : (
          /* Conversation List */
          <div className="p-2 space-y-1">
            {(() => {
              const filteredConversations = conversations.filter(conversation => {
                if (!conversationSearchTerm) return true;
                
                const otherUser = conversation.chat_participants?.find(p => p.user_id !== currentUser.id);
                const otherUserName = otherUser?.full_name || 'Bilinmeyen Kullanıcı';
                const lastMessage = conversation.messages?.[conversation.messages.length - 1];
                const messageContent = lastMessage?.content || '';
                
                const searchLower = conversationSearchTerm.toLowerCase();
                return (
                  otherUserName.toLowerCase().includes(searchLower) ||
                  messageContent.toLowerCase().includes(searchLower)
                );
              });

              if (conversationSearchTerm && filteredConversations.length === 0) {
                return (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Search className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500">Sohbet bulunamadı</p>
                    <p className="text-xs text-gray-400 mt-1">"{conversationSearchTerm}" için sonuç yok</p>
                  </div>
                );
              }

              return filteredConversations.map((conversation, index) => {
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
                      ? 'bg-green-50 border-l-4 border-l-green-500' 
                      : 'hover:bg-gray-50'
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
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
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
                        <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold bg-green-500 text-white shadow-sm">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
              });
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatSidebar; 