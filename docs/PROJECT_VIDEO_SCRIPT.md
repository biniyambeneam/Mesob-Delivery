# CampusFood — Video Presentation Script & Evaluation Guide

**Project:** CampusFood (Campus Meal Delivery System)  
**Context:** Capstone project following the INSA Cyber Talent Center Software Development Summer Camp at Bahir Dar University  
**Audience:** Summer Camp Mentors and Evaluators  
**Target Duration:** ~5 minutes (~600 spoken words at 120–130 words/minute)  
**Target File Location:** `/PROJECT_VIDEO_SCRIPT.md`

---

## 1. Five-Minute Presentation Script

| Time | What appears on screen / what I should do | Exact words I should say |
| :--- | :--- | :--- |
| **0:00 – 0:30**<br>*(~65 words)* | **Camera on me / Title Slide**<br>Display the clean CampusFood onboarding landing screen (`http://localhost:3000/auth`) in a centered phone frame or browser tab. Introduce myself clearly with eye contact. | "Hello everyone. My name is Biniyam, and this is my presentation for the INSA Cyber Talent Center Software Development Summer Camp at Bahir Dar University.<br><br>I built **CampusFood**—a scheduled meal ordering and delivery platform tailored for university students and campus cafeterias. Its purpose is to deliver hot, scheduled meals directly to campus dorms without students losing study time in long cafeteria lines." |
| **0:30 – 1:10**<br>*(~85 words)* | **Onboarding Screen (Slide 1 & 2)**<br>Click through Slide 1 ("Your Favorite Meals") and Slide 2 ("Order Today. Pick Up on Campus") showing T22 & T34 pickup badges. | "In our university environment, meal times create huge bottlenecks. Hundreds of students rush to off-campus eateries or crowded dining halls between lectures, standing in lines for thirty to forty minutes.<br><br>Individual door-to-door delivery does not work here—dorms are restricted, and delivering single orders is unaffordable. The real problem was operational: how can a kitchen cook food in bulk and deliver it efficiently to specific campus stations like Building T22 for female students and Building T34 for male students?" |
| **1:10 – 1:50**<br>*(~90 words)* | **Login & Student Dashboard**<br>Click *Skip to Login*, enter student phone and password, and submit. The Student Dashboard opens.<br>Point to the remaining meal credits and Ethiopian Time window banner. | "Here is how CampusFood solves this. Students subscribe to a monthly meal plan and choose their daily dish during scheduled Ethiopian time windows—Breakfast, Lunch, or Dinner.<br><br>On the student dashboard, you can see our local time engine tracking the active window and showing my remaining meal credits. Because students already prepaid, ordering takes one tap. I will select today's lunch dish and confirm my order." |
| **1:50 – 2:30**<br>*(~95 words)* | **Order Confirmation & Lock**<br>Tap *Tap to Confirm* on a meal card, click *Confirm Order*. Show the screen instantly transition to the locked status card.<br>Point to the badge: "Cooking in Kitchen". | "Notice that the menu instantly closes. To prevent food waste, each student gets exactly one portion per meal window. The order is now locked in our Supabase database.<br><br>Instead of vague delivery estimates, our status reflects cafeteria reality: 'Cooking in Kitchen'. All meals are prepared together in one large batch before departure, rather than dispatched one by one." |
| **2:30 – 3:10**<br>*(~95 words)* | **Manager Dispatch & Real-Time Arrival**<br>Switch to the Manager tab on screen (split-screen or second browser window).<br>Show *Packing / Dispatch*. Click **Mark All as Packed**, then click **Mark T22 as Arrived**.<br>Switch back to Student view: the "Food Arrived!" modal pops up with an audio chime. | "Now let's view the manager's dispatch screen. The manager sees orders grouped strictly by pickup point—T22 and T34.<br><br>When the food is loaded into the delivery vehicle, the manager clicks 'Mark All as Packed'. And when the car reaches Building T22, they tap 'Mark T22 as Arrived'.<br><br>Immediately, via Supabase real-time updates, the student's phone receives an alert and chime telling them to bring their Student ID and collect their meal." |
| **3:10 – 4:15**<br>*(~135 words)* | **Architecture & Technology Overview**<br>Briefly show the code editor or a high-level architecture diagram: React 19, Tailwind CSS, Supabase (Auth, RLS, Storage, Realtime). | "Architecturally, the frontend is built with React 19, Vite, and Tailwind CSS, featuring dual English and Amharic support and a mobile-first interface.<br><br>The backend is powered by Supabase. We use PostgreSQL with Row Level Security to protect student data, database constraints to prevent double-ordering, Supabase Storage for Telebirr and CBE payment receipt verification, and WebSockets for live status updates.<br><br>Regarding my workflow: I utilized AI-assisted development tools to accelerate implementation. My core contributions were defining the system architecture, modeling the Ethiopian campus logistics, designing the UI/UX rules and design system, integrating Supabase authentication and schemas, and rigorously debugging real-time state synchronization." |
| **4:15 – 5:00**<br>*(~100 words)* | **Camera back on me / Conclusion**<br>Show the clean final screen or camera. Deliver a warm, confident conclusion. | "CampusFood demonstrates how targeted software design can transform everyday student logistics. By replacing random deliveries with scheduled batch ordering, students save valuable hours every week, and campus kitchens gain predictable demand with zero food waste.<br><br>The INSA Cyber Talent Center camp at Bahir Dar University challenged me to think from real problem definition all the way to a functioning software product, and this application is the direct result.<br><br>Thank you for your mentorship and time. I welcome any questions or feedback." |

