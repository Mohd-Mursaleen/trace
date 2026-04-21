# log.af — Complete Build Context for Replit Agent

## What this is

Build **log.af**, a mobile-first journal app using **React Native + Expo**. It should run on **Android and iOS**, and the codebase should be suitable for later APK/iOS builds via Expo/EAS. The product is a **local-first personal journal**: all journal data lives on the user's device, and the app works without signup, login, or any backend account system. The only optional network integrations are **Deepgram** for speech-to-text and **Supermemory** for optional knowledge-graph sync. [conversation_history:1]

This app is inspired directly by the `/journal` experience from my portfolio repo. That journal has a standalone dark layout, a full calendar-driven interface, a monthly/yearly toggle, visually distinct day cell states, entry counts, image thumbnails in calendar cells, and a focused modal-based writing flow. Recreate that same soul and interaction model, but adapt it carefully for mobile. [cite:3][cite:4][cite:9][cite:12][cite:13]

---

## Product intent

The app name and display name are both **log.af**. The tagline is **Your days, remembered**. The positioning is not generic journaling. The pitch is:

> Agents are coming. The ones that truly know you will be the most powerful. log.af helps people build that memory layer now — one day at a time, on their own device. [conversation_history:1]

The app should feel:
- personal
- local-first
- calm
- intimate
- dark
- sharp
- minimal
- not corporate
- not generic productivity SaaS [conversation_history:1]

---

## Hard product constraints

These are non-negotiable:

- **React Native + Expo** only. [conversation_history:1]
- App should work on **iOS and Android**. [conversation_history:1]
- There is **no auth**: no signup, no login, no password gate, no user accounts. [conversation_history:1]
- This is an app for **everyone** who installs it. [conversation_history:1]
- **All journal data is stored locally on the device** and local storage is the **source of truth**. [conversation_history:1]
- Use my **Deepgram key** for all users for now. [conversation_history:1]
- **Supermemory is optional**, user-provided via settings; local save must work without Supermemory. [conversation_history:1]
- The app should have a **mobile UI very close in feeling to my portfolio journal**, just adapted properly to a phone form factor. [conversation_history:1][cite:3][cite:9]
- **Multiple images per day** are supported. [conversation_history:1]
- **Import feature is out for now**. Do not build markdown/text import yet. [conversation_history:1]
- Do not build home-screen app icon replacement. For now, the user photo is the **main in-app personal avatar** and emotional entry point. [conversation_history:1]

---

## Existing journal reference — what to preserve

Use my existing `/journal` implementation as the design and interaction reference.

### The route structure and architecture

My portfolio journal has its own standalone `app/journal/layout.jsx` and `app/journal/page.jsx`, separate from the rest of the site. The page probes access, loads entries, shows a count, and renders a full-year calendar and day editor modal. [cite:2][cite:3][cite:4]

### Main page behavior to carry over

The existing page:
- loads journal entry metadata first,
- tracks selected date,
- opens a day modal on day click,
- re-fetches entries after closing the modal,
- and supports prefetching day data for responsiveness. [cite:3]

For the mobile app, keep the same high-level mental model:
- load lightweight entry metadata for the calendar,
- open a day editor when a date is tapped,
- save locally,
- then refresh the visible calendar state. [cite:3][cite:9]

### Calendar behavior to preserve

The current `JournalCalendar` has:
- a **monthly/yearly toggle**,
- a **year navigator**,
- a **month navigator**,
- a **12-month yearly grid**,
- a **shared DayCell renderer**,
- an entry legend,
- and visually distinct cell states for photo days, text-only days, today, future days, and empty days. [cite:9]

These exact semantics should carry over to mobile.

### Day editor behavior to preserve

The current web modal is a polished two-panel journal editor that prioritizes writing while also handling media, previews, saving, and status states. It includes:
- formatted date header,
- manual save + close,
- auto-save concepts,
- image management,
- and a clean, distraction-light writing experience. [cite:12][cite:13]

For the mobile app, simplify the structure but preserve the feeling:
- clear date header,
- focused writing area,
- image support,
- strong save affordance,
- and a premium modal/sheet interaction. [cite:12][cite:13]

---

## Recommended stack

Use this stack unless there is a strong reason not to:

