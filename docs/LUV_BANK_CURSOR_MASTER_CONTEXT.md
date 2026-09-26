# Luv Bank - Cursor Master Project Context

**Document purpose:** This is the canonical product, UX, architecture, and implementation context for building the Luv Bank web product. Cursor must read this file completely before proposing or applying code changes.

**Project type:** Premium bilingual relationship-wellbeing web application with a public marketing website and a private authenticated experience.

**Primary experience:** Mobile-first PWA-style web app, with a deliberately different desktop composition.

**Working language:** Code, technical documentation, schemas, and API naming should be in English. The product UI must support both English and Arabic as first-class languages.

**Source material supplied by the client:**

- `Luv_Bank_Pitch.pdf` - the product concept, positioning, research references, and intended MVP direction.
- `Luv_Bank_Prototype.html` - an interactive proof of concept showing the current balance, logging, insight, nudge, sharing, English/Arabic, and RTL ideas.

The prototype is a **functional reference**, not a visual design to copy literally. Its example names, numbers, score thresholds, wording, and data are illustrative unless explicitly approved.

---

## 1. Mandatory instructions for Cursor

1. Read this document before touching the codebase.
2. Treat the product principles and scope boundaries in this file as the source of truth.
3. Do not redesign the product into a social network, dating app, therapy marketplace, or public scorecard.
4. Keep relationship data private by default and enforce ownership on the backend, not only in the UI.
5. Arabic and RTL are core product requirements, not a later translation task.
6. Mobile must use an app-like composition. Do not merely shrink the desktop layout.
7. Desktop must feel like a premium romantic web product, not an enlarged phone mockup.
8. Keep scoring, insight, authorization, and sharing rules in backend/domain services. Do not place authoritative business logic only in React components.
9. Do not present illustrative scoring as clinical, diagnostic, or scientifically validated.
10. Do not add AI-generated counseling, partner surveillance, public leaderboards, or automatic partner messaging without explicit approval.
11. Do not hard-code secrets, live credentials, production URLs, or personal user data.
12. Do not run `git add`, `git commit`, `git push`, create or merge pull requests, or create/push tags. The user controls all Git and GitHub operations.
13. After each implementation task, report:
    - files changed;
    - decisions made;
    - tests run and their real results;
    - remaining risks or unanswered decisions;
    - a suggested commit message, without executing it.
14. Do not claim a test, database migration, API, email, PWA notification, or production deployment works unless it was actually run and verified.

---

## 2. Product identity

### Product name

**Luv Bank**

Possible Arabic display name: **بنك الحب**. The final Arabic brand treatment must be confirmed with the client. Until then, support both names in translation dictionaries without duplicating brand logic throughout the UI.

### Product promise

Luv Bank helps a person see the emotional pattern of a relationship over time. Positive moments are recorded as deposits, difficult moments as withdrawals, and the product converts those private entries into a balance, trend, reflective insight, and a gentle next action.

### Core product loop

1. **Track** - Log a relationship moment quickly and privately.
2. **Understand** - See the balance, recent trend, ratio, and plain-language reflection.
3. **Act** - Receive a calm, relevant nudge and take a small constructive action.

This `Track -> Understand -> Act` loop is the center of the product. Every major screen should support one part of this loop without unnecessary complexity.

### Product positioning

Luv Bank is not a tool for blaming a partner or proving who is right. It is a private, positive mirror designed to help the user notice patterns and show up better in the relationship.

---

## 3. Problem the product solves

The client concept identifies the following problems:

- Small positive and difficult moments blur together, so people may not notice drift until the relationship is already under strain.
- Feelings and patterns are hard to observe because they are not naturally visible or measurable.
- Existing relationship and wellbeing products are mostly English-first and often do not provide a polished Arabic or RTL experience.
- A raw score is not enough. Users need gentle interpretation and a useful next step.

The product should make emotional patterns easier to notice without turning the relationship into a competition.

---

## 4. Product principles

### 4.1 Private by default

- A user's ledger, notes, moments, and insights are visible only to that user unless they deliberately share a selected snapshot.
- No entry is automatically sent to a partner.
- Sharing must be explicit, scoped, understandable, revocable where technically possible, and safely worded.

### 4.2 Reflection, not scorekeeping

- Copy must never encourage keeping evidence against a partner.
- Avoid competitive language, winners, losers, streak pressure, public rankings, or partner comparisons.
- The balance is a reflective signal, not a verdict.

### 4.3 Positive action over passive analytics

