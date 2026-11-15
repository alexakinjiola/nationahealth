# Design system

**Intent:** bright, airy and human. Dark blue is the primary colour and dark green the secondary. Real photography of Nigerian and African clinicians, scientists and patients does the emotional work. The interface around it is calm: white cards with soft blue-tinted shadows on a faint blue canvas, generous rounded corners, pill-shaped buttons and tabs, and icons set in tinted circles. Headlines are bold sans-serif with one or two words in an italic serif accent (`.accent-word`).

## Typography

| Role | Face | Use |
|---|---|---|
| UI and headings | Plus Jakarta Sans (variable) | Everything, from 800-weight hero headlines to 13px captions. |
| Accent | Newsreader italic (variable serif) | One or two emphasised words in a headline, in dark green. Never body text. |
| Data | IBM Plex Mono | Health IDs, references (`REQ-…`, `PRM-…`), licence numbers |

All three are self-hosted through `@fontsource`, so the browser makes no third-party font requests.

## Colour tokens and measured contrast (WCAG 2.2 AA)

| Pair | Ratio |
|---|---|
| ink `#0E1B34` on canvas `#F5F8FD` | 16.1:1 |
| ink-3 `#5A6479` on canvas / white | 5.6 / 5.9:1 |
| brand-600 `#0B4CB4` (primary, dark blue) on white / brand-50 | 7.8 / 7.0:1 |
| accent-600 `#146F3B` (secondary, dark green) on white | 6.2:1 |
| accent-700 on accent-50 | 7.5:1 |
| success / warning / danger / info text on their tints | 5.6 / 5.9 / 6.5 / 6.8:1 |
| navy-200 / navy-300 on navy-900 (provider/admin sidebar, deep blue) | 11.1 / 7.7:1 |
| placeholder `#6A7388` on white | 4.75:1 |

Shape: radii are 6 / 10 / 12 / 18 / 24 / 32 px (`--radius-xs` to `--radius-2xl`). Buttons and tabs are fully rounded. Cards use `--shadow-card`. Axe runs on 39 screens in the e2e suite and fails the build on any contrast regression.

## Photography

Photos live in `public/images` as WebP and are served through `next/image` with blur placeholders. All are from Unsplash under the free Unsplash License; sources are listed in `public/images/CREDITS.md`. Rules: real people, never AI-generated; show Nigerian and African patients and clinicians; always a meaningful `alt` unless decorative; text placed on photos always sits on a dark gradient scrim.

Status is never shown by colour alone. Every badge has text, and provenance badges also carry an icon.

## Provenance language

| Source | Badge | Rule colour |
|---|---|---|
| Verified institution | green, `verified` icon | teal |
| Approved integration | blue, `share` icon | blue |
| Uploaded by patient | sand, `upload_file` icon, *"not medically verified"* | sand |

## Components (`src/components`)

- `ui/`: Button (variants: primary, ink, accent, secondary, ghost, danger, danger-outline, navy, link; with a loading state), Field/Input/Textarea/Select (label, hint and error wired automatically through context), Checkbox / CheckboxCard, RadioCards, Dialog, ConfirmDialog (reason and step-up built in), DropdownMenu, Badge, Callout, Card, Stat, Table, TabsNav (URL-driven), FilterBar (no-JS GET form), Pagination, EmptyState, Skeleton / PageSkeleton, Toaster (polite live region), PasswordInput, ActionButton, Icon.
- `shell/`: one `AppShell` with three moods (patient light, provider/admin navy), MobileDrawer, BottomNav (patient, mobile), UserMenu, NotificationBell, SkipLink, SyntheticBanner.
- `domain/`: RecordRow, ProvenanceBadge, CategoryIcon, HealthIdChip, ActivityItem, NotificationList, AccessGuard, FileDrop and upload with progress, StructuredData, Charts (with screen-reader figcaptions), SecuritySettings, IdentityForm.

## Icons

Google Material Symbols, Rounded, weight 400. `scripts/build-icons.mjs` extracts only the glyphs in use (outline and filled) into `icon-paths.ts`. Icons are decorative (`aria-hidden`) unless given a `label`.

## Accessibility practices

Skip link, a visible focus ring on everything, labelled controls with `aria-describedby` hints and errors, `aria-invalid`, `aria-current` in navigation, live regions for toasts, uploads and access expiry, reduced-motion support, 44px minimum targets on mobile, and a bottom navigation for thumb reach. Verified by `e2e/accessibility.spec.ts` (axe-core, WCAG 2.2 A/AA) on 32 screens. Manual screen-reader testing (TalkBack and VoiceOver) is still needed before the pilot.
