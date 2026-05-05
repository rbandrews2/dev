# Standalone Messaging System Design Document

**Web App**: Vite + React (TypeScript) + Node.js/Express + PostgreSQL  
**Target Scale**: 100-1000 concurrent users  
**Core Features**: Text messaging, image sharing, video file sharing, group chats, direct messaging, searchable history  
**Real-Time Requirements**: WebSocket-based messaging with notifications  
**Media Storage**: Cloud (AWS S3/GCP)  

---

## 1. System Architecture Overview

### High-Level Components

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend (Vite)                   │
│          ┌──────────────────────────────────────┐           │
│          │  Messaging UI Components             │           │
│          │  - Chat List                         │           │
│          │  - Message Thread                    │           │
│          │  - Image/Video Upload                │           │
│          │  - Real-time Notifications           │           │
│          └──────────────────────────────────────┘           │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP + WebSocket
                         ▼
┌─────────────────────────────────────────────────────────────┐
│           Node.js/Express Backend API Layer                 │
│  ┌────────────────────────────────────────────────────┐    │
│  │ REST Endpoints (HTTP)                              │    │
│  │ - Conversations CRUD                               │    │
│  │ - Messages CRUD                                    │    │
│  │ - File upload/download coordination                │    │
│  │ - User search, conversation search                 │    │
│  └────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────┐    │
│  │ WebSocket Server (Socket.IO)                       │    │
│  │ - Real-time message delivery                       │    │
│  │ - Presence tracking (online/offline)               │    │
│  │ - Typing indicators                                │    │
│  │ - Read receipts                                    │    │
│  └────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Authentication & Authorization                     │    │
│  │ - JWT token validation                             │    │
│  │ - Permission checks (conversation access)          │    │
│  │ - Rate limiting                                    │    │
│  └────────────────────────────────────────────────────┘    │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   ┌────────────┐  ┌────────────┐  ┌──────────────┐
   │ PostgreSQL │  │  Redis     │  │ AWS S3/GCP   │
   │ Database   │  │  Cache     │  │ Cloud Storage│
   │ - Users    │  │ - Sessions │  │ - Images     │
   │ - Convs    │  │ - Presence │  │ - Videos     │
   │ - Messages │  │            │  │              │
   └────────────┘  └────────────┘  └──────────────┘
```

### Technology Recommendations

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Real-time Transport** | Socket.IO + WebSocket | Battle-tested, fallback support, room/namespace management |
| **Message Queue** | Bull (Redis) | Reliable message delivery, job scheduling |
| **Caching** | Redis | Session management, presence tracking, rate limiting |
| **Authentication** | JWT + Refresh Tokens | Stateless, scalable, secure |
| **File Upload** | Multer + Signed URLs | Secure, direct-to-S3 uploads |
| **Search** | PostgreSQL Full-Text Search | Built-in, no external dependency for now |
| **Notifications** | In-app + Email (async) | Real-time UI updates + async notifications |

---

## 2. Database Schema (PostgreSQL)

### Core Tables

```sql
-- Users table (extend existing)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(500),
  status ENUM('online', 'away', 'offline') DEFAULT 'offline',
  last_seen_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversations (DM or Group)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255), -- NULL for DM, required for group
  conversation_type ENUM('direct', 'group') NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMP
);

-- Conversation Members (who's in the conversation)
CREATE TABLE conversation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  muted BOOLEAN DEFAULT FALSE,
  last_read_message_id UUID,
  UNIQUE(conversation_id, user_id),
  INDEX idx_user_convs (user_id, conversation_id)
);

-- Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  content TEXT,
  message_type ENUM('text', 'image', 'video', 'file') NOT NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMP,
  deleted_at TIMESTAMP, -- Soft delete
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_conversation (conversation_id),
  INDEX idx_sender (sender_id),
  INDEX idx_created (conversation_id, created_at DESC)
);

-- Message Attachments (images, videos, files)
CREATE TABLE message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_url VARCHAR(500) NOT NULL, -- S3/GCP URL
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL, -- mime type
  file_size BIGINT,
  media_type ENUM('image', 'video', 'file') NOT NULL,
  width INT, -- For images
  height INT, -- For images
  duration INT, -- For videos (seconds)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Message Reactions (optional, for future)
CREATE TABLE message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(message_id, user_id, emoji)
);

