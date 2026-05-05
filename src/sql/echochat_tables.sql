-- EchoChat Database Schema for Supabase
-- Run this SQL in your Supabase SQL Editor to create the required tables

-- Create conversations table
CREATE TABLE IF NOT EXISTS echochat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  participants TEXT[] DEFAULT '{}',
  last_message TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS echochat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES echochat_conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_email TEXT,
  sender_name TEXT,
  content TEXT NOT NULL,
  media_type TEXT DEFAULT 'text' CHECK (media_type IN ('text', 'image', 'video')),
  media_url TEXT,
  created_date TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE echochat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE echochat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
DROP POLICY IF EXISTS "Users can view their conversations" ON echochat_conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON echochat_conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON echochat_conversations;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON echochat_messages;
DROP POLICY IF EXISTS "Users can send messages" ON echochat_messages;

-- Users can view conversations they participate in
CREATE POLICY "Users can view their conversations"
ON echochat_conversations FOR SELECT
USING (participants @> ARRAY[auth.uid()::text]);

-- Users can create conversations
CREATE POLICY "Users can create conversations"
ON echochat_conversations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Users can update their own conversations
CREATE POLICY "Users can update their conversations"
ON echochat_conversations FOR UPDATE
USING (participants @> ARRAY[auth.uid()::text])
WITH CHECK (participants @> ARRAY[auth.uid()::text]);

-- RLS Policies for messages
-- Users can view messages in their conversations
CREATE POLICY "Users can view messages in their conversations"
ON echochat_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM echochat_conversations
    WHERE id = echochat_messages.conversation_id
    AND participants @> ARRAY[auth.uid()::text]
  )
);

-- Users can insert messages to their conversations
CREATE POLICY "Users can send messages"
ON echochat_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM echochat_conversations
    WHERE id = echochat_messages.conversation_id
    AND participants @> ARRAY[auth.uid()::text]
  )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_echochat_messages_conversation_id ON echochat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_echochat_messages_created_date ON echochat_messages(created_date DESC);
CREATE INDEX IF NOT EXISTS idx_echochat_conversations_last_message_at ON echochat_conversations(last_message_at DESC);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE echochat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE echochat_conversations;
