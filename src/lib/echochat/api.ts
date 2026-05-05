import { supabase as echoChatClient } from "@/lib/supabase/client";

// Types for EchoChat
export interface EchoChatUser {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

export interface EchoChatConversation {
  id: string;
  title: string;
  participants: string[];
  last_message?: string;
  last_message_at?: string;
  created_at: string;
  updated_at: string;
}

export interface EchoChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_email: string;
  sender_name?: string;
  content: string;
  media_type?: 'text' | 'image' | 'video';
  media_url?: string;
  created_date: string;
}

type EchoChatResult<T> = {
  data: T | null;
  error: string | null;
};

async function currentUserId() {
  const {
    data: { user },
    error,
  } = await echoChatClient.auth.getUser();

  if (error || !user?.id) {
    throw new Error(error?.message ?? "You must be signed in to use EchoChat.");
  }

  return user;
}

// API Functions
export const echoChatApi = {
  // Get current authenticated user
  async getCurrentUser(): Promise<EchoChatUser | null> {
    const { data: { user } } = await echoChatClient.auth.getUser();
    if (!user) return null;
    
    // Get user profile from profiles table
    const { data: profile } = await echoChatClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    return {
      id: user.id,
      email: user.email || '',
      full_name: profile?.full_name || user.email?.split('@')[0],
      avatar_url: profile?.avatar_url,
    };
  },

  // List conversations for current user
  async listConversations(): Promise<EchoChatConversation[]> {
    const user = await currentUserId();
    const { data, error } = await echoChatClient
      .from('echochat_conversations')
      .select('*')
      .contains("participants", [user.id])
      .order('last_message_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching conversations:', error);
      throw new Error(error.message);
    }
    
    return data || [];
  },

  // Get a single conversation
  async getConversation(conversationId: string): Promise<EchoChatConversation | null> {
    const user = await currentUserId();
    const { data, error } = await echoChatClient
      .from('echochat_conversations')
      .select('*')
      .eq('id', conversationId)
      .contains("participants", [user.id])
      .single();
    
    if (error) {
      console.error('Error fetching conversation:', error);
      throw new Error(error.message);
    }
    
    return data;
  },

  // Create a new conversation
  async createConversation(
    title: string,
    participants: string[] = []
  ): Promise<EchoChatConversation | null> {
    const user = await currentUserId();
    const participantIds = Array.from(new Set([user.id, ...participants].filter(Boolean)));
    const { data, error } = await echoChatClient
      .from('echochat_conversations')
      .insert({
        title,
        participants: participantIds,
        last_message_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating conversation:', error);
      throw new Error(error.message);
    }
    
    return data;
  },

  // Get messages for a conversation
  async getMessages(conversationId: string): Promise<EchoChatMessage[]> {
    await currentUserId();
    const { data, error } = await echoChatClient
      .from('echochat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_date', { ascending: true });
    
    if (error) {
      console.error('Error fetching messages:', error);
      throw new Error(error.message);
    }
    
    return data || [];
  },

  // Send a message
  async sendMessage(
    conversationId: string,
    content: string,
    mediaType?: 'text' | 'image' | 'video',
    mediaUrl?: string
  ): Promise<EchoChatMessage | null> {
    const user = await currentUserId();
    
    const { data, error } = await echoChatClient
      .from('echochat_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        sender_email: user.email,
        content,
        media_type: mediaType || 'text',
        media_url: mediaUrl,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error sending message:', error);
      throw new Error(error.message);
    }
    
    // Update conversation's last_message
    await echoChatClient
      .from('echochat_conversations')
      .update({
        last_message: content,
        last_message_at: new Date().toISOString(),
      })
      .eq('id', conversationId);
    
    return data;
  },

  async createConversationResult(
    title: string,
    participants: string[] = []
  ): Promise<EchoChatResult<EchoChatConversation>> {
    try {
      return {
        data: await this.createConversation(title, participants),
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unable to create conversation.",
      };
    }
  },

  async sendMessageResult(
    conversationId: string,
    content: string,
    mediaType?: 'text' | 'image' | 'video',
    mediaUrl?: string
  ): Promise<EchoChatResult<EchoChatMessage>> {
    try {
      return {
        data: await this.sendMessage(conversationId, content, mediaType, mediaUrl),
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unable to send message.",
      };
    }
  },

  // Subscribe to real-time messages
  subscribeToMessages(
    conversationId: string,
    callback: (message: EchoChatMessage) => void
  ): () => void {
    const channel = echoChatClient
      .channel(`echochat:messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'echochat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          callback(payload.new as EchoChatMessage);
        }
      )
      .subscribe();
    
    return () => {
      echoChatClient.removeChannel(channel);
    };
  },

  // Subscribe to conversation updates
  subscribeToConversations(
    callback: (conversation: EchoChatConversation) => void
  ): () => void {
    const channel = echoChatClient
      .channel('echochat:conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'echochat_conversations',
        },
        (payload) => {
          callback(payload.new as EchoChatConversation);
        }
      )
      .subscribe();
    
    return () => {
      echoChatClient.removeChannel(channel);
    };
  },
};

export default echoChatApi;
