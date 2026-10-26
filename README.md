# CampusFood (ካምፓስ ምግብ) 🍲

> **Scheduled Campus Meal-Subscription & Pickup Platform for Ethiopian Universities**  
> *Developed as a capstone project following the INSA Cyber Talent Center Software Development Summer Camp at Bahir Dar University.*

[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_15-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📌 Executive Summary

**CampusFood** is a full-stack, mobile-first meal subscription and scheduled delivery platform engineered to eliminate cafeteria congestion, long meal queues, and food waste in university environments.

Rather than relying on individual on-demand deliveries—which are unaffordable for students and restricted by campus dorm security gates—CampusFood introduces a **prepaid batch delivery model**. Students subscribe to monthly cafeteria plans, choose their daily dish during scheduled Ethiopian meal windows, and collect freshly prepared meals directly from clustered dorm drop stations (**Building T22** for female students and **Building T34** for male students).

---

## 🎯 The Campus Problem & The Solution

### The Problem
* **Dining Hall Congestion:** Between lecture periods, thousands of students rush to cafeterias, standing in lines for 30–40 minutes and losing critical study time.
* **Why Generic Delivery Apps Fail:** Third-party marketplace apps charge 15%–30% delivery and commission fees that students cannot afford. Furthermore, individual courier motorbikes cannot enter secure student residential blocks.
* **Kitchen Uncertainty:** Cafeteria cooks operate on estimates, resulting in food shortages during peak days and massive food waste on others.

### The CampusFood Solution
* **Guaranteed Cash Flow:** Monthly 30-day meal subscriptions (2 Meals/Day or 3 Meals/Day) paid upfront via **Commercial Bank of Ethiopia (CBE)** or **Telebirr**, providing cafeterias with advance working capital.
* **Zero Food Waste:** Orders are strictly locked during active windows. Cooks prepare exact batch quantities based on aggregated student orders.
* **Cluster Minibus Logistics:** Delivery vehicles dispatch batch orders directly to campus dorm stations (**T22** and **T34**), replacing dozens of scattered couriers with one scheduled run.
* **Dual-Language Accessibility:** Instant, full-app localization between **Amharic (አማርኛ)** and **English**.

---

## 🚀 Key Features & System Workflows

### 👩‍🎓 1. Student Experience (Customer Portal)
* **Phone-Keyed Authentication:** Simple login and signup using phone numbers without email verification friction.
* **Dorm Onboarding:** One-time profile setup capturing full name, Student ID, and assigned pickup building (T22 or T34).
* **4-Step Monthly Subscription Activation:**
  1. *Choose Meal Plan:* 2 Meals/Day (4,500 Birr) or 3 Meals/Day (6,700 Birr).
  2. *Transfer to Cafeteria Account:* 1-click account copy for CBE and Telebirr.
  3. *Submit Reference:* Enter transaction reference number.
  4. *Receipt Proof Upload:* Attach payment screenshot with automatic client-side image compression.
* **Awaiting Verification State:** Dedicated clean status screen with live status check while the manager verifies the transfer.
* **Ethiopian Time Window Ordering:** Clear visual status tracking local operational meal windows:
  * 🌅 **Breakfast:** 1:00 – 2:00 Local Time (7:00 – 8:00 AM)
  * ☀️ **Lunch:** 5:00 – 7:00 Local Time (11:00 AM – 1:00 PM)
  * 🌙 **Dinner:** 11:00 – 1:00 Local Time (5:00 – 7:00 PM)
* **Single Portion Lock:** Database constraint strictly limits ordering to 1 portion per student per meal window to prevent abuse.
* **Real-Time Order Tracking & Arrival Chime:** Live visual progress indicator:  
  `In Kitchen Prep` → `Packed & In Transit` → `Arrived at Station` → `Delivered`  
  When the vehicle reaches the student's dorm building, an instant modal alert triggers with an audio notification chime.
* **Personal Favorites & Orders History:** Star favorite dishes for one-tap ordering and review previous meal history.

### 👨‍🍳 2. Cafeteria Operations (Manager Portal)
* **Kitchen View (Real-Time Prep Tally):** Automatically aggregates student dish selections into kitchen totals (e.g., *"45 Enjera with Shiro, 32 Pasta Bolognese"*), eliminating manual paper counting.
* **Central Packing & Dispatch Controller:**
  * *Step 1 (Minibus Departure):* Single-click **"Mark All as Packed"** when food is boxed into the transport vehicle.
  * *Step 2 (Station Drop Notification):* Independent **"Mark T22 as Arrived"** and **"Mark T34 as Arrived"** triggers that push real-time alerts to students at each dorm.
* **Menu Management Suite:** Add dishes per meal window with optional batch portion limits. Dishes automatically switch to *Sold Out* when orders hit the limit.
* **Subscription Verification Queue:** Review submitted transaction references and payment receipt screenshots in a built-in lightbox viewer. Click **Approve** (which automatically sets a 30-day active subscription) or **Reject** with preset feedback reasons.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19, Vite 8 | Ultra-fast single-page application with responsive routing |
| **Styling & UI** | Tailwind CSS 3.4, Lucide Icons | CampusFood emerald design system with mobile-first layout |
| **Backend & Database** | Supabase (PostgreSQL 15+) | Managed PostgreSQL, Row Level Security (RLS), and WebSockets |
| **Authentication** | Supabase Auth | Normalized phone-based authentication |
| **File Storage** | Supabase Storage (`receipts` bucket) | Secure storage for student bank transfer receipt screenshots |
| **Realtime Engine** | Supabase Realtime Channels | Live order status synchronization and arrival alerts |
| **Time Engine** | `date-fns`, `date-fns-tz` | `Africa/Addis_Ababa` timezone conversion & Ethiopian time formatting |
| **Mobile Deployment** | `vite-plugin-pwa` | Installable Progressive Web App with offline service worker |

---

## 🗄️ Database Architecture & Security

The database schema is defined in [`supabase-schema.sql`](supabase-schema.sql) and enforces data integrity directly within PostgreSQL:

* **Row Level Security (RLS):** Enabled on all tables (`users`, `menu`, `orders`, and storage objects).
  * Students can only read and mutate their own profile and orders.
  * Only verified managers (`is_manager: true`) can update order dispatch statuses, manage menus, or review subscriptions.
* **Double-Order Prevention:**
  ```sql
  constraint orders_one_per_user_per_meal_per_day 
  unique (user_id, meal_type, order_date)
  ```
* **Order Validation Function (`can_submit_order`):** Server-side stored function verifying that:
  1. The student holds an active, unexpired subscription (`subscription_status = 'active'`).
  2. The selected menu item is currently available and not sold out.
  3. The batch portion limit has not been exceeded.
* **Aggregated Menu Counts (`get_menu_with_counts`):** Stored SQL procedure returning live order numbers per dish for real-time kitchen tracking.
* **Storage Security:** The `receipts` bucket allows authenticated students to upload screenshots and cafeteria managers to view them.

---

## 📁 Repository Structure

```
├── docs/                                      # Project architecture and design documentation
│   ├── App-Implementation.html                # Interactive architecture & commercial walkthrough
│   ├── Database-Architecture.html             # Detailed database, RLS, and functions guide
│   ├── CAMPUSFOOD_DESIGN_SYSTEM.md            # Color tokens, typography, and UI specs
│   ├── CAMPUSFOOD_UI_IMPLEMENTATION_HANDOFF.md# Implementation details and handoff guide
│   ├── campusfood-design-tokens.json          # Raw design tokens in JSON
│   └── PROJECT_VIDEO_SCRIPT.md                # 5-minute video presentation script & checklist
├── public/                                    # Public static assets & PWA manifest icons
│   ├── favicon.svg & icons.svg & food-delivery.png
├── src/
│   ├── components/                            # Modular UI components (MealStatusCard, OrderCard, etc.)
│   ├── context/                               # Global AuthContext & LanguageContext providers
│   ├── lib/                                   # Business logic (time.js, subscription.js, supabase.js, sound.js)
│   ├── pages/                                 # AuthPage, OnboardingPage, StudentDashboard, ManagerDashboard
│   ├── App.jsx                                # Client-side routing and role-based route guards
│   ├── main.jsx                               # Application bootstrap
│   ├── index.css & campusfood.css             # Tailwind and custom animations
├── .env.example                               # Safe environment variables template
├── .gitignore                                 # Comprehensive git exclusion rules
├── LICENSE                                    # MIT License
├── package.json                               # Project metadata and dependencies
├── supabase-schema.sql                        # Complete PostgreSQL schema, functions & RLS policies
└── vite.config.js                             # Vite and PWA configuration
```

---

## 💻 Getting Started

### Prerequisites
* **Node.js:** v18.0.0 or higher
* **npm** or **bun**
* A free [Supabase](https://supabase.com) account and project

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/campusfood.git
cd campusfood
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy the template file to `.env`:
```bash
cp .env.example .env
```
Fill in your Supabase project credentials in `.env`:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Optional: Customize Cafeteria Payment Numbers (displayed on student payment screen)
VITE_CAFETERIA_CBE_ACCOUNT=1000690418917
VITE_CAFETERIA_CBE_NAME=CampusFood Finance (CBE)
VITE_CAFETERIA_TELEBIRR_PHONE=0950271983
VITE_CAFETERIA_TELEBIRR_NAME=CampusFood Finance
```

### 4. Initialize Database Schema
1. Open your Supabase project dashboard.
2. Navigate to the **SQL Editor**.
3. Copy the entire contents of [`supabase-schema.sql`](supabase-schema.sql) and paste them into the SQL editor.
4. Click **Run** to provision the tables, Row Level Security policies, stored functions, and storage bucket.

### 5. Start the Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:3000`.

---

## ⚙️ Development & Demonstration Mode

To allow mentors, evaluators, and recruiters to test the ordering workflow outside of actual Ethiopian meal hours (e.g., in the afternoon or late at night), the application includes a development override flag in `src/lib/time.js`:

```javascript
// src/lib/time.js
export const DEV_MODE_ALWAYS_OPEN = true;
```

* When `DEV_MODE_ALWAYS_OPEN = true`: Students can place test orders at any time of day.
* When `DEV_MODE_ALWAYS_OPEN = false`: Strict Ethiopian campus dining hours are enforced by the client and server clocks.

---

## 🧪 Quality Assurance & Build Validation

CampusFood adheres to strict code quality standards:

* **Linting:** Zero warnings or errors.
  ```bash
  npm run lint
  ```
* **Production Build:** Optimized bundling with service workers and precache generation.
  ```bash
  npm run build
  ```
* **Preview Production Build:**
  ```bash
  npm run preview
  ```

---

## 🎓 Academic Context & Attribution

* **Author:** Biniyam Yimen Tilahun
* **Institution:** Bahir Dar University
* **Program:** INSA Cyber Talent Center Software Development Summer Camp
* **Methodology:** The application's domain logic, campus logistics, database schemas, and UX design were architected by the author, accelerated using modern AI-assisted software development tools.

---

## 📄 License

This project is open-source and licensed under the [MIT License](LICENSE).