- **Expo SDK latest stable**
- **Expo Router** for navigation
- **TypeScript**
- **AsyncStorage** for local persistence
- **expo-file-system** for local image files
- **expo-image-picker** for profile photo and journal images
- **expo-av** for microphone recording
- **react-native-reanimated** + **moti** for motion
- **@expo/vector-icons** for icons
- Use `StyleSheet` or a clean theme/token-based approach; do not bring in a heavy styling abstraction unless it clearly improves speed

Do not overcomplicate the architecture. This is an MVP.

---

## App identity

- **App name**: `log.af` [conversation_history:1]
- **Display name**: `log.af` [conversation_history:1]
- **Bundle/package identifier**: `log.af.app` or equivalent Expo config package id [conversation_history:1]
- **Tagline**: `Your days, remembered` [conversation_history:1]

In `app.json` or `app.config.ts`, make the display name and package identifiers configurable.

---

## Information architecture

Suggested structure:

```txt
app/
  _layout.tsx
  index.tsx
  onboarding.tsx
  settings.tsx

components/
  ProfileHero.tsx
  JournalCalendar.tsx
  CalendarDayCell.tsx
  DayEditorSheet.tsx
  VoiceRecorderButton.tsx
  ImageStrip.tsx
  EmptyState.tsx
  Legend.tsx

hooks/
  useProfile.ts
  useJournal.ts
  useCalendar.ts
  useVoiceRecorder.ts
  useSupermemory.ts

lib/
  storage.ts
  journalStore.ts
  dates.ts
  deepgram.ts
  supermemory.ts
  theme.ts
  constants.ts
```

Keep logic isolated and composable.

---

## Local storage model

Use local storage as the source of truth.

### 1. Profile

Storage key: `user_profile`

```json
{
  "name": "",
  "photoUri": "",
  "supermemoryEnabled": false,
  "supermemoryKey": "",
  "hasCompletedOnboarding": false
}
```

### 2. Journal entry per date

Storage key pattern: `journal_entry_YYYY-MM-DD`

```json
{
  "date": "2026-04-21",
  "text": "today i wrote something",
  "images": [
    "file:///some/local/path/1.jpg",
    "file:///some/local/path/2.jpg"
  ],
  "previewImage": "file:///some/local/path/1.jpg",
  "createdAt": "2026-04-21T10:00:00.000Z",
  "updatedAt": "2026-04-21T11:30:00.000Z",
  "supermemorySyncStatus": "idle"
}
```

### 3. Entry index for calendar

Storage key: `journal_index`

```json
[
  {
    "date": "2026-04-21",
    "previewImage": "file:///some/local/path/1.jpg"
  },
  {
    "date": "2026-04-20",
    "previewImage": null
  }
]
```

The calendar should use the index and not read every full entry on every render. This mirrors the metadata-first loading pattern used in the existing journal page and calendar. [cite:3][cite:9]

---

## Core screens

### 1. Onboarding

Show only on first launch.

Use **3 simple onboarding screens** with minimal copy and clear CTAs.

#### Screen 1 — Welcome

Title:
**log.af**

Tagline:
**Your days, remembered.**

Body:
**Agents are coming. The ones that truly know you will be the most powerful. log.af helps you build that memory — one day at a time, entirely on your phone.** [conversation_history:1]

CTA:
- `Get started`

#### Screen 2 — Make it yours

Title:
**Make it yours**

Body:
**Add a photo and your name. This lives only on your device.** [conversation_history:1]

UI requirements:
- Large circular avatar placeholder
- Button to pick image from camera or gallery
- Optional name input
- `Skip` and `Continue`

#### Screen 3 — Supermemory

Title:
**Build your agents memory**

Body:
**Connect Supermemory to turn your daily logs into a knowledge graph — the foundation your future AI agent will think from. Free to start, totally optional.** [conversation_history:1]

UI requirements:
- Optional toggle or connect CTA
- API key input field
- Support `Skip`
- Small helper copy: `Get your free key at supermemory.ai`

When onboarding completes:
- save `hasCompletedOnboarding = true`
- navigate to home

---

### 2. Home screen

This is the emotional center of the app.

#### Header
- Left: `log.af`
- Right: settings icon