-- Read Receipts
CREATE TABLE read_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(message_id, user_id)
);
```

### Indexes for Performance

```sql
-- Search optimization
CREATE INDEX idx_messages_search ON messages USING GIN (to_tsvector('english', content));

-- Conversation queries
CREATE INDEX idx_conv_members_user ON conversation_members(user_id);
CREATE INDEX idx_conv_members_conv ON conversation_members(conversation_id);

-- Message queries
CREATE INDEX idx_messages_conversation_created 
  ON messages(conversation_id, created_at DESC) 
  WHERE deleted_at IS NULL;

-- Attachment queries
CREATE INDEX idx_attachments_message ON message_attachments(message_id);
```

---

## 3. REST API Design

### Base URL
```
/api/v1/messaging
```

### Conversation Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/conversations` | List user's conversations with pagination | JWT |
| `GET` | `/conversations/{id}` | Get conversation details | JWT |
| `GET` | `/conversations/{id}/messages` | Paginated message history | JWT |
| `POST` | `/conversations` | Create DM or group conversation | JWT |
| `PUT` | `/conversations/{id}` | Update conversation name/settings | JWT |
| `DELETE` | `/conversations/{id}` | Archive or delete conversation | JWT |
| `POST` | `/conversations/{id}/members` | Add member to group | JWT |
| `DELETE` | `/conversations/{id}/members/{userId}` | Remove member | JWT |

### Message Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/messages` | Send message (text, with or without attachments) | JWT |
| `GET` | `/messages/{id}` | Get single message | JWT |
| `PUT` | `/messages/{id}` | Edit message | JWT |
| `DELETE` | `/messages/{id}` | Delete message (soft delete) | JWT |
| `POST` | `/messages/{id}/reactions` | Add reaction to message | JWT |
| `POST` | `/messages/{id}/read` | Mark message as read | JWT |

### File/Media Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/upload/request` | Get presigned S3 URL for upload | JWT |
| `POST` | `/upload/confirm` | Confirm upload completion | JWT |
| `GET` | `/attachments/{id}/download` | Download file | JWT |

### Search Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/search/conversations` | Search conversations by name | JWT |
| `GET` | `/search/messages` | Full-text search messages | JWT |
| `GET` | `/search/users` | Search users (for adding to groups) | JWT |

### Example Request/Response

#### Create a message with image

```http
POST /api/v1/messaging/messages
Content-Type: application/json
Authorization: Bearer {token}

{
  "conversation_id": "uuid-123",
  "content": "Check out this image!",
  "message_type": "image",
  "attachments": [
    {
      "file_url": "https://s3.amazonaws.com/bucket/path/image.jpg",
      "file_name": "image.jpg",
      "file_type": "image/jpeg",
      "file_size": 256000,
      "media_type": "image",
      "width": 1920,
      "height": 1080
    }
  ]
}

Response: 201 Created
{
  "id": "msg-456",
  "conversation_id": "uuid-123",
  "sender_id": "user-789",
  "sender": {
    "id": "user-789",
    "username": "john_doe",
    "avatar_url": "..."
  },
  "content": "Check out this image!",
  "message_type": "image",
  "attachments": [...],
  "created_at": "2026-04-25T10:30:00Z",
  "is_edited": false
}
```

---

## 4. Real-Time Communication (WebSocket/Socket.IO)

### Socket.IO Events

#### Client → Server (Emit)

```typescript
// Send a message
socket.emit('message:send', {
  conversation_id: string;
  content: string;
  message_type: 'text' | 'image' | 'video' | 'file';
  attachments?: Attachment[];
});

// Typing indicator
socket.emit('message:typing', {
  conversation_id: string;
});

// Stop typing
socket.emit('message:typing:end', {
  conversation_id: string;
});

// Mark message as read
socket.emit('message:read', {
  conversation_id: string;
  message_id: string;
});

// User presence
socket.emit('user:presence', {
  status: 'online' | 'away' | 'offline';
});

// Join conversation room
socket.emit('conversation:join', {
  conversation_id: string;
});

// Leave conversation room
socket.emit('conversation:leave', {
  conversation_id: string;
});
```

#### Server → Client (Broadcast)

