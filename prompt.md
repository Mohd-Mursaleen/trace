# trace — Search Tab + Profile Card + Settings Revamp

## Project context

This is a React Native + Expo journal app called **trace** at `artifacts/logaf/`. It is a local-first personal journal where entries are stored in AsyncStorage. Supermemory is an optional integration — users push journal entries to Supermemory as memories and can search/retrieve them semantically.

**Existing relevant files:**

- `app/index.tsx` — home screen
- `app/settings.tsx` — settings screen
- `components/DayEditorSheet.tsx` — journal entry editor
- `components/Toast.tsx` — toast system
- `components/DotGrid.tsx` — dot grid background
- `lib/supermemory.ts` — Supermemory sync helper
- `lib/storage.ts` — AsyncStorage CRUD (Profile, JournalEntry, IndexEntry)
- `hooks/useJournalStore.tsx` — global context (profile, index, loadEntry)
- `hooks/useColors.ts` — theme tokens
- `constants/colors.ts` — accent: `#c4f441`, bg: `#0a0a0a`

**Supermemory containerTag used throughout:** `"trace_user"` — use this for ALL Supermemory API calls.

---

## PART 1 — Bottom Tab Navigation

### Replace the current single-screen navigation with a bottom tab navigator

In `app/_layout.tsx`, replace the Stack navigator with an Expo Router Tabs navigator:

```tsx
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { Platform } from "react-native";

export default function Layout() {
  const colors = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: Platform.OS === "ios" ? 88 : 68,
          paddingBottom: Platform.OS === "ios" ? 28 : 12,
          paddingTop: 10,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 12,
          letterSpacing: 0.2,
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Journal",
          tabBarIcon: ({ color, size }) => (
            <Feather name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, size }) => (
            <Feather name="zap" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

Tab bar design rules:

- `backgroundColor: colors.surface` (`#111111`)
- `borderTopColor: colors.border` (`#1e1e1e`)
- Active: `colors.accent` (`#c4f441`)
- Inactive: `colors.textMuted` (`#666666`)
- Both tabs have labels — "Journal" and "Search"
- Calendar icon for Journal, Zap (⚡) icon for Search
- The two tabs are wide and comfortable since there are only 2

Move settings out of tabs — it remains a Stack screen pushed from the Journal tab via `router.push('/settings')`. Update `_layout.tsx` to handle this with a nested Stack inside the tabs if needed.

---

## PART 2 — Search Screen (`app/search.tsx`)

Create this file from scratch.

### 2A — Lock screen (Supermemory not enabled)

If `profile.supermemoryEnabled === false`, show a full lock screen:

```tsx
<View
  style={{
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  }}
>
  <DotGrid />
  {/* Lock icon with lime glow halo */}
  <View
    style={{ alignItems: "center", justifyContent: "center", marginBottom: 32 }}
  >
    <View
      style={{
        position: "absolute",
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: "rgba(196,244,65,0.06)",
      }}
    />
    <View
      style={{
        position: "absolute",
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "rgba(196,244,65,0.1)",
      }}
    />
    <Feather name="lock" size={32} color={colors.accent} />
  </View>
  <Text
    style={{
      fontFamily: "Inter_600SemiBold",
      fontSize: 20,
      color: colors.text,
      textAlign: "center",
      letterSpacing: -0.3,
    }}
  >
    Search is locked
  </Text>
  <Text
    style={{
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      color: colors.textMuted,
      textAlign: "center",
      marginTop: 8,
      lineHeight: 22,
    }}
  >
    Enable Supermemory to search your journal semantically — ask anything about
    your past.
  </Text>
  <Pressable
    onPress={() => router.push("/settings")}
    style={{
      marginTop: 28,
      backgroundColor: colors.accent,
      paddingHorizontal: 24,
      paddingVertical: 14,
      borderRadius: 999,
    }}
  >
    <Text
      style={{
        fontFamily: "Inter_600SemiBold",
        fontSize: 14,
        color: "#0a0a0a",
      }}
    >
      Enable in Settings
    </Text>
  </Pressable>
</View>
```

### 2B — Search screen (Supermemory enabled)

State variables needed:

```ts
const [query, setQuery] = useState("");
const [results, setResults] = useState<SearchResult[]>([]);
const [loading, setLoading] = useState(false);
const [activeFilter, setActiveFilter] = useState<string | null>(null);
const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
const [hasSearched, setHasSearched] = useState(false);
```

### 2C — Rotating placeholder suggestions

Define this array at the top of the file (30+ items, generic and relatable):

