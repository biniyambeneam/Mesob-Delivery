# CampusFood UI Design System

## Scope and source of truth

This document describes the rendered CampusFood prototype as implemented in `src/App.jsx`, `src/App.css`, `src/campus.css`, and `src/index.css`. Values below are extracted from source, not estimated from screenshots. The app has no separate component files, routing library, API client, signup screen, animation library, image-generation asset, or formal token file in source.

`src/App.css` is the base visual stylesheet. `src/campus.css` is imported after it and overrides base values for CampusFood. Some legacy base CSS selectors (for example `.parcel-box`, `.scooter`, `.truck`) are not referenced by current JSX and are therefore inactive.

## A. Brand identity

**Application name / wordmark:** `CampusFood`; rendered as text in `.logo`, with `Campus` green and `Food` warm orange. No reusable logo image exists.

| Role | Actual value | Source/use |
|---|---|---|
| Primary brand | `#08795d` | slide accent, primary button, active dot, logo, focus, icons; `src/App.jsx`, `src/campus.css` |
| Primary dark text | `#101426` | `.phone-shell`, `src/campus.css` |
| Global base text | `#171719` | `:root`, `src/index.css` |
| Wordmark food accent | `#d48431` | `.logo span` |
| Warm cream | `#f7f6ea` | slide pale background and login gradient start |
| Pickup pale green | `#edf6ee` | slide 2 illustration backdrop |
| White surface | `#fff` | app surface, cards, tiles, inputs/menus |
| Secondary text | `#777`, `#596571` | copy / signup prompt |
| Soft border | `#dce3e8` | language selector override |
| Default input border | `#d3d3d6` | phone/password fields |
| Input surface | `#f5f5f7` | phone/password field fill |
| Success | `#35b96a` | schedule confirmation tile |
| Disabled | `opacity: .44` | disabled primary button |
| Focus outline | `2px solid #08795d55` | phone/password focus-within |

**Login background:** `linear-gradient(180deg,#f7f6ea 0,#fff 31%)`.

Illustration colors are intentionally local rather than global tokens: food browns/oranges (`#e59332`, `#915b36`, `#f4bd6a`, `#f5b33f`, `#df5c3f`), takeaway package gradients (`linear-gradient(145deg,#f7b85d,#da753b)` and scheduled `linear-gradient(145deg,#f09b52,#d86e43)`), and map/confirmation colors. Values are source-defined; no image-derived values are used.

## B. Typography

Google Fonts loads Poppins weights `400,500,600,700,800` through `@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap')`. Global stack is `Poppins, system-ui, sans-serif`; no local font files are used.

| Token / component | Actual definition | Notes |
|---|---|---|
| Onboarding h1 | `clamp(27px,7vw,36px)`, `700`, `line-height:1.24`, `letter-spacing:-1.2px` | `.copy h1` |
| Login h1 | `35px`, inherited weight (browser bold for `h1`), `line-height:1.2`, `letter-spacing:-1.5px` | `.welcome-content h1` |
| Body copy | `clamp(14px,3.7vw,18px)`, `line-height:1.55` | onboarding `.copy p` |
| Login subtitle | `17px` | `.welcome-content > p` |
| Primary button | `17px`, `600` | `.primary-btn` |
| Secondary button | `16px` | `.secondary-btn` |
| Form label | `13px`, `600` | `.input-label` |
| Input | phone `17px` (letter-spacing `1.8px`); password `16px` | phone base styling / password override |
| Feature title | `11px`, `700` | `.feature strong` |
| Feature caption | `8px`, `line-height:1.35` | `.feature small` CampusFood override |
| Signup prompt | `13px` | `.signup-prompt` |
| Wordmark | `40px`, `800`, `letter-spacing:-2.5px` | `.logo` CampusFood override |

No uppercase transformation is implemented. The only responsive type override is inside `@media (max-height:720px)`, where onboarding `h1` becomes `27px`.

## C. Spacing and layout

