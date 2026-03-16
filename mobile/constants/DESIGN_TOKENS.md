# PadMagnet Design Token Reference

> **Last audited**: 2026-03-16
> **Rule**: ALL visual values (colors, fonts, spacing, radii) MUST come from constants files.
> Hardcoded values in component files are violations unless explicitly documented as intentional overrides below.

## Files

| File | Purpose |
|------|---------|
| `colors.js` | Every color in the app — hex, rgba, overlays, gradients |
| `fonts.js` | Font families (Outfit headings, DM Sans body) + size scale |
| `layout.js` | Spacing scale, border radius scale, component dimensions, chip styles |
| `screenStyles.js` | Shared screen containers, tab bar, menu items, sign-out button |
| `roles.js` | Role label mapping (tenant/owner display names) |
| `mls.js` | MLS/IDX compliance text and disclaimers |
| `service-areas.js` | 91 South Florida cities with coordinates for ZonePicker |

---

## Color Tokens (`colors.js`)

### Primary
| Token | Value | Use |
|-------|-------|-----|
| `navy` | `#0B1D3A` | Deepest background, logo |
| `accent` | `#3B82F6` | Primary action, links, active states |
| `white` | `#FFFFFF` | Text on dark, icon fills |
| `black` | `#000000` | Shadow colors |

### Supporting
| Token | Value | Use |
|-------|-------|-----|
| `slate` | `#64748B` | Muted text, placeholders |
| `light` | `#F1F5F9` | Light backgrounds (web) |
| `success` | `#22C55E` | Positive states, save actions, price drop badges |
| `successLight` | `#4ade80` | Lighter green for gradients |
| `warning` | `#F59E0B` | Caution states |
| `danger` | `#EF4444` | Errors, destructive actions, delete |

### Semantic (Screen Structure)
| Token | Value | Use |
|-------|-------|-----|
| `background` | `#1A3358` | Screen backgrounds |
| `surface` | `#234170` | Cards, modals, tab bar |
| `card` | `#2C5288` | Elevated cards |
| `text` | `#FFFFFF` | Primary text |
| `textSecondary` | `#B0BEC5` | Secondary/muted text |
| `border` | `#3464A0` | Card borders, dividers |

### Brand
| Token | Value | Use |
|-------|-------|-----|
| `brandOrange` | `#F59E0B` | UI elements: badges, labels, tooltips, owner highlights |
| `deepOrange` | `#F95E0C` | "Magnet" in wordmark ONLY |
| `gold` | `#FFD700` | Premium tier badge (freemium plan) |

### Overlays & Scrims
| Token | Value | Use |
|-------|-------|-----|
| `frostedGlass` | `rgba(255,255,255,0.12)` | Frost buttons, subtle glass effect |
| `scrimDark` | `rgba(0,0,0,0.6)` | Modal overlays, photo remove buttons |
| `scrimDarker` | `rgba(0,0,0,0.7)` | Map badge backgrounds |
| `scrimDarkest` | `rgba(0,0,0,0.8)` | Heavy overlays |
| `scrimLight` | `rgba(0,0,0,0.2)` | Subtle shadows |
| `overlayNavy` | `rgba(11,29,58,0.92)` | NearbyRentals gate overlay |
| `overlayWhiteLight` | `rgba(255,255,255,0.2)` | Progress bar tracks |
| `overlayWhiteStrong` | `rgba(255,255,255,0.85)` | Progress bar fills, bright text on dark |
| `successOverlay` | `rgba(34,197,94,0.25)` | Heart FAB background |

### Gradients
| Token | Value | Use |
|-------|-------|-----|
| `gradientDark1` | `#0f2d4a` | NoPhotoPlaceholder, PhotoGallery gradient top |
| `gradientDark2` | `#0a1e33` | NoPhotoPlaceholder, PhotoGallery gradient bottom |
| `successGradient1` | `#4ade80` | GlossyHeart SVG gradient |
| `successGradient2` | `#22c55e` | GlossyHeart SVG gradient |
| `successGradient3` | `#15803d` | GlossyHeart SVG gradient |

### Opacity Suffixes (used inline with existing tokens)
When you need a semi-transparent version of an existing color, append a hex opacity suffix:
- `COLORS.accent + '22'` → 13% opacity (chip backgrounds)
- `COLORS.accent + '55'` → 33% opacity (saved badge backgrounds)
- `COLORS.success + '22'` → 13% opacity (active chip backgrounds)
- `COLORS.success + '33'` → 20% opacity (swipe indicator backgrounds)
- `COLORS.danger + '33'` → 20% opacity (swipe indicator backgrounds)

---

## Font Tokens (`fonts.js`)

### Families
| Token | Value | Use |
|-------|-------|-----|
| `FONTS.heading.regular` | Outfit-Regular | Light headings |
| `FONTS.heading.medium` | Outfit-Medium | Tab labels |
| `FONTS.heading.semiBold` | Outfit-SemiBold | Section titles |
| `FONTS.heading.bold` | Outfit-Bold | Page titles, hero text |
| `FONTS.body.regular` | DMSans-Regular | Body text, descriptions |
| `FONTS.body.medium` | DMSans-Medium | Labels, menu items |
| `FONTS.body.semiBold` | DMSans-SemiBold | Emphasized body, buttons |
| `FONTS.body.bold` | DMSans-Bold | Strong emphasis |

