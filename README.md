# Mesob Delivery

Mesob Delivery is a mobile-first meal subscription and scheduled cafeteria pickup application for university communities. Students can manage a meal subscription, choose dishes during meal windows, and follow order progress to campus pickup points. Cafeteria managers can manage menus, review subscriptions, and coordinate meal preparation and pickup.

> Developed as a capstone project following the INSA Cyber Talent Center Summer Camp at Bahir Dar University.

[![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![PWA](https://img.shields.io/badge/PWA-Installable-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Features

### Students

- Sign up and sign in with a phone number and password.
- Complete a profile with a name, student ID, and campus pickup point.
- Submit a monthly meal-plan payment reference and receipt image for manager review. The interface currently offers two meals per day for 4,500 Birr or three meals per day for 6,700 Birr.
- Browse the current meal's menu, place an order, favorite dishes, and view order history.
- Follow order progress from preparation through packing to arrival at the pickup point.
- Use the interface in English or Amharic.

### Cafeteria managers

- Review order totals and manage meal menus and availability.
- Mark orders as packed and notify students when meals arrive at their pickup point.
- Review subscription payment references and receipt images, then approve or reject requests.

## Technology

- React 19, React Router, and Vite 8
- Tailwind CSS and Lucide icons
- Supabase Auth, Postgres, Storage, and Realtime
- `date-fns` and `date-fns-tz` for meal-window time handling
- `vite-plugin-pwa` for the installable web app and service-worker asset caching
- Firebase Hosting configuration for static hosting and single-page-app routing

The browser application connects directly to Supabase. The Supabase project must have the tables, policies, storage bucket, and other backend resources expected by the app configured separately. **This repository does not include `supabase-schema.sql` or database migrations.** The documents under [`docs/`](./docs/) are project references; do not treat them as executable migrations without verifying them against the application.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- A Supabase project configured for the application's data model

## Local development

1. Clone this repository and install dependencies:

   ```sh
   git clone https://github.com/biniyambeneam/Mesob-Delivery.git
   cd Mesob-Delivery
   npm install
   ```

2. Copy `.env.example` to `.env.local` and set your Supabase project credentials:

   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

   The anon key is used by the browser app; protect data with appropriate Supabase policies. Optional `VITE_CAFETERIA_*` variables configure the payment account details displayed in the subscription screen. Verify those recipient details with the cafeteria before using them for real payments. `VITE_DEMO_MEAL` can be set to `Breakfast`, `Lunch`, or `Dinner` in `.env.local` to preview a selected meal outside its normal window; restart Vite after changing it.

3. Start the development server:

   ```sh
   npm run dev
   ```

   Vite serves the app at `http://localhost:3000`.

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server on port 3000 |
| `npm run build` | Create the production build in `dist/` |
| `npm run preview` | Preview the production build locally on port 3000 |
| `npm run lint` | Run ESLint |

There is no test script configured in `package.json`.

## Ordering and demonstration behavior

Meal-window selection and ordering availability are implemented in `src/lib/time.js`. The current development setting keeps ordering open for demonstrations; `VITE_DEMO_MEAL` selects which meal to preview. Do not rely on this client-side development behavior as a production authorization or order-validation boundary. Configure and enforce production business rules in the backend as appropriate.

## Build and deployment

Run the production build with `npm run build`; the generated static site is written to `dist/`. The repository includes Firebase Hosting configuration for deploying that directory and rewriting application routes to the SPA entry point. Deployment requires access to the intended Firebase project and the Firebase CLI; review `.firebaserc` and `firebase.json` before deploying. Building the app does not deploy it.

The PWA manifest and icons use the Mesob emblem. Browser and operating-system install or launch screens are generated in part by the platform; installed clients may need to refresh or reinstall to pick up changed icons.

## Repository overview

```text
public/       Static assets, PWA manifest, and Mesob app icons
src/
  components/ Shared interface components
  context/    Authentication and language contexts
  lib/        Supabase client and application helpers
  pages/      Authentication, onboarding, student, and manager screens
docs/         Project and design reference documents
firebase.json, .firebaserc
              Firebase Hosting configuration
vite.config.js
              Vite and PWA configuration
```

## Academic context

- **Author:** Biniyam Yimen Tilahun
- **Institution:** Bahir Dar University
- **Program:** INSA Cyber Talent Center Software Development Summer Camp

## License

This project is licensed under the [MIT License](LICENSE).