#### Profile hero
Show near the top center:
- large circular profile image if available
- fallback initials or placeholder if not
- user name underneath if present, else `My Journal`
- journal count under that: `{n} memories logged`

Important interaction:
- **tap the profile photo to open today’s journal entry** [conversation_history:1]

This profile avatar is the personal icon *inside the app*. It should feel tactile and intimate.

#### Calendar
Under the profile hero, render the main journal calendar.

Requirements:
- monthly / yearly toggle
- year navigation
- month navigation
- responsive layout for small phones
- touch-friendly day cells
- same semantic cell states as the web journal [cite:9]

Render a small legend underneath:
- logged
- has photo
- today [cite:9]

---

### 3. Settings screen

Keep it very minimal.

Sections:

#### Profile
- edit name
- change/remove profile photo

#### Supermemory
- toggle enable/disable
- key input
- helper copy: `Turn your journal into a knowledge graph for your future AI agent.`
- save/update action

#### About
- show local-first note: `All journal data is stored locally on this device.`
- app version placeholder

---

## Calendar component specification

Build a React Native version of the existing `JournalCalendar` semantics.

### Views
- **Yearly view**
- **Monthly view** [cite:9]

### Yearly view
- Render all 12 months
- On mobile, use a practical layout like 2 columns or a well-compressed scrolling layout
- Each month block contains:
  - month name
  - entry count if count > 0
  - 7-column day grid [cite:9]

### Monthly view
- Render one month with larger day cells
- Prev/next month arrows [cite:9]

### Day cell states
Carry over these states from the existing calendar:

1. **Future date**
- dimmed
- not interactive [cite:9]

2. **Photo day**
- thumbnail fills the cell
- day number shown in corner [cite:9]

3. **Text-only day**
- accent-dim background
- accent dot [cite:9]

4. **Today**
- accent ring [cite:9]

5. **Empty past date**
- muted number
- still tappable [cite:9]

### Day tap behavior
Tapping any valid day opens the day editor for that date.

### Calendar UX notes
The existing calendar also used coarse pointer detection to disable hover-heavy motion on touch devices. Since this is mobile-native, use subtle press states instead of hover behaviors. Preserve the restrained motion feel, not the exact web implementation. [cite:9]

---

## Day editor sheet specification

Use a **bottom sheet** or **full-screen modal sheet**. It should feel native, premium, and focused.

### Header
- formatted date, like `Tuesday, April 21`
- raw ISO date under it in small muted monospace
- close button
- save button [cite:12]

### Main writing area
- large multiline `TextInput`
- placeholder: `What happened today?`
- enough vertical space to feel like a real journal
- dark background
- good padding
- calm, distraction-free feel [cite:12]

### Save model
For MVP, use simple local save behavior:
- load existing entry on open
- keep text state locally in component
- save when tapping Save
- optionally add lightweight draft persistence if straightforward

Do not overengineer auto-save unless it is easy to implement well.

### Images section
The current web app has strong image support with upload, preview, delete, and grid rendering. Recreate that spirit in mobile with a horizontal strip or compact grid. [cite:12][cite:13]

Requirements:
- multiple images per day [conversation_history:1]
- add image from camera or gallery
- show local thumbnails
- allow removing images
- first image becomes `previewImage`
- image URIs stored locally

### Optional interactions
If simple to build, support:
- tap image for full-screen preview
- long-press image to delete

---

## Voice dictation specification

Add a mic button to the day editor.

### Voice flow
- user taps mic
- microphone recording starts
- UI changes to recording state
- user stops recording
- audio is sent to Deepgram
- transcript is appended to existing journal text [conversation_history:1]

### States
- idle
- recording
- processing
- success
- error

### Deepgram requirements
- use my shared API key for everyone for now [conversation_history:1]
- isolate the key and request logic in a helper module
- use a suitable transcription endpoint and model for conversational dictation
- append transcript, never replace text automatically

### UX behavior
- if text already exists, append transcript with spacing/new line
- if transcription fails, show inline error and preserve current journal content
- request microphone permissions only when needed

---

## Supermemory specification

Supermemory is optional.

### Product meaning
This is the “memory layer for your future agent” feature. It should be framed as optional enrichment on top of local journaling. [conversation_history:1]