```typescript
// New message received
socket.on('message:new', (data: {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender: User;
  content: string;
  message_type: string;
  attachments?: Attachment[];
  created_at: string;
}));

// Message edited
socket.on('message:edited', (data: {
  id: string;
  conversation_id: string;
  content: string;
  edited_at: string;
}));

// Message deleted
socket.on('message:deleted', (data: {
  id: string;
  conversation_id: string;
}));

// Typing indicator
socket.on('message:user:typing', (data: {
  conversation_id: string;
  user_id: string;
  username: string;
}));

// User online/offline
socket.on('user:status:changed', (data: {
  user_id: string;
  status: 'online' | 'away' | 'offline';
  timestamp: string;
}));

// Read receipt
socket.on('message:read:receipt', (data: {
  message_id: string;
  user_id: string;
  read_at: string;
}));
```

### Socket.IO Implementation (Express)

```typescript
// server/src/socket.ts
import { Server } from 'socket.io';
import { verifyToken } from './middleware/auth';

export function initializeSocket(httpServer: any) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Middleware for authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('No token provided'));
    
    try {
      const decoded = verifyToken(token);
      socket.data.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`User ${socket.data.userId} connected`);

    // Join conversation room
    socket.on('conversation:join', (data) => {
      const room = `conv:${data.conversation_id}`;
      socket.join(room);
      socket.broadcast.to(room).emit('user:joined', {
        user_id: socket.data.userId,
        timestamp: new Date()
      });
    });

    // Handle incoming messages
    socket.on('message:send', async (data) => {
      try {
        const message = await saveMessage(data);
        const room = `conv:${data.conversation_id}`;
        
        // Broadcast to room
        io.to(room).emit('message:new', message);
        
        // Notify users not in room
        const notInRoom = await getConversationMembers(
          data.conversation_id,
          socket.data.userId
        );
        notInRoom.forEach(member => {
          io.to(`user:${member.id}`).emit('notification:new', {
            type: 'message',
            conversation_id: data.conversation_id,
            sender: message.sender
          });
        });
      } catch (error) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('message:typing', (data) => {
      const room = `conv:${data.conversation_id}`;
      socket.broadcast.to(room).emit('message:user:typing', {
        conversation_id: data.conversation_id,
        user_id: socket.data.userId,
        username: socket.data.username
      });
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log(`User ${socket.data.userId} disconnected`);
      updateUserStatus(socket.data.userId, 'offline');
    });
  });

  return io;
}
```

---

## 5. Security & Privacy Measures

### Authentication & Authorization

```typescript
// 1. JWT-based authentication
// - Use access tokens (short-lived, 15 min)
// - Use refresh tokens (long-lived, 7 days)
// - Validate all API requests and WebSocket connections

// 2. Conversation Access Control
app.get('/api/v1/messaging/conversations/:id/messages', 
  authenticate, 
  async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Verify user is conversation member
    const member = await ConversationMember.findOne({
      conversation_id: id,
      user_id: userId
    });
    
    if (!member) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const messages = await Message.find({
      conversation_id: id
    }).paginate(req.query.page);
    
    res.json(messages);
  }
);

// 3. Message-level authorization
async function authorizeMessageAccess(userId: string, messageId: string) {
  const message = await Message.findById(messageId);
  const isMember = await ConversationMember.exists({
    conversation_id: message.conversation_id,
    user_id: userId
  });
  return isMember;
}
```

### Data Encryption

```typescript
// 1. In Transit: HTTPS/TLS
// - All API calls over HTTPS
// - WebSocket over WSS (Secure WebSocket)
// - Enforce in production environment

// 2. At Rest: Database-level encryption
// - Enable PostgreSQL encryption at column level for sensitive fields
// - Consider field-level encryption for very sensitive messages

CREATE TABLE messages (
  ...
  content TEXT, -- Can be encrypted at application level
  ...
);

// Application-level encryption for sensitive messages
import crypto from 'crypto';

function encryptMessage(content: string, key: string): string {
  const cipher = crypto.createCipher('aes-256-cbc', key);
  let encrypted = cipher.update(content, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// 3. File Storage: Signed URLs + Bucket Policies
// AWS S3 Signed URLs (15-min expiration)
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

app.post('/api/v1/messaging/upload/request', async (req, res) => {
  const { filename, filetype } = req.body;
  const key = `messages/${Date.now()}-${filename}`;
  
  const signedUrl = s3.getSignedUrl('putObject', {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    ContentType: filetype,
    Expires: 900, // 15 minutes
    Conditions: [
      ['content-length-range', 0, 50 * 1024 * 1024] // 50MB max
    ]
  });
  
  res.json({ signedUrl, key });
});
```

