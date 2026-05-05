// server.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://atlas.superiorllc.org',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);

// Types
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  systemPrompt?: string;
  maxTokens?: number;
}

interface SecurityEvent {
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: string;
}

// Validate API key exists
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ERROR: ANTHROPIC_API_KEY not found in environment variables');
  process.exit(1);
}

// Helper function to detect security concerns in messages
function analyzeSecurityRisks(messages: ChatMessage[]): SecurityEvent[] {
  const events: SecurityEvent[] = [];
  const dangerousPatterns = [
    { pattern: /password|passwd|pwd/i, message: 'Password-related query detected' },
    { pattern: /sql\s+injection|xss|cross-site/i, message: 'Potential security vulnerability discussion' },
    { pattern: /hack|exploit|breach/i, message: 'Security threat keywords detected' },
    { pattern: /<script|javascript:/i, message: 'Potential XSS attempt in message' },
    { pattern: /admin|root|sudo/i, message: 'Administrative access keywords detected' }
  ];

  messages.forEach(msg => {
    dangerousPatterns.forEach(({ pattern, message }) => {
      if (pattern.test(msg.content)) {
        events.push({
          type: 'warning',
          message,
          timestamp: new Date().toISOString()
        });
      }
    });
  });

  return events;
}

// Main chat endpoint
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { messages, systemPrompt, maxTokens = 1024 } = req.body as ChatRequest;

    // Validation
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid request: messages array is required' 
      });
    }

    // Security analysis
    const securityEvents = analyzeSecurityRisks(messages);
    
    // Log security events (in production, send to monitoring service)
    if (securityEvents.length > 0) {
      console.log('Security events detected:', securityEvents);
    }

    // Prepare request to Anthropic API
    const anthropicRequest = {
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: Math.min(maxTokens, 4096), // Cap at reasonable limit
      system: systemPrompt || 'You are a helpful AI assistant.',
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    };

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(anthropicRequest)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Anthropic API error:', errorData);
      
      return res.status(response.status).json({
        error: 'Failed to get response from AI service',
        details: errorData
      });
    }

    const data = await response.json();

    // Return response with security events
    res.json({
      content: data.content,
      securityEvents,
      usage: data.usage,
      model: data.model
    });

  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Security event logging endpoint
app.post('/api/security/log', async (req: Request, res: Response) => {
  try {
    const { events } = req.body;
    
    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ error: 'Invalid events data' });
    }

    // In production, send to monitoring service (e.g., Sentry, DataDog)
    console.log('Security events logged:', events);
    
    // Here you could:
    // - Store in database
    // - Send to monitoring service
    // - Trigger alerts for critical events
    // - Rate limit suspicious IPs
    
    res.json({ success: true, logged: events.length });
  } catch (error) {
    console.error('Security logging error:', error);
    res.status(500).json({ error: 'Failed to log security events' });
  }
});

// Context validation endpoint
app.post('/api/validate/context', async (req: Request, res: Response) => {
  try {
    const { formData, route } = req.body;
    
    // Perform server-side validation
    const validationErrors: string[] = [];
    
    if (formData) {
      // Example validations
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        validationErrors.push('Invalid email format');
      }
      
      if (formData.password && formData.password.length < 8) {
        validationErrors.push('Password must be at least 8 characters');
      }
    }
    
    res.json({
      valid: validationErrors.length === 0,
      errors: validationErrors,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ error: 'Validation failed' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 API key configured: ${!!process.env.ANTHROPIC_API_KEY}`);
});

export default app;