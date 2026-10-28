# CampusFood Logout Audit — Read-only Findings

## 1. Executive Summary

**Verified:** Both dashboards use one shared authentication function, `signOut` in [AuthContext.jsx](./src/context/AuthContext.jsx#L222), but render their own logout buttons. There is no shared logout button component.

- **Student, active subscription:** Desktop logout is in the sidebar footer. Mobile logout is in the Profile tab’s Account Actions card; reaching it requires selecting Profile and may require scrolling. When Profile is selected on desktop, that card can appear alongside the sidebar logout.
- **Student, inactive subscription:** A different activation-screen branch places logout in the header on all viewport sizes. It has no dashboard sidebar or bottom tab bar.
- **Manager:** Desktop logout is in the sidebar footer. Mobile/tablet has **two** controls: one in the top header and another in a manager profile card at the end of dashboard content.
- All controls ultimately use shared `signOut`. The manager adds a wrapper that handles the event and also calls React Router navigation to `/auth`.
- The shared function clears auth/profile state immediately, removes matching local-storage keys, attempts Supabase local-scope sign-out, then redirects to `/auth`. It does not show logout-specific loading, confirmation, toast, or on-screen error feedback.
- There is one concrete persistence consequence: the student’s per-student favorites use a `cf_` local-storage key, and the shared logout cleanup removes keys with that prefix. Other keys with different prefixes are not cleared by this function.
- **No files were changed.** This report is based on static source inspection; I did not inspect the UI in a running browser.

## 2. Files and Components Investigated

The logout-related search covered the source tree, including dashboard pages, shared context, routing, authentication setup, and shared UI. Relevant files:

- [StudentDashboardPage.jsx](./src/pages/StudentDashboardPage.jsx) — student activation and active-dashboard logout controls; responsive layout and student local state.
- [ManagerDashboardPage.jsx](./src/pages/ManagerDashboardPage.jsx) — manager logout controls and wrapper handler.
- [AuthContext.jsx](./src/context/AuthContext.jsx) — shared session state, auth listener, cleanup, Supabase call, redirect.
- [supabase.js](./src/lib/supabase.js) — Supabase client creation and auth persistence options.
- [App.jsx](./src/App.jsx) — authentication route guards and dashboard role selection.
- [OnboardingPage.jsx](./src/pages/OnboardingPage.jsx) — an additional sign-out button outside the dashboards.
- [LanguageContext.jsx](./src/context/LanguageContext.jsx) — language preference storage, relevant to what survives logout.
- [time.js](./src/lib/time.js) — another non-`cf_` local-storage key.
- [index.css](./src/index.css), [campusfood.css](./src/campusfood.css), and [tailwind.config.js](./tailwind.config.js) — global button rules, design tokens, and responsive breakpoint configuration.
- [translations.js](./src/lib/translations.js) — translated sign-out label.

The search found no separate reusable logout button, profile dropdown, or drawer component. It found an additional direct sign-out control in onboarding, described below.

## 3. Student Logout Implementation

### Controls and handlers

| Student state | Location | Trigger and handler |
|---|---|---|
| Inactive subscription / activation view | Compact top header | Button calls `signOut` directly at approximately line 605 of [StudentDashboardPage.jsx](./src/pages/StudentDashboardPage.jsx#L605). |
| Active dashboard, desktop | Fixed sidebar footer below student identity | Button calls `signOut` directly at approximately line 1045 of [StudentDashboardPage.jsx](./src/pages/StudentDashboardPage.jsx#L1045). |
| Active dashboard, mobile and desktop Profile tab | Account Actions card in the Profile content | Button calls `signOut` directly at approximately line 1761 of [StudentDashboardPage.jsx](./src/pages/StudentDashboardPage.jsx#L1761). |

All three are separate button instances in the student page, not a shared button component. The active dashboard’s header does **not** contain a logout button.

### Click-to-redirect sequence

1. A student clicks one of the buttons above. The page passes the shared `signOut` function directly as the button’s `onClick`; there is no student-specific wrapper.
2. `signOut` immediately sets session and profile to `null`, sets profile-loading and general loading to `false`, then starts cleanup in [AuthContext.jsx](./src/context/AuthContext.jsx#L222).
3. It attempts to remove local-storage keys beginning with `sb-`, containing `supabase`, or beginning with `cf_`. A storage exception is caught and logged with `console.warn`.
4. If the Supabase client exists, it races `supabase.auth.signOut({ scope: 'local' })` against a 600 ms timer. It catches a rejected auth call and logs a warning; the function does not display the error to the student.
5. In `finally`, it calls `window.location.replace('/auth')` unless already at `/auth`.
6. Independently, the app’s `DashboardRoute` sees the session is `null` and redirects to `/auth`; `AuthRoute` renders the auth page if there is no session. These guards are in [App.jsx](./src/App.jsx#L66).

The student button event itself does not await or expose the returned promise to the UI. The shared function handles its expected storage and auth rejections internally. There is no logout-specific disabled state or progress indicator, confirmation dialog, success toast, or visible error message.

### State that is cleared or survives

- The in-memory auth session and profile are cleared immediately. React state belonging to the dashboard is removed when the page is replaced.
- Student favorites are described as per-student local storage in [StudentDashboardPage.jsx](./src/pages/StudentDashboardPage.jsx#L104). Their key has the `cf_favorites_...` prefix, so the shared cleanup removes it.
- The dismissed-arrival-order key, `dismissed_arrived_order_id`, does not match the cleanup prefixes and therefore is not removed by this function. Its definition and use are in [StudentDashboardPage.jsx](./src/pages/StudentDashboardPage.jsx#L52).
- The language key `campusfood-language` and sold-out reset key `campusfood_last_reset_meal_cycle` also do not match those prefixes; their source is [LanguageContext.jsx](./src/context/LanguageContext.jsx#L5) and [time.js](./src/lib/time.js#L83).

The storage-removal behavior is verified from the code. Whether clearing favorites is intentional is not stated there; the key name and page comment indicate they are intended to be persisted per student.

## 4. Manager Logout Implementation

### Controls and handler

The manager page has three button instances, all wired to its page-level `handleSignOut`:

| Location | Visibility | Source |
|---|---|---|
| Fixed desktop sidebar footer, below manager identity | `md` and wider | Approximately line 589 of [ManagerDashboardPage.jsx](./src/pages/ManagerDashboardPage.jsx#L589). |
| Top header | Below `md` only | Approximately line 642 of [ManagerDashboardPage.jsx](./src/pages/ManagerDashboardPage.jsx#L642). |
| Manager identity card at the end of dashboard content | Below `md` only | Approximately line 1386 of [ManagerDashboardPage.jsx](./src/pages/ManagerDashboardPage.jsx#L1386). |

`handleSignOut`, at approximately line 68 of [ManagerDashboardPage.jsx](./src/pages/ManagerDashboardPage.jsx#L68), prevents the event’s default behavior and propagation when available, awaits shared `signOut`, logs an unexpected rejection, and calls `navigate('/auth', { replace: true })` in its `finally` block.

### Differences from student behavior

The manager does **not** have a different Supabase sign-out method. Its wrapper calls the same context function used by students. The wrapper does add its own navigation after the shared function completes. The shared function already calls `window.location.replace('/auth')`, so manager logout has two navigation mechanisms aiming at the same destination. This is redundant in source; the exact runtime effect of the two navigations was not tested.

The manager shows no confirmation, logout-specific loading state, toast, or visible error. Its wrapper’s warning is for an unexpected rejection; expected auth errors are caught inside the shared function. Manager React state is not individually reset by `handleSignOut`; the page’s state is discarded when navigation replaces the page.

## 5. Duplication and Shared Architecture Findings

The architecture is **partial duplication**:

- **Shared authentication logic:** Both dashboards use `signOut` from [AuthContext.jsx](./src/context/AuthContext.jsx#L222). The Supabase call and auth-storage cleanup are centralized there.
- **Separate dashboard UI:** Student and manager buttons are independently rendered in their respective page files. There is no reusable logout component.
- **Different event wrappers:** Student controls call `signOut` directly. Manager controls call `handleSignOut`, which wraps `signOut` and adds event handling, logging, and a second navigation.
- **Additional non-dashboard use:** The onboarding page has its own button calling `signOut` directly at approximately line 95 of [OnboardingPage.jsx](./src/pages/OnboardingPage.jsx#L95).

The repeated buttons correspond to different layout contexts: desktop sidebar versus mobile/header or Profile content. That is consistent with responsive layout choices, but the manager’s two mobile controls are both visible at the same breakpoint and are therefore duplicates on mobile, not mutually exclusive responsive alternatives.

A future shared button could standardize presentation, accessibility, and feedback if desired; the core auth method is already shared. Whether to share the markup should depend on whether the layouts need the same interaction and placement. No refactor was made.

## 6. Student Mobile Experience

### Active dashboard

- The desktop sidebar is `hidden md:flex`; the fixed bottom tab navigation is `md:hidden` in [StudentDashboardPage.jsx](./src/pages/StudentDashboardPage.jsx#L956) and approximately line 1777.
- The bottom navigation has Home, Favorites, Orders, and Profile; it has no logout control.
- Logout is inside the Profile tab’s Account Actions card, after other Profile content, at approximately line 1761. A user must first select Profile, and the control is not fixed to the viewport. Its position in the content means scrolling may be necessary; exact initial-viewport visibility depends on rendered content and device size.
- There is no drawer or dropdown involved.
- The Profile-card button shows a logout icon and text. It has no explicit tooltip or `aria-label`, but its visible text gives it a name.

### Inactive-subscription activation view

The student page renders a separate view when the subscription is inactive. It has a top-header logout button at approximately line 605 of [StudentDashboardPage.jsx](./src/pages/StudentDashboardPage.jsx#L605); it does not use the active dashboard’s sidebar or bottom navigation. At widths below `sm`, its text is hidden and the icon remains. It has a `title`, but no explicit `aria-label`.

At the narrowest widths, the header control’s class provides horizontal padding and an icon but no explicit minimum width. The global button rule sets a 44 px minimum height, not a minimum width. Whether the resulting width is comfortable to tap should be verified in a browser.

## 7. Manager Mobile Experience

Below `md`, the desktop sidebar is hidden and the fixed bottom navigation provides the manager’s dashboard tabs. Logout is **not** in that bottom navigation.

Instead, there are two direct logout buttons:

1. **Top header:** At approximately line 642 of [ManagerDashboardPage.jsx](./src/pages/ManagerDashboardPage.jsx#L642). It is visible without navigating to a profile screen or scrolling. Below `sm`, the text is hidden, leaving the icon; this button does have both `aria-label` and `title`.
2. **Content-end identity card:** At approximately line 1386 of [ManagerDashboardPage.jsx](./src/pages/ManagerDashboardPage.jsx#L1386). It contains manager identity and a text-labeled logout button. It is in scrollable content, not a fixed footer.

The page comments identify the header control as the mobile logout button and the lower card as “Mobile Profile & Sign Out Footer Card.” The source does not state why both were retained. A reasonable interpretation is quick access in the header plus sign-out alongside manager identity lower in the content, but that intent is an inference rather than a verified requirement.

As with the student page, `md:hidden`/`hidden md:flex` controls visibility. The manager header control has no explicit minimum width, although the global button rule gives it a 44 px minimum height. Its narrow-screen tap width should be visually checked.

## 8. Student Desktop Experience

At `md` and wider, the active dashboard shows a fixed sidebar (`md:fixed`, `md:inset-y-0`) with logout in its footer. The main dashboard is offset with `md:pl-64`; these layout classes are in [StudentDashboardPage.jsx](./src/pages/StudentDashboardPage.jsx#L956).

The sidebar remains outside the active-tab content, so its logout control stays present while navigating between Home, Favorites, Orders, and Profile. Selecting Profile also renders the separate Account Actions sign-out button in the main content, so both controls can be visible on desktop at once. The Profile-card button itself is only present in the Profile content.

The sidebar control includes a `LogOut` icon and visible sign-out text. Its styling uses rose text and a rose hover background; there is no explicit tooltip, disabled/loading style, or custom focus style on that button. The active dashboard’s top header contains station/order information, not logout.

The inactive-subscription activation view is an exception: it has no desktop sidebar and uses the header control instead.

## 9. Manager Desktop Experience

At `md` and wider, the manager sees a fixed sidebar with sign-out below language and identity controls, approximately line 589 of [ManagerDashboardPage.jsx](./src/pages/ManagerDashboardPage.jsx#L589). It remains rendered as dashboard tabs change. The header and content-end profile card are both `md:hidden`, leaving one manager logout button at desktop widths.

The sidebar button has a `LogOut` icon and visible text. It uses dashboard-specific utility classes for rose text and hover background; it does not set a tooltip or custom focus, active, or disabled state. The sidebar has `overflow-y-auto`, so its internal content can scroll if needed. No overlap can be confirmed from static markup alone.

The student and manager desktop placement is broadly consistent: both use a fixed left sidebar footer. Their button markup and event handlers are not shared.

## 10. Authentication and Session Safety

### Verified source behavior

- [supabase.js](./src/lib/supabase.js#L1) creates a Supabase client only when the configured URL and key are present. Its auth options enable `persistSession` and `autoRefreshToken`.
- [AuthContext.jsx](./src/context/AuthContext.jsx#L71) initializes session state using `supabase.auth.getSession()`.
- The provider subscribes to `supabase.auth.onAuthStateChange`; when there is no next session, the handler sets profile to `null` and clears profile-loading state. This is around line 119.
- The shared logout function clears context state before awaiting auth sign-out, removes local-storage keys matching its prefixes, races the local-scope Supabase call against a 600 ms timer, and redirects to `/auth`.
- [App.jsx](./src/App.jsx#L66) redirects an unauthenticated user away from `/dashboard`; `/auth` renders the auth page when there is no session. The dashboard component is selected by `profile?.is_manager` when a session exists.

### Failure handling and caveats

- The cleanup code catches local-storage exceptions and rejected auth promises, logs warnings, and continues to redirect. There is no user-visible logout error or retry flow.
- The code races the Supabase operation against 600 ms and does not cancel the underlying request if the timer wins. It therefore does not necessarily wait for the auth request to finish before proceeding.
- The resolved value from `supabase.auth.signOut(...)` is not inspected by this code. In particular, the source contains no branch that displays or handles a returned error object.
- The client state and matching storage are cleared before the remote/local auth call finishes. The source does not establish what happens to other sessions on other devices; the explicit call uses `scope: 'local'`.
- Both roles go to `/auth`. The post-login route is role-aware, but the logout destination itself is not role-specific.
- The dashboard route is a **client-side route guard**. This audit does not establish server-side authorization or database policy behavior.

### Data that may survive

The shared cleanup removes matching auth and `cf_` keys, but it does not clear all storage. In particular, the language preference and other nonmatching keys remain. The student favorites key is removed despite being described as per-student persisted data. Manager page state is React component state; no manager-specific logout cleanup is present in the inspected page.

## 11. Accessibility Findings

**Positive findings:**

- Dashboard and onboarding logout controls use native `<button>` elements, and the inspected controls specify `type="button"`. They are keyboard-operable by default and do not submit a surrounding form.
- Most controls show a text label in addition to the icon.
- The manager’s compact header button has an explicit `aria-label` and `title`.
- [index.css](./src/index.css#L86) applies `min-h-[44px]` to buttons globally. This gives logout buttons a 44 px minimum height.

**Potential gaps supported by the markup:**

- The inactive-student header button hides its text below `sm` and has a `title` but no explicit `aria-label`. The title can provide a tooltip and may be used as an accessible-name fallback, but there is no explicit label on the button. The manager’s equivalent compact header button does provide one.
- None of the dashboard logout buttons defines a dedicated `focus-visible` style. Native button focus behavior may still be visible depending on browser and generated styles, but that was not verified at runtime.
- The global minimum is height-only; the compact icon-only header buttons do not set a minimum width. Their tap width needs browser/device verification.
- No logout button has disabled or loading semantics during sign-out. No confirmation step is present.
- The buttons with visible text have a meaningful label; the icon is accompanied by that text. No icon-only sidebar or Profile-card logout control was found.

The logout controls are not shown inside a dropdown or an active form-submit flow. Their `type="button"` semantics prevent accidental form submission. The manager’s `preventDefault`/`stopPropagation` wrapper is present, but no related dropdown interaction was found.

Color contrast was not measured with a browser or contrast tool. The buttons use rose utility colors; an exact accessibility contrast result is therefore **not verified**.

## 12. Student-versus-Manager Comparison

| Detail | Student Dashboard | Manager Dashboard |
|---|---|---|
| Logout component | No reusable logout component; page renders buttons | No reusable logout component; page renders buttons |
| Source file | [StudentDashboardPage.jsx](./src/pages/StudentDashboardPage.jsx) | [ManagerDashboardPage.jsx](./src/pages/ManagerDashboardPage.jsx) |
| Logout handler | Direct shared `signOut` callback | Page wrapper `handleSignOut`, then shared `signOut` |
| Authentication method | `supabase.auth.signOut({ scope: 'local' })` via context | Same shared method |
| Desktop placement | Fixed sidebar footer; extra Account Actions button when Profile tab is selected | Fixed sidebar footer |
| Mobile placement | Active dashboard: Profile content; inactive-subscription view: top header | Top header and content-end identity card |
| Always visible? | Desktop sidebar control stays visible; Profile control conditional on Profile tab. Inactive view has header control | Desktop sidebar control stays visible; both mobile controls render below `md` |
| Requires opening a menu? | No dropdown; active mobile requires selecting the Profile tab | No |
| Confirmation dialog | None | None |
| Loading feedback | No logout-specific feedback | No logout-specific feedback |
| Error handling | Shared handler logs caught errors; no visible feedback | Shared handler logs caught errors; wrapper also logs unexpected rejection |
| Redirect destination | `/auth` | `/auth`, via shared redirect and manager navigation |
| Protected route behavior | Client guard redirects when session is absent | Same client guard |
| Shared implementation? | Shared auth function; separate UI | Shared auth function; separate UI and extra wrapper |
| Main inconsistencies | Active mobile logout is within Profile content; compact inactive header hides text without explicit `aria-label`; favorites key is cleared by logout | Two simultaneous mobile logout controls; wrapper adds a second navigation |

## 13. Prioritized Issues and Improvement Opportunities

These are audit findings and opportunities, **not changes made**.

| Severity | Evidence | Why it matters | Possible improvement | Type |
|---|---|---|---|---|
| **Medium** | [AuthContext.jsx](./src/context/AuthContext.jsx#L243) races auth sign-out against 600 ms, ignores the resolved return value, and only logs caught rejections | A failed or delayed operation has no on-screen explanation; the UI proceeds without confirming the operation’s result | Decide the desired local sign-out and timeout contract; explicitly handle returned errors and provide appropriate user feedback | Functional / UX |
| **Medium** | Student favorites use `cf_favorites_...` in [StudentDashboardPage.jsx](./src/pages/StudentDashboardPage.jsx#L104) while [AuthContext.jsx](./src/context/AuthContext.jsx#L231) removes every `cf_` key | Logout removes the per-student favorites data that the page says is persisted | Decide whether favorites should persist across logout; if so, scope cleanup to auth/sensitive keys rather than all `cf_` keys | Functional / data lifecycle |
| **Low** | Manager mobile logout is in both header and content-end card in [ManagerDashboardPage.jsx](./src/pages/ManagerDashboardPage.jsx#L642) and [ManagerDashboardPage.jsx](./src/pages/ManagerDashboardPage.jsx#L1386) | Duplicate actions can add visual repetition and make the intended primary location less clear | Decide whether both access points serve distinct user needs; keep one or document the intentional redundancy | UX / architecture |
| **Low** | Manager wrapper navigates after shared sign-out, which itself calls `window.location.replace`, in [ManagerDashboardPage.jsx](./src/pages/ManagerDashboardPage.jsx#L68) and [AuthContext.jsx](./src/context/AuthContext.jsx#L256) | Two navigation mechanisms target the same route; their interaction is redundant and untested | Keep redirect ownership in one layer, after choosing the desired behavior | Functional / architecture |
| **Low** | Active student mobile logout is in Profile content at [StudentDashboardPage.jsx](./src/pages/StudentDashboardPage.jsx#L1761) | It is less immediate than a persistent control: users must enter Profile, and may need to scroll | Consider a consistent, easily discoverable mobile location that does not make logout compete with primary ordering actions | Mobile UX |
| **Low** | Inactive student header hides its text below `sm` and lacks an explicit `aria-label` at [StudentDashboardPage.jsx](./src/pages/StudentDashboardPage.jsx#L605) | The narrow layout depends on an icon and title rather than an explicit accessible name | Add an explicit accessible name if retaining the icon-only treatment; verify width and focus visibility | Accessibility |
| **Low / verify** | No dedicated focus styling or contrast validation was found for logout controls; related global button rule is in [index.css](./src/index.css#L86) | Keyboard focus and text contrast should be confirmed rather than assumed from hover classes | Verify in browser and with contrast testing; add explicit focus treatment if needed | Accessibility |

No evidence was found for a severe routing failure or missing client-side dashboard guard. The observed concerns are about error visibility, persistence semantics, duplicated placement, and accessibility verification.

## 14. Recommended Premium Redesign Direction

The source contains the requested brand colors in [campusfood.css](./src/campusfood.css#L1): primary green `#08795d`, warm accent `#d48431`, and cream `#f7f6ea`. The global font stack uses Outfit in [index.css](./src/index.css#L14), while the CampusFood-specific utility uses Poppins in [campusfood.css](./src/campusfood.css#L18). Existing UI uses rounded buttons and cards, which gives a reasonable foundation for a polished account-action treatment.

For a later phase, I would first choose a clear logout location per viewport rather than simply adding another control: retain a persistent desktop account/sidebar action if it fits the dashboard flow, then decide whether mobile should use a header shortcut, Profile/account area, or both for a specific reason. Keep the action visually distinct from ordinary navigation without making it compete with primary meal and operations actions. A consistent explicit accessible name, visible keyboard focus, appropriately sized mobile target, and clear in-progress/error feedback would address the most concrete gaps. A confirmation step is optional: it can reduce accidental sign-outs, but adds friction to a common action. The shared auth method already exists; a shared button component is only worth considering if it makes the different layouts and feedback genuinely more consistent.

## 15. Files That May Need Changes in a Future Phase

Depending on the chosen design and behavior, likely files are:

- [StudentDashboardPage.jsx](./src/pages/StudentDashboardPage.jsx) — student placements and markup.
- [ManagerDashboardPage.jsx](./src/pages/ManagerDashboardPage.jsx) — manager placements and wrapper/redirect behavior.
- [AuthContext.jsx](./src/context/AuthContext.jsx) — shared sign-out handling, error outcomes, and storage cleanup.
- [index.css](./src/index.css) or [campusfood.css](./src/campusfood.css) — only if the chosen work requires shared focus or button styles.
- [translations.js](./src/lib/translations.js) — if new or revised labels need English/Amharic translations.
- [OnboardingPage.jsx](./src/pages/OnboardingPage.jsx) — if the future phase intends to standardize logout outside dashboard pages too.

The routing file [App.jsx](./src/App.jsx) would only need consideration if redirect ownership or protected-route behavior changes. No new shared component is required for the existing shared auth logic.

## 16. Unverified Details Requiring Browser Testing

This was a static audit, so the following need runtime verification before a visual redesign is finalized:

- Actual control visibility and layout at narrow phone widths, at the `sm`/`md` breakpoints, and on desktop.
- Whether the compact icon-only buttons have comfortable tap widths and whether any header content crowds them.
- Whether the student Profile logout requires scrolling at realistic device heights and content states.
- Whether the manager’s two mobile controls feel redundant in the rendered experience.
- Actual keyboard focus appearance and assistive-technology announcement of the inactive-student icon-only button.
- Rendered color contrast for the actual text/background combinations.
- The runtime interaction between manager `navigate('/auth')` and the shared `window.location.replace('/auth')`.
- Network-failure behavior and whether Supabase sign-out returns an error result in the deployed SDK/runtime.
- Any state held outside the inspected React context, local storage, and source-visible page logic.

No browser actions or business operations were performed.

## 17. Final Confirmation That No Changes Were Made

**No application code, configuration, or authentication behavior was changed during this audit.** This requested report was saved as `lb.md`. No dependencies were installed, and no database or routing behavior was changed. The worktree inspection reported untracked `firebase.json`, `.firebaserc`, and `package-lock.json`; I did not touch them.