### Rate Limiting & DoS Protection

```typescript
import rateLimit from 'express-rate-limit';

// API Rate Limiting
const messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute per user
  keyGenerator: (req) => req.user.id,
  message: 'Too many messages, please try again later'
});

app.post('/api/v1/messaging/messages', messageLimiter, sendMessage);

// WebSocket Rate Limiting
const socketRateLimits = new Map();

socket.on('message:send', (data, callback) => {
  const userId = socket.data.userId;
  const key = `msg:${userId}`;
  
  if (!socketRateLimits.has(key)) {
    socketRateLimits.set(key, { count: 0, resetAt: Date.now() + 60000 });
  }
  
  const limit = socketRateLimits.get(key);
  if (Date.now() > limit.resetAt) {
    limit.count = 0;
    limit.resetAt = Date.now() + 60000;
  }
  
  if (limit.count >= 30) {
    return callback({ error: 'Rate limited' });
  }
  
  limit.count++;
  // Process message...
});
```

### Input Validation & Sanitization

```typescript
import { body, validationResult } from 'express-validator';
import DOMPurify from 'isomorphic-dompurify';

app.post('/api/v1/messaging/messages',
  body('conversation_id').isUUID().trim(),
  body('content')
    .trim()
    .isLength({ max: 5000 })
    .customSanitizer(value => DOMPurify.sanitize(value)),
  body('message_type').isIn(['text', 'image', 'video', 'file']),
  authenticate,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    // Process validated & sanitized data
    const message = await createMessage(req.body);
    res.json(message);
  }
);
```

### GDPR & Privacy Compliance

```typescript
// 1. Right to be forgotten - cascade delete
app.delete('/api/v1/users/:id', async (req, res) => {
  const userId = req.params.id;
  
  // Delete all user data
  await User.deleteOne({ id: userId });
  await Message.deleteMany({ sender_id: userId }); // or anonymize
  await ConversationMember.deleteMany({ user_id: userId });
  await ReadReceipt.deleteMany({ user_id: userId });
});

// 2. Data export - get all user's messages
app.get('/api/v1/users/:id/data/export', authenticate, async (req, res) => {
  const userId = req.user.id;
  
  const data = {
    user: await User.findById(userId),
    conversations: await getUserConversations(userId),
    messages: await Message.find({ sender_id: userId }),
    exportedAt: new Date()
  };
  
  res.json(data);
});

// 3. Audit logging - track who accessed what
async function logAccess(userId: string, action: string, resource: string) {
  await AuditLog.create({
    user_id: userId,
    action,
    resource,
    timestamp: new Date()
  });
}
```

---

## 6. React Component Architecture

### Folder Structure

```
src/
├── features/
│   └── messaging/
│       ├── components/
│       │   ├── ChatList.tsx          # List of conversations
│       │   ├── ChatWindow.tsx        # Main message area
│       │   ├── MessageThread.tsx     # Individual messages
│       │   ├── InputArea.tsx         # Message input + attachments
│       │   ├── UserTyping.tsx        # Typing indicators
│       │   ├── PresenceIndicator.tsx # Online status
│       │   ├── FileUploadModal.tsx   # Image/video upload
│       │   ├── SearchPanel.tsx       # Search conversations/messages
│       │   └── GroupModal.tsx        # Create/manage groups
│       ├── hooks/
│       │   ├── useConversations.ts   # Fetch conversations
│       │   ├── useMessages.ts        # Fetch messages
│       │   ├── useSocket.ts          # WebSocket connection
│       │   ├── usePresence.ts        # User status tracking
│       │   └── useFileUpload.ts      # S3 upload logic
│       ├── services/
│       │   ├── messagingAPI.ts       # REST API calls
│       │   ├── socketClient.ts       # Socket.IO client setup
│       │   └── storageService.ts     # S3/media handling
│       ├── store/
│       │   └── messagingSlice.ts     # Redux/Zustand state
│       ├── types/
│       │   └── index.ts              # TypeScript types
│       └── pages/
│           └── MessagingPage.tsx     # Main messaging page
```