Insights should lead to one simple, practical action such as:

- send a song;
- share a joke;
- say thank you;
- plan a small surprise;
- schedule calm time together;
- take a short cool-down;
- seek trusted or professional support when the pattern stays difficult.

### 4.4 Adaptive emotional tone

The interface changes its tone according to the pattern:

- **Strong/high balance:** celebrate gently and suggest paying it forward.
- **Steady/neutral balance:** encourage one small deliberate deposit.
- **Low/negative balance:** reduce celebratory language, avoid shame, use calm support, encourage reflection, safety, and trusted help.

### 4.5 Non-clinical product

- Luv Bank must not diagnose relationships or mental-health conditions.
- Insights are reflective prompts, not professional advice.
- Low-balance experiences must include responsible language and must not pressure a user to stay in a harmful or unsafe situation.

### 4.6 Bilingual from the foundation

- English and Arabic must have equal feature coverage.
- Use true RTL layout rather than visually reversing isolated components.
- Arabic wording must be natural and culturally aware, not a literal machine translation.
- Dates, pluralization, direction-sensitive icons, charts, navigation, sheets, and forms must be tested in both directions.

---

## 5. MVP product scope

The MVP should contain two connected experiences:

1. A **public marketing website** that explains the concept and builds trust.
2. A **private authenticated application** that demonstrates the full Track -> Understand -> Act loop.

### 5.1 Public marketing website

Suggested routes:

- `/` - premium landing page;
- `/how-it-works` - Track, Understand, Act;
- `/science-and-safety` - carefully worded conceptual/research background and safety boundaries;
- `/privacy` - privacy commitments and policy placeholder until legal copy is approved;
- `/terms` - terms placeholder until legal copy is approved;
- `/login`;
- `/register`.

The landing page should include:

- an emotionally strong hero;
- a live or animated product preview;
- the Track -> Understand -> Act story;
- bilingual/RTL value;
- privacy-first positioning;
- adaptive examples for thriving, steady, and struggling patterns;
- a trust section that clearly separates reflective insight from diagnosis;
- a clear CTA to create an account or try the private experience.

### 5.2 Authenticated app

Suggested routes:

- `/app` - relationship dashboard/home;
- `/app/log` - log a positive or difficult moment;
- `/app/insights` - trend and reflective insights;
- `/app/history` - searchable/filterable ledger;
- `/app/share` - create and manage selected share snapshots;
- `/app/reminders` - reminder preferences;
- `/app/settings` - language, timezone, relationship profile, privacy, sessions, and account controls.

### 5.3 Onboarding

A new user should complete a short, calm onboarding flow:

1. Choose English or Arabic.
2. Create a relationship profile.
3. Enter an optional private partner display name.
4. Enter an optional relationship start date.
5. Choose timezone.
6. Choose whether to enable a weekly in-app reminder.
7. Read a brief private-by-default and non-diagnostic notice.
8. Enter the app with useful starter guidance, not an empty technical dashboard.

### 5.4 MVP account model

Default implementation unless the client decides otherwise:

- One registered user owns private relationship profiles.
- The MVP allows one active relationship profile in the UI, while the database may support multiple profiles for future expansion.
- The partner does not need an account.
- There is no real-time shared ledger in the MVP.
- Sharing occurs through a deliberately created snapshot, not through automatic access to the user's private account.

---

## 6. Core features

### 6.1 Relationship dashboard

The home screen should show:

- relationship display name and optional duration;
- current balance;
- selected time-window trend;
- adaptive state such as thriving, steady, or struggling;
- one contextual nudge;
- recent moments;
- positive-to-difficult ratio for a defined period;
- a compact trend visualization;
- quick access to log a moment;
- sharing entry point;
- reminder status.

### 6.2 Log a moment

A moment contains:

- kind: `POSITIVE` or `DIFFICULT`;
- category;
- server-controlled default weight;
- optional note;
- occurrence date/time;
- relationship profile ID;
- owner ID derived from the authenticated session, never trusted from the client payload.

Initial categories may be based on the supplied prototype.

Positive examples:

- affection;
- surprise;
- appreciation;
- quality time;
- shared laugh;
- support.

Difficult examples:

- snapping;
- dismissal;
- feeling ignored;
- argument;
- distance;
- coldness.

Category labels and descriptions must be translated. Weights should be stored in a controlled configuration or database table and must not be freely editable from the browser.

### 6.3 Ledger/history

The ledger should support:

- chronological list;
- positive/difficult filtering;
- category filtering;
- date-range filtering;
- pagination or cursor loading;
- editing and deleting only by the owner;
- a clear distinction between `occurredAt` and `createdAt`;
- safe handling of notes so they do not leak into logs, analytics, or error messages.

### 6.4 Insights

MVP insights should be transparent and deterministic rather than pretending to be advanced AI.

Possible output:

- current balance;
- 7-day and 30-day change;
- positive-to-difficult ratio for a selected window;
- most common positive category;
- most common difficult category;
- a simple trend state;
- a plain-language reflection;
- one or more suggested next actions.

The prototype displays intimacy, passion, and commitment values. These must not be presented as validated measurements unless the scoring method is formally designed, reviewed, and approved. For the first production-quality MVP, they should be omitted, labeled as experimental, or derived only after a documented methodology exists.

### 6.5 Smart nudges

Nudges should be generated from simple, explainable rules in the backend or a shared domain service.

Examples:

- strong positive trend -> suggest a small act of appreciation;
- steady pattern with no recent positive entry -> suggest a deliberate positive moment;
- repeated difficult entries -> suggest a pause, calm check-in, or support;
- long period without entries -> offer a neutral reminder, not guilt;
- very low pattern -> show supportive language and a safety-oriented note.

A nudge is not a diagnosis and should not make claims about the partner's intent.

### 6.6 Sharing

The supplied prototype offers three scopes:

- positives only;
- this month / last 30 days;
- full balance sheet.

Recommended MVP implementation:

- create a server-side immutable snapshot;
- assign a random, non-guessable token;
- store only a token hash in the database;
- allow an expiration date;
- allow the owner to revoke it;
- show exactly what will be included before confirmation;
- frame difficult moments as an invitation to communicate, never a verdict;
- do not expose private notes unless the user explicitly includes them;
- use the Web Share API where available, with a copy-link fallback.

### 6.7 Reminders

MVP default:

- in-app reminder preferences and reminder cards;
- timezone-aware weekly schedule;
- no claim of background push delivery until PWA push is actually implemented and tested.

Email or push notifications may be added later as separate, verified phases.

---

## 7. Scoring and insight integrity

### 7.1 Basic balance

A simple initial formula may be:

`balance = sum(positive weights) - sum(difficult weights)`

The authoritative computation must run on the server from stored moments. The browser may display optimistic UI, but it must not be the source of truth.

### 7.2 Ratio

The pitch references a 5:1 positive-to-negative idea. The implementation must document whether the displayed ratio uses:

- count of moments; or
- weighted point totals.

Default technical proposal: show a **weighted ratio** for the selected window and label it clearly. Do not claim that the app's weighted ratio is identical to any published observational research ratio.

### 7.3 State classification

The prototype uses illustrative thresholds to show thriving, steady, and struggling previews. Do not hard-code those prototype thresholds as final product science.

Create a configuration-driven state engine based on:

- balance;
- short-term delta;
- recent positive/difficult ratio;
- persistence of a low pattern;
- recent activity volume.

Every rule must be testable and explainable. Avoid a single score that swings dramatically from one entry.

### 7.4 Server response shape

A dashboard or insight response should include both values and explanations, for example:

```ts
{
  balance: 128,
  window: "30d",
  trend: {
    delta: 14,
    direction: "UP"
  },
  ratio: {
    positiveWeight: 42,
    difficultWeight: 8,
    value: 5.25
  },
  state: "THRIVING",
  explanationKey: "insight.thriving.positiveTrend",
  nudge: {
    type: "PAY_IT_FORWARD",
    actionKey: "nudge.sendThanks"
  }
}
```

Use translation keys or structured codes. Do not store fully translated insight copy as the core business value unless there is a specific content-management requirement.

---

## 8. Visual and emotional design direction

### 8.1 Overall design character

The product should feel:

- romantic but mature;
- intimate but not intrusive;
- premium but calm;
- emotionally warm without becoming childish or overloaded with hearts;
- modern, polished, and memorable;
- safe and trustworthy when the data becomes difficult.

Avoid:

- generic SaaS blue dashboards;
- excessive neon pink;
- cartoon romance clichés;
- heavy glass effects on every component;
- visual gamification that makes negative moments feel like failure;
- dense admin-like tables as the primary experience.

### 8.2 Suggested design tokens

Use semantic CSS variables and Tailwind v4 theme tokens rather than scattering raw values.

Suggested starting palette, inspired by the supplied prototype but refined for a premium product:

- `--background`: warm pearl / soft rose-white;
- `--foreground`: deep plum-black;
- `--brand`: rich berry rose;
- `--brand-strong`: deep burgundy/plum;
- `--brand-soft`: blush pink;
- `--romance-gold`: muted champagne accent;
- `--surface`: translucent or solid warm white;
- `--surface-muted`: lavender mist;
- `--positive`: calm emerald;
- `--warning`: warm amber;
- `--difficult`: muted coral-red;
- `--border`: low-contrast rose-gray.

Prototype reference colors that may inform the token system:

- `#B4267A` brand accent;
- `#E0588F` secondary accent;
- `#221A20` dark ink;
- `#8A7F86` muted text;
- `#1F9D6B` positive;
- `#D9544D` difficult;
- `#C98A17` warning.

Do not copy these values blindly. Validate contrast and use semantic tokens.

### 8.3 Typography

Use a high-quality pairing that supports Latin and Arabic well. Do not use an Arabic font as an afterthought.

Recommended direction:

- clean modern sans for UI and numbers;
- elegant display face or restrained serif accent for selected marketing headlines only;
- consistent numeric legibility in balances and charts;
- generous line height in Arabic;
- no text smaller than is comfortably readable on mobile.

Font selection must account for licensing, loading performance, and full Arabic glyph coverage.

### 8.4 Motion

Use motion to communicate emotion and state, not to decorate every element.

Appropriate examples:

- soft balance number transition;
- subtle trend line reveal;
- card elevation and blur changes on hover;
- spring-like mobile bottom-sheet entry;
- gentle background gradient movement;
- small success feedback after logging a moment;
- reduced-motion mode that removes nonessential animation.

Avoid aggressive confetti for ordinary entries and avoid dramatic red animations for difficult moments.

---

## 9. Desktop experience - web-native composition

Desktop is not a phone frame placed in the middle of a large empty page.

### 9.1 Marketing desktop

Use a cinematic editorial layout:

- wide hero with layered copy, product visualization, and subtle romantic atmosphere;
- asymmetric sections with large typography and ample whitespace;
- interactive Track -> Understand -> Act storytelling;
- product preview composed from real reusable app components;
- subtle gradient, grain, light, or botanical/abstract motifs;
- deliberate section transitions rather than repeated identical cards.

### 9.2 Authenticated desktop app

Suggested structure:

- slim left navigation rail or elegant desktop sidebar;
- top area with relationship selector, date window, language, and account menu;
- primary dashboard grid with a large balance/trend panel;
- secondary panels for nudge, ratio, recent moments, and actions;
- history displayed with a refined timeline or structured list rather than a cold spreadsheet;
- insights use more horizontal space for trend visualization and explanations;
- responsive content width so large displays do not produce excessively long lines.

Desktop navigation should not use the mobile bottom tab bar.

---

## 10. Mobile experience - app-like composition

At mobile widths, redesign the composition instead of stacking desktop blocks mechanically.

### 10.1 Mobile app shell

- full-height application shell;
- safe-area support;
- compact top bar;
- bottom navigation for Home and Insights;
- prominent central `+` action for logging;
- bottom sheets for quick actions, filters, and sharing;
- touch targets of at least 44 x 44 CSS pixels;
- sticky actions where appropriate;
- smooth route or state transitions;
- no desktop sidebar;
- no horizontal desktop tables.

### 10.2 Suggested mobile navigation

- Home;
- central Log action;
- Insights;
- secondary access to History, Share, Reminders, and Settings through the header/menu or contextual cards.

### 10.3 Mobile dashboard order

1. compact identity/header;
2. large balance hero;
3. adaptive nudge;
4. weekly trend;
5. ratio and reminder;
6. recent moments;
7. supportive footer note.

### 10.4 Mobile logging experience

Logging should feel fast enough to complete in seconds:

- positive/difficult segmented control;
- two-column emotional category grid;
- optional note;
- optional occurrence time;
- clear submit action;
- tactile pressed states;
- success feedback;
- return to dashboard with updated data.

Do not expose internal point weights as if the user is pricing a relationship. The interface may show a gentle relative value only if the product team explicitly approves it.

---

## 11. Technical stack - fixed requirements

### Frontend

- Next.js App Router;
- React;
- TypeScript;
- Tailwind CSS v4;
- shadcn/ui;
- Radix UI primitives;
- lucide-react icons.

### Backend

- Express.js;
- TypeScript;
- REST API for the first version.

### Database

- Neon PostgreSQL;
- Prisma ORM.

