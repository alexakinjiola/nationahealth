# Design system

**Intent:** a well-made printed record, not a software template. Warm paper canvas, forest-green brand, green-black ink and a single clay accent for things that need the patient's attention. Editorial serif headlines, hairline rules instead of boxes, small radii, almost no shadow, no gradients or glass. The landing page illustrates with real-looking clinical paper (a lab report, a consent slip, a verification stamp), drawn in code — never stock imagery.

## Typography

| Role | Face | Use |
|---|---|---|
| Display | Newsreader (variable serif) | Every page title, section headings, key numbers. Light weights and italics for emphasis. |
| UI | Schibsted Grotesk (variable) | Everything else. A newsroom grotesk with more character than a default system face, still very legible at small sizes. |
| Data | IBM Plex Mono | Health IDs, references (`REQ-…`, `PRM-…`), dates in lists, eyebrow labels |

All three are self-hosted through `@fontsource`, so the browser makes no third-party font requests. The scale runs 11 / 12 / 14 / 16 / 18 / 22 / 28 / 36 / 48 px (`--text-*` in `globals.css`); display headlines go larger on the landing page.

## Colour tokens and measured contrast (WCAG 2.2 AA)

| Pair | Ratio |
|---|---|
| ink `#16201C` on canvas `#F4F1EA` | 14.8:1 |
| ink-2 `#39443F` on surface `#FFFEFB` | 10.0:1 |
| ink-3 `#58625D` on canvas / surface | 5.6 / 6.3:1 |
| brand-600 `#0E6B52` on surface / canvas | 6.4 / 5.7:1 |
| white on brand-600 / on ink | 6.5 / 16.7:1 |
| clay-600 `#A8461F` on surface; clay-700 on clay-50 | 5.8 / 6.9:1 |
| navy-200 / navy-300 on navy-900 (provider/admin sidebar) | 11.7 / 6.8:1 |
| brand-200 on brand-800 (Health ID card) | 6.1:1 |

The `navy-*` tokens keep their names for compatibility but are now a deep green-black, so the professional workspaces share the patient app's palette. Axe runs on 39 screens in the e2e suite and fails the build on any contrast regression.

Status is never shown by colour alone. Every badge has text, and provenance badges also carry an icon.

## Provenance language

| Source | Badge | Rule colour |
|---|---|---|
| Verified institution | green, `verified` icon | teal |
| Approved integration | blue, `share` icon | blue |
| Uploaded by patient | sand, `upload_file` icon, *"not medically verified"* | sand |

## Components (`src/components`)

- `ui/`: Button (variants: primary, ink, secondary, ghost, danger, danger-outline, navy, link; with a loading state), Field/Input/Textarea/Select (label, hint and error wired automatically through context), Checkbox / CheckboxCard, RadioCards, Dialog, ConfirmDialog (reason and step-up built in), DropdownMenu, Badge, Callout, Card, Stat, Table, TabsNav (URL-driven), FilterBar (no-JS GET form), Pagination, EmptyState, Skeleton / PageSkeleton, Toaster (polite live region), PasswordInput, ActionButton, Icon.
- `shell/`: one `AppShell` with three moods (patient light, provider/admin navy), MobileDrawer, BottomNav (patient, mobile), UserMenu, NotificationBell, SkipLink, SyntheticBanner.
- `domain/`: RecordRow, ProvenanceBadge, CategoryIcon, HealthIdChip, ActivityItem, NotificationList, AccessGuard, FileDrop and upload with progress, StructuredData, Charts (with screen-reader figcaptions), SecuritySettings, IdentityForm.

## Icons

Google Material Symbols, Rounded, weight 400. `scripts/build-icons.mjs` extracts only the glyphs in use (outline and filled) into `icon-paths.ts`. Icons are decorative (`aria-hidden`) unless given a `label`.

## Accessibility practices

Skip link, a visible focus ring on everything, labelled controls with `aria-describedby` hints and errors, `aria-invalid`, `aria-current` in navigation, live regions for toasts, uploads and access expiry, reduced-motion support, 44px minimum targets on mobile, and a bottom navigation for thumb reach. Verified by `e2e/accessibility.spec.ts` (axe-core, WCAG 2.2 A/AA) on 32 screens. Manual screen-reader testing (TalkBack and VoiceOver) is still needed before the pilot.