### Key Component Examples

#### 1. useSocket Hook (Custom Hook for WebSocket)

```typescript
// features/messaging/hooks/useSocket.ts
import { useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/hooks/useAuth'; // Your auth hook
import { useDispatch } from 'react-redux';
import { 
  messageAdded, 
  messageEdited, 
  userTyping,
  userStatusChanged 
} from '../store/messagingSlice';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { token } = useAuth();
  const dispatch = useDispatch();

  useEffect(() => {
    if (!token) return;

    // Initialize socket connection
    socketRef.current = io(process.env.REACT_APP_API_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    // Listen for events
    socketRef.current.on('message:new', (message) => {
      dispatch(messageAdded(message));
    });

    socketRef.current.on('message:edited', (data) => {
      dispatch(messageEdited(data));
    });

    socketRef.current.on('message:user:typing', (data) => {
      dispatch(userTyping(data));
    });

    socketRef.current.on('user:status:changed', (data) => {
      dispatch(userStatusChanged(data));
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [token, dispatch]);

  // Emit functions
  const sendMessage = useCallback((conversationId: string, content: string) => {
    socketRef.current?.emit('message:send', {
      conversation_id: conversationId,
      content,
      message_type: 'text'
    });
  }, []);

  const sendTyping = useCallback((conversationId: string) => {
    socketRef.current?.emit('message:typing', {
      conversation_id: conversationId
    });
  }, []);

  const joinConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit('conversation:join', {
      conversation_id: conversationId
    });
  }, []);

  const markAsRead = useCallback((conversationId: string, messageId: string) => {
    socketRef.current?.emit('message:read', {
      conversation_id: conversationId,
      message_id: messageId
    });
  }, []);

  return {
    socket: socketRef.current,
    sendMessage,
    sendTyping,
    joinConversation,
    markAsRead
  };
}
```

#### 2. ChatWindow Component

```typescript
// features/messaging/components/ChatWindow.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import MessageThread from './MessageThread';
import InputArea from './InputArea';
import UserTyping from './UserTyping';
import { useSocket } from '../hooks/useSocket';
import { useMessages } from '../hooks/useMessages';
import { selectMessages, selectTypingUsers } from '../store/messagingSlice';

interface ChatWindowProps {
  conversationId: string;
}

export default function ChatWindow({ conversationId }: ChatWindowProps) {
  const { id } = useParams<{ id: string }>();
  const actualConvId = conversationId || id;
  
  const dispatch = useDispatch();
  const messages = useSelector(selectMessages(actualConvId));
  const typingUsers = useSelector(selectTypingUsers(actualConvId));
  
  const { sendMessage, joinConversation, markAsRead } = useSocket();
  const { messages: loadedMessages, loading } = useMessages(actualConvId);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Join conversation room
  useEffect(() => {
    joinConversation(actualConvId);
  }, [actualConvId, joinConversation]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark last message as read
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      markAsRead(actualConvId, lastMessage.id);
    }
  }, [messages, markAsRead, actualConvId]);

  const handleSendMessage = (content: string) => {
    sendMessage(actualConvId, content);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageThread key={message.id} message={message} />
        ))}
        
        {/* Typing Indicators */}
        {typingUsers.length > 0 && <UserTyping users={typingUsers} />}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <InputArea 
        onSendMessage={handleSendMessage}
        conversationId={actualConvId}
      />
    </div>
  );
}
```

#### 3. InputArea Component (with File Upload)