### Authentication

- JWT-based authentication;
- HttpOnly cookies;
- secure refresh/session handling;
- Zod validation for request and response boundaries where practical.

### Validation

- Zod schemas should be shared or generated consistently so client forms and API endpoints do not drift.

Do not replace the requested stack without explicit approval.

---

## 12. Recommended repository architecture

Use a pnpm workspace or equivalent monorepo structure:

```text
luv-bank/
  apps/
    web/                    # Next.js App Router frontend
    api/                    # Express.js API
  packages/
    database/               # Prisma schema, migrations, generated client wrapper
    validation/             # Shared Zod schemas and domain DTOs
    config/                 # Shared TypeScript/env configuration
    ui/                     # Optional shared design tokens/components if useful
  docs/
    LUV_BANK_CURSOR_MASTER_CONTEXT.md
    decisions/              # ADRs for important product/technical decisions
  .env.example
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
```

Do not create a package merely for appearance. Shared packages must have a real ownership boundary.

### Frontend route groups

Suggested App Router structure:

```text
app/
  [locale]/
    (marketing)/
      page.tsx
      how-it-works/page.tsx
      science-and-safety/page.tsx
      privacy/page.tsx
      terms/page.tsx
    (auth)/
      login/page.tsx
      register/page.tsx
    (app)/
      app/layout.tsx
      app/page.tsx
      app/log/page.tsx
      app/insights/page.tsx
      app/history/page.tsx
      app/share/page.tsx
      app/reminders/page.tsx
      app/settings/page.tsx
```

Locale routing details may be adapted, but a single page must never mix ad-hoc English and Arabic strings.

### Backend module structure

Suggested API modules:

```text
src/
  app.ts
  server.ts
  config/
  middleware/
  modules/
    auth/
    users/
    relationships/
    moments/
    dashboard/
    insights/
    nudges/
    shares/
    reminders/
  lib/
  errors/
  tests/
```

Each module should separate routing, validation, controller, service/domain logic, and data access clearly enough to keep business rules testable.

---

## 13. Recommended initial Prisma domain model

This is a starting architecture, not an instruction to copy field names without review.

### `User`

- `id`;
- `email` unique;
- `passwordHash`;
- `preferredLocale`;
- `timezone`;
- `createdAt`;
- `updatedAt`;
- optional `deletedAt` for a controlled account-deletion flow.

### `AuthSession`

- `id`;
- `userId`;
- hashed refresh token or session token identifier;
- `userAgent` optional;
- safe IP fingerprint/hash optional;
- `expiresAt`;
- `revokedAt` optional;
- timestamps.

### `RelationshipProfile`

- `id`;
- `ownerId`;
- `title` or generated display title;
- `partnerDisplayName` optional;
- `startedAt` optional;
- `status` such as `ACTIVE` or `ARCHIVED`;
- timestamps.

### `Moment`

- `id`;
- `relationshipId`;
- `kind`: `POSITIVE` or `DIFFICULT`;
- `category`;
- `weight` integer copied from controlled category configuration at creation time;
- `note` optional;
- `occurredAt`;
- `createdAt`;
- `updatedAt`.

### `MomentCategory`

Optional database-backed configuration if categories need admin/content control:

- `id`;
- stable `code`;
- `kind`;
- `defaultWeight`;
- icon identifier;
- active flag;
- ordering.

Translations should normally remain in typed locale dictionaries unless there is a true content-management need.

### `ReminderPreference`

- `id`;
- `relationshipId` unique;
- weekly enabled flag;
- day of week;
- local time;
- timezone;
- timestamps.

### `ShareSnapshot`

- `id`;
- `relationshipId`;
- `createdById`;
- `scope`: `POSITIVES_ONLY`, `LAST_30_DAYS`, or `FULL`;
- sanitized immutable snapshot payload or snapshot record relation;
- hashed public token;
- `expiresAt` optional;
- `revokedAt` optional;
- timestamps.

### `NudgeInteraction`

Optional in MVP, useful later:

- nudge type;
- relationship ID;
- shown timestamp;
- dismissed/completed timestamp;
- action code.

Do not persist a large volume of derived analytics if they can be computed efficiently. Add snapshots only when required for performance, reproducibility, or sharing.

---

## 14. Initial API surface

Suggested versioned routes:

### Auth

- `POST /api/v1/auth/register`;
- `POST /api/v1/auth/login`;
- `POST /api/v1/auth/refresh`;
- `POST /api/v1/auth/logout`;
- `POST /api/v1/auth/logout-all`;
- `GET /api/v1/auth/me`.

