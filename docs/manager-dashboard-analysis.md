# Mesob Delivery: Manager Dashboard Technical Analysis & Operational Blueprint

**Document Reference:** `docs/manager-dashboard-analysis.md`  
**Date:** October 28, 2026  
**Project:** Mesob Delivery
**Academic Context:** Capstone Project — INSA Cyber Talent Center Software Development Summer Camp at Bahir Dar University  
**Scope:** Technical audit, architecture analysis, workflow evaluation, and improvement blueprint for the Cafeteria Manager Dashboard.  
**Mode:** Analysis-Only (Zero modifications to application source code, Supabase database, or database schemas).

---

## 1. Executive Summary

Mesob Delivery is a scheduled, prepaid university cafeteria meal-subscription and dorm pickup web application designed to address dining hall congestion, long food queues, and kitchen food waste at Ethiopian universities (specifically modeled around Bahir Dar University dorm clusters).

The platform uses a **batch delivery model**: authorized students with active monthly subscriptions choose a single dish from the active meal window (Breakfast, Lunch, or Dinner), and the central cafeteria kitchen prepares, packs, and dispatches batch meals directly to two clustered dorm pickup stations (**Building T22** for female students and **Building T34** for male students).

The existing manager dashboard (`src/pages/ManagerDashboardPage.jsx`) provides four operational tabs:
1. **Kitchen View:** Displays aggregated portion tallies for the active Ethiopian meal window.
2. **Packing / Dispatch:** Provides bulk status transitions (`Pending` $\rightarrow$ `Packed` $\rightarrow$ `Arrived`) for stations T22 and T34.
3. **Menu Management:** Enables creating menu items with optional portion limits (`max_servings`), toggling items as "Sold Out", or deleting dishes.
4. **Subscriptions:** Provides an administrative queue to review payment reference numbers and receipt screenshots, approving 30-day passes or rejecting submissions with structured feedback.

### Key Investigation Findings

* **Strong Architecture:** Real-time updates via Supabase channels, automated sold-out state resets between meal cycles (`resetClosedMealSoldOutState`), client-side receipt compression, and strict single-portion order constraints.
* **Kitchen Operational Disconnect:** The Kitchen View shows total counts per dish (e.g., *"42x Shiro with Injera"*), but clicking a dish does **not** reveal which students ordered it, their IDs, or which dorm building they belong to. Cooks cannot see station-by-station portion splits (e.g., *"How many Shiro go to T22 vs T34?"*).
* **Dispatch Granularity Limitation:** Minibus dispatch operations are currently purely bulk (`Mark All as Packed`, `Mark T22 as Arrived`, `Mark T34 as Arrived`). The manager cannot check off individual containers as they are packed or handed over. There is no individual `Delivered` status action, despite being documented in project descriptions.
* **Container Identification Feasibility:** Because students are restricted to exactly one dish per meal window (`orders_one_per_user_per_meal_per_day`), **one order strictly equals one container**. The existing student `identity_number` (enforced as UNIQUE in the database) provides an ideal, human-readable container identifier. No complex barcode or artificial numbering system is needed.
* **Information Architecture Separation:** Kitchen preparation, container packing, and station dispatch are treated as disconnected tabs rather than sequential steps of the same campus meal cycle.

---

## 2. Application Architecture

