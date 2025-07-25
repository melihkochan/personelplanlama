import React, { useState, useEffect, useRef } from 'react';
import { Send, Users, MessageCircle, MoreVertical, Search, Phone, Video, Paperclip, Smile, X, Trash2 } from 'lucide-react';
import ChatMessage from './ChatMessage';
import ChatSidebar from './ChatSidebar';
import { supabase } from '../../services/supabase';

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
      console.log('🔍 Current User:', currentUser);
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
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentUser?.id]);

  // Mesajları dinle
  useEffect(() => {
    if (currentConversation?.id) {
      console.log('🔄 Sohbet değişti, mesajlar yükleniyor:', currentConversation.id);
      loadMessages(currentConversation.id);
      markMessagesAsRead(currentConversation.id);
      const unsubscribe = subscribeToMessages(currentConversation.id);
      
      return () => {
        unsubscribe();
      };
    } else {
      console.log('❌ currentConversation yok veya ID yok:', currentConversation);
    }
  }, [currentConversation?.id]);

  const loadConversations = async () => {
    try {
      console.log('🔄 Sohbetler yükleniyor...');
      
      // Basit sohbet yükleme - sadece conversations
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('*');

      if (convError) {
        console.error('❌ Conversations yüklenirken hata:', convError);
        throw convError;
      }

      console.log('📋 Bulunan sohbetler:', conversations?.length || 0);

      // Basit participants yükleme
      const conversationsWithParticipants = [];
      
      for (const conv of conversations) {
        try {
          const { data: participants, error: partError } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('conversation_id', conv.id);

          if (partError) {
            console.error(`❌ Participants yüklenirken hata (conv ${conv.id}):`, partError);
            continue;
          }

          // Gerçek kullanıcı bilgilerini al
          const participantsWithData = [];
          for (const participant of participants || []) {
            try {
                            // Users tablosundan kullanıcı bilgilerini al
              console.log('🔍 Kullanıcı bilgisi aranıyor:', participant.user_id);
              console.log('🔍 Current user ID:', currentUser.id);
              console.log('🔍 Current user email:', currentUser.email);
              
              // Önce ID ile dene
              let { data: userData, error: userError } = await supabase
                .from('users')
                .select('id, email, full_name, username, last_seen, is_online')
                .eq('id', participant.user_id)
                .single();

              // Eğer bulunamazsa, email ile dene
              if (userError) {
                console.log('⚠️ ID ile bulunamadı, email ile deneniyor...');
                const { data: emailUserData, error: emailError } = await supabase
                  .from('users')
                  .select('id, email, full_name, username, last_seen, is_online')
                  .eq('email', currentUser.email)
                  .single();
                
                if (!emailError && emailUserData) {
                  userData = emailUserData;
                  userError = null;
                  console.log('✅ Email ile kullanıcı bulundu:', userData);
                }
              }

              console.log('🔍 UserData:', userData);
              console.log('🔍 UserError:', userError);

              if (!userError && userData) {
                console.log('✅ Kullanıcı bulundu:', userData);
                participantsWithData.push({
                  user_id: userData.id,
                  email: userData.email,
                  full_name: userData.full_name || userData.username || 'Kullanıcı',
                  username: userData.username,
                  last_seen: userData.last_seen,
                  is_online: userData.is_online
                });
              } else {
                console.log('⚠️ Kullanıcı bilgisi bulunamadı:', participant.user_id, userError);
                // Fallback
                participantsWithData.push({
                  user_id: participant.user_id,
                  email: 'bilinmeyen@kullanici.com',
                  full_name: 'Bilinmeyen Kullanıcı',
                  last_seen: null,
                  is_online: false
                });
              }
            } catch (error) {
              console.error('❌ Kullanıcı bilgisi alınırken genel hata:', error);
              participantsWithData.push({
                user_id: participant.user_id,
                email: 'bilinmeyen@kullanici.com',
                full_name: 'Bilinmeyen Kullanıcı',
                last_seen: null,
                is_online: false
              });
            }
          }

          // Mesajları al
          const { data: allMessages, error: msgError } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: true });

          if (msgError) {
            console.error(`❌ Mesajlar yüklenirken hata (conv ${conv.id}):`, msgError);
          }

          // Current user kontrolü
          const hasCurrentUser = participantsWithData.some(p => p.user_id === currentUser.id);
          if (hasCurrentUser) {
            const convWithParticipants = {
              ...conv,
              chat_participants: participantsWithData,
              messages: allMessages || []
            };
            conversationsWithParticipants.push(convWithParticipants);
            console.log('✅ Sohbet eklendi:', conv.id, 'mesaj sayısı:', allMessages?.length || 0);
          }
        } catch (error) {
          console.error(`❌ Sohbet işlenirken hata (conv ${conv.id}):`, error);
        }
      }
      
      console.log('📊 Toplam sohbet sayısı:', conversationsWithParticipants.length);
      setConversations(conversationsWithParticipants);
    } catch (error) {
      console.error('Sohbetler yüklenirken hata:', error);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      console.log('🔍 Mesajlar yükleniyor, conversation_id:', conversationId);
      
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Mesajlar yüklenirken hata:', error);
        setMessages([]);
      } else {
        console.log('✅ Mesajlar yüklendi:', data?.length || 0, 'mesaj');
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
                    
                    return (
                      <>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${getAvatarColor(otherUser?.email)}`}>
                          {getInitials(fullName || otherUser?.email)}
                        </div>
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
                                  new Date(otherUser.last_seen).toLocaleTimeString('tr-TR', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  }) : 
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
        <div className="flex-1 overflow-y-auto p-6" style={{ maxHeight: 'calc(100vh - 140px)' }}>
          {currentConversation ? (
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Henüz mesaj yok</p>
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
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Sohbet Seçin
                </h3>
                <p className="text-gray-500">
                  Mesajlaşmaya başlamak için bir sohbet seçin
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Mesaj Gönderme Alanı */}
        {currentConversation && (
          <div className="bg-white border-t border-gray-200 p-4">
            <div className="flex items-end space-x-3">
              <div className="flex-1 bg-gray-50 rounded-2xl px-4 py-3">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Mesajınızı yazın..."
                  className="w-full bg-transparent border-none outline-none resize-none text-sm"
                  rows="1"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 rounded-lg hover:bg-gray-100 relative"
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
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-3 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
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