### Relationship profile

- `POST /api/v1/relationships`;
- `GET /api/v1/relationships`;
- `GET /api/v1/relationships/:id`;
- `PATCH /api/v1/relationships/:id`;
- `POST /api/v1/relationships/:id/archive`.

### Moments

- `POST /api/v1/relationships/:relationshipId/moments`;
- `GET /api/v1/relationships/:relationshipId/moments`;
- `GET /api/v1/relationships/:relationshipId/moments/:momentId`;
- `PATCH /api/v1/relationships/:relationshipId/moments/:momentId`;
- `DELETE /api/v1/relationships/:relationshipId/moments/:momentId`.

### Dashboard and insights

- `GET /api/v1/relationships/:relationshipId/dashboard?window=30d`;
- `GET /api/v1/relationships/:relationshipId/insights?window=30d`;
- `GET /api/v1/relationships/:relationshipId/nudges/current`.

### Reminders

- `GET /api/v1/relationships/:relationshipId/reminder-preference`;
- `PUT /api/v1/relationships/:relationshipId/reminder-preference`.

### Sharing

- `POST /api/v1/relationships/:relationshipId/shares`;
- `GET /api/v1/relationships/:relationshipId/shares`;
- `DELETE /api/v1/relationships/:relationshipId/shares/:shareId`;
- `GET /api/v1/public/shares/:token`.

All relationship-bound endpoints must verify ownership or explicit authorized access in the service layer.

---

## 15. Authentication and security requirements

Relationship notes are sensitive. Security decisions must be part of the architecture from the start.

### Required baseline

- password hashing with a modern algorithm such as Argon2id or an approved equivalent;
- short-lived access JWT;
- refresh/session token rotation;
- HttpOnly cookies;
- `Secure` cookies in production;
- intentional `SameSite` configuration;
- strict CORS allowlist with credentials;
- Helmet;
- authentication rate limiting;
- generic login error messages;
- server-side Zod validation;
- centralized error handling;
- no stack traces or sensitive payloads in production responses;
- no private moment notes in application logs;
- ownership checks on every private resource;
- CSRF protection strategy appropriate to cookie-based authentication;
- environment validation at startup;
- revocable sessions and logout-all support;
- safe account deletion/export design before those controls are exposed.

### Cookie/domain design

Prefer same-site deployment where possible, for example:

- web: `app.example.com` or `example.com`;
- API: `api.example.com`;

Document the exact cookie domain, CORS, and CSRF model before production deployment.

---

## 16. Localization and RTL requirements

- All user-facing copy comes from locale dictionaries.
- Use logical CSS properties such as `margin-inline`, `padding-inline`, `inset-inline`, and `text-align: start`.
- Set document `lang` and `dir` correctly.
- Mirror only icons whose meaning depends on direction.
- Do not mirror universal icons such as hearts, plus signs, or media controls without reason.
- Test sheets, dialogs, forms, charts, tooltips, toasts, and navigation in RTL.
- Use locale-aware date/time and number formatting.
- Decide whether relationship balance digits follow locale or remain Latin based on client preference; do not mix formats randomly.
- Arabic content must receive enough horizontal and vertical space.
- Never use translated strings as database enum values.

---

## 17. Frontend implementation principles

- Prefer Server Components for marketing/content and initial data loading where appropriate.
- Use Client Components only for interactions, forms, charts, local UI state, and browser APIs.
- Use TanStack Query only if the project requires complex client caching; do not add it automatically if native patterns are sufficient.
- Use React Hook Form with Zod integration for forms if approved; otherwise maintain a consistent validated form abstraction.
- Build a real semantic design system with Tailwind v4 tokens.
- Use shadcn/ui and Radix as primitives, not as an excuse for a generic shadcn visual style.
- Extend components to match the Luv Bank brand.
- Use lucide-react consistently; avoid mixing unrelated icon families.
- Keep mobile and desktop compositions in the same feature architecture while allowing intentionally different layout components.
- Avoid duplicating business logic between the mobile and desktop views.
- Use accessible SVG/CSS visualizations where possible before adding a heavy chart library.
- Never render untrusted user notes with `dangerouslySetInnerHTML`.

---

## 18. Backend implementation principles

