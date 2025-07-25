-- Modern Chat Sistemi Tabloları

-- Sohbetler tablosu
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255),
  type VARCHAR(50) DEFAULT 'direct', -- 'direct' veya 'group'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sohbet katılımcıları tablosu
CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member', -- 'admin', 'member'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Mesajlar tablosu
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text', -- 'text', 'file', 'image'
  file_url VARCHAR(500),
  file_name VARCHAR(255),
  file_size INTEGER,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Online durumu tablosu
CREATE TABLE IF NOT EXISTS user_status (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Politikaları

-- Conversations için RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view conversations they participate in" ON conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_participants 
      WHERE chat_participants.conversation_id = conversations.id 
      AND chat_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update conversations they participate in" ON conversations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM chat_participants 
      WHERE chat_participants.conversation_id = conversations.id 
      AND chat_participants.user_id = auth.uid()
    )
  );

-- Chat participants için RLS
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view participants in their conversations" ON chat_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_participants cp2
      WHERE cp2.conversation_id = chat_participants.conversation_id 
      AND cp2.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add participants to conversations they're in" ON chat_participants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_participants cp2
      WHERE cp2.conversation_id = chat_participants.conversation_id 
      AND cp2.user_id = auth.uid()
    )
  );

-- Messages için RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their conversations" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_participants 
      WHERE chat_participants.conversation_id = messages.conversation_id 
      AND chat_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to conversations they're in" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_participants 
      WHERE chat_participants.conversation_id = messages.conversation_id 
      AND chat_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE USING (sender_id = auth.uid());

-- User status için RLS
ALTER TABLE user_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all user statuses" ON user_status
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own status" ON user_status
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own status" ON user_status
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Indexler
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_participants_conversation_id ON chat_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);

-- Trigger fonksiyonları
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_status_updated_at BEFORE UPDATE ON user_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 