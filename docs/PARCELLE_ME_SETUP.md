# Parcelle Organics - MarginEdge Setup Plan

Getting ME data ready for menu optimization.

---

## Current State

- **71 products** (39 food, 32 non-food)
- **30 vendors** configured
- **No recipes** (critical gap)
- **Toast not connected** (no automatic sales data)
- **QB not connected** (manual accounting)

---

## Phase 1: Connect Integrations

### 1.1 Connect Toast POS → MarginEdge

This is the biggest win - automatic sales data flow.

**In MarginEdge:**
1. Go to **Setup > Point of Sale**
2. Select **Toast** as POS
3. Follow OAuth flow to authorize
4. Map menu items to ME categories

**Note:** Toast charges ~$25/month/location for API access. This shows up in ME billing.

**What you get:**
- Daily sales by menu item (automatic)
- Item mix reports
- Theoretical vs actual food cost

### 1.2 Connect QuickBooks

**In MarginEdge:**
1. Go to **Setup > Integrations**
2. Select QuickBooks Online
3. Authorize and map GL accounts

**What you get:**
- Invoice data flows to QB automatically
- P&L alignment
- Less manual bookkeeping

---

## Phase 2: Build Product Catalog

### 2.1 Identify Main Suppliers

Check with Kamal - who does Parcelle order from regularly?

Common restaurant suppliers:
- [ ] US Foods
- [ ] Sysco
- [ ] Local produce (who?)
- [ ] Meat supplier (who?)
- [ ] Dairy supplier (who?)
- [ ] Bread/bakery (who?)
- [ ] Beverage distributor (who?)

### 2.2 Enter Historical Invoices

For each main supplier, enter the last 4-8 weeks of invoices.

**In MarginEdge:**
1. **Orders > Add Order**
2. Upload invoice photo/PDF (ME does OCR)
3. Review extracted data
4. Confirm and post

**Target:** Get to 150+ food products with current costs

### 2.3 Establish Invoice Routine

Best practice: Enter invoices within 24-48 hours of delivery

Options:
- **Daily:** Quick photo upload after each delivery
- **Weekly:** Batch upload all invoices from the week
- **ME mobile app:** Snap photos on the spot

---

## Phase 3: Create Recipes (Critical for Menu Costing)

This is where ME calculates what each menu item *should* cost.

### 3.1 Get Parcelle's Menu

Need the actual menu items sold at Parcelle:
- Breakfast items
- Lunch items
- Bowls/salads
- Sides
- Beverages
- etc.

### 3.2 Build Recipes in ME

**For each menu item:**

1. Go to **Recipes > Add Recipe**
2. Name it exactly as it appears on POS (for matching)
3. Add ingredients from product catalog
4. Set yield (portions per batch)
5. ME calculates cost per serving

**Example: "Avocado Toast"**
```
Ingredients:
- Bread, Sourdough: 2 slices (0.25 lb)
- Avocados, Fresh: 1 each
- Olive Oil: 0.5 oz
- Salt: pinch
- Red Pepper Flakes: pinch

Yield: 1 portion
Calculated Cost: $X.XX
```

### 3.3 Link Recipes to POS Items

Once Toast is connected:
1. Go to **Setup > Menu Mapping**
2. Match each POS item to its ME recipe
3. This enables theoretical food cost tracking

---

## Phase 4: Validate Data Quality

### 4.1 Run Health Check

```bash
cd ~/menu-autopilot
npx tsx scripts/quick-health.ts
```

**Targets:**
- [ ] 150+ food products
- [ ] All major categories have products
- [ ] Recipes created for top 20 menu items
- [ ] Toast connected and syncing

### 4.2 Check for Issues

```bash
# Full integrity check (once data is built up)
npx tsx scripts/test-marginedge.ts
```

Look for:
- Duplicate products
- Missing costs
- Unmapped menu items

---

## Success Criteria

Ready for Menu Autopilot analysis when:

| Requirement | Target |
|-------------|--------|
| Food products | 150+ |
| Recipes created | Top 20+ menu items |
| Toast connected | Yes |
| Recent invoices | Last 4 weeks |
| Menu items mapped | 80%+ |

---

## Quick Reference

### ME Dashboard Sections

| Section | Use For |
|---------|---------|
| Orders | Enter/review invoices |
| Products | View/edit ingredient catalog |
| Recipes | Create menu item recipes |
| Performance | View food cost reports |
| Setup | Integrations, POS, settings |

### Helpful ME Keyboard Shortcuts

- `Cmd+K` - Quick search
- `Cmd+N` - New order/invoice

### Support

- ME Help: help@marginedge.com
- ME Docs: help.marginedge.com

---

## Timeline Estimate

| Phase | Effort |
|-------|--------|
| Connect Toast | 30 min setup |
| Connect QB | 30 min setup |
| Enter 4 weeks invoices | 2-3 hours |
| Create 20 recipes | 2-3 hours |
| Validate & cleanup | 1 hour |

**Total: ~8 hours spread over 1-2 weeks**

---

## Notes

- ME API is read-only - all data entry happens in ME dashboard
- Invoice OCR is pretty good but review before posting
- Recipe costs update automatically when product prices change
- Toast connection may require Parcelle's Toast admin access
