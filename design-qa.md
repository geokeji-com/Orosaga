# Orosaga 账户入口 Design QA

## Comparison Target

- Source visual truth: commit `c6052bb`, `tests/e2e/visual.spec.ts-snapshots/home-desktop-1440-chromium-darwin.png` and `home-mobile-320-chromium-darwin.png`.
- Implementation: the same tracked screenshot paths in the current branch, plus `tests/e2e/account-menu.visual.spec.ts-snapshots/*-chromium-{darwin,linux}.png`.
- Viewports: desktop `1440×1000`, tablet `1024×900` and `768×900`, mobile `390×844` and `320×700`.
- Pixels and density: source and implementation use identical CSS viewport size and `deviceScaleFactor=1`; full-page desktop captures are `1440×3870`, mobile captures are `320×5282`.
- State: authenticated portal and admin, account control closed and open.

## Evidence

- Full-view comparison: `/tmp/orosaga-account-qa/desktop-full-comparison.png`.
- Focused desktop header comparison: `/tmp/orosaga-account-qa/desktop-topbar-comparison.png`.
- Focused mobile header comparison: `/tmp/orosaga-account-qa/mobile-topbar-comparison.png`.
- Open-state evidence: portal/admin desktop and mobile snapshots in `tests/e2e/account-menu.visual.spec.ts-snapshots/`.
- Automated comparison across all 60 portal baselines found no material changes below the 72px/64px header boundary; no baseline had more than 64 pixels with a channel difference above 16 outside the header.
- Focused regions were required because the new identity trigger, popover, role label and logout action are too small to assess in the downscaled full-page comparison.

## Findings

- No actionable P0/P1/P2 findings.
- Typography: existing local Noto Sans SC UI treatment is preserved; name truncation and mobile hiding do not alter page hierarchy.
- Spacing/layout: the desktop action cluster and 36px mobile trigger remain inside every tested viewport without overlapping search, navigation, brand or back links.
- Colors/tokens: muted green identity treatment and restrained red logout action match existing portal tokens and retain visible focus states.
- Images/icons: the original brand asset is unchanged; account and logout actions use the existing Lucide icon family, with no new placeholder or generated imagery.
- Copy/content: only current display name, localized role and explicit logout states are added; no Feishu external identifier is rendered.
- Interaction/accessibility: disclosure semantics, Escape focus restoration, outside close, duplicate-submit protection, CSRF rejection, logout cache clearing and Axe serious/critical checks pass.
- Console: the four open-state visual scenarios collect console and page errors and require an empty result.

## Comparison History

- Initial comparison found the intended header-only change and no structural drift. No P0/P1/P2 visual fix was required.
- Desktop and mobile open-state captures were then added to cover the previously unbaselined popover and admin header.

## Final Result

final result: passed
