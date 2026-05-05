import React, { useState, useEffect, useRef } from "react";
import { echoChatApi, EchoChatConversation, EchoChatMessage, EchoChatUser } from "@/lib/echochat/api";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Plus, Search, User, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface EchoChatWidgetProps {
  className?: string;
}

export function EchoChatWidget({ className }: EchoChatWidgetProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<EchoChatConversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<EchoChatConversation | null>(null);
  const [messages, setMessages] = useState<EchoChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [newConversationTitle, setNewConversationTitle] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Load messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
      // Subscribe to real-time updates
      const unsubscribe = echoChatApi.subscribeToMessages(
        selectedConversation.id,
        (message) => {
          setMessages((prev) =>
            prev.some((existing) => existing.id === message.id)
              ? prev
              : [...prev, message]
          );
        }
      );
      return unsubscribe;
    }
  }, [selectedConversation?.id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await echoChatApi.listConversations();
      setConversations(data);
    } catch (err) {
      console.error("EchoChat conversations failed", err);
      setConversations([]);
      setError(err instanceof Error ? err.message : "Unable to load EchoChat conversations.");
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    setError(null);
    try {
      const data = await echoChatApi.getMessages(conversationId);
      setMessages(data);
    } catch (err) {
      console.error("EchoChat messages failed", err);
      setMessages([]);
      setError(err instanceof Error ? err.message : "Unable to load messages.");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sending) return;

    setSending(true);
    const { data: message, error } = await echoChatApi.sendMessageResult(
      selectedConversation.id,
      newMessage.trim()
    );
    if (error) {
      setError(error);
      setSending(false);
      return;
    }
    if (message) {
      setMessages((prev) =>
        prev.some((existing) => existing.id === message.id)
          ? prev
          : [...prev, message]
      );
      setNewMessage("");
    }
    setSending(false);
  };

  const handleCreateConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConversationTitle.trim()) return;

    const { data: conversation, error } = await echoChatApi.createConversationResult(
      newConversationTitle.trim()
    );
    if (error) {
      setError(error);
      return;
    }
    if (conversation) {
      setConversations((prev) => [conversation, ...prev]);
      setSelectedConversation(conversation);
      setShowNewConversation(false);
      setNewConversationTitle("");
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.title?.toLowerCase().includes(search.toLowerCase())
  );

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return d.toLocaleDateString([], { weekday: 'short' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (!user) {
    return (
      <Card className={`bg-black/40 border border-amber-500/30 text-white p-6 ${className}`}>
        <h3 className="text-xl font-semibold text-amber-300 mb-2">EchoChat Messaging</h3>
        <p className="text-amber-100/80">Please sign in to access messaging.</p>
      </Card>
    );
  }

  return (
    <Card className={`bg-black/40 border border-amber-500/30 text-white overflow-hidden ${className}`}>
      <div className="flex min-h-[calc(100dvh-190px)] flex-col md:h-[620px] md:min-h-0 md:flex-row">
        {/* Conversations Sidebar */}
        <div className="flex max-h-[34dvh] min-h-[210px] flex-col border-b border-amber-500/20 md:max-h-none md:min-h-0 md:w-72 md:border-b-0 md:border-r">
          <div className="border-b border-amber-500/20 p-3 sm:p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-semibold text-amber-300 sm:text-lg">
                <MessageSquare className="w-5 h-5" />
                Messages
              </h3>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full"
                onClick={() => setShowNewConversation(true)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {error && (
              <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                {error}
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/50" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 bg-black/30 pl-9 text-sm text-white border-amber-500/20 placeholder:text-amber-400/50"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-amber-100/60">
                <p className="text-sm">No conversations yet</p>
                <Button
                  variant="link"
                  className="text-amber-400 mt-2"
                  onClick={() => setShowNewConversation(true)}
                >
                  Start a new conversation
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-amber-500/10">
                {filteredConversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`w-full p-3 text-left transition-colors hover:bg-amber-500/10 ${
                      selectedConversation?.id === conv.id ? 'bg-amber-500/20' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <User className="w-5 h-5 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{conv.title}</p>
                        <p className="text-xs text-amber-100/60 truncate">
                          {conv.last_message || 'No messages yet'}
                        </p>
                      </div>
                      {conv.last_message_at && (
                        <span className="shrink-0 text-xs text-amber-100/50">
                          {formatTime(conv.last_message_at)}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex min-h-0 flex-1 flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="border-b border-amber-500/20 p-3 sm:p-4">
                <h4 className="truncate font-semibold text-white">{selectedConversation.title}</h4>
                <p className="text-xs text-amber-100/60">
                  {selectedConversation.participants?.length || 0} participants
                </p>
              </div>

              {/* Messages */}
              <ScrollArea className="min-h-[300px] flex-1 p-3 sm:p-4">
                <div className="space-y-3 sm:space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender_email === user.email ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[86%] rounded-lg p-3 sm:max-w-[70%] ${
                          msg.sender_email === user.email
                            ? 'bg-amber-500/30 text-white'
                            : 'bg-amber-500/10 text-white'
                        }`}
                      >
                        {msg.sender_email !== user.email && (
                          <p className="text-xs text-amber-300 mb-1">{msg.sender_name || msg.sender_email}</p>
                        )}
                        <p className="text-sm">{msg.content}</p>
                        <p className="text-xs text-amber-100/50 mt-1">
                          {formatTime(msg.created_date)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="border-t border-amber-500/20 p-3 sm:p-4">
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="h-11 bg-black/30 text-sm text-white border-amber-500/20 placeholder:text-amber-400/50"
                  />
                  <Button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="h-11 shrink-0 bg-amber-500/20 px-3 hover:bg-amber-500/30"
                    aria-label="Send message"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex min-h-[300px] flex-1 items-center justify-center p-6">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-amber-400/50 mx-auto mb-3" />
                <p className="text-amber-100/60">Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Conversation Dialog */}
      {showNewConversation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-sm border-amber-500/30 bg-zinc-900 p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-white mb-4">New Conversation</h3>
            <form onSubmit={handleCreateConversation}>
              <Input
                value={newConversationTitle}
                onChange={(e) => setNewConversationTitle(e.target.value)}
                placeholder="Conversation title..."
                className="bg-black/30 border-amber-500/20 text-white mb-4"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowNewConversation(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!newConversationTitle.trim()}
                  className="bg-amber-500/20 hover:bg-amber-500/30"
                >
                  Create
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </Card>
  );
}

export default EchoChatWidget;