- Root shell: `width:min(100%,576px)`, `min-height:100dvh`, flex column, `overflow:hidden`, centered with `margin:auto`.
- Onboarding content: flexible (`flex:1`), `padding:clamp(24px,5vh,56px) 24px 0`.
- Onboarding illustration: `height:min(46vh,520px)`, `min-height:310px`, relative grid-centered.
- Primary circular illustration: `width:min(62vw,350px)`, `aspect-ratio:1`; at desktop media query width is fixed to `350px`.
- Footer: `padding:24px 24px max(21px,env(safe-area-inset-bottom))`; login footer uses `margin-top:auto` and `padding-bottom:max(38px,env(safe-area-inset-bottom))`.
- Login header: `height:31vh`, `min-height:230px`; login content `padding:0 24px`.
- Feature card: `min-width:145px`, CampusFood `max-width:178px`, `padding:10px 13px 10px 9px`, internal `gap:8px`.
- Feature locations: top card `top:7%; right:0`; bottom card `bottom:8%; left:0`.
- Tile: `62px` square. Feature icon: `32px` square.
- Button: full width, `height:58px`; secondary action top margin `17px`.
- Inputs: `height:64px`; password input padding `0 16px`, icon gap `11px`; labels are separated by `18px`; label to field gap `7px`.

The shell is the page surface. Onboarding uses a flexible top content region with the footer naturally at the bottom; login similarly uses a flexible footer spacer. Illustration/card elements are absolutely positioned only within the relative illustration container. Feature cards use `z-index:5`; tiles use `z-index:4`; central artwork uses `z-index:3`; mini map uses `z-index:2`.

## D. Shapes and surfaces

| Surface | Actual definition |
|---|---|
| Main button | `border:0`, `height:58px`, `border-radius:17px`, green, `box-shadow:0 8px 18px #08795d2b` |
| Card | white, `border-radius:15px`, `box-shadow:0 8px 25px #2a273015` |
| Tile | white, `border-radius:17px`, `box-shadow:0 10px 24px #38292f17` |
| Phone input | `1px solid #d3d3d6`, `border-radius:13px`, overflow hidden |
| Password input | same `1px solid #d3d3d6`, `border-radius:13px`, `#f5f5f7` fill |
| Language selector | `1px solid #dce3e8`, `border-radius:9px` |
| Logo flag | `border-radius:5px`, `padding:3px 4px` |
| Illustration disk | `border-radius:50%`, background variable `--pale` |
| Accent disk | 64% of parent in both dimensions, fully circular; inset `-13px -16px 25px #00000016`, outer `0 12px 25px #00000012` |
| Active pagination | `26px × 8px`, `border-radius:12px`, green |
| Inactive pagination | `8px × 8px`, `border-radius:12px`, `#d8d8da` |

Button hover is `transform:translateY(-1px)`. Disabled buttons use opacity `.44`, no shadow, and `cursor:not-allowed`. Inputs use focus-within outline above. No pressed style is defined.

## E. Responsive behavior

- **Mobile default:** works from `body min-width:320px`; shell fills viewport width up to 576px.
- **Wide screens (`min-width:577px`):** page background `#f2f2f4`; shell gets `box-shadow:0 0 0 1px #e7e7e9,0 18px 60px #16111b18`; onboarding top padding `42px`; illustration height `490px`; illustration disk `350px`; copy horizontal padding `8px`; footer bottom padding `29px`.
- **Short screens (`max-height:720px`):** illustration fixed at `310px`; onboarding top padding `15px`; feature cards `transform:scale(.84)`; onboarding heading `27px`; dots bottom margin `18px`; footer top padding `14px`; login header `height:28vh`, `min-height:190px`.
- **Reduced motion:** `@media (prefers-reduced-motion:reduce){*{transition:none!important}}`.

There are no Tailwind breakpoint classes or Tailwind theme extensions. The only safe-area behavior is the footer padding described above. The shell hides overflow; this is a material constraint when reproducing the design.

## F. Animations and interactions