- Express routes should be thin.
- Zod schemas validate params, query, body, and important response DTOs.
- Services own scoring, insight, nudge, sharing, and authorization rules.
- Prisma access should be wrapped enough to support transactions and testing.
- Creating, updating, or deleting a moment should produce consistent dashboard results.
- Use database transactions where a write and dependent snapshot/audit record must remain consistent.
- Avoid trusting client-provided calculated balances, weights, roles, owner IDs, or insight states.
- Use UTC in storage and convert for display using the user's timezone.
- Paginate ledger endpoints.
- Add indexes based on real query paths, especially relationship ID plus occurrence date.

---

## 19. Accessibility requirements

- WCAG-aware color contrast;
- visible keyboard focus;
- complete keyboard navigation on desktop;
- proper labels and error associations;
- screen-reader names for icon-only controls;
- reduced-motion support;
- no information communicated by color alone;
- positive and difficult states use text/icons in addition to color;
- charts include a textual summary;
- bottom sheets and dialogs trap focus correctly and restore focus when closed;
- touch targets at least 44 x 44 CSS pixels;
- readable type at 320px width without horizontal scrolling.

---

## 20. Testing expectations

### Unit tests

- balance calculation;
- ratio calculation;
- classification rules;
- nudge rules;
- translation-key mapping;
- share-scope filtering;
- date-window boundaries and timezone handling.

### API/integration tests

- registration, login, refresh, logout;
- invalid and expired sessions;
- ownership isolation between users;
- moment CRUD;
- dashboard recalculation after writes;
- share token expiration and revocation;
- Zod validation errors;
- archived relationship behavior;
- rate-limit behavior where practical.

### Frontend tests

- form validation;
- mobile and desktop navigation variants;
- RTL layout of critical components;
- adaptive copy/state rendering;
- share confirmation scope;
- reduced-motion behavior.

### End-to-end core journeys

1. Register -> onboarding -> dashboard.
2. Log a positive moment -> updated balance and nudge.
3. Log a difficult moment -> updated insight with calm copy.
4. Filter history.
5. Create a positives-only share snapshot -> open public token -> revoke -> token no longer works.
6. Switch English/Arabic -> entire experience changes direction and copy without losing state.
7. Use the application at a narrow mobile viewport and a wide desktop viewport.

Never report E2E success when the database, environment, or browser run was not actually available.

---

## 21. Performance expectations

- fast first load for the public landing page;
- optimized fonts and images;
- avoid loading the authenticated application bundle on unrelated marketing routes;
- no large animation/video asset without lazy loading and a fallback;
- skeletons or calm loading states for dashboard data;
- avoid layout shift in balance cards and charts;
- paginate or virtualize long histories only when needed;
- keep API responses intentionally shaped and avoid leaking internal Prisma records.

---

## 22. Analytics and privacy

Do not add invasive analytics by default.

If product analytics is later approved:

- track product events, not private note content;
- never send relationship notes, partner names, share contents, or sensitive insight text to analytics vendors;
- document consent and retention;
- use neutral event names such as `moment_created`, `insight_viewed`, `share_snapshot_created`;
- keep personally sensitive values out of event properties.

---

## 23. Out of scope for the first MVP

Unless explicitly approved, do not build:

- native iOS or Android apps;
- live partner accounts or a shared real-time ledger;
- partner monitoring or hidden tracking;
- public profiles or social feeds;
- public scores, rankings, or leaderboards;
- direct messaging between partners;
- AI therapist/chatbot;
- clinical diagnosis;
- therapist marketplace;
- subscriptions or payments;
- complex admin dashboard;
- automatic SMS, WhatsApp, email, or push notifications;
- audio/video calling;
- sentiment analysis of private notes;
- importing private messages from third-party platforms.

The architecture may leave reasonable extension points, but MVP code should remain focused.

---

## 24. Proposed delivery phases

### Phase 0 - Repository and architectural foundation

- create monorepo/workspace;
- scaffold Next.js and Express TypeScript apps;
- configure Tailwind CSS v4, shadcn/ui, Radix, and lucide-react;
- add shared TypeScript, ESLint, formatting, and environment validation;
- add Prisma/Neon configuration and initial schema;
- add health endpoints;
- add design tokens and a basic bilingual shell;
- add documentation and `.env.example`;
- no fake claims of live Neon connectivity without real credentials.

### Phase 1 - Authentication and onboarding

- register/login/logout/refresh/me;
- HttpOnly cookie flow;
- protected routes;
- locale selection;
- relationship profile onboarding;
- ownership baseline;
- responsive desktop/mobile shells.

### Phase 2 - Moment ledger