---

## 2. Pre-Recording Preparation Checklist

### A. Screens and Feature Setup Checklist
- [ ] **Two Browser Windows / Profiles Ready:**
  - **Window 1 (Student View):** Logged in as a verified student assigned to pickup point **T22** with an active subscription and remaining meal credits.
  - **Window 2 (Manager View):** In an Incognito window or second browser, logged in as the cafeteria manager (`is_manager: true`) on `/dashboard` open to the **Packing / Dispatch** tab.
- [ ] **Database Pre-Check in Supabase:**
  - Clear out any existing order for today's test date for that student test account so that the menu is visible at the start of the demonstration.
  - Verify that `DEV_MODE_ALWAYS_OPEN = true` in `src/lib/time.js` so that meal ordering is active regardless of the actual time of day during your recording.
  - Ensure at least 2–3 menu items exist in the active meal type (`Lunch`).
- [ ] **Audio Test:**
  - Confirm system sound is captured by your screen recorder so the gentle arrival chime (`playNotificationChime()`) is audible when the manager marks the order arrived.
- [ ] **Dual-Language & Onboarding Tour:**
  - Ensure the local storage flag `cf_has_seen_tour_v1` can be cleared or click the *"View app introduction tour"* link on the login screen to demonstrate the 3 onboarding slides smoothly.

---

### B. Verification & Fact-Checking List (What to Confirm)
Before making claims in your video, ensure these verified facts match your script:
1. **Batch Delivery Model:** CampusFood delivers via scheduled minibus/van in batches to **T22** and **T34**, not via single motorbike deliveries.
2. **Prepaid Plan:** Students use monthly subscription credits (e.g., 2 Meals/day for 4,500 ETB or 3 Meals/day for 6,700 ETB); they do not pay per individual plate at checkout.
3. **Database Constraints:** One order per student per meal cycle is enforced both in React UI and by a PostgreSQL unique index (`orders_one_per_user_per_meal_per_day`).
4. **Receipt Verification:** Students upload payment screenshots; the manager manually verifies and approves them before subscriptions become active.
5. **Honest Scope Statement:** Do not claim the app is deployed to real campus cafeterias or has hundreds of users yet. Present it accurately as a **fully functional prototype and assignment capstone**.

---

### C. Likely Mentor Questions & Technically Accurate Answers

#### Question 1: *"How does the application prevent a student from placing multiple orders for the same lunch or dinner?"*
> **Answer:** *"We enforce this at two layers. On the client side, once an order is submitted, the dashboard locks and hides the menu, replacing it with the active order status. More importantly, at the database level in Supabase, the `orders` table has a composite unique constraint on `(user_id, meal_type, order_date)`. Any duplicate insert attempt is rejected by PostgreSQL with code `23505`, preventing duplicate plates even if network requests are repeated."*

#### Question 2: *"Why did you design the delivery system around two specific pickup points instead of room-to-room delivery?"*
> **Answer:** *"University dormitories have security restrictions where outside delivery drivers cannot enter residential floors, especially between female and male dorm buildings like T22 and T34. Furthermore, single-plate deliveries would require massive delivery overhead. By batching deliveries into one vehicle that arrives at scheduled times, the cafeteria can serve hundreds of students with a single driver in under fifteen minutes."*

#### Question 3: *"How does real-time communication work between the manager and student devices?"*
> **Answer:** *"We use Supabase Realtime, which connects over WebSockets to listen to Postgres changes on the `orders` table filtered by the student's user ID. When the manager updates the status to 'Packed' or 'Arrived', the event fires immediately on the student's browser. As a reliability safeguard for spotty campus Wi-Fi, the client also includes a lightweight polling fallback."*

#### Question 4: *"What was your methodology for using AI during development, and what did you personally build?"*
> **Answer:** *"I acted as the product architect and systems engineer. I defined the campus problem, specified the Ethiopian time window logic, designed the database schema and RLS policies, chose the tech stack, guided the UI/UX design tokens, and integrated Supabase authentication and storage. I used AI as an accelerator for boilerplate code, CSS compositions, and UI refinement. I validated, tested, and debugged all system interactions myself."*

---

### D. Recording & Technical Checklist

- [ ] **Resolution:** Record at **1080p (1920×1080)** or **2K**. Set your browser zoom to 100% or 110% so text and badges are crisp and legible.
- [ ] **Browser Prep:**
  - Hide your browser bookmarks bar (`Ctrl+Shift+B` or `Cmd+Shift+B`).
  - Close unrelated tabs, messaging apps, and personal notifications.
  - Disable browser extensions or password autofill popups that might obscure form inputs.
- [ ] **Privacy & Credentials:**
  - Never show `.env` files, Supabase service role keys, or database passwords on screen.
  - Use sample student names (e.g., "Abebe Kebede") and test phone numbers (e.g., `0911223344`).
- [ ] **Audio & Environment:**
  - Use a dedicated headset or USB condenser microphone placed 6–8 inches from your mouth.
  - Record in a quiet room with minimal echo; run a 10-second test recording first to verify clear audio levels without clipping.
- [ ] **Pacing:** Speak at an unhurried, natural speed. Allow 1–2 second visual pauses after major transitions (like confirming an order or triggering the arrival chime) so evaluators can absorb the screen state.