- Button and dot transitions: `.primary-btn` has `transition:transform .2s,opacity .2s`; dots have `transition:.25s` (default timing function).
- No CSS keyframes, swipe gestures, page/slide animation, loading animation, or illustration animation is implemented.
- Onboarding changes immediately with React state; visual pagination change is the dot transition only.
- Language selector toggles a static `English` popover; no translation changes.
- Login enablement is business-state driven: phone digits (non-digits stripped for validation only) must number at least 9 and password must be non-empty.

## G. Component inventory

All components are local functions in [src/App.jsx](../src/App.jsx); none are exported individually.

| Component | Purpose / props | Dependencies / visual classes |
|---|---|---|
| `App` | switches `onboarding` / `login` local state | `Onboarding`, `Login`; no router/persistence |
| `Onboarding` | maintains `current` slide; Next, Back, Skip, Get Started | `Illustration`, `Dots`, `Button`, `.phone-shell`, `.onboard-*`, `.copy` |
| `Illustration` | selects one of three CSS/Lucide illustration functions from `slide.kind` | CSS custom props `--accent`, `--pale`; `FeatureCard` |
| `FoodArt`, `PickupArt`, `ScheduleArt` | CSS-drawn central and floating scene compositions | `lucide-react` food, bag, pin, clock, bell, check icons |
| `FeatureCard` | top/bottom white information card; props `type`, `data`, `kind` | Lucide `Utensils`, `MapPin`, `Clock3`, `PackageCheck`; `.feature` |
| `Dots` | three indicators; prop `active` | `.dots` |
| `Button` | primary full-width action; props `children`, `onClick`, `disabled` | `ArrowRight`; `.primary-btn` |
| `Login` | phone/password fields, language menu, signup link, Login control | `.welcome`, `.phone-input`, `.password-input`, `.signup-prompt` |

There is no standalone application layout component, routing component, phone-input component, password-input component, signup component/page, or shared form-control component. Those structures exist as JSX inside `Login`.

## H. Screen specifications

### Onboarding: Favorite meals (slide index 0)

- **Renderer:** `Onboarding`, first `slides` object; active dot 1.
- **Layout:** shared onboarding shell; cream disk `#f7f6ea`; green central disk and CSS hamburger; tiles for utensils, coffee, pizza slice, and food dot.
- **Copy:** “Your Favorite Meals, Just a Tap Away”; “Tap Away” green. Body: “Discover delicious meals from nearby restaurants and order your food without leaving campus.”
- **Cards:** “Fresh & Hot / Meals prepared daily by nearby restaurants.” and “Easy Ordering / Choose your favorite meals in just a few taps.”
- **Actions:** Next and Skip. Skip calls `onFinish` to show Login.

### Onboarding: Campus pickup (slide index 1)

- **Renderer:** `Onboarding`, second `slides` object; active dot 2.
- **Visuals:** pale green disk `#edf6ee`; CSS takeaway bag, Lucide bag/pin/utensils tiles, and `T22` sign. No external illustration asset.
- **Copy:** “Order Today. Pick Up on Campus.” with “Campus.” green. Body: “Collect your food at designated campus pickup points at T22 or T34 without unnecessary waiting.”
- **Cards:** “Campus Pickup / Collect your order at T22 or T34.” and “Less Waiting / Order ahead and spend less time in queues.”
- **Actions:** Next / Back.

### Onboarding: Scheduled order (slide index 2)

- **Renderer:** `Onboarding`, third object; active dot 3.
- **Visuals:** cream disk; scheduled orange takeaway bag, clock, bell, check tile, CSS mini-map.
- **Copy:** “Your Food, Ready When You Need It”, with “Need It” green. Body: “Order during the available meal window and collect your food at the right time.”
- **Cards:** “Scheduled Ordering / Place your order during the active meal window.” and “Easy Collection / Know where and when to pick up your meal.”
- **Actions:** Get Started / Back. Get Started calls `onFinish` to show Login.

### Login

