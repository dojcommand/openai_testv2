# OpenMind AI - Full-Stack ChatGPT Clone

## Overview

OpenMind AI is a full-stack web application that replicates ChatGPT functionality, providing users with an AI-powered chatbot for research assistance, coding help, and document analysis. The application uses the OpenAI GPT-4 API to power conversations and includes comprehensive user management, chat history, and administrative features.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **Styling**: Tailwind CSS with shadcn/ui components
- **Theme**: Next-themes for dark/light mode support
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **File Storage**: Local file system with multer for uploads
- **Authentication**: JWT-based authentication with bcrypt for password hashing

### Database Architecture
- **ORM**: Drizzle with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` for type-safe database definitions
- **Migrations**: Generated in `./migrations` directory
- **Connection**: Neon serverless PostgreSQL via `DATABASE_URL`

## Key Components

### Authentication System
- JWT-based session management with 7-day expiration
- Role-based access control (user/admin)
- Password hashing with bcryptjs
- Token-based API authentication middleware
- User registration and login endpoints

### Chat System
- Real-time chat interface with OpenAI GPT-4o integration
- Message history persistence with thread support
- File attachment support (PDF, DOCX, TXT up to 10MB)
- Markdown rendering with syntax highlighting
- Chat tagging and favoriting system
- Archive functionality for chat organization

### User Management
- User profiles with settings (theme, language, default model)
- Usage tracking (tokens, daily requests)
- Plan management (free/pro tiers)
- Account status management (active/suspended/deleted)

### Admin Panel
- User management dashboard
- Chat moderation tools
- AI response configuration
- Rate limiting controls
- Content filtering settings
- Analytics and reporting

### File Processing
- Multi-format document support
- Text extraction from uploaded files
- Secure file storage with unique naming
- File type validation and size limits

## Data Flow

1. **User Authentication**: Client sends credentials → Server validates → JWT token returned
2. **Chat Messages**: User input → Rate limiting check → OpenAI API call → Response stored → Client updated
3. **File Upload**: File selected → Validation → Processing → Storage → Chat attachment
4. **Admin Actions**: Admin request → Authorization check → Database update → Response

## External Dependencies

### Core Dependencies
- **OpenAI API**: GPT-4o model for chat completions
- **Neon Database**: Serverless PostgreSQL hosting
- **React Ecosystem**: React Query, React Hook Form, Radix UI
- **Authentication**: jsonwebtoken, bcryptjs
- **File Processing**: multer, react-syntax-highlighter

### Development Tools
- **Build**: Vite, esbuild for production bundling
- **Database**: Drizzle Kit for migrations and schema management
- **TypeScript**: Full type safety across frontend and backend
- **Replit Integration**: Development environment optimizations

## Deployment Strategy

### Development
- Vite dev server for frontend with HMR
- tsx for TypeScript execution in development
- File-based JSON storage for rapid prototyping

### Production
- Vite build for optimized frontend assets
- esbuild for server bundling with ESM format
- PostgreSQL database migration on deployment
- Environment variable configuration for API keys

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API authentication
- `JWT_SECRET`: JWT signing secret
- `NODE_ENV`: Environment mode (development/production)

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

Changelog:
- July 03, 2025. Initial setup