```typescript
// features/messaging/components/InputArea.tsx
import React, { useState, useRef } from 'react';
import { useFileUpload } from '../hooks/useFileUpload';

interface InputAreaProps {
  onSendMessage: (content: string) => void;
  conversationId: string;
}

export default function InputArea({ 
  onSendMessage, 
  conversationId 
}: InputAreaProps) {
  const [content, setContent] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile } = useFileUpload();

  const handleSend = async () => {
    if (!content.trim() && attachments.length === 0) return;

    // Send message via WebSocket
    onSendMessage(content);
    setContent('');
    setAttachments([]);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (!files) return;

    setIsUploading(true);
    try {
      const uploadedAttachments = await Promise.all(
        Array.from(files).map(file => uploadFile(file, conversationId))
      );
      setAttachments(prev => [...prev, ...uploadedAttachments]);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="border-t p-4 bg-white">
      {/* Preview attachments */}
      {attachments.length > 0 && (
        <div className="mb-2 flex gap-2 flex-wrap">
          {attachments.map((att) => (
            <div key={att.id} className="relative">
              {att.media_type === 'image' && (
                <img 
                  src={att.file_url} 
                  alt={att.file_name}
                  className="h-16 w-16 object-cover rounded"
                />
              )}
              <button
                onClick={() => setAttachments(a => a.filter(x => x.id !== att.id))}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          accept="image/*,video/*"
          className="hidden"
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="p-2 hover:bg-gray-100 rounded"
        >
          📎 Attach
        </button>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type a message..."
          className="flex-1 border rounded p-2 resize-none"
          rows={3}
        />

        <button
          onClick={handleSend}
          disabled={!content.trim() && attachments.length === 0 || isUploading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          Send
        </button>
      </div>
    </div>
  );
}
```

#### 4. useFileUpload Hook

```typescript
// features/messaging/hooks/useFileUpload.ts
import { useState } from 'react';
import axios from 'axios';

interface UploadProgress {
  loaded: number;
  total: number;
}

export function useFileUpload() {
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  const uploadFile = async (file: File, conversationId: string) => {
    try {
      // Step 1: Request signed URL from server
      const { data: { signedUrl, key } } = await axios.post(
        '/api/v1/messaging/upload/request',
        {
          filename: file.name,
          filetype: file.type,
          size: file.size
        },
        {
          headers: { Authorization: `Bearer ${getToken()}` }
        }
      );

      // Step 2: Upload directly to S3 using signed URL
      await axios.put(signedUrl, file, {
        headers: {
          'Content-Type': file.type
        },
        onUploadProgress: (progressEvent) => {
          setProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total
          });
        }
      });

      // Step 3: Confirm upload with backend
      const { data: attachment } = await axios.post(
        '/api/v1/messaging/upload/confirm',
        {
          key,
          filename: file.name,
          filetype: file.type,
          size: file.size,
          conversation_id: conversationId
        },
        {
          headers: { Authorization: `Bearer ${getToken()}` }
        }
      );

      setProgress(null);
      return attachment;
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    }
  };

  return { uploadFile, progress };
}
```

---

## 7. TypeScript Types

```typescript
// features/messaging/types/index.ts

export interface User {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  status: 'online' | 'away' | 'offline';
  last_seen_at?: string;
}

export interface Conversation {
  id: string;
  name?: string; // null for DM
  conversation_type: 'direct' | 'group';
  created_by: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  members: User[];
  last_message?: Message;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender: User;
  content: string;
  message_type: 'text' | 'image' | 'video' | 'file';
  attachments: MessageAttachment[];
  is_edited: boolean;
  edited_at?: string;
  created_at: string;
  deleted_at?: string;
  read_by?: User[];
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  media_type: 'image' | 'video' | 'file';
  width?: number;
  height?: number;
  duration?: number; // For videos
  created_at: string;
}

export interface ConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  muted: boolean;
  last_read_message_id?: string;
}

export interface TypingUser {
  conversation_id: string;
  user_id: string;
  username: string;
}
```

---

## 8. Implementation Roadmap

### Phase 1: Core Messaging (Weeks 1-2)
- [ ] Database schema setup with PostgreSQL
- [ ] REST API: Conversation CRUD
- [ ] REST API: Message CRUD (text only)
- [ ] Basic authentication & authorization
- [ ] React components: ChatList, ChatWindow, InputArea
- [ ] Basic styling & layout

### Phase 2: Real-Time Features (Weeks 3-4)
- [ ] Socket.IO integration (backend)
- [ ] Socket.IO client setup (React)
- [ ] Real-time message delivery
- [ ] Typing indicators
- [ ] User presence (online/offline)
- [ ] Read receipts

### Phase 3: Media Handling (Weeks 5-6)
- [ ] S3/GCP integration setup
- [ ] Presigned URL generation
- [ ] File upload hook & InputArea component
- [ ] Image preview in messages
- [ ] Video file support
- [ ] File download with expiring links

### Phase 4: Advanced Features (Weeks 7)
- [ ] Message search (full-text)
- [ ] Group chat management
- [ ] Message editing & deletion
- [ ] User search for adding to groups
- [ ] Message reactions (optional)
- [ ] Conversation search

