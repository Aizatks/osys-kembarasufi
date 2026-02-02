## Project Summary
A comprehensive HR and Operational management system integrated with a Quotation Calculator for travel packages. The system includes attendance tracking, document management, claims processing, payroll, recruitment, intern management, and advanced operational tools like airport duty scheduling and WhatsApp integration.

## Tech Stack
- Frontend: Next.js (App Router), Tailwind CSS, Lucide Icons, Shadcn UI
- Backend: Next.js API Routes
- Database: Supabase (PostgreSQL)
- Authentication: Supabase Auth
- Integrations: Google Sheets (Pricing & Trip Dates), WhatsApp (Baileys)

## Architecture
- `src/app`: Application routes and pages
- `src/app/api`: Server-side API endpoints
- `src/components`: Reusable UI components
- `src/lib`: Utility functions and shared logic
- `src/contexts`: React Context providers for state management

## User Preferences
- Creative, distinctive frontends (avoiding "AI slop")
- Use existing code style and conventions
- No comments unless requested
- Functional components preferred

## Project Guidelines
- RBAC (Role-Based Access Control) for all modules
- Mobile-first approach for staff attendance (Clock in/out)
- Comprehensive logging and audit trails
- API routes protected server-side

## Common Patterns
- Supabase for data persistence
- Zod for schema validation
- React Hook Form for form management
- Responsive design with Tailwind CSS
