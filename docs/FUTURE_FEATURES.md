# Future Features & Roadmap

Product ideas and enhancements for future development. Organized by theme with feasibility notes based on API research (January 2025).

---

## Integrations

### Toast POS Integration

**Status:** Researched, awaiting partner credentials
**Partner Program:** Requires application at pos.toasttab.com/partners
**Cost to Restaurants:** $25/month/location for API access

#### Available Data (confirmed via API docs)

| Endpoint | Data | Use Case |
|----------|------|----------|
| `/ordersBulk` | Item sales, quantities, prices, modifiers, timestamps | Menu Autopilot: replace CSV upload |
| `/labor/v1/timeEntries` | Clock in/out, tips (cash + CC), hours, job role | AirTip: pre-populate shift entries |
| `/labor/v1/employees` | Staff roster, job assignments | AirTip: sync staff directory |
| `/labor/v1/jobs` | Role definitions | AirTip: map to TipStaff roles |
| `/menus` | Menu hierarchy, item names, groups | Menu Autopilot: item catalog sync |
| Webhooks | `orders.updated` real-time events | Near real-time reporting |

#### Implementation Plan

**Phase 1: Menu Autopilot Sales Sync**
- Daily cron polls `/ordersBulk` with `businessDate` parameter
- Transform order selections → `ItemWeekMetric` records
- Eliminate manual CSV upload for Toast users
- Auto-generate weekly reports

**Phase 2: AirTip Labor Sync**
- Daily poll `/timeEntries` for previous business day
- Pre-populate `ShiftEntry` with `declaredCashTips`, `nonCashTips`, sales
- Sync employee roster → `TipStaff`
- Reconciliation view: Toast-reported vs. manually-entered allocations

**Phase 3: Real-time (Optional)**
- Subscribe to `orders.updated` webhook
- Enable same-day reporting
- Live shift tracking

#### Not Available / Requires Partner Status
- **Menu price write-back**: Menus API write requires certified partner
- **Inventory levels**: Not exposed in orders/labor APIs

---

### MarginEdge Integration

**Status:** Researched, public API available
**Cost:** Included with MarginEdge subscription (no extra fee)
**Portal:** developer.marginedge.com

#### Available Data (confirmed)

| Data Type | Available | Notes |
|-----------|-----------|-------|
| Products | Yes | Ingredient/product catalog |
| Invoices | Yes | Purchase invoices with costs |
| Recipes | Likely | Based on Q1 2024 release notes |
| Inventory | No | Explicitly excluded from public API |
| Daily Sales | No | Not available via API |

#### Implementation Plan

**Phase 1: Cost Sync**
- Daily poll for product/recipe costs
- Update `CostOverride` records with `source: MARGINEDGE`
- Eliminate manual cost CSV upload
- Trigger re-scoring when costs change

**Phase 2: Recipe Linking**
- Match ME recipes to POS menu items
- Track ingredient-level cost changes
- Alert when specific ingredient spikes affect menu items

#### Limitations
- **Read-only API**: Cannot write back to MarginEdge
- **No inventory data**: Continue using CSV for inventory analysis
- **No theoretical vs. actual**: Variance data may not be exposed

---

### Combined Integration Architecture

```
┌──────────────┐     ┌──────────────┐
│   Toast POS  │     │  MarginEdge  │
│  (sales)     │     │  (costs)     │
└──────┬───────┘     └──────┬───────┘
       │                    │
       ▼                    ▼
┌─────────────────────────────────────┐
│        Integration Service          │
│  ┌───────────┐  ┌────────────────┐ │
│  │Toast Sync │  │ MarginEdge Sync│ │
│  │ (daily)   │  │ (daily)        │ │
│  └─────┬─────┘  └───────┬────────┘ │
└────────┼────────────────┼──────────┘
         │                │
         ▼                ▼
┌─────────────────────────────────────┐
│            PostgreSQL               │
│  ┌─────────────┐ ┌───────────────┐ │
│  │ItemWeekMetric│ │ CostOverride  │ │
│  │ (from Toast)│ │ (from ME)     │ │
│  └─────────────┘ └───────────────┘ │
│  ┌─────────────┐ ┌───────────────┐ │
│  │ ShiftEntry  │ │   TipStaff    │ │
│  │ (from Toast)│ │ (from Toast)  │ │
│  └─────────────┘ └───────────────┘ │
└─────────────────────────────────────┘
```