```ts
const SEARCH_SUGGESTIONS = [
  "when was I last really happy?",
  "what was I stressed about last month?",
  "when did I feel proud of myself?",
  "what was I working on in January?",
  "times I felt grateful",
  "when did I last travel somewhere?",
  "what made me anxious recently?",
  "moments I felt at peace",
  "when did I last meet someone new?",
  "what was I excited about this year?",
  "times I felt overwhelmed",
  "when did I have a breakthrough?",
  "what was I reading or watching?",
  "when did I last exercise or stay active?",
  "moments of self-doubt",
  "when did I feel most creative?",
  "what was I worried about in February?",
  "times I celebrated something",
  "when did I last feel lonely?",
  "what decisions did I make this month?",
  "times I laughed a lot",
  "when did I last feel motivated?",
  "what was I building or creating?",
  "moments I was proud of my work",
  "when did I last talk to someone important?",
  "what was on my mind this week?",
  "times I felt stuck",
  "when did I last try something new?",
  "what made me smile recently?",
  "moments I needed rest",
];
```

Use `useEffect` with `setInterval` (3000ms) to rotate through the suggestions by index. The rotating text appears as the input placeholder, not as separate pill buttons.

The placeholder text changes with a subtle fade/opacity animation using `Animated.timing`.

### 2D — Filter pills

Define these filter pills:

```ts
const FILTER_OPTIONS = [
  { label: "This week", key: "week" },
  { label: "This month", key: "month" },
  { label: "Last 3 months", key: "3months" },
  { label: "This year", key: "year" },
  { label: "All time", key: "all" },
];
```

Filters appear as a horizontal ScrollView below the search input, always visible. When a filter is selected:

- It gets `backgroundColor: colors.accent`, text `color: '#0a0a0a'`
- Others: `backgroundColor: colors.cardAlt`, text `color: colors.textMuted`
- Selecting a filter + having a query → re-triggers search with metadata filter

Filter → metadata filter mapping for Supermemory API:

```ts
function getDateFilter(filterKey: string) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  if (filterKey === "week") {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return `${weekAgo.getFullYear()}-${pad(weekAgo.getMonth() + 1)}-${pad(weekAgo.getDate())}`;
  }
  if (filterKey === "month") {
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
  }
  if (filterKey === "3months") {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 3);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
  }
  if (filterKey === "year") {
    return `${now.getFullYear()}-01-01`;
  }
  return null; // all time = no filter
}
```

### 2E — Supermemory Search API call

Create/update `lib/supermemory.ts` to add a search function:

```ts
export type SearchResult = {
  id: string;
  memory?: string;
  chunk?: string;
  similarity: number;
  metadata?: {
    date?: string;
    source?: string;
    year?: string;
    month?: string;
    [key: string]: any;
  };
  updatedAt?: string;
};

export type SearchResponse = {
  results: SearchResult[];
  timing: number;
  total: number;
};

export async function searchMemories(
  key: string,
  query: string,
  dateFrom?: string | null,
): Promise<{ success: boolean; data?: SearchResponse; error?: string }> {
  if (!key?.trim() || !query?.trim()) {
    return { success: false, error: "missing key or query" };
  }

  const body: any = {
    q: query,
    containerTag: "trace_user",
    searchMode: "hybrid",
    limit: 8,
    threshold: 0.5,
    rerank: true,
  };

  if (dateFrom) {
    body.filters = {
      AND: [{ key: "date", value: dateFrom, operator: "gte" }],
    };
  }

  try {
    const res = await fetch("https://api.supermemory.ai/v3/memories/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key.trim()}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `${res.status}: ${errText}` };
    }

    const data: SearchResponse = await res.json();
    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e?.message ?? "network error" };
  }
}
```

Also add profile fetch:

```ts
export type ProfileResponse = {
  profile: {
    static: string[];
    dynamic: string[];
  };
  searchResults?: SearchResponse;
};

export async function fetchProfile(
  key: string,
): Promise<{ success: boolean; data?: ProfileResponse; error?: string }> {
  if (!key?.trim()) return { success: false, error: "no key" };
  try {
    const res = await fetch(
      `https://api.supermemory.ai/v3/profile?containerTag=trace_user`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${key.trim()}`,
        },
      },
    );
    if (!res.ok) {
      const t = await res.text();
      return { success: false, error: `${res.status}: ${t}` };
    }
    const data: ProfileResponse = await res.json();
    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e?.message ?? "network error" };
  }
}
```

### 2F — Voice search

Add a mic button next to the search input. Use React Native's built-in `Voice` via `expo-speech` is NOT for this — use the device's native speech recognition via `@react-native-voice/voice` if available, OR use the existing `useVoiceRecorder` + Deepgram pipeline that's already in the app.

Actually — use the **existing `VoiceRecorderButton` component** and wire `onTranscript` to set the query and auto-trigger search:

```tsx
<VoiceRecorderButton
  onTranscript={(text) => {
    setQuery(text);
    handleSearch(text);
  }}
