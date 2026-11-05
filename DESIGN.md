# Rebound design

Describes how Rebound looks and why, for designers and design tools (Claude Design imports it from the repo). The values live in code and win any disagreement: tokens in `src/app/globals.css`, fonts in `src/app/layout.tsx`, shared pieces in `src/components/`.

## Principles

- **Used mid-workout, on a phone.** One hand, sweaty, glancing. Large tap targets, high contrast, little on screen at once.
- **Calm and focused, not loud.** Recovery and coming back stronger, not neon gym-bro. Warm neutrals and a deep green.
- **Say it in words, not just colour.** State is always icon plus text, never colour alone.
- **Tone:** plain, encouraging, short. Tagline: "Train around it. Come back stronger."

## Colour

Tokens follow the system light/dark setting. Use the token names (Tailwind classes such as `bg-primary`), not hex values, in code.

| Role | Light | Dark | Use |
|---|---|---|---|
| `background` | `#f5f3ee` | `#0f1513` | Page |
| `card` | `#ffffff` | `#18211e` | Cards, lists |
| `foreground` | `#16211d` | `#e8ede9` | Text |
| `muted-foreground` | `#566260` | `#9eaba5` | Secondary text |
| `primary` | `#1d6b56` | `#5ec4a4` | Main actions, brand |
| `secondary` | `#e3ebe6` | `#22302b` | Secondary buttons, number badges |
| `accent` | `#f8e4d3` | `#3a2a1f` | Selected row (desktop) |
| `border` | `#dcd8cf` | `#2c3934` | Dividers |
| `input` | `#848c88` | `#6b7a74` | Input and choice borders (higher contrast) |
| `destructive` | `#b3261e` | `#f2766b` | Delete, errors |
| `brand-apricot` | `#e8894f` | `#f09a62` | Logo ball only |

**Training state colours** carry meaning, each with a `-muted` background and `-foreground` text:

| State | Colour | Meaning |
|---|---|---|
| `rest` | rose | An injured muscle is being avoided |
| `rehab` | amber | An injured muscle is getting gentle work only |
| `ready` | blue | Muscle is rested and available |
| recovering | `secondary` (neutral) | Trained recently, still recovering |

Do not reuse these colours for anything else.

## Type

- **Headings:** Bricolage Grotesque (`font-heading`), bold, tight tracking. Large on the workout title.
- **Body:** Atkinson Hyperlegible Next (`font-sans`), chosen for legibility. Body text 16-18px.
- **Numbers:** tabular figures (`tabular-nums`) wherever numbers line up, such as sets, reps and weights. Geist Mono (`font-mono`) is available for numbers that need to look technical.

## Shape and spacing

- Base radius `0.75rem`. Cards and lists `rounded-2xl`; large panels `rounded-3xl`; chips fully round.
- Cards sit on the page with a 1px border ring and a faint shadow (no shadow in dark mode).
- Generous spacing: a 16px page gutter on phones, 24px between sections.
- Icons: Lucide, 20px in rows and chips.

## Layout

- **Phone (designed at 390px wide):** a single column, max width `md`. The primary action is a full-width bar fixed to the bottom, with safe-area padding. Detail views replace the list instead of stacking under it.
- **Desktop:** a three-column grid up to 1200px: session summary and primary action, the exercise list, then detail.
- Both must always work; design phone first.

## Components

- **Primary button:** tall (64px), full width, rounded `xl`, bold heading font. Secondary actions use the `secondary` variant at 56px.
- **List rows:** at least 72px tall, a numbered circle, bold name, muted detail line, chevron.
- **Status chip** (`StatusChip`): pill at least 40px tall with icon and words.
- **Inputs:** at least 48px tall, 16px text so iOS does not zoom.
- **Logo mark** (`LogoMark`): a dip-and-rise curve with a ball on the way back up, on a `primary` tile.

## Accessibility

- Tap targets at least 44px, preferably 48px or more.
- Text contrast meets WCAG AA in light and dark.
- Visible focus ring (`ring`) on every interactive element.
- Respect the safe areas on notched phones.