### Phase 5: Security & Production (Week 7-8)
- [ ] Rate limiting
- [ ] Input validation & sanitization
- [ ] Encryption at rest (sensitive data)
- [ ] GDPR compliance features
- [ ] Audit logging
- [ ] Performance optimization
- [ ] Testing (unit, integration)
- [ ] Deployment & monitoring

---

## 9. Performance Optimization Tips

### Backend

```typescript
// 1. Database query optimization
// Use indexes for frequently queried fields
// Pagination for large datasets
async function getConversationMessages(
  conversationId: string,
  page: number = 1,
  limit: number = 50
) {
  const offset = (page - 1) * limit;
  return Message.find({ conversation_id: conversationId })
    .limit(limit)
    .offset(offset)
    .sort({ created_at: -1 }); // Newest first
}

// 2. Caching with Redis
import redis from 'redis';
const client = redis.createClient();

async function getUserConversations(userId: string) {
  const cached = await client.get(`user:${userId}:conversations`);
  if (cached) return JSON.parse(cached);
  
  const conversations = await Conversation.find({ user_id: userId });
  await client.setex(`user:${userId}:conversations`, 300, JSON.stringify(conversations));
  return conversations;
}

// 3. Connection pooling
const pool = new Pool({
  max: 20, // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// 4. Gzip compression
import compression from 'compression';
app.use(compression());
```

### Frontend

```typescript
// 1. Code splitting
import { lazy, Suspense } from 'react';
const ChatWindow = lazy(() => import('./ChatWindow'));

// 2. Virtualization for long message lists
import { FixedSizeList } from 'react-window';

// 3. Memoization
const MessageThread = React.memo(({ message }) => (
  <div>{message.content}</div>
), (prevProps, nextProps) => 
  prevProps.message.id === nextProps.message.id
);

// 4. Debouncing typing indicators
import { debounce } from 'lodash';

const handleTyping = debounce((conversationId) => {
  socket.emit('message:typing', { conversation_id: conversationId });
}, 300);
```

---

## 10. Deployment Considerations

### Environment Variables (.env)

```env
# Backend
DATABASE_URL=postgresql://user:pass@localhost:5432/messaging_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_secret_key_here
JWT_REFRESH_SECRET=refresh_secret_here

# AWS S3
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret

# Socket.IO
SOCKET_CORS_ORIGIN=https://yourdomain.com

# Email (for async notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_password
```

### Docker Deployment (Optional)

```dockerfile
# Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 5000

CMD ["node", "dist/server.js"]
```

### Testing Strategy

```typescript
// Unit test example
import { describe, it, expect } from 'vitest';
import { validateMessage } from './validation';

describe('Message Validation', () => {
  it('should accept valid messages', () => {
    const valid = {
      conversation_id: 'uuid-123',
      content: 'Hello',
      message_type: 'text'
    };
    expect(validateMessage(valid)).toEqual(true);
  });

  it('should reject empty content', () => {
    const invalid = {
      conversation_id: 'uuid-123',
      content: '',
      message_type: 'text'
    };
    expect(() => validateMessage(invalid)).toThrow();
  });
});
```

---

## 11. Monitoring & Analytics

```typescript
// Error tracking (e.g., Sentry)
import * as Sentry from "@sentry/node";

Sentry.init({ dsn: process.env.SENTRY_DSN });

// Performance monitoring
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Socket.IO event logging
io.on('connection', (socket) => {
  console.log('User connected:', socket.data.userId);
  
  socket.on('message:send', (data) => {
    console.log('Message sent:', {
      userId: socket.data.userId,
      conversationId: data.conversation_id,
      timestamp: new Date()
    });
  });
});
```

---

## Summary & Next Steps

This design provides:
- ✅ **Scalable architecture** for 100-1000 users
- ✅ **Real-time messaging** with Socket.IO
- ✅ **Secure authentication & authorization**
- ✅ **Media support** via cloud storage
- ✅ **Full-text search** capabilities
- ✅ **Production-ready** patterns

**Begin with Phase 1** (database + basic REST API), then progress to real-time features in Phase 2. All security measures and optimization strategies are included for production deployment.

For questions or clarifications on any section, refer to the specific code examples and implementation guidelines provided.
