# TradeCopy Pro - AI Coding Agent Instructions

## Project Overview
TradeCopy Pro is a Next.js trade copying platform with Supabase backend, Stripe payments, and real-time trading account synchronization. The core concept is master-slave account relationships where trades from master accounts are automatically copied to slave accounts with configurable scaling and risk management.

## Architecture Patterns

### Database & Types
- **Database-first TypeScript**: Types generated from Supabase schema in `src/types/database.ts`
- **Core entities**: Users → Trading Accounts → Copy Mappings → Trades → Copied Trades
- **Key relationships**: Master accounts copy to multiple slave accounts via `copy_mappings` table
- **RLS (Row Level Security)**: All tables use Supabase RLS for user data isolation

### Authentication Flow
- **Client auth**: `src/contexts/auth-context.tsx` provides `useAuth()` hook with user/profile state
- **Server auth**: `src/lib/supabase/server.ts` creates authenticated server clients
- **Middleware**: Session refresh handled in `src/middleware.ts` → `src/lib/supabase/middleware.ts`
- **Pattern**: Always check `user` and `profile` separately (profile is from custom `users` table)

### Component Structure
- **Trading components**: `src/components/trading/` - account management, copy mapping forms
- **Auth components**: `src/components/auth/` - login/signup forms, protected routes
- **UI components**: `src/components/ui/` - reusable shadcn/ui style components
- **Layout pattern**: Use `src/components/layout/dashboard-header.tsx` for consistent navigation

## Development Workflows

### Database Changes
1. Create migration in `supabase/migrations/XXX_description.sql`
2. Run migration in Supabase dashboard or CLI
3. Regenerate types: `npx supabase gen types typescript --project-id <id> > src/types/database.ts`
4. Update `src/types/index.ts` with business logic types

### Development Commands
- `npm run dev --turbopack` - Development with Turbopack (default)
- `npm run build --turbopack` - Production build with Turbopack
- `npm run lint` - ESLint checking

### Environment Setup
Required variables in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

## Key Patterns & Conventions

### Supabase Client Usage
- **Client-side**: Import from `@/lib/supabase/client` in components
- **Server-side**: Import from `@/lib/supabase/server` in API routes/Server Components
- **Never**: Mix client and server imports in same file

### Trading Account Types
- **Master accounts**: Source of trades to be copied
- **Slave accounts**: Destination accounts that receive copied trades
- **Platform integration**: Each account linked to `trading_platforms` (cTrader, MT4/5)
- **Encrypted credentials**: Stored in `trading_accounts.encrypted_credentials`

### Copy Mapping Configuration
- **Lot scaling types**: `fixed`, `percentage`, `balance_ratio`
- **Symbol filtering**: `copy_symbols` (whitelist) and `ignore_symbols` (blacklist)
- **Risk management**: `max_lot_size`, `min_lot_size` limits per mapping

### Stripe Integration
- **Subscription plans**: Defined in `src/types/stripe.ts` as `SUBSCRIPTION_PLANS`
- **Webhook handling**: `src/app/api/stripe/webhook/route.ts` syncs with `subscriptions` table
- **Customer metadata**: Always store `userId` in Stripe customer metadata
- **Plan limits**: Enforce `max_accounts` and `max_copy_mappings` from subscription
- **Billing cycles**: Support monthly/yearly with different pricing

### Subscription & Plan Enforcement
- **Account limits**: Check `subscriptions.max_accounts` before allowing new trading accounts
- **Copy mapping limits**: Validate `subscriptions.max_copy_mappings` before creating mappings
- **Feature gating**: Use subscription tier to enable/disable advanced features
- **Grace period**: Handle `past_due` status with limited functionality

### API Route Patterns
- **File-based routing**: App Router in `src/app/api/`
- **Error handling**: Return `NextResponse.json()` with appropriate status codes
- **Authentication**: Use `createClient()` from server.ts and check `auth.getUser()`

## Critical Integration Points

### Trading Platform Architecture
- **Platform abstraction**: `trading_platforms` table defines supported platforms
- **Account credentials**: Encrypted storage pattern for sensitive API keys
- **Trade synchronization**: `trades` table stores all trades, `copied_trades` tracks copy operations
- **Real-time updates**: Planned WebSocket integration for live trade copying
- **Latency target**: 20-30ms trade copying - prioritize async processing and connection pooling

### Trade Copying Engine
- **Copy flow**: Master trade → Copy mapping validation → Slave trade execution → Status tracking
- **Status tracking**: `copy_status` in `copied_trades`: pending → success/failed/partial
- **Error handling**: Store error messages in `copied_trades.error_message` for debugging
- **Lot scaling logic**: Implement `fixed`, `percentage`, `balance_ratio` scaling in copy engine
- **Symbol filtering**: Check `copy_symbols` (whitelist) and `ignore_symbols` (blacklist) before copying

### Risk Management System
- **Protection rules**: `protection_rules` table with types: equity_drawdown, daily_loss, news_protection
- **Account-level or global**: Rules can apply to specific accounts or all user accounts
- **Trigger mechanism**: `triggered_at` field tracks when protection activates
- **Equity monitoring**: Check protection rules before executing copied trades
- **Trading halt**: When protection triggers, set copy mappings `is_active = false`

### Analytics & Performance Tracking
- **Daily snapshots**: `analytics_snapshots` table for historical performance data
- **P&L calculation**: Database function `calculate_trade_pnl()` for consistent calculations
- **Dashboard metrics**: Aggregated from trades and snapshots for real-time display
- **Real-time updates**: Use Supabase realtime subscriptions for live dashboard data
- **Performance metrics**: Calculate win rate, drawdown, profit factor from trade history

## Common Gotchas

### Supabase Specific
- Always await `cookies()` in server components: `const cookieStore = await cookies()`
- RLS policies require proper user context - ensure auth is working before data queries
- Use `.single()` for single row queries, but handle potential null returns

### Next.js App Router
- Server Components can't use React hooks - use Client Components for interactivity
- Middleware runs on every request matching the matcher pattern
- Use `revalidatePath()` or `revalidateTag()` for cache invalidation after mutations

### Type Safety
- Database types are auto-generated - don't modify `database.ts` manually
- Business logic types in `index.ts` should extend/compose database types
- Form types should have validation schemas with Zod (already included)

### Trading Domain
- **Account relationships are enforced at database level (foreign keys)
- **Copy mappings must validate master ≠ slave account
- **Trade status flows: pending → open → closed
- **Platform trade IDs must be unique per account (enforced by unique constraint)
- **Symbol validation**: Ensure symbols exist on target platform before copying
- **Lot size validation**: Respect platform minimum/maximum lot sizes
- **Market hours**: Consider platform trading hours for copy execution

## File Organization
- `src/app/` - Next.js App Router pages and API routes
- `src/components/` - React components organized by domain
- `src/contexts/` - React contexts (mainly auth)
- `src/lib/` - Utility functions and third-party integrations
- `src/types/` - TypeScript type definitions
- `supabase/migrations/` - Database schema and seed data