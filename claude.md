# Menu Autopilot - Project Context

## Overview

Menu Autopilot is a SaaS tool for restaurant menu engineering. It analyzes menu item performance (sales, costs, margins) and provides actionable recommendations to optimize profitability.

**Two products:**
1. **Menu Autopilot** - Menu optimization and weekly reports
2. **AirTip** - Tip management and compliance (separate sub-app at `/tips`)

## Tech Stack

- **Framework:** Next.js 16 with App Router
- **Frontend:** React 19, Tailwind CSS 4
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** NextAuth with email magic links
- **Email:** Resend
- **Payments:** Stripe

## Key Directories

```
src/
├── app/                    # Next.js pages and API routes
│   ├── (dashboard)/        # Main menu autopilot UI
│   ├── api/                # API endpoints
│   └── tips/               # AirTip sub-application
├── lib/                    # Business logic
│   ├── cost/               # Cost computation from CSV/ME data
│   ├── marginedge/         # MarginEdge API integration
│   ├── scoring/            # Menu item scoring engine
│   ├── report/             # Report generation
│   └── tips/               # AirTip utilities
└── components/             # React components
```

## MarginEdge Integration

### Status
API integration is complete. Connected to Parcelle Organics (restaurant ID: 820742446).

### API Details
- **Base URL:** `https://api.marginedge.com/public`
- **Auth:** `x-api-key` header + `restaurantUnitId` query param
- **Rate Limit:** ~60 requests/minute (client has built-in rate limiting)
- **Read-only:** Cannot push data via API - data entry happens in ME dashboard

### Available Endpoints
- `/restaurantUnits` - List restaurants
- `/products` - Product/ingredient catalog with costs
- `/categories` - Product categories
- `/vendors` - Vendor list
- `/orders` - Invoice data

### Key Files
- `src/lib/marginedge/client.ts` - API client with rate limiting
- `src/lib/marginedge/sync.ts` - Data sync service
- `src/lib/marginedge/integrity.ts` - Data quality checks
- `src/lib/marginedge/health.ts` - Setup health assessment
- `src/app/api/marginedge/*` - API routes

### Parcelle Data Status (as of Jan 2025)
- 71 products (39 food, 32 non-food)
- 30 vendors
- 45 categories
- **Missing:** Recipes, Toast POS connection, QuickBooks connection
- **Not ready** for menu optimization until recipes are created

See `docs/PARCELLE_ME_SETUP.md` for the setup roadmap.

## Environment Variables

```
# Database
DATABASE_URL=

# NextAuth
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# Email
RESEND_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# MarginEdge
MARGINEDGE_API_URL=https://api.marginedge.com/public
MARGINEDGE_API_KEY=
MARGINEDGE_RESTAURANT_ID=
```

## Scripts

```bash
# Test MarginEdge connection
npx tsx scripts/test-marginedge.ts

# Quick health check
npx tsx scripts/quick-health.ts

# Full health assessment
npx tsx scripts/check-health.ts
```

## Data Flow

```
Toast POS ──────────────────────────────────┐
                                            ▼
Invoices ──► MarginEdge ──► ME API ──► Menu Autopilot ──► Reports
                │                              │
                ▼                              ▼
           QuickBooks                    Recommendations
```

## Current Priorities

1. Build up Parcelle's MarginEdge data (products, recipes)
2. Connect Toast POS to MarginEdge
3. Create recipes linking ingredients to menu items
4. Once data is ready, enable menu optimization features

## Notes

- ME API only provides raw product/ingredient data, not menu item costs
- Menu item costs require ME recipes (links ingredients to menu items)
- Toast connection enables automatic sales data flow
- Without recipes + Toast, menu optimization isn't possible
