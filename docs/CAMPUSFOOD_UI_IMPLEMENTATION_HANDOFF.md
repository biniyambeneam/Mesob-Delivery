# CampusFood UI Implementation Handoff

Reproduce the approved CampusFood appearance from `CAMPUSFOOD_DESIGN_SYSTEM.md`, but adapt it to the target application's architecture.

## Required approach

1. Inspect the main application's current routes, design system, component library, backend calls, auth/session model, validation, and test suite before changing code.
2. Map the documented CampusFood colors, spacing, typography, shapes, and responsive rules to the main app's existing tokens. Do not introduce broad global CSS that conflicts with the app.
3. Recreate the three onboarding visual states with the same shell, disk/card/tile composition, copy, green/cream treatment, and bottom actions. Use the main app's routing/navigation implementation rather than the prototype's local `useState` switch.
4. Recreate the login presentation (wordmark, gradient, field geometry, focus/disabled styles, and typography) while binding fields to the main app's real login form, validation, error handling, session flow, and API call.
5. Keep the main app's existing signup route/flow. The prototype does **not** have a signup page or backend; its `Sign up here` anchor is intentionally inert and must not replace the main app's working signup behavior.
6. Use Lucide icons only if compatible with the main app; otherwise map to its existing icon system at equivalent sizes/colors. The prototype's food illustrations are CSS/DOM compositions, not transferable image files.
7. Preserve all existing accessibility behavior, focus management, backend integrations, API calls, authentication, account creation, password policies, session handling, routing, order processing, data models, and application state.
8. Validate at the prototype breakpoints: mobile default from 320px, wide shell treatment at 577px+, and short viewport behavior at 720px height or below. Capture screenshots and compare with the approved prototype when tools are available.
9. Run the target application's existing tests and production build. Report any unavoidable differences.

## Strict business-logic warning

**Do not copy the prototype's mock/local UI behavior into the main app as a replacement for working business logic.** In particular, do not replace real login/signup API calls, route navigation, validation, account creation, sessions, ordering, or pickup logic with prototype-only state, `alert()` feedback, or mock data. Only replace or add visual presentation components necessary to achieve the approved CampusFood appearance.

## Prototype-specific limitations to account for

- No router is used; prototype screen navigation is local state only.
- No signup implementation exists in the prototype.
- No login API/backend exists; Login only enables by local phone/password checks and shows an alert.
- No image assets are used for food scenes; all scenes are CSS plus Lucide icons.
- Tailwind v4 is installed but active UI styling is custom CSS, so port visual rules rather than blindly copying package configuration.