- category configuration;
- log positive/difficult moments;
- history list and filters;
- edit/delete;
- empty states;
- bilingual and RTL QA.

### Phase 3 - Dashboard and scoring

- authoritative balance;
- trend windows;
- ratio;
- recent moments;
- responsive visualizations;
- adaptive state presentation;
- unit and integration tests.

### Phase 4 - Insights and nudges

- deterministic insight engine;
- explainable nudge rules;
- constructive actions;
- low-state safety copy;
- no unsupported AI claims.

### Phase 5 - Sharing and reminders

- share snapshots and public tokens;
- expiration/revocation;
- in-app reminder preferences;
- Web Share integration;
- privacy review.

### Phase 6 - Premium visual polish and PWA readiness

- motion and microinteractions;
- mobile installability where supported;
- offline shell strategy only if truly useful;
- accessibility audit;
- performance pass;
- security review;
- complete visual QA in English/Arabic across target breakpoints.

Do not implement all phases in one uncontrolled change. Each phase needs a clear report and review.

---

## 25. Acceptance criteria for the product foundation

The project foundation is acceptable when:

- the requested stack is present and correctly configured;
- web and API run independently in development;
- environment values are validated;
- Prisma schema and migration workflow exist;
- the app supports English and Arabic with correct `dir` behavior;
- desktop and mobile have intentionally different navigation/layout shells;
- auth uses HttpOnly cookies and protected API routes;
- users cannot access another user's relationship data;
- the design tokens reflect the Luv Bank identity;
- the UI is not a literal copy of the supplied prototype;
- no unsupported science, AI, notification, or production claims are made;
- lint, typecheck, and available tests have real reported results.

---

## 26. Open product decisions requiring client confirmation

These questions should be recorded, but they should not block the initial foundation when a safe default exists:

1. Should the Arabic brand display be `Luv Bank`, `بنك الحب`, or a combined mark?
2. Is the first release strictly private for one user, or should a partner create an account and connect later?
3. Can one user manage more than one relationship profile?
4. Are point weights visible to users or only represented through emotional categories?
5. What exact scoring rules and thresholds are approved for production?
6. Should ratios use event counts or weighted points?
7. Are intimacy, passion, and commitment dimensions included in MVP, experimental, or postponed?
8. What share format is preferred: expiring link, image card, PDF, native share, or a combination?
9. Are private notes ever included in a share snapshot?
10. Are reminders in-app only at first, or is verified email/PWA push required?
11. Is there an admin/content-management requirement for categories, copy, or safety resources?
12. Which countries and Arabic dialect/tone are primary?
13. What legal privacy, terms, age, and safety requirements apply in the launch market?
14. Is monetization planned, and if so, what model belongs after the validated MVP?
15. Which research claims are approved for public marketing after source verification?

### Safe defaults until confirmed

- private single-user ledger;
- one active relationship profile in the UI;
- no connected partner account;
- server-controlled weights not emphasized in the UI;
- deterministic, non-AI insights;
- no intimacy/passion/commitment scores in production MVP;
- expiring share links with explicit scope;
- private notes excluded from sharing by default;
- in-app reminders only;
- no payment system;
- no admin dashboard beyond required operational tooling.

---

## 27. First Cursor task after reading this file

The first coding task should be a **foundation audit and scaffold plan**, not the entire product.

Cursor should:

1. inspect the current repository without assuming it is empty;
2. report the existing structure, package manager, branch, status, and conflicts with this architecture;
3. propose the smallest Phase 0 implementation plan;
4. identify required environment variables and create only safe placeholders;
5. establish the monorepo, web/API/database/validation boundaries;
6. create the initial semantic design tokens and bilingual responsive shells;
7. run available lint/typecheck/build/tests;
8. provide a precise report and suggested next task;
9. avoid all Git write operations.

---

## 28. Source-derived details that are illustrative, not production truth

The HTML prototype includes sample data such as:

- `You & Sara`;
- a `+128` balance;
- a `+14 this week` trend;
- example categories and point values;
- preview states for thriving, steady, and struggling;
- example text for nudges and insights;
- a 5:1 ratio display;
- sample relationship duration;
- fixed thresholds used to switch states.

Use these elements to understand the intended experience. Do not seed them as real user data, expose them as universal scientific rules, or embed them throughout production components.

---

## 29. Final product north star

A successful Luv Bank experience should make a user think:

> "I can see the pattern without feeling judged, I understand what it may mean, and I know one gentle thing I can do next."

Every product, design, and technical decision should support that outcome.
