```markdown
# log.af — Premium UI Overhaul (Match Portfolio Journal)

## Context

This is a React Native + Expo journal app at `artifacts/logaf/`. The app currently looks generic and flat. We need to make it look and feel like the portfolio journal at geekymd.me — which has a **dot grid background, lime accent `#c4f441`, dark surfaces, glow halos, soft overlays, and premium monospace details**.

Here is exactly what the portfolio uses, extracted directly from source:

### Portfolio color tokens (from tailwind.config.js)
```

bg: '#0a0a0a'
bg-elevated: '#141414'
bg-card: '#1a1a1a'
foreground: '#fafafa'
text-secondary: '#999999'
text-muted: '#666666'
accent: '#c4f441' ← THIS is the exact green. not #b4ff6e
border: '#1e1e1e'
border-hover: '#2e2e2e'

````

### Portfolio background (from globals.css)
```css
background-color: #0a0a0a;
background-image: radial-gradient(rgba(255,255,255,0.13) 1px, transparent 1px);
background-size: 22px 22px;
````

This is the dot grid. We need to replicate this in React Native.

---

## Task 1 — Fix constants/colors.ts completely

Replace the entire file with:

```ts
const palette = {
  bg: "#0a0a0a",
  surface: "#111111",
  surfaceAlt: "#1a1a1a",
  surfaceHigh: "#141414",
  border: "#1e1e1e",
  borderStrong: "#2e2e2e",
  text: "#fafafa",
  textMuted: "#666666",
  textSecondary: "#999999",
  textDim: "#444444",
  accent: "#c4f441",
  accentSoft: "rgba(196,244,65,0.15)",
  accentDim: "rgba(196,244,65,0.08)",
  accentRing: "rgba(196,244,65,0.5)",
  danger: "#ff4d4d",
  recording: "#ff4d4d",
};

const token = {
  text: palette.text,
  tint: palette.accent,
  background: palette.bg,
  foreground: palette.text,
  card: palette.surface,
  cardForeground: palette.text,
  cardAlt: palette.surfaceAlt,
  cardHigh: palette.surfaceHigh,
  primary: palette.accent,
  primaryForeground: "#0a0a0a",
  secondary: palette.surfaceAlt,
  secondaryForeground: palette.text,
  muted: palette.surfaceAlt,
  mutedForeground: palette.textMuted,
  accent: palette.accent,
  accentForeground: "#0a0a0a",
  accentSoft: palette.accentSoft,
  accentDim: palette.accentDim,
  accentRing: palette.accentRing,
  destructive: palette.danger,
  destructiveForeground: "#ffffff",
  border: palette.border,
  borderStrong: palette.borderStrong,
  input: palette.border,
  textDim: palette.textDim,
  textMuted: palette.textMuted,
  textSecondary: palette.textSecondary,
  recording: palette.recording,
};

const colors = {
  light: token,
  dark: token,
  radius: 12,
};

export default colors;
```

---

## Task 2 — Add dot grid background to the home screen

In `app/index.tsx`, wrap the entire screen content in a `View` that simulates the dot grid background.

Since React Native doesn't support CSS background patterns natively, create a `DotGrid` component:

### Create `components/DotGrid.tsx`

```tsx
import { StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/useColors";

/**
 * Renders a dot grid background matching the portfolio:
 * radial-gradient(rgba(255,255,255,0.13) 1px, transparent 1px)
 * background-size: 22px 22px
 *
 * We simulate this by rendering a grid of tiny dots absolutely positioned.
 * Use useMemo to compute dots based on screen size.
 */
import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

export function DotGrid() {
  const { width, height } = useWindowDimensions();
  const spacing = 22;

  const dots = useMemo(() => {
    const cols = Math.ceil(width / spacing) + 1;
    const rows = Math.ceil(height / spacing) + 2;
    const result = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        result.push({ key: `${r}-${c}`, x: c * spacing, y: r * spacing });
      }
    }
    return result;
  }, [width, height]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {dots.map((d) => (
        <View
          key={d.key}
          style={{
            position: "absolute",
            left: d.x,
            top: d.y,
            width: 1,
            height: 1,
            borderRadius: 0.5,
            backgroundColor: "rgba(255,255,255,0.13)",
          }}
        />
      ))}
    </View>
  );
}
```

Then in `app/index.tsx`, add `<DotGrid />` as the first child inside the root View, behind everything else:

```tsx
<View style={[styles.root, { backgroundColor: colors.background }]}>
  <DotGrid />
  {/* rest of content */}
</View>
```

Also add the DotGrid to `app/onboarding.tsx` and `app/settings.tsx` the same way.

---

## Task 3 — Add accent glow halo behind the profile avatar

In `components/ProfileHero.tsx`, add a radial glow behind the avatar. This is the soft green glow the portfolio has around interactive accent elements.