/>
```

Place it inside the search input row on the right side.

### 2G — Search input UI

```tsx
<View
  style={{
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.cardAlt,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginHorizontal: 16,
    marginTop: 16,
  }}
>
  <Feather name="search" size={16} color={colors.textMuted} />
  <TextInput
    value={query}
    onChangeText={setQuery}
    onSubmitEditing={() => handleSearch(query)}
    returnKeyType="search"
    placeholder={currentSuggestion} // rotates from SEARCH_SUGGESTIONS
    placeholderTextColor={colors.textDim}
    style={{
      flex: 1,
      fontFamily: "Inter_400Regular",
      fontSize: 15,
      color: colors.text,
    }}
    selectionColor={colors.accent}
  />
  {query.length > 0 && (
    <Pressable
      onPress={() => {
        setQuery("");
        setResults([]);
        setHasSearched(false);
      }}
    >
      <Feather name="x" size={15} color={colors.textMuted} />
    </Pressable>
  )}
  <VoiceRecorderButton
    onTranscript={(text) => {
      setQuery(text);
      handleSearch(text);
    }}
  />
</View>
```

### 2H — Results list

Each result card in the list:

```tsx
// Result card
<Pressable
  onPress={() => setSelectedResult(result)}
  style={({ pressed }) => ({
    backgroundColor: pressed ? colors.cardAlt : colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
  })}
>
  {/* Date badge */}
  <Text
    style={{
      fontFamily: "Inter_400Regular",
      fontSize: 11,
      color: colors.accent,
      letterSpacing: 0.4,
      textTransform: "uppercase",
    }}
  >
    {formatDisplayDate(result.metadata?.date || result.updatedAt)}
  </Text>

  {/* Memory/chunk text */}
  <Text
    numberOfLines={3}
    style={{
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      color: colors.text,
      lineHeight: 22,
    }}
  >
    {result.memory || result.chunk || ""}
  </Text>

  {/* Similarity score as a subtle bar */}
  <View
    style={{
      height: 2,
      backgroundColor: colors.border,
      borderRadius: 1,
      overflow: "hidden",
    }}
  >
    <View
      style={{
        height: 2,
        width: `${Math.round(result.similarity * 100)}%`,
        backgroundColor: colors.accent,
        borderRadius: 1,
        opacity: 0.6,
      }}
    />
  </View>
</Pressable>
```

`formatDisplayDate` converts `"2026-04-14"` or ISO string to `"April 14, 2026"`.

### 2I — Empty + loading states

**Loading:** Show 3 skeleton cards (animated opacity pulse) while searching.

**No results:**

```tsx
<View style={{ alignItems: "center", padding: 40 }}>
  <Feather name="inbox" size={28} color={colors.textDim} />
  <Text
    style={{
      color: colors.textMuted,
      fontFamily: "Inter_400Regular",
      fontSize: 14,
      marginTop: 12,
      textAlign: "center",
    }}
  >
    Your journal hasn't captured this yet
  </Text>
</View>
```

**Pre-search (hasSearched = false):**
Show a prompt-style UI with just the suggestion pills:

```tsx
<Text
  style={{
    color: colors.textDim,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    textAlign: "center",
    marginTop: 40,
  }}
>
  Ask anything about your past
</Text>
```

---

## PART 3 — Result Bottom Sheet (90% screen)

Create `components/SearchResultSheet.tsx`.

When a result is tapped, this sheet slides up covering 90% of the screen.

```tsx
type Props = {
  result: SearchResult | null;
  visible: boolean;
  onClose: () => void;
  localEntry?: JournalEntry | null; // loaded from AsyncStorage by date
};
```

### Sheet structure

```
┌─────────────────────────────────┐
│   ─────  (drag handle)          │
│                                 │
│   APRIL 14, 2026                │ ← date, monospace, accent color
│   ──────────────────────        │
│                                 │
│   [full journal text here]      │ ← from localEntry.text if available
│   [or memory/chunk from API]    │   fallback to result.memory
│                                 │
│   ──────────────────────        │
│                                 │
│   Photos                        │ ← section label
│   [photo strip if images exist] │
│                                 │
└─────────────────────────────────┘
```

Implementation:

- Use React Native `Modal` with `animationType="slide"` and `presentationStyle="pageSheet"`
- Inside: a `ScrollView`
- Drag handle at top: `width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong, alignSelf: 'center', marginTop: 12, marginBottom: 20`
- When `result` has a `metadata.date`, load the local entry via `loadEntry(date)` from `useJournalStore` to get the full text + images

### Date display in sheet

```tsx
<Text
  style={{
    fontFamily: "Inter_400Regular", // monospace feel
    fontSize: 11,
    color: colors.accent,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
  }}
