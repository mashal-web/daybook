# Daybook Design System Specification

**Status:** Target specification only; no styles or pages changed in Phase 1.  
**Baseline:** `9aeb4d54c4e6f2727db6674f4060cfe62a270d0e`

## 1. Design direction

The current baseline already contains a monochrome dark/light token foundation in `design-system.css`, with dark graphite and light porcelain themes, spacing/type/radius tokens, responsive rules, safe-area support and reduced-motion overrides. The supplied dark-purple futuristic dashboard is the visual reference for the target direction; it is not evidence that the current code already implements that palette.

Target style: dark futuristic productivity dashboard, controlled deep-purple accents, layered graphite surfaces, precise typography, restrained glow, strong data hierarchy and minimal decorative effects. Purple is an accent, not a background wash. Keep a complete accessible light theme as a preference.

## 2. Tokens (proposed initial values; validate contrast before release)

### Colour
- `--color-bg: #0D0B14` — app canvas.
- `--color-surface-1: #151220` — primary cards.
- `--color-surface-2: #1C1829` — raised panels.
- `--color-surface-3: #252035` — controls/hover.
- `--color-border: #332D45` — dividers.
- `--color-text: #F5F2FA` — primary text.
- `--color-muted: #B7AFC7` — secondary text.
- `--color-subtle: #887F9B` — tertiary labels.
- `--color-accent: #9B7BFF` — primary action.
- `--color-accent-strong: #B69FFF` — focus/active emphasis.
- `--color-accent-soft: rgba(155,123,255,.14)`.
- Semantic success/warning/danger must use distinct hue and text/icon label; never rely on colour alone.

Light theme maps surfaces/text to high-contrast porcelain/ink and retains a darker purple accent.

## 3. Typography
Use system sans stack initially to avoid font downloads. Type scale: 11/12px metadata, 14px body, 16px emphasis, 20px section title, 26–32px page title. Use tabular numerals for time, dates, amounts and metrics. Limit weights to 400/500/600/700. Avoid all-caps for long content; reserve small uppercase labels for metadata.

## 4. Spacing, shape and elevation
4px base spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48. Radius: 8px controls, 12px compact cards, 16px primary panels, 22px large surfaces. Shadows should separate layers, not simulate heavy neumorphism; one subtle ambient shadow and one restrained purple edge/highlight at most. Avoid blur/backdrop-filter on large scrolling surfaces to protect low-end devices.

## 5. Layout and breakpoints
- Compact: <=600px; one column, bottom navigation, safe-area padding.
- Tablet: 601–900px; compact rail or bottom nav, two-column where useful.
- Desktop: 901–1200px; sidebar plus content.
- Wide: >1200px; content max width around 1440px.
Breakpoints are layout decisions, not device detection. Ensure no horizontal overflow at 320/360px and 200% text zoom.

## 6. Components
- AppShell: platform-aware navigation, header, main landmark.
- PrimaryNavigation / MoreSheet: same destination IDs across platforms.
- QuickActionButton / QuickActionSheet: central action launcher with accessible dialog semantics.
- PageHeader: title, date/context, actions.
- Card / MetricCard: consistent padding, border, semantic label.
- Timeline / TimelineItem: chronological items with time and status text.
- EventEditor / TaskEditor: validated forms and clear destructive actions.
- DateNavigator: day/week/month navigation with keyboard support.
- EmptyState / LoadingState / ErrorState: distinct semantics and recovery action.
- ProgressIndicator: visible label and accessible value.
- ChartFrame: chart plus equivalent table/data summary.
- Toast / Dialog / ConfirmDialog: announced messages, focus trap and restoration.
- FormField: label, hint, error association.
- PermissionStatus: explains browser/Android capability state.
- BackupPanel: preview, export and restore controls.

## 7. Icons and motion
Use one consistent outline icon set, same stroke and optical size. Every icon-only button needs accessible name. Motion is purposeful and short; no continuous decorative animation. Honour prefers-reduced-motion; avoid animating layout dimensions and large shadows.

## 8. Accessibility requirements
- WCAG 2.2 AA target for contrast and interaction.
- Semantic landmarks and heading order.
- Full keyboard operation and visible focus.
- Dialog focus trapping/restoration.
- Touch targets at least 44x44 CSS px where feasible.
- Inputs have persistent labels; errors linked with aria-describedby.
- Status is communicated with text/icon, not colour alone.
- Charts have text summaries/tables.
- Screen-reader announcements for save/error/timer completion without noisy repeated announcements.
- Reduced motion and system theme preference supported.
- Test 200% zoom, landscape, small viewport, TalkBack and keyboard-only desktop.

## 9. Design acceptance
All pages use shared tokens/components; dark and light themes pass contrast checks; no screen introduces one-off spacing/colour without token rationale; mobile layouts avoid clipped dialogs and navigation; motion is disabled or reduced when requested. This specification does not authorize a design implementation in Phase 1.
