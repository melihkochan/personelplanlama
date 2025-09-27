import React, { useState, useEffect, useRef } from 'react';
import { Send, Users, MessageCircle, MoreVertical, Search, Phone, Video, Paperclip, Smile, X, Trash2 } from 'lucide-react';
import ChatMessage from './ChatMessage';
import ChatSidebar from './ChatSidebar';
import { supabase, avatarService } from '../../services/supabase';

const ChatSystem = ({ currentUser }) => {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showConversationMenu, setShowConversationMenu] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Mesajları otomatik scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Sohbetleri yükle
  useEffect(() => {
    if (currentUser?.id) {
      loadConversations();
      loadOnlineUsers();
    }
  }, [currentUser?.id]);


  
  // Real-time conversation updates
  useEffect(() => {
    if (!currentUser?.id) return;
    
    const subscription = supabase
      .channel('conversation_updates')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages'
        }, 
        (payload) => {
          // Eğer mesaj başka birinden geldiyse toast göster
          if (payload.new.sender_id !== currentUser.id) {
            showToastNotification(`Yeni mesaj: ${payload.new.content}`);
          }
          
          loadConversations(); // Conversation list'i yenile
        }
      )
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
            console.log('🔄 Online status değişti, sohbetler yenileniyor...');
            // Sadece conversations state'ini güncelle, tüm verileri yeniden yükleme
            setConversations(prevConversations => {
              return prevConversations.map(conv => {
                const updatedParticipants = conv.chat_participants.map(p => {
                  if (p.user_id === payload.new.id) {
                    return {
                      ...p,
                      is_online: payload.new.is_online,
                      last_seen: payload.new.last_seen
                    };
                  }
                  return p;
                });
                
                return {
                  ...conv,
                  chat_participants: updatedParticipants
                };
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

  // Mesajları dinle
  useEffect(() => {
    if (currentConversation?.id) {
      loadMessages(currentConversation.id);
      markMessagesAsRead(currentConversation.id);
      const unsubscribe = subscribeToMessages(currentConversation.id);
      
      return () => {
        unsubscribe();
      };
    } else {
    }
  }, [currentConversation?.id]);

  const loadConversations = async () => {
    try {
      
      // Önce conversations'ları al
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('*');

      if (convError) {
        console.error('❌ Conversations yüklenirken hata:', convError);
        throw convError;
      }


      // Her conversation için participants ve messages'ları ayrı ayrı al
      const conversationsWithData = [];
      for (const conv of conversations || []) {
        try {
          // Participants'ları al
          const { data: participants, error: partError } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('conversation_id', conv.id);

          if (partError) {
            console.error(`❌ Participants yüklenirken hata (conv ${conv.id}):`, partError);
            continue;
          }

          // Her participant için user bilgilerini al
          const participantsWithData = [];
          for (const participant of participants || []) {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('id, email, full_name, username, last_seen, is_online, avatar_url, role')
              .eq('id', participant.user_id)
              .single();

            if (!userError && userData) {
              participantsWithData.push({
                user_id: userData.id,
                email: userData.email,
                full_name: userData.full_name || userData.username || 'Kullanıcı',
                username: userData.username,
                last_seen: userData.last_seen,
                is_online: userData.is_online || false,
                avatar_url: userData.avatar_url,
                role: userData.role
              });
            }
          }

          // Messages'ları al
          const { data: messages, error: msgError } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: true });

          if (msgError) {
            console.error(`❌ Messages yüklenirken hata (conv ${conv.id}):`, msgError);
          }

          conversationsWithData.push({
            ...conv,
            chat_participants: participantsWithData,
            messages: messages || []
          });
        } catch (error) {
          console.error(`❌ Conversation işlenirken hata (conv ${conv.id}):`, error);
        }
      }

      // Sadece current user'ın dahil olduğu sohbetleri filtrele
      const conversationsWithParticipants = conversationsWithData.filter(conv => {
        return conv.chat_participants?.some(p => p.user_id === currentUser.id);
      });

      // Son mesajın tarihine göre sırala (en yeni üstte)
      const sortedConversations = conversationsWithParticipants.sort((a, b) => {
        const aLastMessage = a.messages && a.messages.length > 0 
          ? new Date(a.messages[a.messages.length - 1].created_at) 
          : new Date(a.created_at);
        const bLastMessage = b.messages && b.messages.length > 0 
          ? new Date(b.messages[b.messages.length - 1].created_at) 
          : new Date(b.created_at);
        
        return bLastMessage - aLastMessage; // En yeni üstte
      });

      setConversations(sortedConversations);
    } catch (error) {
      console.error('❌ Sohbetler yüklenirken genel hata:', error);
      setConversations([]);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Mesajlar yüklenirken hata:', error);
        setMessages([]);
      } else {
        setMessages(data || []);
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error('❌ Mesajlar yüklenirken genel hata:', error);
      setMessages([]);
    }
  };

  const subscribeToMessages = (conversationId) => {
    const subscription = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        }, 
        (payload) => {
          setMessages(prev => [...prev, payload.new]);
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === payload.new.id ? payload.new : msg
            )
          );
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const loadOnlineUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('is_online', true);

      if (error) throw error;
      setOnlineUsers(data?.map(user => user.id) || []);
    } catch (error) {
      console.error('Online kullanıcılar yüklenirken hata:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentConversation) return;

    setIsLoading(true);
    try {
      console.log('📤 Mesaj gönderiliyor:', newMessage.trim());
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: currentConversation.id,
          sender_id: currentUser.id,
          content: newMessage.trim(),
          message_type: 'text',
          message_status: 'sent'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Mesaj gönderilirken hata:', error);
      } else {
        console.log('✅ Mesaj gönderildi:', data);
        setNewMessage('');
        setMessages(prev => [...prev, data]);
        
        // Sohbetleri yeniden yükle
        setTimeout(() => {
          loadConversations();
        }, 100);
      }
    } catch (error) {
      console.error('❌ Mesaj gönderilirken genel hata:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Dosya yükleme işlemi burada yapılacak
      
    }
  };

  const handleEmojiSelect = (emoji) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const markMessagesAsRead = async (conversationId) => {
    try {
      const { data: currentMessages, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId);
      
      if (fetchError) {
        console.error('❌ Mesajlar getirilirken hata:', fetchError);
        return;
      }
      
      const unreadMessages = currentMessages.filter(msg => 
        !msg.is_read && msg.sender_id !== currentUser.id
      );
      
      if (unreadMessages.length > 0) {
        const { error } = await supabase
          .from('messages')
          .update({ 
            is_read: true,
            message_status: 'read'
          })
          .in('id', unreadMessages.map(msg => msg.id));

        if (error) {
          console.error('❌ Mesajlar okundu olarak işaretlenirken hata:', error);
        } else {
          loadConversations();
        }
      }
    } catch (error) {
      console.error('❌ Mesajları okundu işaretleme hatası:', error);
    }
  };

  const showToastNotification = (message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const createNewConversation = async (participantIds, groupData = null) => {
    try {
      console.log('🔄 Yeni sohbet oluşturuluyor:', { participantIds, groupData });
      
      const isGroup = groupData?.isGroup || false;
      const participantId = Array.isArray(participantIds) ? participantIds[1] : participantIds;
      
      // Önce mevcut sohbet var mı kontrol et
      const { data: existingConv, error: existingError } = await supabase
        .from('conversations')
        .select('*');

      if (existingError) {
        console.error('❌ Mevcut sohbetler yüklenirken hata:', existingError);
        throw existingError;
      }

      // Grup sohbeti için mevcut kontrol yapma (her grup benzersiz olabilir)
      if (!isGroup) {
        const existingDirectConv = existingConv?.find(conv => {
          const participants = conv.chat_participants || [];
          return participants.some(p => p.user_id === currentUser.id) && 
                 participants.some(p => p.user_id === participantId);
        });

        if (existingDirectConv) {
          console.log('✅ Mevcut sohbet bulundu:', existingDirectConv);
          setCurrentConversation(existingDirectConv);
          return;
        }
      }

      // Yeni sohbet oluştur
      const conversationData = {
        name: 'Yeni Sohbet'
      };

      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert(conversationData)
        .select()
        .single();

      if (convError) {
        console.error('❌ Sohbet oluşturulurken hata:', convError);
        throw convError;
      }

      // Katılımcıları ekle
      const participantsToInsert = participantIds.map(userId => ({
        conversation_id: newConv.id,
        user_id: userId
      }));

      const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert(participantsToInsert);

      if (participantsError) {
        console.error('❌ Katılımcılar eklenirken hata:', participantsError);
        throw participantsError;
      }

      // Participants bilgisini al
      const { data: participants, error: partError } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('conversation_id', newConv.id);

      if (partError) {
        console.error('❌ Participants bilgisi alınırken hata:', partError);
      }

      const fullConv = {
        ...newConv,
        chat_participants: participants || []
      };

      console.log('✅ Yeni sohbet oluşturuldu:', fullConv);
      setCurrentConversation(fullConv);
      await loadConversations();
      
      // Mesajları yükle
      await loadMessages(newConv.id);
      
      showToastNotification(
        isGroup 
          ? `"${groupData.groupName}" grubu oluşturuldu!` 
          : 'Yeni sohbet başlatıldı!'
      );
    } catch (error) {
      console.error('❌ Sohbet oluşturulurken genel hata:', error);
    }
  };

  const addTestMessage = async () => {
    if (!currentConversation) return;
    
    try {
      console.log('🧪 Test mesajı gönderiliyor...');
      
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: currentConversation.id,
          sender_id: currentUser.id,
          content: 'Merhaba! Bu bir test mesajıdır.',
          message_type: 'text'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Test mesajı eklenirken hata:', error);
      } else {
        console.log('✅ Test mesajı gönderildi:', data);
        // Mesajları yeniden yükle
        await loadMessages(currentConversation.id);
      }
    } catch (error) {
      console.error('❌ Test mesajı eklenirken genel hata:', error);
    }
  };

  return (
    <div className="h-full bg-gray-50 flex">
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col transition-all duration-300">
          <ChatSidebar
            conversations={conversations}
            currentConversation={currentConversation}
            onSelectConversation={setCurrentConversation}
            onCreateConversation={createNewConversation}
            onlineUsers={onlineUsers}
            currentUser={currentUser}
            onClose={() => setShowSidebar(false)}
          />
        </div>
      )}

      {/* Ana Chat Alanı */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
            
            {currentConversation ? (
              <div className="flex items-center space-x-3">
                                  {(() => {
                    // Diğer kullanıcıyı bul
                    const otherUser = currentConversation.chat_participants?.find(p => p.user_id !== currentUser.id);
                    
                    // Kullanıcı adını al
                    const fullName = otherUser?.full_name || otherUser?.user_metadata?.full_name || otherUser?.profiles?.full_name;
                   
                    
                    const getInitials = (name) => {
                      if (!name) return '?';
                      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                    };
                    const getAvatarColor = (email) => {
                      const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-yellow-500', 'bg-red-500', 'bg-teal-500'];
                      const index = email?.length % colors.length || 0;
                      return colors[index];
                    };
                    
                    const isOnline = (user) => {
                      // Users tablosundan gelen is_online bilgisini kullan
                      return user?.is_online || false;
                    };
                    
                    // Avatar URL'ini avatarService ile al
                    const fullAvatarUrl = otherUser?.avatar_url ? avatarService.getAvatarUrl(otherUser.avatar_url) : null;
                    
                    
                    return (
                      <>
                        {fullAvatarUrl ? (
                          <div className="w-10 h-10 rounded-full overflow-hidden">
                            <img 
                              src={fullAvatarUrl} 
                              alt="Avatar" 
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                            <div className={`w-full h-full rounded-full flex items-center justify-center text-white font-medium ${getAvatarColor(otherUser?.email)}`} style={{display: 'none'}}>
                              {getInitials(fullName || otherUser?.email)}
                            </div>
                          </div>
                        ) : (
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${getAvatarColor(otherUser?.email)}`}>
                            {getInitials(fullName || otherUser?.email)}
                          </div>
                        )}
                        <div>
                          <h2 className="font-semibold text-gray-900">
                            {fullName || 'Bilinmeyen Kullanıcı'}
                          </h2>
                          <p className="text-sm text-gray-500">
                            {isOnline(otherUser) ? (
                              <span className="flex items-center text-green-600">
                                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                Çevrimiçi
                              </span>
                            ) : (
                              <span className="text-gray-400">
                                Son görülme {otherUser?.last_seen ? 
                                  (() => {
                                    const lastSeenDate = new Date(otherUser.last_seen);
                                    const now = new Date();
                                    const diffInMs = now - lastSeenDate;
                                    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
                                    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
                                    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
                                    
                                    let timeAgo = '';
                                    if (diffInDays > 0) {
                                      timeAgo = `${diffInDays} gün önce`;
                                    } else if (diffInHours > 0) {
                                      timeAgo = `${diffInHours} saat önce`;
                                    } else if (diffInMinutes > 0) {
                                      timeAgo = `${diffInMinutes} dakika önce`;
                                    } else {
                                      timeAgo = 'Az önce';
                                    }
                                    
                                    const timeString = lastSeenDate.toLocaleTimeString('tr-TR', { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    });
                                    
                                    return `${timeAgo} ${timeString}`;
                                  })() : 
                                  'Bilinmiyor'
                                }
                              </span>
                            )}
                          </p>
                        </div>
                      </>
                    );
                  })()}
              </div>
            ) : (
              <div>
                <h2 className="font-semibold text-gray-900">Mesajlar</h2>
                <p className="text-sm text-gray-500">Sohbet seçin</p>
              </div>
            )}
          </div>

          {currentConversation && (
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setShowConversationMenu(!showConversationMenu)}
                className="p-2 rounded-lg hover:bg-gray-100 relative"
              >
                <MoreVertical className="w-4 h-4" />
                {/* Conversation Menu */}
                {showConversationMenu && (
                  <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[150px]">
                    <button 
                      onClick={async () => {
                        try {
                          // Önce conversation'ı sil
                          const { error: convError } = await supabase
                            .from('conversations')
                            .delete()
                            .eq('id', currentConversation.id);
                          
                          if (convError) {
                            console.error('❌ Conversation silinirken hata:', convError);
                            return;
                          }
                          
                          // Sonra participants'ları sil
                          const { error: partError } = await supabase
                            .from('chat_participants')
                            .delete()
                            .eq('conversation_id', currentConversation.id);
                          
                          if (partError) {
                            console.error('❌ Participants silinirken hata:', partError);
                          }
                          
                          // Sonra messages'ları sil
                          const { error: msgError } = await supabase
                            .from('messages')
                            .delete()
                            .eq('conversation_id', currentConversation.id);
                          
                          if (msgError) {
                            console.error('❌ Messages silinirken hata:', msgError);
                          }
                          
                          // UI'ı güncelle
                          setCurrentConversation(null);
                          setMessages([]);
                          loadConversations();
                          setShowConversationMenu(false);
                          
                          showToastNotification('Sohbet silindi');
                        } catch (error) {
                          console.error('❌ Sohbet silinirken genel hata:', error);
                          showToastNotification('Sohbet silinemedi');
                        }
                      }}
                      className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Sohbeti Sil
                    </button>
                  </div>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Mesaj Alanı */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50" style={{ maxHeight: 'calc(100vh - 140px)' }}>
          {currentConversation ? (
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-8 h-8 text-green-500" />
                  </div>
                  <p className="text-gray-500 text-sm">Henüz mesaj yok</p>
                  <p className="text-gray-400 text-xs mt-1">İlk mesajı siz gönderin</p>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      isOwn={message.sender_id === currentUser.id}
                      currentUser={currentUser}
                      conversation={currentConversation}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageCircle className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Sohbet Seçin
                </h3>
                <p className="text-gray-500 text-sm">
                  Mesajlaşmaya başlamak için bir sohbet seçin
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Mesaj Gönderme Alanı */}
        {currentConversation && (
          <div className="bg-white border-t border-gray-100 p-4">
            <div className="flex items-end space-x-3">
              <div className="flex-1 bg-gray-50 rounded-full px-4 py-3 border border-gray-200 focus-within:border-green-500 focus-within:ring-1 focus-within:ring-green-500 transition-all">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Mesajınızı yazın..."
                  className="w-full bg-transparent border-none outline-none resize-none text-sm placeholder-gray-500"
                  rows="1"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2.5 rounded-full hover:bg-gray-100 relative transition-colors"
                >
                  <Smile className="w-5 h-5 text-gray-500" />
                  
                  {/* Emoji Picker */}
                  {showEmojiPicker && (
                    <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 w-80">
                      <div className="grid grid-cols-8 gap-3">
                        {[
                          '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
                          '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
                          '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜',
                          '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏',
                          '😒', '😞', '😔', '😟', '🙁', '☹️', '😣', '😖',
                          '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡',
                          '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰',
                          '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶'
                        ].map((emoji, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setNewMessage(prev => prev + emoji);
                              setShowEmojiPicker(false);
                            }}
                            className="w-10 h-10 text-xl hover:bg-gray-100 rounded transition-colors flex items-center justify-center"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </button>
                <button
                  onClick={sendMessage}
                  disabled={isLoading || !newMessage.trim()}
                  className="bg-green-500 text-white p-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-600 transition-colors shadow-sm hover:shadow-md"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              
              {/* Windows Emoji Picker kullanılıyor */}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx"
            />
          </div>
        )}
      </div>
      
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 animate-slide-up">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-900">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatSystem; 