### Behavior
- user adds their own Supermemory key in settings or onboarding [conversation_history:1]
- if enabled, after local save completes, send the journal entry text to Supermemory
- local save must happen first
- local data always wins
- Supermemory sync failure must not block save [conversation_history:1]

### Sync semantics
Use something like:
- content = date + two line breaks + entry text
- include metadata if useful, such as source and date

Track a simple local sync state if helpful, but do not build a complex sync engine.

---

## Image handling specification

My current journal supports image upload and preview. The web component uses immediate upload, thumbnail rendering, delete controls, and loading/error states. Carry that UX intent into mobile. [cite:13]

For mobile:
- let users select multiple images over time for a single day
- save copies to app storage if needed
- store URIs locally
- render thumbnails cleanly
- keep delete and preview interactions simple and safe

Use the first image as the preview image for the calendar.

---

## Visual design system

Use a dark theme close to the current journal implementation.

Suggested tokens:

```ts
export const colors = {
  bg: '#0e0e0e',
  bgCard: '#111111',
  bgElevated: '#1a1a1a',
  border: '#1e1e1e',
  foreground: '#f0f0f0',
  textMuted: '#666666',
  textSecondary: '#999999',
  accent: '#b4ff6e',
  accentDim: 'rgba(180,255,110,0.12)',
  black: '#000000',
  error: '#ff4d4d'
}
```

### Typography
The web journal uses a mix of strong headings and monospace metadata labels. Recreate that.

Use:
- system sans for headings/body
- monospace for dates, counts, labels, metadata [cite:3][cite:4][cite:9][cite:12][cite:13]

### Design rules
- no purple gradients
- no glowing blobs
- no startup-dashboard look
- no glass-heavy abstraction
- keep spacing tight but breathable
- rounded corners, but not cartoonishly soft
- cards should feel dense and intentional

---

## Motion design

The current journal uses motion tastefully across page transitions, hover states, status, and modals. The mobile app should preserve that restraint. [cite:3][cite:9][cite:10][cite:12][cite:13]

Use subtle motion only:
- onboarding fade/slide in
- profile hero slight press feedback
- day cell press scale
- sheet slide up/down
- voice recording pulse
- save success flash or tiny status feedback

No excessive animation.

---

## Navigation flow

```txt
Launch app
  -> if onboarding incomplete: onboarding
  -> else: home

Home
  -> tap avatar: open today's day editor
  -> tap any calendar date: open that day's day editor
  -> tap settings: open settings

Settings
  -> back to home
```

Keep navigation dead simple.

---

## Suggested implementation order

Build in this order:

1. Expo scaffold + routing
2. theme tokens + basic layout
3. onboarding
4. profile persistence
5. calendar data helpers
6. home screen calendar rendering
7. day editor sheet
8. local journal save/load
9. image picking + local image persistence
10. voice recording + Deepgram transcription
11. Supermemory optional sync
12. polish motion and empty states

---

## MVP boundaries

Do **not** build these now:
- markdown/text import
- authentication
- signup/login
- backend accounts
- search
- reminders
- export
- web sync
- collaborative features
- AI chat UI
- streak gamification [conversation_history:1]

---

## Expected deliverables

Generate:
- complete Expo app scaffold
- all core screens and components
- clean reusable hooks
- local persistence layer
- Deepgram helper
- Supermemory helper
- theme constants
- basic README with run instructions

Also include:
- how to run in Replit
- how to test with Expo Go
- how to build Android APK later using EAS

---

## README notes to include

Please include setup notes like:
- install dependencies
- run `npx expo start`
- connect device via Expo Go
- where to place the Deepgram key
- how to set Supermemory key in app
- how to later build APK with EAS

---

## Final quality bar

This should not feel like a generic note-taking app. It should feel like a **personal memory object** with a strong emotional center around the profile avatar and calendar. The closest design reference is my existing journal route: dark, minimal, metadata-driven, image-aware, and calendar-first. [cite:3][cite:4][cite:9][cite:12][cite:13]

When in doubt:
- prefer simplicity over feature breadth
- prefer local-first over cloud complexity
- prefer calm over flashy
- prefer tactile over ornamental
- prefer the portfolio journal’s soul over generic mobile UI trends [cite:3][cite:9][cite:12]