```tsx
{
  /* Glow halo */
}
<View
  style={{
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(196,244,65,0.08)",
    // blur approximated by making it larger and very transparent
  }}
/>;
{
  /* Second outer glow ring */
}
<View
  style={{
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(196,244,65,0.04)",
  }}
/>;
{
  /* Avatar on top */
}
<View style={[avatarStyles, { zIndex: 1 }]}>
  {/* avatar image or initials */}
</View>;
```

Center everything with `alignItems: 'center', justifyContent: 'center'` on the parent container.

---

## Task 4 — Fix JournalCalendar toggle to match portfolio exactly

The portfolio toggle (from JournalCalendar.jsx):

```
inline-flex rounded-xl border border-border bg-bg-elevated p-1
Active tab: bg-accent text-black rounded-lg px-4 py-1.5 text-sm font-mono
Inactive tab: text-text-muted hover:text-foreground rounded-lg px-4 py-1.5
```

In `components/JournalCalendar.tsx`, rewrite the toggle:

```tsx
<View
  style={{
    flexDirection: "row",
    alignSelf: "center",
    backgroundColor: colors.cardAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    marginBottom: 20,
  }}
>
  {(["monthly", "yearly"] as const).map((mode) => (
    <Pressable
      key={mode}
      onPress={() => setViewMode(mode)}
      style={({ pressed }) => ({
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 9,
        backgroundColor: viewMode === mode ? colors.accent : "transparent",
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text
        style={{
          fontSize: 13,
          fontFamily:
            viewMode === mode ? "Inter_600SemiBold" : "Inter_400Regular",
          color: viewMode === mode ? "#0a0a0a" : colors.textMuted,
          letterSpacing: 0.2,
        }}
      >
        {mode.charAt(0).toUpperCase() + mode.slice(1)}
      </Text>
    </Pressable>
  ))}
</View>
```

---

## Task 5 — Fix CalendarDayCell to exactly match portfolio DayCell

The portfolio DayCell has these exact behaviors (from JournalCalendar.jsx):

### Photo day

```
ring-2 ring-accent ring-offset-1 ring-offset-bg (if today)
Image fills cell with object-cover
Black overlay: bg-black/10 → bg-black/30 on hover
Day number: absolute bottom-right, text-white/90 or text-accent if today
```

### Text-only day (inMap, no image)

```
bg-accent/10 → hover: bg-accent/20
Flex column with gap
Day number: text-foreground (or text-accent if today)
Accent dot: w-1 h-1 rounded-full bg-accent centered below number
```

### Today (no entry)

```
ring-2 ring-accent ring-offset-1 ring-offset-bg
hover: bg-accent/5
Day number: text-accent font-bold
```

### Future

```
opacity-30
Day number: text-text-muted font-mono
Not interactive
```

### Empty past

```
Just day number: text-text-muted font-mono
Pressable with subtle hover
```

Replicate all these states in `components/CalendarDayCell.tsx` using React Native equivalents:

- `ring-2 ring-accent` → `borderWidth: 1.5, borderColor: colors.accent`
- `bg-accent/10` → `backgroundColor: colors.accentDim`
- `opacity-30` → `opacity: 0.3`
- `bg-black/10` overlay → `<View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.12)' }} />`

---

## Task 6 — Fix Legend to match portfolio

Portfolio legend (from JournalCalendar.jsx):

```
flex items-center gap-4 mt-6 justify-center flex-wrap

logged:    small square w-3 h-3 bg-accent/10 border border-accent/30 + w-1 h-1 dot inside
has photo: small square w-3 h-3 bg-[#1a1a1a] border border-accent + gradient overlay
today:     small square w-3 h-3 ring-1 ring-accent (just a ring, no fill)

All labels: text-[10px] font-mono text-text-muted
```

Rewrite `components/Legend.tsx` to match:

```tsx
<View
  style={{
    flexDirection: "row",
    gap: 16,
    marginTop: 20,
    justifyContent: "center",
    flexWrap: "wrap",
  }}
>
  {/* logged */}
  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
    <View
      style={{
        width: 12,
        height: 12,
        borderRadius: 2,
        backgroundColor: colors.accentDim,
        borderWidth: 1,
        borderColor: "rgba(196,244,65,0.3)",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.accent,
        }}
      />
    </View>
    <Text
      style={{
        fontSize: 10,
        fontFamily: "Inter_400Regular",
        color: colors.textMuted,
      }}
    >
      logged
    </Text>
  </View>

  {/* has photo */}
  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
    <View
      style={{
        width: 12,
        height: 12,
        borderRadius: 2,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.accent,
        overflow: "hidden",
      }}
    >
      <View style={{ flex: 1, backgroundColor: "rgba(196,244,65,0.15)" }} />
    </View>
    <Text
      style={{
        fontSize: 10,
        fontFamily: "Inter_400Regular",
        color: colors.textMuted,
      }}
    >
      has photo
    </Text>
  </View>

  {/* today */}
  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
    <View
      style={{
        width: 12,
        height: 12,
        borderRadius: 2,
        borderWidth: 1.5,
        borderColor: colors.accent,
      }}
    />
    <Text
      style={{
        fontSize: 10,
        fontFamily: "Inter_400Regular",
        color: colors.textMuted,
      }}
    >
      today
    </Text>
  </View>
</View>
```