>
  {formatDisplayDate(date)} // "April 14, 2026"
</Text>
```

### Text display

```tsx
<Text
  style={{
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    lineHeight: 28,
    color: colors.text,
    letterSpacing: 0.1,
  }}
>
  {localEntry?.text || result.memory || result.chunk}
</Text>
```

### Photos in sheet

If `localEntry?.images` has items, show them as a vertical stack of rounded images (not a strip — full readable width):

```tsx
{
  localEntry?.images?.map((uri, i) => (
    <Image
      key={i}
      source={{ uri }}
      style={{
        width: "100%",
        height: 220,
        borderRadius: 12,
        marginTop: 16,
      }}
      contentFit="cover"
    />
  ));
}
```

---

## PART 4 — Settings Screen Revamp + Profile Card

Completely revamp `app/settings.tsx`. Keep the same data/logic but redesign the layout.

### 4A — Profile Card (top of settings)

This is the hero element of the settings screen. It looks like a vertical ID badge/card.

Structure:

```
┌─────────────────────────────────┐
│                                 │
│    [profile photo - special]    │
│                                 │
│    Mohd Mursaleen               │ ← name
│    trace member                 │ ← subtitle
│                                 │
│    ┌──────────┬──────────┐      │
│    │ 47       │ Apr 2026 │      │
│    │ memories │ member since    │
│    └──────────┴──────────┘      │
│                                 │
│    CURRENT VIBE                 │ ← from profile.dynamic
│    "Working on something new"   │
│                                 │
│    RECENT CONTEXT               │ ← from profile.dynamic[1..2]
│    "Has been feeling motivated" │
│                                 │
└─────────────────────────────────┘
```

**Card styling:**

```tsx
<View style={{
  marginHorizontal: 16,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.card,
  overflow: 'hidden',
  padding: 24,
  alignItems: 'center',
  gap: 0,
}}>
```

**Profile photo — non-generic presentation:**
Instead of a plain circle, use a hexagon-shaped clip or a square with heavily rounded corners (24px radius) with a subtle lime border glow:

```tsx
<View style={{
  width: 88,
  height: 88,
  borderRadius: 24,
  borderWidth: 1.5,
  borderColor: 'rgba(196,244,65,0.4)',
  overflow: 'hidden',
  marginBottom: 16,
  // Outer glow
  shadowColor: '#c4f441',
  shadowOpacity: 0.2,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 0 },
  elevation: 8,
}}>
  {profile.photoUri ? (
    <Image source={{ uri: profile.photoUri }} style={{ width: 88, height: 88 }} contentFit="cover" />
  ) : (
    <View style={{ width: 88, height: 88, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 28, fontFamily: 'Inter_700Bold', color: colors.accent }}>
        {profile.name?.?.toUpperCase() || '?'}
      </Text>
    </View>
  )}
</View>
```

**Stats row:**

```tsx
<View
  style={{
    flexDirection: "row",
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 16,
    overflow: "hidden",
  }}
>
  <View
    style={{
      flex: 1,
      padding: 14,
      alignItems: "center",
      borderRightWidth: 1,
      borderRightColor: colors.border,
    }}
  >
    <Text
      style={{ fontFamily: "Inter_700Bold", fontSize: 22, color: colors.text }}
    >
      {index.length}
    </Text>
    <Text
      style={{
        fontFamily: "Inter_400Regular",
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 2,
      }}
    >
      memories
    </Text>
  </View>
  <View style={{ flex: 1, padding: 14, alignItems: "center" }}>
    <Text
      style={{
        fontFamily: "Inter_600SemiBold",
        fontSize: 13,
        color: colors.text,
      }}
    >
      {memberSince}
    </Text>
    <Text
      style={{
        fontFamily: "Inter_400Regular",
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 2,
      }}
    >
      member since
    </Text>
  </View>
