# EchoChat Integration - Environment Variables

## Required Environment Variables for Render.com

### Supabase Configuration (Required)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEYS=your-publishable-key
```

### EchoChat API Configuration
```
# Optional - Uses Supabase as backend by default
VITE_ECHOCHAT_API_URL=https://api.superiorllc.org
```

### Security Variables (Required)
```
VITE_WZOS_SIGNING_SECRET=your-signing-secret
VITE_WZOS_VAULT_SECRET=your-vault-secret
```

## Database Setup

Before using EchoChat, you need to create the required database tables in Supabase:

1. Run the SQL migration file: `src/sql/echochat_tables.sql`
2. This creates:
   - `echochat_conversations` table
   - `echochat_messages` table
   - Row Level Security (RLS) policies
   - Real-time subscriptions

## Cross-Platform Compatibility

The EchoChat integration is designed to work on:
- **Desktop browsers** (Chrome, Firefox, Safari, Edge)
- **Apple iOS** (Safari, Chrome)
- **Android devices** (Chrome, Samsung Browser)

The responsive design uses:
- Tailwind CSS for styling
- Mobile-first approach
- Touch-friendly interface elements

## API Endpoints

The EchoChat API uses Supabase as the backend:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/echochat_conversations` | GET | List all conversations |
| `/echochat_conversations` | POST | Create new conversation |
| `/echochat_messages` | GET | Get messages for conversation |
| `/echochat_messages` | POST | Send new message |

Real-time updates are handled via Supabase Realtime subscriptions.
