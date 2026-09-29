---
name: Terminal POS Dark
colors:
  surface: '#131316'
  surface-dim: '#131316'
  surface-bright: '#39393c'
  surface-container-lowest: '#0e0e11'
  surface-container-low: '#1b1b1e'
  surface-container: '#1f1f22'
  surface-container-high: '#2a2a2d'
  surface-container-highest: '#353438'
  on-surface: '#e4e1e6'
  on-surface-variant: '#e0c0b1'
  inverse-surface: '#e4e1e6'
  inverse-on-surface: '#303033'
  outline: '#a78b7d'
  outline-variant: '#584237'
  surface-tint: '#ffb690'
  primary: '#ffb690'
  on-primary: '#552100'
  primary-container: '#f97316'
  on-primary-container: '#582200'
  inverse-primary: '#9d4300'
  secondary: '#7bd0ff'
  on-secondary: '#00354a'
  secondary-container: '#00a6e0'
  on-secondary-container: '#00374d'
  tertiary: '#a3caf9'
  on-tertiary: '#003258'
  tertiary-container: '#779dcb'
  on-tertiary-container: '#00345b'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdbca'
  primary-fixed-dim: '#ffb690'
  on-primary-fixed: '#341100'
  on-primary-fixed-variant: '#783200'
  secondary-fixed: '#c4e7ff'
  secondary-fixed-dim: '#7bd0ff'
  on-secondary-fixed: '#001e2c'
  on-secondary-fixed-variant: '#004c69'
  tertiary-fixed: '#d1e4ff'
  tertiary-fixed-dim: '#a3caf9'
  on-tertiary-fixed: '#001d36'
  on-tertiary-fixed-variant: '#1f4972'
  background: '#131316'
  on-background: '#e4e1e6'
  surface-variant: '#353438'
  surface-base: '#18181b'
  surface-primary: '#1e1e1e'
  surface-secondary: '#111111'
  surface-tertiary: '#0a0a0a'
  surface-border: '#27272a'
  surface-border-subtle: '#1f1f23'
  text-high-contrast: '#ffffff'
  text-main: '#d4d4d4'
  text-muted: '#a1a1aa'
  accent-cyan: '#4fc1ff'
  accent-blue: '#569cd6'
  accent-blue-soft: '#60a5fa'
  selection-blue: '#264f78'
  selection-blue-alpha: '#075985b3'
  selection-blue-tint: '#1e3a8acc'
  cta-primary: '#f97316'
  cta-hover: '#ea580c'
  status-success: '#22c55e'
  status-error: '#ef4444'
  status-warning: '#f59e0b'
  status-info: '#38bdf8'
typography:
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 3rem
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 2rem
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: '1.25'
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: '1.3'
  display-currency:
    fontFamily: JetBrains Mono
    fontSize: 2.75rem
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  display-plate:
    fontFamily: JetBrains Mono
    fontSize: 2rem
    fontWeight: '700'
    lineHeight: '1.15'
    letterSpacing: 0.08em
  body-lg:
    fontFamily: Geist
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: '1.5'
  body-md:
    fontFamily: Geist
    fontSize: 0.9375rem
    fontWeight: '400'
    lineHeight: '1.45'
  body-sm:
    fontFamily: Geist
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: '1.4'
  label-lg:
    fontFamily: JetBrains Mono
    fontSize: 0.875rem
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.02em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.04em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 0.6875rem
    fontWeight: '500'
    lineHeight: '1.1'
    letterSpacing: 0.06em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system is tailored for an industrial, high-throughput desktop Electron POS terminal operating in parking exit booths and driver-facing manless kiosks. The brand personality is utilitarian, mission-critical, high-contrast, and technical. The UI provides operators and drivers with instantaneous clarity, zero latency perception, and robust visual verification under harsh booth lighting conditions.

The visual style combines modern developer-console dark aesthetics with industrial hardware control interfaces:
- **High-Density Utility:** Maximizes screen estate on fixed-resolution displays (1080p POS touchscreens and dual-screen customer units).
- **Industrial Hierarchy:** Heavy usage of tabular numerical readouts, fixed-width monospaced metrics, clear categorical color-coded badges, and unmistakable transactional CTA buttons.
- **Fail-Safe Affordances:** Immediate, unambiguous color shifts for critical parking workflows (unpaid, waiting for payment, paid, barrier open, system offline).

## Colors

The palette employs a strict, industrial dark scheme built to reduce operator eye fatigue and maximize high-speed contrast on low-grade outdoor/booth monitors:
- **Surfaces:** `#18181b` as the canvas ground, `#1e1e1e` for central working panels and data grids, and `#111111` / `#0a0a0a` for navigation rails, telemetry bars, and physical hardware status strips.
- **Brand & Action (CTA):** `#f97316` serves as the primary actionable anchor (`Terima Cash`, `Tampilkan QR`, `Buka Palang`), shifting to `#ea580c` on hover/active press.
- **Accents & Information:** `#38bdf8` and `#569cd6` anchor vehicle telemetry, active ticket lookups, and secondary operations (`Cetak Ulang`, `Kamera Masuk`).
- **Status Semantics:**
  - `PAID` / `Gate Authorized`: `#22c55e` (Emerald Green)
  - `FAILED` / `CANCELLED` / `Barrier Locked`: `#ef4444` (Crimson Red)
  - `PENDING_QR` / `PENDING_EMONEY` / `Manual Override`: `#f59e0b` (Industrial Amber)
  - `UNPAID` / `Processing`: `#38bdf8` (Cyan Blue)

