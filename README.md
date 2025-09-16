# TradeCopy Pro - Professional Trade Copying Platform

A Next.js-based trade copying platform that allows users to mirror trades across multiple trading accounts with low latency, advanced analytics, and risk management.

## Features

### Core Features
- **Multi-Platform Support**: Connect cTrader, MetaTrader 4/5, and other trading platforms
- **Ultra-Low Latency**: Copy trades in under 30ms with optimized infrastructure
- **Advanced Risk Management**: Equity drawdown protection, position sizing controls, news filters
- **Real-time Analytics**: P&L tracking, performance metrics, custom dashboards
- **User Authentication**: Secure signup/login with Supabase Auth
- **Subscription Management**: Stripe integration for billing and plan management

### Technical Stack
- **Frontend**: Next.js 15.5.3, React 19, TypeScript
- **Styling**: Tailwind CSS 4.1
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **Deployment**: Vercel-ready

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/         # Main dashboard
│   ├── accounts/          # Trading account management
│   ├── login/            # Authentication pages
│   └── signup/
├── components/            # Reusable React components
│   ├── auth/             # Authentication components
│   ├── trading/          # Trading-specific components
│   └── ui/               # Base UI components
├── contexts/             # React contexts
├── lib/                  # Utility functions and configurations
│   ├── supabase/        # Supabase client configuration
│   └── utils.ts         # Common utilities
└── types/               # TypeScript type definitions

supabase/
└── migrations/          # Database schema migrations
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- Stripe account (for payments)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd trade-copy
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy `.env.local.example` to `.env.local` and update with your values:
   ```bash
   cp .env.local.example .env.local
   ```

   Update the following variables:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # Stripe
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   ```

### Database Setup

1. **Create a new Supabase project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Copy your project URL and anon key

2. **Run database migrations**
   
   Execute the SQL files in `supabase/migrations/` in order:
   ```sql
   -- Run these in your Supabase SQL editor
   001_initial_schema.sql
   002_indexes.sql
   003_rls_policies.sql
   004_functions_triggers.sql
   005_seed_data.sql
   ```

3. **Configure authentication**
   - Enable email authentication in Supabase Auth settings
   - Configure email templates and redirect URLs

### Development

1. **Start the development server**
   ```bash
   npm run dev
   ```

2. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Core User Flows

### 1. User Registration & Authentication
- Sign up with email/password
- Email verification
- Secure login/logout
- Password reset functionality

### 2. Trading Account Management
- Connect multiple trading platform accounts
- Configure master/slave relationships
- Monitor account status and balances
- Real-time synchronization

### 3. Copy Trading Setup
- Create copy mappings between master and slave accounts
- Configure lot scaling and risk parameters
- Set symbol filters and restrictions
- Enable/disable copy operations

### 4. Risk Management
- Set equity drawdown limits
- Configure daily loss thresholds
- News event protection
- Position size controls

### 5. Analytics & Monitoring
- Real-time P&L tracking
- Performance metrics and charts
- Trade history and analysis
- Account health monitoring

## API Structure

### Core Entities

- **Users**: User profiles and subscription info
- **Trading Platforms**: Supported trading platforms
- **Trading Accounts**: Connected trading accounts
- **Copy Mappings**: Master-to-slave relationships
- **Trades**: Individual trade records
- **Analytics**: Performance tracking data
- **Subscriptions**: Billing and plan management

### Database Schema

The application uses a PostgreSQL database with the following main tables:

- `users` - User profiles (extends Supabase auth.users)
- `trading_platforms` - Supported platforms (cTrader, MT4/5, etc.)
- `trading_accounts` - Connected trading accounts
- `copy_mappings` - Master-to-slave copy configurations
- `trades` - Individual trade records
- `copied_trades` - Copy operation tracking
- `protection_rules` - Risk management rules
- `analytics_snapshots` - Performance data snapshots
- `subscriptions` - Billing and subscription data

## Security

- Row Level Security (RLS) enabled on all tables
- User data isolation through Supabase Auth
- Encrypted credential storage
- Secure API endpoints
- Input validation and sanitization

## Deployment

### Vercel Deployment

1. **Connect your repository to Vercel**
2. **Set environment variables** in Vercel dashboard
3. **Deploy** - Vercel will automatically build and deploy

### Environment Variables for Production

Ensure all environment variables are set in your production environment:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

## Trading Platform Integration

### Currently Supported
- **cTrader**: Full API integration planned
- **MetaTrader 4/5**: Integration framework prepared

### Integration Architecture
- Secure credential storage with encryption
- Real-time trade monitoring
- Low-latency trade execution
- Connection health monitoring
- Automatic reconnection handling

## Future Enhancements

### Planned Features
- Real-time trade copying engine
- Advanced charting and analytics
- Mobile application
- Social trading features
- Advanced risk management tools
- Multi-currency support
- API for third-party integrations

### Scalability Considerations
- Microservices architecture preparation
- Redis for caching and real-time data
- WebSocket connections for live updates
- Horizontal scaling capabilities
- Performance monitoring and optimization

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is proprietary. All rights reserved.

## Support

For support and questions:
- Email: support@tradecopy.pro
- Documentation: [docs.tradecopy.pro](https://docs.tradecopy.pro)
- GitHub Issues: For bug reports and feature requests

---

**Note**: This is a professional trading platform. Always test with demo accounts before using with live trading accounts. Trading involves risk, and past performance does not guarantee future results.

---

## UI / Landing Page Enhancements (Recent)

The marketing/landing experience was upgraded with a lightweight internal design layer:

### Components
- `BackgroundGrid` (`src/components/ui/background-grid.tsx`): Ambient grid + radial color bloom wrapper.
- Extended `Button` variants: `primary`, `secondary`, `outline`, `ghost`, `gradient` (+ `size`, `shimmer`, `asChild`).
- `Card` variants: `default`, `outline`, `ghost`, `glow` (interactive hover elevation & radial highlight).

### Utility Classes (in `globals.css`)
- `.bg-grid` / `.mesh-gradient`: Subtle spatial depth & color mesh backgrounds.
- Animations: `shimmer`, `fade-up` + helpers `.animate-shimmer`, `.fade-up`.
- Marquee helpers: `.animate-marquee`, `.marquee-fade` (for platform ticker loop without layout shift).
- `.container-page`: Responsive horizontal constraint (replaces earlier Tailwind `container`).

### Patterns
1. Prefer composing Tailwind utilities inline; global CSS kept minimal for portability.
2. Radial glow layers use low-opacity gradients for GPU-friendly rendering.
3. Metric & feature tiles reuse base card styles—avoid one-off bespoke wrappers.

### Extending
- Add a new surface? Start with `<Card variant="glow" interactive />` and adjust utilities.
- Need a CTA variant? Use `<Button variant="gradient" shimmer>` for attention weight.
- For reduced motion support, wrap motion utility usage in a `@media (prefers-reduced-motion: no-preference)` block if adding new animated patterns.

### Roadmap Ideas
- Theme toggle (swap neutral palette + accent hue via CSS vars).
- Animated number counters (IntersectionObserver + requestAnimationFrame increment).
- Broker/platform badge component fed by a JSON manifest.