- **Renderer:** `Login`; no URL route.
- **Layout:** cream-to-white 180° gradient, brand header 31vh/230px minimum, content padding 24px, flex spacer before bottom action.
- **Wordmark:** text `CampusFood`; Campus is green and Food orange.
- **Copy:** “Welcome back”; “Login with the same phone number and password you used at signup.”
- **Fields:** phone label, green `ET` pill + `+251`, `09-12-xx-xx-xx` placeholder; password label, KeyRound icon, `Enter your password` placeholder.
- **CTA:** green Login button at footer; disabled until 9+ digits and non-empty password.
- **Signup:** visible text “New to CampusFood? Sign up here”. Anchor has `href="#signup"` and prevents its default action; it does not navigate because the prototype has no signup implementation.

## I. Asset inventory

| Path | Type / dimensions | Referenced by active UI | Purpose |
|---|---|---|---|
| `public/favicon.svg` | SVG; dimensions not determined from source inspection | Yes, `index.html` | browser favicon only |
| `public/icons.svg` | SVG | No | inherited, unused |
| `src/assets/hero.png` | PNG, `343×361` | No | inherited, unused |
| `src/assets/react.svg` | SVG | No | inherited, unused |
| `src/assets/vite.svg` | SVG | No | inherited, unused |

The active illustrations are DOM/CSS constructions and Lucide React SVG output; no standalone 3D food asset can be reused as a file. Lucide icons used: `ArrowRight`, `Bell`, `Check`, `ChevronDown`, `Clock3`, `Coffee`, `MapPin`, `PackageCheck`, `ShoppingBag`, `Utensils`, and `KeyRound`.

## J. Tailwind CSS and dependencies

- Tailwind CSS: `^4.3.3`, loaded in `src/index.css` by `@import "tailwindcss"`.
- Integration: `@tailwindcss/vite` `^4.3.3` in `vite.config.js` alongside React plugin.
- No `tailwind.config.*`, theme extension, custom utility, or Tailwind class usage is present in active JSX. Styling is custom CSS.
- React `^19.3.1`, React DOM `^19.3.1`, Vite `^8.3.4`, Lucide React `^1.61.0`.
- Poppins is external Google Font CSS, not an npm dependency.

When porting, install or retain Lucide and Poppins, load styles in source order (`App.css` before `campus.css`), and map existing app tokens rather than necessarily retaining Tailwind if the main app already has an equivalent system.

## K. Consolidated token reference

These are repeated/hardcoded values, not formal JS/CSS variables unless noted.

| Group | Token name | Value | Source / use |
|---|---|---|---|
| Color | `brand.primary` | `#08795d` | `App.jsx`, `campus.css` |
| Color | `brand.foodAccent` | `#d48431` | `campus.css` |
| Color | `surface.cream` | `#f7f6ea` | `App.jsx`, `campus.css` |
| Color | `surface.input` | `#f5f5f7` | `App.css` |
| Color | `border.input` | `#d3d3d6` | `App.css` |
| Spacing | `page.x` | `24px` | onboarding/footer/login content |
| Sizing | `shell.maxWidth` | `576px` | `.phone-shell` |
| Sizing | `button.height` | `58px` | `.primary-btn` |
| Sizing | `input.height` | `64px` | phone/password controls |
| Radius | `button` | `17px` | `.primary-btn` |
| Radius | `input` | `13px` | input controls |
| Radius | `card` | `15px` | `.feature` |
| Shadow | `button` | `0 8px 18px #08795d2b` | `campus.css` |
| Shadow | `card` | `0 8px 25px #2a273015` | `App.css` |
| Animation | `button` | `transform .2s,opacity .2s` | `.primary-btn` |
| Animation | `dot` | `.25s` | `.dots i` |
| Breakpoint | `wide` | `min-width:577px` | `App.css` |
| Breakpoint | `short` | `max-height:720px` | `App.css` |
| Layer | `feature` | `z-index:5` | `.feature` |
| Layer | `tile` | `z-index:4` | `.tile` |
| Layer | `central art` | `z-index:3` | scene elements |

The only active CSS custom properties are inline `--accent` and `--pale` on `.illustration`, populated by each slide object. `--accent` ends up `#08795d` for all current slides; `--pale` is cream or pickup pale green.