## Typography

The typographic hierarchy prioritizes instantaneous readability at distances up to 2 meters for drivers and quick peripheral checks by cashiers:
- **Headlines (`Space Grotesk`):** Modern geometric sans-serif delivering clear terminal headers, dialog titles, and barrier clearance instructions.
- **Body (`Geist`):** Engineered for ultra-clean UI rendering inside desktop Electron apps, ensuring high clarity for operational metadata and configuration panels.
- **Labels & Numbers (`JetBrains Mono`):** Fixed-width monospaced metrics applied to currency values (`display-currency`), vehicle license plate recognition strings (`display-plate`), barcode payloads, ticket identifiers, and time duration readouts.
- **Manual Overrides:** Any vehicle plate number edited manually by an operator must feature `JetBrains Mono` oblique styling with amber border outlines to distinguish it from optical character recognition (OCR) readings.

## Layout & Spacing

The terminal uses a fixed-density desktop workspace optimized for touch and keyboard shortcuts:
- **Layout Rhythm:** Built on an 8px base grid using an assertive compact scale. Dense layouts eliminate unnecessary vertical scrolling during time-sensitive transactions.
- **Operator Dashboard (3-Column Layout):**
  - **Left Rail (260px):** Hardware status indicators (Printer, Gate, Scanner, Backend Ping), operator details, and active lane selector.
  - **Center Panel (Flexible 1fr):** Transactional data, vehicle camera feed snapshot, ticket OCR/scan details, and duration calculus.
  - **Right Rail (380px):** Billing calculator, currency tally, payment method switcher (`Cash`, `QRIS`, `E-Money`), and barrier clearance trigger.
- **Customer / Manless Display (Single Focus Layout):**
  - Clean full-screen step-by-step layout centering the invoice amount, QR code presentation box (280x280px minimum), and dynamic countdown indicator.

## Elevation & Depth

This design system avoids soft organic drop shadows and blurred glassmorphism, favoring a razor-sharp, industrial flat-layered architecture:
- **Base Surfaces (`#18181b`):** The viewport foundation.
- **Card and Panel Surfaces (`#1e1e1e`):** Elevated purely via crisp 1px borders (`#27272a`) and structural background separation.
- **Active / Focused Selections:** Represented using high-saturation background highlights (`#264f78` or `#075985b3`) paired with a 1px border (`#38bdf8`).
- **Modal & Critical Interventions (Inactivity Lockout / Shift Settlement):** Solid `#0a0a0a` backdrop overlay with 85% opacity, framing a central card with a 2px high-visibility `#f97316` or `#ef4444` border.

## Shapes

The design system implements a compact, disciplined corner radius (`0.25rem` / 4px) to preserve screen real estate, reflect industrial equipment rigor, and avoid a consumer-app aesthetic:
- **Buttons, Inputs & Badges:** `rounded` (4px).
- **Containers, Camera Panels & Modals:** `rounded-lg` (8px).
- **Pills and Indicators:** Hardware status lights (LED style) use complete circular radii (50%).

## Components

### Buttons & Action Triggers
- **Primary CTA (`#f97316`):** Dedicated to the primary progressive step (`Terima Cash`, `Tampilkan QR`, `Buka Palang`). High-contrast white text, uppercase `JetBrains Mono` label, 48px minimum touch height.
- **Hover & Active States:** Darkens to `#ea580c`. Press state features a 1px inner inset glow.
- **Secondary Actions:** Dark surface (`#1e1e1e`) with 1px border (`#27272a`), `#d4d4d4` text, shifting to `#264f78` background on hover.
- **Disabled State:** Surface `#18181b`, text `#52525b`, border `#27272a`, pointer-events none. Crucial for disabling `Buka Palang` until backend confirmation.

### Badges & Transaction Status Chips
- Rendered in uppercase `label-md` with 2px horizontal padding and 1px borders:
  - `PAID`: Background `#14532d80`, Border `#22c55e`, Text `#86efac`.
  - `FAILED` / `EXPIRED`: Background `#7f1d1d80`, Border `#ef4444`, Text `#fca5a5`.
  - `PENDING_QR`: Background `#78350f80`, Border `#f59e0b`, Text `#fde68a`.
  - `UNPAID`: Background `#0c4a6e80`, Border `#38bdf8`, Text `#bae6fd`.

### Form Fields & Scanner Inputs
- Background `#111111`, border 1px solid `#27272a`, text `#ffffff`.
- Active focus state: border 1px solid `#38bdf8`, box-shadow 0 0 0 1px `#38bdf8`.
- Ticket scanner input: always autofocuses when no other field is active; includes an animated visual barcode pulse icon.
- Manual plate override: includes an amber warning tag `[MANUAL]` next to the field value.

### Data Tables & Ticket Lookup
- Row height: 38px for ultra-dense scannability.
- Selected row background: `#264f78` with text `#ffffff`.
- Alternating rows: `#18181b` and `#1e1e1e`.
- Numerical columns right-aligned in `JetBrains Mono`.

### Hardware Telemetry Strip
- A persistent 32px footer bar showing physical connectivity:
  - Dot indicators: Green (`#22c55e`) for Connected, Flashing Red (`#ef4444`) for Error/Disconnected.
  - Monitors: Barrier Gate COM, Thermal Printer, Barcode Scanner, Network Link to Central Cloud.