**Zero-touch goal:** Toast sales + MarginEdge costs = fully automated menu engineering

---

## New Opportunities (Discovered via API Research)

Features not originally planned but now feasible:

### AirTip Enhancements from Toast Data

| Feature | Data Source | Value |
|---------|-------------|-------|
| Pre-filled tip entries | `TimeEntry.declaredCashTips`, `nonCashTips` | Reduce manual entry |
| Shift time validation | `TimeEntry.inDate`, `outDate` | Verify hours worked |
| Auto-sync staff roster | `/employees`, `/jobs` | Eliminate manual staff setup |
| Hourly tip rate calc | Tips / hours worked | Performance insights |
| Tip % by check size | Payments per check | Server coaching data |
| Break compliance alerts | `TimeEntry.breaks[].missed` | Labor law compliance |

### Menu Autopilot Enhancements

| Feature | Data Source | Value |
|---------|-------------|-------|
| Modifier margin analysis | Order selection modifiers | Which add-ons drive profit |
| Daypart performance | Order timestamps | Lunch vs. dinner optimization |
| Deferred revenue tracking | `selection.deferred` for gift cards | Proper revenue recognition |
| Real-time margin alerts | Webhook on high-volume orders | Same-day issue detection |

---

## Personalization & Roles

### Role-Based Filtered Views
Different team members need different information from the same report:
- **Executive/Owner**: Financial summary, YoY comparisons, value delivered
- **Head Chef**: Cost-focused items, rework recommendations, ingredient insights
- **FOH Manager**: Pricing recommendations, promotion candidates, guest-facing changes

Could implement as report "modes" or separate email templates per role.

---

## Value Tracking & ROI

### Cumulative "Value Delivered" Tracker
Running tally of savings/margin improvements attributed to Menu Autopilot recommendations:
- YTD savings displayed prominently in reports
- "We've helped you capture $X,XXX in additional margin this year"
- Need to solve for multi-year attribution (Y1 savings make Y2 baseline higher)
- Consider showing both cumulative all-time and rolling 12-month

### Recommendation Follow-Through Tracking
Track whether flagged items actually improve after being surfaced:
- Monitor items that appear in Top 3 or At a Glance sections
- Compare their metrics in subsequent weeks (revenue, cost %, margin)
- Surface insights: "Chicken Parm margin improved 8% since we flagged it 3 weeks ago"

### Repeated Recommendation Alerts
Flag items that keep appearing in recommendations without improvement:
- "This is the 3rd time in 3 months we've recommended repricing this item"
- Helps identify ignored issues or structural problems
- Could escalate visibility or change recommendation language

---

## Notifications & Mobile

### Push Notifications
Real-time alerts for significant events:
- Report ready
- Urgent margin leak detected
- Weekly digest reminder
- (AirTip) Shift not closed, tips unsubmitted

### Mobile App
Native mobile experience for on-the-go review:
- Quick daily/weekly summary
- Approve/acknowledge recommendations
- Photo capture for menu boards (future: OCR for price verification)

---

## Financial Dashboard Expansion

### Broader Financial Metrics
Users will want more financial visibility beyond menu items:
- Labor cost trends (feasible via Toast `/timeEntries`)
- Inventory turnover (not feasible via ME API - need CSV or expanded access)
- Sales by daypart/channel (feasible via Toast order timestamps)
- Weather correlation with sales (needs separate weather API)

### Multi-Location Rollups
For operators with multiple locations:
- Portfolio-level dashboard (feasible - both APIs support multi-location)
- Location comparison and benchmarking
- Best practices sharing (what's working at Location A?)

---

## Feasibility Summary

| Feature | Feasibility | Blocker |
|---------|-------------|---------|
| Toast sales sync | Ready when credentialed | Partner application |
| Toast labor/tips sync | Ready when credentialed | Partner application |
| MarginEdge cost sync | Ready when credentialed | Need to test API |
| Menu price push to POS | Requires partner certification | Toast approval process |
| Inventory from ME | Not feasible | Excluded from public API |
| Waste tracking | Unclear | Need to verify API exposure |
| Weather correlation | Easy to add | Just needs weather API |

---

## Design Principles

- Avoid becoming project management software - focus on insights and recommendations
- Financial performance view should come before optimization details
- Keep the interface clean; resist feature bloat
- Integrations should be zero-touch after initial setup
- Always support manual CSV as fallback (not everyone uses Toast/ME)