Mesob Delivery is structured as a client-rendered React single-page application communicating directly with a Supabase PostgreSQL backend via client-side libraries.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Mesob Delivery Frontend (React 19 + Vite 8)           │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         Route Controller (App.jsx)                   │   │
│   │   /auth          → AuthPage.jsx (Phone Login / Signup)               │   │
│   │   /onboarding    → OnboardingPage.jsx (Name, Student ID, Dorm T22/T34│   │
│   │   /dashboard     → Role Guard:                                       │   │
│   │                      - is_manager === true  → ManagerDashboardPage   │   │
│   │                      - is_manager === false → StudentDashboardPage   │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│              │                                    │                         │
│              ▼                                    ▼                         │
│   ┌──────────────────────┐             ┌──────────────────────┐             │
│   │ AuthContext.jsx      │             │ LanguageContext.jsx  │             │
│   │ Session & Profile    │             │ Amharic (am) /       │             │
│   │ Phone Normalization  │             │ English (en)         │             │
│   └──────────────────────┘             └──────────────────────┘             │
│              │                                    │                         │
│              ▼                                    ▼                         │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ Domain Libraries (src/lib/)                                         │   │
│   │   - time.js: Ethiopia timezone (Africa/Addis_Ababa) & meal windows  │   │
│   │   - subscription.js: 30-day validity, days remaining, expiration   │   │
│   │   - sound.js: Web Audio API synthesized arrival chime               │   │
│   │   - translations.js: Bilingual dictionary                           │   │
│   │   - supabase.js: Initialized @supabase/supabase-js client           │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ WebSockets (Realtime) & REST
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Supabase Backend (PostgreSQL 15+)                  │
│                                                                             │
│   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────────────┐   │
│   │ users table     │   │ menu table      │   │ orders table            │   │
│   │ - id (UUID)     │   │ - id            │   │ - id                    │   │
│   │ - phone         │   │ - name          │   │ - user_id (FK -> users) │   │
│   │ - name          │   │ - meal_type     │   │ - menu_id (FK -> menu)  │   │
│   │ - identity_num  │   │ - max_servings  │   │ - meal_type             │   │
│   │ - pickup_point  │   │ - is_sold_out   │   │ - order_date (YYYY-MM-DD│   │
│   │ - sub_status    │   └─────────────────┘   │ - status                │   │
│   │ - sub_end_date  │                         │ - created_at            │   │
│   │ - receipt_url   │                         └─────────────────────────┘   │
│   └─────────────────┘                                                       │
│            ▲                                               ▲                │
│            └───────────────────────┬───────────────────────┘                │
│                                    │                                        │
│            ┌───────────────────────┴───────────────────────┐                │
│            │ Supabase Storage: 'receipts' bucket           │                │
│            │ Supabase Realtime Channels (orders / users)   │                │
│            └───────────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component and Module Breakdown

| Component / File Path | Architectural Responsibility |
|---|---|
| `src/App.jsx` | Client routing with `BrowserRouter`, declarative route guards (`HomeRedirect`, `AuthRoute`, `OnboardingRoute`, `DashboardRoute`), and global footer rendering. |
| `src/context/AuthContext.jsx` | User authentication lifecycle, session synchronization (`onAuthStateChange`), profile upserts, normalized phone login, and safe `signOut` flow (safeguarding student favorites). |
| `src/context/LanguageContext.jsx` | Dynamic language toggling between English (`en`) and Amharic (`am`), persisting preference to `localStorage['campusfood-language']`. |
| `src/pages/AuthPage.jsx` | Student and manager phone-based sign-in and registration, input sanitization, and 3-slide visual onboarding tour (`OnboardingTour.jsx`). |
| `src/pages/OnboardingPage.jsx` | Mandatory profile completion for new students: captures full name, unique student ID number, and pickup dorm building (`T22` or `T34`). |
| `src/pages/StudentDashboardPage.jsx` | Student customer portal: plan selection, bank transfer receipt upload, local-time meal ordering, single-portion locks, order replacement card, and 3-stage delivery progress tracker. |
| `src/pages/ManagerDashboardPage.jsx` | Cafeteria operations command center: kitchen tallies, dispatch triggers, dish management, and subscription verification. |
| `src/lib/time.js` | Ethiopian local-time calculations, active/upcoming meal window state machine, and automatic sold-out reset logic. |
| `src/lib/subscription.js` | Subscription verification math (`isSubscriptionCurrentlyActive`, `getSubscriptionDaysRemaining`, `getEffectiveSubscriptionStatus`). |
| `src/lib/supabase.js` | Singleton Supabase client configuration using `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. |

---

## 3. Current Manager Dashboard

The Manager Dashboard is implemented in `src/pages/ManagerDashboardPage.jsx` (~1,560 lines). It operates with a responsive dual-layout: a fixed desktop sidebar (`md:flex md:w-64`) and a mobile-optimized top header and bottom tab navigation.

### A. Dashboard Cards & Summary Overview Strip

At the top of the main viewport, an overview strip presents four summary metric cards:

1. **Focused Meal Orders Card (`orders.length`):** Displays total orders confirmed for the currently active meal period (e.g., *"45 Orders — Lunch Orders Active Meal Cycle"*).
2. **Pending Packing Card (`pendingOrdersCount`):** Displays orders currently with `status === 'Pending'` awaiting kitchen boxing.
3. **In Minibus Transit Card (`t22PendingArrivalCount + t34PendingArrivalCount`):** Displays orders that have been marked `Packed` but not yet marked `Arrived` at their respective stations. Displays a breakdown: *"T22: X • T34: Y"*.
4. **Pending Proofs Card (`pendingSubscriptions.length`):** Displays count of students whose subscriptions are in `'pending'` state awaiting manager verification.

### B. Header & Navigation Controls

* **Compact Top Header:**
  * **Line 1:** Dashboard title (`Cafeteria Manager` / `t.managerDash`) with an `Ops` badge and manager name separator.
  * **Line 2:** Manager greeting (`Hello, [Name] 👋`).
  * **Controls:** 
    * "Refresh" button (triggers `loadDashboard(false)` with spinning indicator).
    * `LanguageToggle` component (mobile view).
    * Icon-only Logout button (mobile view, 40×40px target, `aria-label="Log out"`).
* **Sidebar Navigation (Desktop):**
  * Brand wordmark ("Mesob Delivery Operations Manager").
  * 4 navigation tabs with live badge counters.
  * Sidebar footer: Language toggle, Manager profile pill, and signout button.
* **Bottom Navigation Bar (Mobile):**
  * Fixed bottom bar with 4 icon buttons and badge notification dots for pending subscriptions and un-packed orders.

### C. Detailed Tab Breakdown

#### Tab 1: Kitchen View (`activeTab === 'kitchen'`)
* **Purpose:** Instruct kitchen cooks how many portions of each dish must be prepared before dispatch.
* **Title:** Dynamic localized heading via `formatTotalsTitle` (e.g., *"Lunch totals"* / *"የምሳ ጠቅላላ ትእዛዝ"*).
* **Cards Grid:** Renders a card for every dish present in `kitchenTotals`:
  * **Required Portions:** Large bold counter (e.g., `45x`) and portion limit indicator (`/ 50 max`).
  * **Status Badges:** "Sold Out" (rose badge), "Near Limit" (amber badge when $\ge 80\%$ of limit), or "Available" (emerald badge).
  * **Progress Bar:** Visual fill percentage of batch limit.
  * **Toggle Action:** "Mark Sold Out" / "Mark Available" button (`handleToggleSoldOut`).
* **Critical Usability Gap:**
  * **No student drill-down:** The manager cannot see *who* ordered each dish.
  * **No station breakdown:** The manager cannot see how many portions go to T22 vs T34.
  * **Missing zero-order dishes:** If a dish has 0 orders, it does not appear in `kitchenTotals`, leaving the manager unaware of whether cooks should prepare any baseline quantity.

#### Tab 2: Packing / Dispatch (`activeTab === 'packing'`)
* **Purpose:** Coordinate boxing dishes into minibuses and sending station arrival notifications.
* **Dispatch Controller:**
  * **Step 1 ("Minibus Departure"):** "Mark All as Packed" button (`handleMarkAllPacked`). Sets `status = 'Packed'` for all orders where `status === 'Pending'`. Disabled when 0 pending orders.
  * **Step 2 ("Arrival Notice by Station"):**
    * "Mark T22 as Arrived" button (`handlePickupArrival('T22')`). Updates all non-arrived T22 orders to `status = 'Arrived'`.
    * "Mark T34 as Arrived" button (`handlePickupArrival('T34')`). Updates all non-arrived T34 orders to `status = 'Arrived'`.
* **Grouped Station Columns:**
  * Left column: **T22 - Female Building** list with total and arrived counters.
  * Right column: **T34 - Male Building** list with total and arrived counters.
  * Order items: Displays Student Name, ID number, Phone, Dish name, and status badge (`In Kitchen`, `Packed`, `Arrived`).
* **Critical Usability Gap:**
  * **No individual order actions:** Cannot mark a single student's order as packed or arrived.
  * **No delivery confirmation:** No action to mark an order as `Delivered` or handed over.
  * **No search or filter:** Staff cannot search by Student ID or name when a student approaches the minibus.
  * **No dish grouping within station:** Orders are listed by student arrival timestamp rather than grouped by dish type, making packing inefficient.

#### Tab 3: Menu Management (`activeTab === 'menu'`)
* **Left Column (Add Dish Form):**
  * Meal Name text input.
  * Meal Type dropdown (`Breakfast`, `Lunch`, `Dinner`).
  * Portion Limit (`max_servings`, optional integer).
  * "Add to Menu" submit button (`handleMenuSubmit`).
* **Right Column (Current Dishes):**
  * Meal window filter pills: `All`, `Breakfast`, `Lunch`, `Dinner`.
  * Dish cards showing name, portion limit, sold-out status, "Mark Available/Sold Out" button, and delete button (`handleDeleteMenu`).

#### Tab 4: Subscriptions (`activeTab === 'subscriptions'`)
* **Left Column (Pending Approvals Queue):**
  * Card for each student with `subscription_status === 'pending'`.
  * Displays Student Name, Phone number, and Transaction Reference.
  * "View Receipt" button: opens screenshot in `ReceiptModal` lightbox with full-image link.
  * "Reject" button: opens `RejectModal` with quick-select reasons ("Invalid reference number", "Payment not found", "Insufficient payment amount") and custom text. Sets `subscription_status = 'expired'` and clears reference.
  * "Approve (30 Days)" button: sets `subscription_status = 'active'` and `subscription_end_date = addDays(now, 30)`.
* **Right Column (Active Students Roster):**
  * Lists students with `subscription_status === 'active'`.
  * Displays name and days remaining.
  * "Revoke" button (`handleRevokeSubscription`): immediately expires student subscription.

---

## 4. Student Registration and Subscription Workflow

```
[Student Registration]
       │
       ▼
1. Enter Phone & Password ────► Normalizes Phone ────► Generates Fake Email ────► Supabase Auth
                                                        (phone@campusfood.com)      (auth.users)
                                                                                       │
                                                                                       ▼
2. Upsert Minimal Profile ◄────────────────────────────────────────────────────────────┘
   (id: auth.uid, phone: phone) in public.users
       │
       ▼
3. Onboarding Guard (App.jsx) detects onboarding_complete == false
       │
       ▼
4. Student Enters Profile Details (/onboarding):
   - Full Name
   - Identity Number (Student ID) ──► Enforced UNIQUE in DB (Constraint error 23505 if taken)
   - Assigned Pickup Point (T22 or T34)
       │
       ▼
[Monthly Subscription Activation]
       │
       ▼
1. Select Plan: 2 Meals/Day (4,500 Birr) or 3 Meals/Day (6,700 Birr)
2. Transfer Funds to Cafeteria Accounts (CBE: 1000690418917 / Telebirr: 0950271983)
3. Upload Payment Receipt Screenshot ──► Client-side Canvas Image Compression
                                         (max 1200px, 80% JPEG)
                                            │
                                            ▼
4. Upload to Supabase Storage ◄─────────────┘
   Bucket: 'receipts'
   Path: `${profile.id}-${Date.now()}.jpg`
       │
       ▼
5. Update public.users:
   - subscription_status = 'pending'
   - last_transaction_ref = '[3 Meals - 6,700 Birr] FT241029ABC'
   - receipt_url = publicUrl
       │
       ▼
[Manager Verification Queue]
       │
       ├───────────────────────────────────────────┐
       ▼                                           ▼
   [APPROVE]                                   [REJECT]
   - subscription_status = 'active'            - subscription_status = 'expired'
   - subscription_end_date = now + 30 days     - last_transaction_ref = null
   - payment_rejection_reason = null           - payment_rejection_reason = reason
       │                                           │
       ▼                                           ▼
Unlocks Student Dashboard                   Student Sees Rejection Card
(Authorized to Order)                       with Manager Feedback
```

### Authorization Determination
The application calculates student authorization through `src/lib/subscription.js`:
```javascript
export function isSubscriptionCurrentlyActive(profile) {
  const endDate = parseSubscriptionEndDate(profile?.subscription_end_date);
  return getEffectiveSubscriptionStatus(profile) === 'active' && Boolean(endDate) && !isPast(endDate);
}
```
* If `isSubscriptionActive` is false, `StudentDashboardPage.jsx` renders a dedicated onboarding/renewal screen, blocking all ordering tabs and menus.
* In `placeOrder`, the client re-verifies `isSubscriptionCurrentlyActive(latestProfile)` before sending the insert query.

---

## 5. Food Ordering Workflow

```
[Student Opens Dashboard]
       │
       ▼
Check Subscription Status ──(Inactive)──► Render Payment & Refill Interface
       │ (Active)
       ▼
Evaluate Meal Window (time.js: getMealWindowState())
       │
       ├─► Breakfast: 1:00 - 2:00 Local Time (7:00 - 8:00 AM)
       ├─► Lunch:     5:00 - 7:00 Local Time (11:00 AM - 1:00 PM)
       └─► Dinner:   11:00 - 1:00 Local Time (5:00 - 7:00 PM)
       │
       ▼
Query Existing Orders for (user_id, focusedMeal, focusDate)
       │
       ├─► Existing Order Found ──► Hide Food Menu!
       │                            Render Compact Order Confirmation Card
       │                            with "Track Your Order" button
       │
       └─► No Existing Order ────► Render Food Menu & Dish Cards
                                    │
                                    ▼
Student Taps Dish ────► Check Sold Out & Window Constraints
                             │
                             ▼
Confirmation Modal ───► Student Clicks "Confirm Order"
                             │
                             ▼
Insert into 'orders' Table:
  - user_id: profile.id
  - menu_id: item.id
  - meal_type: item.meal_type
  - order_date: focusDate
  - status: 'Pending'
                             │
       ┌─────────────────────┴─────────────────────┐
       ▼                                           ▼
[Success]                                   [Database Constraint Violation]
- setExistingOrder(order)                   - Code 23505: "Order already placed"
- Menu hidden immediately                   - Code 42501: "Window closed by server"
- Confirmation card rendered                - Error banner displayed, menu stays
```

### Key Workflow Rules

1. **Single Portion Restriction:** Enforced at the database layer via:
   ```sql
   constraint orders_one_per_user_per_meal_per_day unique (user_id, meal_type, order_date)
   ```
   If a student attempts to order twice, code `23505` is caught and handled gracefully.
2. **Order Modification & Cancellation:** **Not supported.** Orders are immutable once inserted. There are no UI controls or API calls to delete or modify a placed order.
3. **Sold-Out Dynamics:**
   * Dishes can be explicitly marked sold out by the manager (`is_sold_out: true`).
   * When `max_servings` is defined, the dish automatically disables ordering when `orders_count >= max_servings`.
   * When a meal window closes, `resetClosedMealSoldOutState()` automatically runs to reset `is_sold_out = false` for the closed window.

---

## 6. Existing Packing and Delivery Workflow

### Status Transitions

```
[Student Confirms Order]
          │
          ▼
   Status: 'Pending'          (Student Dashboard: "Cooking in Central Kitchen")
          │
          ▼
   [Manager clicks "Mark All as Packed"]
          │
          ▼
   Status: 'Packed'           (Student Dashboard: "Packed & In Minibus Transit")
          │
          ▼
   [Minibus reaches Dorm T22 / T34]
   [Manager clicks "Mark T22/T34 as Arrived"]
          │
          ▼
   Status: 'Arrived'          (Student Dashboard: Instant Alert Modal + Audio Chime!)
          │
          ▼
   Status: 'Delivered'        (DOCUMENTED IN README, BUT NOT IMPLEMENTED IN CODE)
```

### Tracking Mechanism
* Status is stored as a string (`'Pending'`, `'Packed'`, `'Arrived'`) in the `orders.status` column.
* The Student Dashboard subscribes to a Supabase Realtime channel (`student-order-status-${profile.id}`). When `status` changes to `'Arrived'`, an arrival modal pops up with dorm pickup instructions and triggers `playNotificationChime()`.
* **Discrepancy:** The `README.md` documents a 4th stage: `Delivered`. However, `ManagerDashboardPage.jsx` has no action to mark an order as `Delivered`, and `StudentDashboardPage.jsx`'s progress bar only has 3 stages (`Cooking in Kitchen` $\rightarrow$ `Packed` $\rightarrow$ `Arrived`). Once an order reaches `Arrived`, it stays in that status indefinitely until the next meal window begins.

---

## 7. Supabase Schema and Relationships

### Access Limitation Statement
Direct database access (e.g., PostgreSQL psql connection, raw database metadata inspection, or Supabase CLI) is not available in this build environment. The schema detailed below is reconstructed through exhaustive inspection of application queries, RPC calls, table joins, Supabase client mutations, and error-handling branches.

### Reconstructed Table Schemas

#### 1. `public.users`
Stores user authentication profiles, campus identity, and subscription billing state.
```sql
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone VARCHAR(32) NOT NULL,
    name VARCHAR(255),
    identity_number VARCHAR(64) UNIQUE, -- Unique Campus Student ID
    pickup_point VARCHAR(32) DEFAULT 'T22', -- 'T22' (Female) or 'T34' (Male)
    onboarding_complete BOOLEAN DEFAULT FALSE,
    is_manager BOOLEAN DEFAULT FALSE,
    subscription_status VARCHAR(32) DEFAULT 'expired', -- 'active', 'pending', 'expired'
    subscription_end_date TIMESTAMPTZ,
    last_transaction_ref TEXT,
    receipt_url TEXT,
    payment_rejection_reason TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. `public.menu`
Stores cafeteria dishes available for scheduling.
```sql
CREATE TABLE public.menu (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- or BIGSERIAL
    name VARCHAR(255) NOT NULL,
    meal_type VARCHAR(32) NOT NULL, -- 'Breakfast', 'Lunch', 'Dinner'
    max_servings INTEGER, -- NULL for unlimited
    is_sold_out BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3. `public.orders`
Stores individual meal reservations per student per meal window.
```sql
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- or BIGSERIAL
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    menu_id UUID NOT NULL REFERENCES public.menu(id) ON DELETE RESTRICT,
    meal_type VARCHAR(32) NOT NULL, -- 'Breakfast', 'Lunch', 'Dinner'
    order_date DATE NOT NULL, -- Format: YYYY-MM-DD
    status VARCHAR(32) NOT NULL DEFAULT 'Pending', -- 'Pending', 'Packed', 'Arrived'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Critical Double-Order Prevention Constraint:
    CONSTRAINT orders_one_per_user_per_meal_per_day UNIQUE (user_id, meal_type, order_date)
);
```

#### 4. Storage Bucket: `receipts`
Public Supabase Storage bucket configured for student payment screenshots (`${profile.id}-${Date.now()}.jpg`).

#### 5. Stored Functions and RPCs
* `get_menu_with_counts(p_meal_type text, p_order_date date)`: Returns menu rows for the specified meal window with joined order counts.
* `can_submit_order`: Server-side trigger/function mentioned in README validating subscription status and meal window timing before order insertion.

---

## 8. Kitchen Preparation and Food Aggregation Analysis

### How Totals Are Currently Calculated
In `ManagerDashboardPage.jsx` (lines 235-241):
```javascript
const kitchenTotals = useMemo(() => {
  return orders.reduce((accumulator, order) => {
    const itemName = order.menu?.name ?? 'Unknown item';
    accumulator[itemName] = (accumulator[itemName] ?? 0) + 1;
    return accumulator;
  }, {});
}, [orders]);
```

### Deficiencies in Current Aggregation

1. **Lack of Dorm Station Breakdown:** The kitchen totals aggregate across all dorms into a single number. Cooks cannot see how many portions must be boxed into the T22 minibus crate versus the T34 minibus crate.
2. **Missing Zero-Count Dishes:** Dishes with 0 orders are excluded from `kitchenTotals`. Cooks cannot verify if a planned dish received zero orders or was forgotten.
3. **Absence of Student Association:** `kitchenTotals` produces an object of `{ [dishName]: count }`. There is no link back to the underlying order objects to view which students ordered that dish.
4. **No Status Filtering in Prep Counts:** `orders.reduce` tallies all fetched orders. While all fetched orders for the day currently count toward kitchen prep, if an order cancellation or revocation status is ever introduced, the reduction would erroneously count cancelled orders.

### Recommended Aggregation Logic

```javascript
// Proposed Structured Aggregation Logic
const kitchenSummary = useMemo(() => {
  const summary = {};

  // 1. Initialize all active menu items for this meal window with 0
  menuItems
    .filter((item) => item.meal_type === focusedMeal)
    .forEach((item) => {
      summary[item.id] = {
        menuId: item.id,
        name: item.name,
        maxServings: item.max_servings,
        isSoldOut: item.is_sold_out,
        totalCount: 0,
        t22Count: 0,
        t34Count: 0,
        orders: [],
      };
    });

  // 2. Tally confirmed orders (filtering out any non-prep statuses)
  orders.forEach((order) => {
    if (order.status === 'Cancelled') return;
    const item = summary[order.menu?.id];
    if (item) {
      item.totalCount += 1;
      if (order.user?.pickup_point === 'T22') item.t22Count += 1;
      if (order.user?.pickup_point === 'T34') item.t34Count += 1;
      item.orders.push(order);
    }
  });

  return Object.values(summary);
}, [menuItems, orders, focusedMeal]);
```

---

## 9. Student ID and Container Identification

### Problem Statement
During peak distribution at dorm drop-off stations T22 and T34, minibus staff need to quickly hand each student the correct container without opening boxes or causing confusion.

### Evaluation of Options

| Approach | Feasibility | Database Impact | Operational Complexity | Recommendation |
|---|---|---|---|---|
| **Option A: Student ID Labeling (`users.identity_number`)** | **100% Feasible** | **Zero DB changes** | **Lowest** (write/stamp student's existing campus ID on container) | **RECOMMENDED** |
| **Option B: Order UUID** | Inconvenient | Zero DB changes | High (UUIDs are 36 characters long and unreadable on small labels) | Not Recommended |
| **Option C: Sequential Daily Order Number** | Requires new counter | Requires new DB sequence or trigger | Medium (adds numbering sequence overhead) | Unnecessary |
| **Option D: Barcode / QR Code Scanner** | Complex | Requires generating & storing QR codes | High (requires hardware scanner or mobile camera app) | Overengineered |

### Why Student ID Is the Superior Solution
1. **Strict 1:1 Relationship:** Because Mesob Delivery enforces `orders_one_per_user_per_meal_per_day`, **1 order = 1 meal = 1 container**. A student can never have 2 or 3 containers in the same meal window.
2. **Guaranteed Uniqueness:** `users.identity_number` is already enforced as `UNIQUE` in the PostgreSQL database.
3. **Physical Verification at Pickup:** Students are already required to present their university ID card when collecting food. Matching the ID number on the container to the student's physical card provides instant, foolproof verification without any new database columns.

---

## 10. Pickup Locations and Delivery Groups

### Current Implementation
* **Hardcoded Pickup Locations:** The system supports exactly two dorm pickup locations:
  * `T22`: Female dormitory cluster.
  * `T34`: Male dormitory cluster.
* In `ManagerDashboardPage.jsx` lines 243-249:
  ```javascript
  const groupedOrders = useMemo(
    () => ({
      T22: orders.filter((order) => order.user?.pickup_point === 'T22'),
      T34: orders.filter((order) => order.user?.pickup_point === 'T34'),
    }),
    [orders],
  );
  ```

### Limitations
* **Missing Fallback Group:** If a student's `pickup_point` is null or corrupt, their order is silently omitted from both the T22 and T34 lists.
* **No Vehicle/Crate Manifests:** While the README refers to "minibus logistics", the app does not provide a crate packing manifest (e.g., *"Crate 1 for T22: 25 Shiro, 15 Tibs"*).
* **Binary Station Logic:** There is no extensibility to add additional dorms (e.g., T10, T12) without hardcoding new keys across multiple files.

---

## 11. Data Integrity and Security Findings

### Confirmed Strengths
* **Single Portion Lock:** PostgreSQL unique constraint `(user_id, meal_type, order_date)` prevents duplicate orders at the database level.
* **Unique Student ID Constraint:** Duplicate student registration numbers are blocked by PostgreSQL unique constraint on `identity_number`.
* **Safe Logout State:** `AuthContext.jsx` explicitly protects student favorites (`cf_favorites_*`) during local storage purging, while removing sensitive Supabase session tokens.
* **Timeout-Protected Signout:** Signout routines are guarded with race timeouts (800ms) to prevent UI freezing on intermittent networks.

### Areas Requiring Attention (Non-Blocking Risks)
1. **Client-Side Sold-Out Reset Execution:** In `src/lib/time.js`, `resetClosedMealSoldOutState()` executes an `.update({ is_sold_out: false })` on the `menu` table directly from client browsers (both manager and student). If RLS policies allow students to execute this update, student clients possess write privileges on the `menu` table. In production, this reset should be handled by a Supabase Database Webhook, Cron (pg_cron), or server-side function.
2. **Fallback Query RLS Assumption:** In `ManagerDashboardPage.jsx` lines 141-170, when the relational join `orders` $\rightarrow$ `users` fails, the client executes a fallback query directly on `users`: `.select('id, name, phone, identity_number, pickup_point').in('id', userIds)`. If Supabase RLS restricts students from reading other users' rows, this query succeeds only for managers. The manager's `is_manager: true` claim must be verified in RLS policies.
3. **Plan Tier Storage in Reference String:** Student payment plans (`2 Meals - 4,500 Birr` vs `3 Meals - 6,700 Birr`) are stored as string prefixes in `users.last_transaction_ref` rather than as a dedicated `plan_id` or `meals_per_day` column. If a manager approves an account, the system grants a flat 30-day active status without recording whether the student is entitled to 2 or 3 meals per day.

---

## 12. Recommended Dashboard Layout

To resolve the separation between cooking, packing, and dispatch, the manager dashboard should be reorganized into an **Operational Kitchen & Dispatch Console**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Mesob Delivery Operations — Header (Active Window: LUNCH • Closes in 45m)   │
│  [Refresh]  [Language]  [Sign Out]                                          │
└─────────────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────────────┐
│  OPERATIONAL SUMMARY STRIP                                                  │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ │
│  │ Total Orders   │ │ To Prepare     │ │ To Pack (Minibus│ │ Awaiting Pickup│ │
│  │ 77 Orders      │ │ 42 Shiro       │ │ 24 In Kitchen  │ │ T22: 38 Orders │ │
│  │ (Active Lunch) │ │ 35 Tibs        │ │ 53 Packed      │ │ T34: 39 Orders │ │
│  └────────────────┘ └────────────────┘ └────────────────┘ └────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────────────────────┐
│  PRIMARY NAVIGATION:                                                        │
│  [ 🍳 Kitchen Prep & Tallies ]  [ 📦 Dispatch & Dorm Handover ]  [ ⚙️ Admin ]│
└─────────────────────────────────────────────────────────────────────────────┘

=== VIEW 1: KITCHEN PREP & TALLIES ===
┌─────────────────────────────────────────────────────────────────────────────┐
│  Meal Portion Requirements (Click dish to inspect student list)              │
│                                                                             │
│  ┌─────────────────────────────────────┐ ┌────────────────────────────────┐ │
│  │ 🍲 Shiro with Injera                │ │ 🥩 Beef Tibs with Injera       │ │
│  │ Required: 42 Portions (T22: 22 | T34: 20) Required: 35 Portions (T22: 16 | T34: 19)
│  │ Limit: 50 max (84% of limit)        │ │ Limit: Unlimited               │ │
│  │ [Toggle Sold Out] [Inspect Students]│ │ [Toggle Sold Out] [Inspect...] │ │
│  └─────────────────────────────────────┘ └────────────────────────────────┘ │
│                                                                             │
│  ▼ EXPANDED DISH DRILL-DOWN: "Shiro with Injera (42 Students)"               │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Search: [ Filter by Student ID or Name... ]                            │ │
│  │ • BDU-48192 | Almaz Kebede      | Station: T22 (Female) | Status: Prep │ │
│  │ • BDU-51029 | Yohannes Bekele   | Station: T34 (Male)   | Status: Prep │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘

=== VIEW 2: DISPATCH & DORM HANDOVER ===
┌─────────────────────────────────────────────────────────────────────────────┐
│  Dispatch Station Controller                                                │
│  [ Station T22 (Female) — 38 Orders ]  [ Station T34 (Male) — 39 Orders ]    │
│                                                                             │
│  Quick Action: [ 🚚 Mark Station T22 as Arrived ]                           │
│  Search Station Orders: [ Enter Student ID or Name... ]                     │
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Container Label │ Student Name    │ Dish Selection     │ Handover      │ │
│  │ ─────────────── │ ─────────────── │ ────────────────── │ ───────────── │ │
│  │ ID: BDU-48192   │ Almaz Kebede    │ Shiro with Injera  │ [✓ Delivered] │ │
│  │ ID: BDU-49210   │ Meron Hailu     │ Beef Tibs          │ [✓ Delivered] │ │
│  │ ID: BDU-50381   │ Sara Tesfaye    │ Shiro with Injera  │ [✓ Delivered] │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 13. Frontend and Database Changes Required

### Category A: Frontend-Only Improvements (Zero Database Changes)
These improvements can be implemented immediately using existing Supabase queries and data:
1. **Kitchen Station Split:** Compute `t22Count` and `t34Count` in the existing `useMemo` aggregation and display station splits on each dish card.
2. **Student Drill-Down in Kitchen View:** Add an expandable accordion or modal allowing the manager to click any dish to see the full list of students (Name, ID, Station) who ordered it.
3. **Dispatch Search Bar:** Add a live search filter input in the Packing / Dispatch tab to search student records by `identity_number` or `name`.
4. **Dish-Grouped Packing View:** Provide a toggle in the Dispatch tab to group orders by dish type (making it easy to box 20 Shiro containers at once).
5. **Individual Delivered Action:** Add an individual order status update trigger (`handleMarkDelivered(orderId)` updating `status = 'Delivered'`) and render a "Delivered ✓" check button per student.

### Category B: Database Queries & Schema Changes (Optional Future Enhancements)
1. **Dedicated Plan Tier Column:** Add `meals_per_day` (INTEGER: 2 or 3) to `users` table rather than parsing `last_transaction_ref`.
2. **Server-Side Sold-Out Reset Trigger:** Move `resetClosedMealSoldOutState` logic into a PostgreSQL function invoked by `pg_cron` or a Supabase Database Webhook, removing write calls from client browsers.
3. **Delivery Timestamp:** Add `delivered_at TIMESTAMPTZ` column to `orders` table to track exact handover times for operational auditing.

---

## 14. Prioritized Implementation Roadmap

| Phase | Milestone | Priority | Scope | Dependencies |
|---|---|---|---|---|
| **Phase 1** | **Kitchen View Dish Drill-Down & Station Split** | **Essential** | Frontend only (`ManagerDashboardPage.jsx`) | Reuses existing `orders` state |
| **Phase 2** | **Dispatch Search & Individual Order Handover** | **Essential** | Frontend only (`ManagerDashboardPage.jsx`) | Reuses existing `orders` table updates |
| **Phase 3** | **Integrated Packing Manifest (Group by Dish within Dorm)** | **Useful** | Frontend only (`ManagerDashboardPage.jsx`) | Reuses existing `orders` state |
| **Phase 4** | **Student Dashboard 4-Stage Progress Update** | **Useful** | Frontend only (`StudentDashboardPage.jsx`) | Aligns with `Delivered` status |
| **Phase 5** | **Database Schema Hardening (pg_cron & Plan Tiers)** | **Optional** | Database migration | Requires Supabase SQL access |

---

## 15. Testing Plan

To verify any future implementation without disrupting live operations:

1. **Kitchen Aggregation Accuracy Test:**
   * Create 3 test orders: 2 for Shiro (one at T22, one at T34), 1 for Tibs at T22.
   * Verify Kitchen View displays: Shiro = 2 (T22: 1, T34: 1), Tibs = 1 (T22: 1, T34: 0).
   * Verify zero-count dishes display cleanly without crashing.
2. **Student Drill-Down Test:**
   * Click "Shiro with Injera" in Kitchen View.
   * Verify modal/accordion lists both students with correct `identity_number` and dorm building.
3. **Container Identification Test:**
   * Inspect container display: verify label matches `user.identity_number`.
   * Search student ID in Dispatch search bar: verify instant filtering to the single target container.
4. **Individual Handover (`Delivered`) Test:**
   * Click individual "Mark Delivered" on a student's order.
   * Verify order status updates to `Delivered` in database.
   * Verify student dashboard reflects final delivery completion.
5. **Realtime Synchronization Test:**
   * Open manager dashboard and student dashboard in side-by-side browser windows.
   * Trigger status changes: verify student screen updates within <500ms without page reload.

---

## 16. Open Questions and Unverified Assumptions

1. **Row Level Security (RLS) on `users` Table:**
   * *Status:* Unverified directly due to lack of raw SQL access.
   * *Assumption:* The fallback query in `ManagerDashboardPage.jsx` (`supabase.from('users').select(...).in('id', userIds)`) assumes that authenticated managers have permission to select profiles of all users. If an RLS policy restricts users to `auth.uid() = id`, the fallback query would return empty for non-manager profiles.
2. **`orders` Foreign Key Relationship in Supabase:**
   * *Status:* Code contains a fallback join mechanism (`fallbackQuery`) which suggests that in some previous deployments, the nested join `orders.select('..., user:user_id(...)')` failed or lacked an explicit schema foreign key relationship.
3. **Multiple Meal Ordering in a Single Day:**
   * *Status:* Verified. The database constraint `orders_one_per_user_per_meal_per_day` restricts one order per `meal_type` per day. A student with a 3-meal plan can place 1 Breakfast order, 1 Lunch order, and 1 Dinner order on the same date.