</View>
```

`memberSince` = earliest date in `index` array formatted as `"Apr 2026"`.

**Current vibe + recent context (from Supermemory profile.dynamic):**

Only show if Supermemory is enabled. Auto-fetch on settings screen mount:

```ts
useEffect(() => {
  if (!profile.supermemoryEnabled || !profile.supermemoryKey) return;
  let cancelled = false;
  setProfileLoading(true);
  fetchProfile(profile.supermemoryKey).then((res) => {
    if (cancelled) return;
    setProfileLoading(false);
    if (res.success && res.data) {
      setSmProfile(res.data.profile);
    } else {
      setSmProfile(null);
    }
  });
  return () => {
    cancelled = true;
  };
}, []); // fetch once on mount
```

Display:

```tsx
{
  profileLoading ? (
    <ActivityIndicator
      size="small"
      color={colors.accent}
      style={{ marginTop: 16 }}
    />
  ) : smProfile ? (
    <View style={{ width: "100%", gap: 12, marginTop: 16 }}>
      {smProfile.dynamic && (
        <View style={{ gap: 4 }}>
          <Text
            style={{
              fontFamily: "Inter_500Medium",
              fontSize: 10,
              color: colors.textDim,
              letterSpacing: 1.4,
              textTransform: "uppercase",
            }}
          >
            Current vibe
          </Text>
          <Text
            style={{
              fontFamily: "Inter_400Regular",
              fontSize: 13,
              color: colors.textMuted,
              lineHeight: 20,
            }}
          >
            {smProfile.dynamic}
          </Text>
        </View>
      )}
      {smProfile.dynamic.slice(1, 3).length > 0 && (
        <View style={{ gap: 4 }}>
          <Text
            style={{
              fontFamily: "Inter_500Medium",
              fontSize: 10,
              color: colors.textDim,
              letterSpacing: 1.4,
              textTransform: "uppercase",
            }}
          >
            Recent context
          </Text>
          {smProfile.dynamic.slice(1, 3).map((item, i) => (
            <Text
              key={i}
              style={{
                fontFamily: "Inter_400Regular",
                fontSize: 13,
                color: colors.textMuted,
                lineHeight: 20,
              }}
            >
              - {item}
            </Text>
          ))}
        </View>
      )}
    </View>
  ) : profile.supermemoryEnabled ? (
    <Text
      style={{
        fontFamily: "Inter_400Regular",
        fontSize: 13,
        color: colors.textDim,
        marginTop: 16,
        textAlign: "center",
      }}
    >
      Not enough memories yet
    </Text>
  ) : null;
}
```

If Supermemory is NOT enabled, show the card without the vibe/context sections — just photo, name, stats.

### 4B — Settings sections below the card

Keep all existing functionality. Just restyle the sections to be consistent cards:

Each section:

```tsx
<View
  style={{
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: "hidden",
  }}
>
  {/* section rows inside */}
</View>
```

Section title above each card:

```tsx
<Text
  style={{
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: colors.textDim,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginLeft: 20,
    marginBottom: 8,
    marginTop: 24,
  }}
>
  Profile
</Text>
```

Each row inside a section has a hairline border between items:

```tsx
<View
  style={{
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  }}
>
  {/* row content */}
</View>
```

### 4C — About section

Update the version text from `log.af · v1.0.0` to `trace · v1.0.0`.

---

## PART 5 — Update supermemory.ts sync to include metadata

In the existing `syncToSupermemory` function, update the body to include proper metadata for filtering:

```ts
body: JSON.stringify({
  content: `${date}\n\n${text}`,
  containerTag: 'trace_user',
  metadata: {
    source: 'trace',
    date: date,                          // "2026-04-14"
    year: date.split('-'),            // "2026"
    month: date.slice(0, 7),             // "2026-04"
  },
}),
```

This is essential for date-based filtering to work in search.

---

## PART 6 — Files to create/modify

### Create

- `app/search.tsx` — full search screen
- `components/SearchResultSheet.tsx` — 90% bottom sheet for result

### Modify

- `app/_layout.tsx` — replace Stack with Tabs
- `app/settings.tsx` — full revamp with profile card
- `lib/supermemory.ts` — add `searchMemories()`, `fetchProfile()`, update `syncToSupermemory` metadata

### Do NOT change

- `lib/storage.ts`
- `hooks/useJournalStore.tsx`
- `hooks/useVoiceRecorder.ts`
- `components/DayEditorSheet.tsx`
- `components/JournalCalendar.tsx`
- `components/CalendarDayCell.tsx`
- `app/index.tsx`

---

## Design rules (apply everywhere)

- Background: `#0a0a0a`
- Cards: `#111111`
- Elevated: `#1a1a1a`
- Border: `#1e1e1e`
- Accent: `#c4f441`
- Text on accent: `#0a0a0a`
- Muted: `#666666`
- All dates shown as `"April 14, 2026"` format
- Monospace/uppercase for section labels and metadata
- Inter font family throughout
- DotGrid background on both Search and Settings screens
- No gradients, no heavy shadows
- Smooth Animated transitions for sheet open/close