### Size Scale
| Token | px | Use |
|-------|-----|-----|
| `FONT_SIZES.xxs` | 10 | Legal text, disclaimers, timestamps, map labels |
| `FONT_SIZES.xs` | 12 | Badges, captions, secondary labels |
| `FONT_SIZES.sm` | 14 | Body text, list items |
| `FONT_SIZES.md` | 16 | Primary body, inputs |
| `FONT_SIZES.lg` | 18 | Section headings |
| `FONT_SIZES.xl` | 22 | Page titles |
| `FONT_SIZES['2xl']` | 28 | Large headings |
| `FONT_SIZES['3xl']` | 34 | Hero headings |
| `FONT_SIZES['4xl']` | 38 | Welcome screen wordmark |
| `FONT_SIZES['5xl']` | 48 | Onboarding hero numbers |

---

## Layout Tokens (`layout.js`)

### Spacing Scale (`LAYOUT.padding.*`)
| Token | px | Use |
|-------|-----|-----|
| `xxs` | 2 | Micro gaps |
| `xs` | 4 | Icon gaps, tight spacing |
| `sm` | 8 | Chip padding, small gaps |
| `md` | 16 | Standard padding, card padding |
| `lg` | 24 | Section spacing, modal padding |
| `xl` | 32 | Large section gaps |
| `2xl` | 48 | Extra large spacing |

### Border Radius Scale (`LAYOUT.radius.*`)
| Token | px | Use |
|-------|-----|-----|
| `xs` | 4 | Progress bars, radio button inners |
| `sm` | 8 | Inputs, small cards, social buttons |
| `md` | 12 | Cards, modals, badges, photo remove buttons |
| `lg` | 16 | Large cards, bottom sheets, action buttons |
| `xl` | 24 | Rounded buttons, image containers |
| `2xl` | 28 | Pill buttons, FABs, circular action buttons |
| `full` | 9999 | Circles, chips, avatars |

### Component Dimensions
| Token | Value | Use |
|-------|-------|-----|
| `LAYOUT.avatar.sm` | 36 | Small avatar |
| `LAYOUT.avatar.md` | 52 | Conversation list avatar |
| `LAYOUT.avatar.lg` | 72 | Profile avatar |
| `LAYOUT.imageHeight.card` | 150 | Listing card image |
| `LAYOUT.imageHeight.map` | 90 | Map thumbnail |
| `LAYOUT.imageHeight.gallery` | 300 | Full gallery image |
| `LAYOUT.iconSize.xs` | 8 | Tiny indicators |
| `LAYOUT.iconSize.sm` | 12 | Small icons |
| `LAYOUT.iconSize.md` | 16 | Standard icons |
| `LAYOUT.iconSize.lg` | 24 | Large icons |
| `LAYOUT.iconSize.xl` | 36 | Hero icons |
| `LAYOUT.badgeOffset.sm` | 6 | Small badge positioning |
| `LAYOUT.badgeOffset.md` | 12 | Standard badge positioning |

---

## Shared Screen Styles (`screenStyles.js`)

| Export | Use |
|--------|-----|
| `TAB_SCREEN_OPTIONS` | Spread into every `<Tabs>` layout for consistent tab bar |
| `TAB_ICON_SIZE` | 26px — uniform tab icons |
| `SCREEN.container` | Full-screen with padding |
| `SCREEN.containerFlush` | Full-screen without padding (lists) |
| `SCREEN.centered` | Loading spinner container |
| `SCREEN.pageTitle` | Standard page title |
| `SCREEN.pageTitleFlush` | Page title with built-in padding |
| `MENU.item` | Settings/profile menu row |
| `MENU.text` | Menu item label |
| `MENU.hint` | Menu item description |
| `MENU.sectionLabel` | Uppercase section divider |
| `SIGN_OUT.button` | Sign out button container |
| `SIGN_OUT.text` | Sign out button text (danger red) |

---

## Intentional Overrides (Documented Exceptions)

These values are intentionally NOT tokenized because they serve a specific visual purpose unique to one component:

| File | Value | Reason |
|------|-------|--------|
| `ChatInput.js` | `borderRadius: 19` | Pill-shaped input, height-dependent (`height/2`) |
| `CardStack.js` | `translateX: -9, translateY: 15` | Animation offset, not a design token |
| `screenStyles.js` | `fontSize: 13` | Tab bar label, platform-specific |
| `AlertProvider.js` | `padding: 28` | Modal card padding, design-specific |

---

## Adding New Tokens

When you need a new value:

1. Check if an existing token works (within 2px tolerance for spacing/radius)
2. If not, add the token to the appropriate constants file
3. Update this document
4. Use the token everywhere, never hardcode

**Never**: Add a raw hex color, font family string, or rgba() value to a component file.
**Always**: Import from constants and reference the token.