---

## Task 7 — Fix the yearly calendar grid year header

Portfolio year header (from JournalCalendar.jsx):

```
Year number: text-2xl font-black font-mono text-foreground tracking-tight
Entry count below: text-[10px] font-mono text-text-muted
Prev/next arrows: p-1.5 rounded-lg text-text-muted hover:text-foreground hover:bg-bg-elevated
```

In `components/JournalCalendar.tsx` year view header, style accordingly:

```tsx
// Year number
<Text style={{
  fontSize: 28,
  fontFamily: 'Inter_700Bold',
  color: colors.foreground,
  letterSpacing: -1,
}}>
  {year}
</Text>

// Count
<Text style={{
  fontSize: 10,
  fontFamily: 'Inter_400Regular',
  color: colors.textMuted,
  marginTop: 2,
  textAlign: 'center',
}}>
  {totalEntries} memories
</Text>

// Arrow buttons
<Pressable style={({ pressed }) => ({
  padding: 8,
  borderRadius: 8,
  backgroundColor: pressed ? colors.cardAlt : 'transparent',
})}>
  <Feather name="chevron-left" size={16} color={colors.textMuted} />
</Pressable>
```

---

## Task 8 — Fix the home screen nav header

Portfolio nav (from layout.jsx):

```
border border-[#1e1e1e] bg-[#111111]/80 backdrop-blur-xl rounded-xl
Left: home icon + "geekymd.me" in font-mono text-text-muted
Right: "Journal" in font-mono uppercase tracking-widest text-text-secondary
```

In `app/index.tsx` header, match this style:

```tsx
<View
  style={{
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: insets.top + 8,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(17,17,17,0.9)",
  }}
>
  <Text
    style={{
      fontFamily: "Inter_400Regular",
      fontSize: 13,
      color: colors.textMuted,
      letterSpacing: 0.2,
    }}
  >
    log.af
  </Text>
  <Pressable onPress={() => router.push("/settings")}>
    <Feather name="settings" size={16} color={colors.textMuted} />
  </Pressable>
</View>
```

---

## Task 9 — Add subtle card border + background to calendar container

In `app/index.tsx`, the calendar should sit inside a card like the portfolio:

```
p-5 sm:p-6 rounded-2xl bg-bg-card border border-border
```

```tsx
<View style={{
  marginHorizontal: 16,
  padding: 16,
  borderRadius: 20,
  backgroundColor: colors.card,
  borderWidth: 1,
  borderColor: colors.border,
}}>
  <JournalCalendar ... />
</View>
```

---

## Task 10 — Fix ProfileHero layout and count text

Portfolio header text:

```
h1: text-2xl font-semibold text-foreground tracking-tight  → "My Journal"
p: text-sm text-text-muted font-mono mt-0.5               → "24 entries logged"
```

In `components/ProfileHero.tsx`:

```tsx
// Name
<Text style={{
  fontSize: 20,
  fontFamily: 'Inter_600SemiBold',
  color: colors.foreground,
  letterSpacing: -0.3,
  marginTop: 12,
}}>
  {profile.name || 'My Journal'}
</Text>

// Count
<Text style={{
  fontSize: 12,
  fontFamily: 'Inter_400Regular',  // monospace ideally, or Inter_400Regular
  color: colors.textMuted,
  marginTop: 4,
  letterSpacing: 0.3,
}}>
  {count} {count === 1 ? 'memory' : 'memories'} logged
</Text>
```

---

## What NOT to change

- Storage logic (`lib/storage.ts`)
- Journal save/load hooks
- Routing
- Voice recorder logic
- Supermemory logic (separate task)

---

## Summary of files to change

1. `constants/colors.ts` — full rewrite with portfolio-exact tokens
2. `components/DotGrid.tsx` — create new
3. `app/index.tsx` — add DotGrid, fix header, wrap calendar in card
4. `app/onboarding.tsx` — add DotGrid
5. `app/settings.tsx` — add DotGrid
6. `components/ProfileHero.tsx` — glow halo, fixed typography
7. `components/JournalCalendar.tsx` — fix toggle, year header, month header
8. `components/CalendarDayCell.tsx` — fix all 5 visual states to match portfolio exactly
9. `components/Legend.tsx` — full rewrite to match portfolio legend

```

***
```
