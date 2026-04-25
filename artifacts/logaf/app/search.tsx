import { Feather } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DotGrid } from "@/components/DotGrid";
import { SearchLockScreen } from "@/components/SearchLockScreen";
import { SearchResultSheet } from "@/components/SearchResultSheet";
import { VoiceRecorderButton } from "@/components/VoiceRecorderButton";
import { useColors } from "@/hooks/useColors";
import { useJournalStore } from "@/hooks/useJournalStore";
import { useRotatingIndex } from "@/hooks/useRotatingIndex";
import {
  SearchResult,
  fetchSearchSuggestions,
  searchMemories,
} from "@/lib/supermemory";

const SEARCH_SUGGESTIONS = [
  "what have I been focused on lately?",
  "tell me my happy moments",
  "what was stressing me recently?",
  "what did I do this week?",
  "what am I grateful for?",
  "when did I feel proud of myself?",
  "show my important memories this month",
  "what decisions did I make lately?",
  "what have I been learning?",
  "what did I talk about most this year?",
  "when did I feel most motivated?",
  "what were my recent challenges?",
  "show moments I felt calm",
  "what made me smile recently?",
  "what have I been working toward?",
  "when did I feel overwhelmed?",
  "what personal wins did I have?",
  "show my recent reflections",
  "what patterns do you see in my journal?",
  "what should I revisit from last month?",
] as const;

const SEARCH_CHIP_SUGGESTIONS = [
  "Tell me my moments from the past month",
  "Show my happy moments",
  "What was I stressed about recently?",
  "What did I learn this week?",
  "What am I grateful for lately?",
  "Show my biggest wins this year",
  "What decisions did I make this month?",
  "What have I been focused on lately?",
  "Show moments I felt calm",
  "What should I revisit from my journal?",
];

function formatDisplayDate(value?: string): string {
  if (!value) return "";
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Skeleton card that mirrors the shape of a real SearchResultCard.
 * Left strip + date line + content lines pulse together.
 */
function SkeletonCard() {
  const colors = useColors();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [anim]);

  const shimmer = colors.borderStrong;

  return (
    <Animated.View
      style={{
        opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] }),
        backgroundColor: colors.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: "hidden",
        flexDirection: "row",
      }}
    >
      {/* Left strip placeholder */}
      <View style={{ width: 3, backgroundColor: shimmer }} />
      {/* Content area */}
      <View style={{ flex: 1, padding: 14, paddingLeft: 13, gap: 10 }}>
        <View style={{ width: 76, height: 9, borderRadius: 5, backgroundColor: shimmer }} />
        <View style={{ width: "92%", height: 12, borderRadius: 6, backgroundColor: shimmer }} />
        <View style={{ width: "76%", height: 12, borderRadius: 6, backgroundColor: shimmer }} />
        <View style={{ width: "50%", height: 12, borderRadius: 6, backgroundColor: shimmer }} />
      </View>
    </Animated.View>
  );
}

function SearchResultCard({ result, onPress }: { result: SearchResult; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? colors.cardAlt : colors.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: pressed ? colors.accentRing : colors.border,
        overflow: "hidden",
        flexDirection: "row",
      })}
    >
      {/* Left accent strip */}
      <View style={{ width: 3, backgroundColor: colors.accent, opacity: 0.8 }} />
      {/* Content */}
      <View style={{ flex: 1, padding: 14, paddingLeft: 13, gap: 6 }}>
        <Text style={[styles.resultDate, { color: colors.accent }]}>
          {formatDisplayDate(result.metadata?.date ?? result.updatedAt)}
        </Text>
        <Text numberOfLines={3} style={[styles.resultBody, { color: colors.text }]}>
          {result.memory ?? ""}
        </Text>
      </View>
      {/* Chevron */}
      <View style={{ justifyContent: "center", paddingRight: 14 }}>
        <Feather name="chevron-right" size={14} color={colors.textDim} />
      </View>
    </Pressable>
  );
}

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = useJournalStore();

  const [query, setQuery] = useState("");
  const [allResults, setAllResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chipStartIndex, setChipStartIndex] = useState(0);
  const [profileSuggestions, setProfileSuggestions] = useState<string[]>([]);
  const [inputFocused, setInputFocused] = useState(false);

  // Placeholder cycles: 3000ms per item, 180ms fade-out, 220ms fade-in
  const [suggestionIndex, placeholderOpacity] = useRotatingIndex(
    SEARCH_SUGGESTIONS.length,
    3000,
    180,
    220,
  );
  const inputRef = useRef<TextInput | null>(null);

  const currentSuggestion = SEARCH_SUGGESTIONS[suggestionIndex] ?? SEARCH_SUGGESTIONS[0]!;
  const searchBarHighlighted = inputFocused || query.trim().length > 0;

  const visibleSuggestionChips = useMemo(() => {
    if (SEARCH_CHIP_SUGGESTIONS.length <= 4) return SEARCH_CHIP_SUGGESTIONS;
    return Array.from({ length: 4 }, (_, idx) => {
      const index = (chipStartIndex + idx) % SEARCH_CHIP_SUGGESTIONS.length;
      return SEARCH_CHIP_SUGGESTIONS[index]!;
    });
  }, [chipStartIndex]);

  const suggestionPills = profileSuggestions.length ? profileSuggestions : visibleSuggestionChips;

  useEffect(() => {
    const interval = setInterval(() => {
      setChipStartIndex((prev) => (prev + 1) % SEARCH_CHIP_SUGGESTIONS.length);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!profile.supermemoryKey?.trim()) {
      setProfileSuggestions([]);
      return;
    }
    let cancelled = false;
    fetchSearchSuggestions(
      profile.supermemoryKey,
      profile.supermemoryContainerTag || null,
    ).then((res) => {
      if (cancelled) return;
      if (res.success && res.suggestions?.length) {
        setProfileSuggestions(res.suggestions);
      }
    });
    return () => { cancelled = true; };
  }, [profile.supermemoryContainerTag, profile.supermemoryKey]);

  const handleSearch = useCallback(
    async (text: string) => {
      const value = text.trim();
      if (!value) {
        setAllResults([]);
        setHasSearched(false);
        setError(null);
        return;
      }
      if (!profile.supermemoryKey?.trim()) {
        setHasSearched(true);
        setError("Supermemory key not available.");
        return;
      }

      setLoading(true);
      setHasSearched(true);
      setError(null);

      const res = await searchMemories(
        profile.supermemoryKey,
        value,
        profile.supermemoryContainerTag || null,
      );
      if (res.success && res.data) {
        setAllResults(res.data.results ?? []);
      } else {
        setAllResults([]);
        setError(res.error ?? "Search failed.");
      }
      setLoading(false);
    },
    [profile.supermemoryContainerTag, profile.supermemoryKey],
  );

  const showPrompt = !loading && !hasSearched && query.trim().length === 0;
  const showNoResults = !loading && hasSearched && allResults.length === 0 && !error;

  // All hooks called above — safe to early-return here.
  if (!profile.supermemoryEnabled) {
    return <SearchLockScreen topInset={insets.top} />;
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <DotGrid />
      <StatusBar style="light" />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={[styles.title, { color: colors.text }]}>Search</Text>
      </View>

      <View
        style={[
          styles.searchBar,
          {
            backgroundColor: colors.cardAlt,
            borderColor: searchBarHighlighted ? colors.accentRing : colors.border,
            shadowColor: colors.accent,
            shadowOpacity: searchBarHighlighted ? 0.22 : 0,
          },
        ]}
      >
        <Feather
          name="search"
          size={16}
          color={searchBarHighlighted ? colors.accent : colors.textMuted}
        />
        <View style={styles.inputWrap}>
          {!query.length && !inputFocused && (
            <Animated.Text
              style={[styles.placeholder, { color: colors.textDim, opacity: placeholderOpacity }]}
              numberOfLines={1}
            >
              {currentSuggestion}
            </Animated.Text>
          )}
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            onSubmitEditing={() => {
              void handleSearch(query);
              Keyboard.dismiss();
              inputRef.current?.blur();
            }}
            returnKeyType="search"
            blurOnSubmit
            placeholder=""
            style={[styles.input, { color: colors.text }]}
            selectionColor={colors.accent}
          />
        </View>
        {query.length > 0 && (
          <Pressable
            onPress={() => {
              setQuery("");
              setAllResults([]);
              setHasSearched(false);
              setError(null);
            }}
          >
            <Feather name="x" size={15} color={colors.textMuted} />
          </Pressable>
        )}
        {inputFocused ? (
          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              inputRef.current?.blur();
            }}
            style={[styles.doneBtn, { borderColor: colors.accentRing }]}
          >
            <Text style={[styles.doneText, { color: colors.accent }]}>Done</Text>
          </Pressable>
        ) : (
          <VoiceRecorderButton
            compact
            onTranscript={(text) => {
              setQuery(text);
              void handleSearch(text);
            }}
          />
        )}
      </View>

      {!loading && query.trim().length === 0 ? (
        <View style={styles.suggestionsWrap}>
          {suggestionPills.map((item, idx) => (
            <Pressable
              key={`${item}-${idx}`}
              onPress={() => {
                setQuery(item);
                void handleSearch(item);
              }}
              style={[
                styles.suggestionChip,
                idx === 0
                  ? styles.suggestionChipSoftRect
                  : idx === 1
                    ? styles.suggestionChipPill
                    : idx === 2
                      ? styles.suggestionChipBlock
                      : styles.suggestionChipRounded,
                { borderColor: colors.accentRing },
              ]}
            >
              <Text numberOfLines={2} style={[styles.suggestionLabel, { color: colors.accent }]}>
                {item}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 22 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{ gap: 10, paddingTop: 12 }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorWrap}>
            <Feather name="alert-circle" size={18} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.textMuted }]}>{error}</Text>
          </View>
        ) : null}

        {showPrompt ? (
          <Text style={[styles.promptText, { color: colors.textDim }]}>
            Ask anything about your past
          </Text>
        ) : null}

        {showNoResults ? (
          <View style={{ alignItems: "center", padding: 40 }}>
            <Feather name="inbox" size={28} color={colors.textDim} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Your journal hasn't captured this yet
            </Text>
          </View>
        ) : null}

        {!loading && allResults.length > 0 ? (
          <View style={{ gap: 10, marginTop: 14 }}>
            {allResults.map((result, idx) => (
              <SearchResultCard
                key={`${result.id}-${idx}`}
                result={result}
                onPress={() => setSelectedResult(result)}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>

      <SearchResultSheet
        result={selectedResult}
        visible={selectedResult !== null}
        onClose={() => setSelectedResult(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  title: {
    fontFamily: "SpaceGrotesk_600SemiBold",
    fontSize: 22,
    letterSpacing: -0.4,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 10,
    marginHorizontal: 16,
    marginTop: 8,
    minHeight: 54,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  inputWrap: {
    flex: 1,
    minHeight: 22,
    justifyContent: "center",
  },
  placeholder: {
    position: "absolute",
    left: 0,
    right: 0,
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 15,
  },
  input: {
    flex: 1,
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 15,
    padding: 0,
  },
  suggestionsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    alignItems: "flex-start",
  },
  suggestionChip: {
    maxWidth: "82%",
    borderWidth: 1,
    minHeight: 38,
    justifyContent: "center",
    backgroundColor: "rgba(196,244,65,0.08)",
  },
  suggestionChipSoftRect: {
    borderRadius: 14,
    minHeight: 44,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  suggestionChipPill: {
    borderRadius: 999,
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  suggestionChipBlock: {
    borderRadius: 12,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  suggestionChipRounded: {
    borderRadius: 22,
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  suggestionLabel: {
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.15,
  },
  doneBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  doneText: {
    fontFamily: "SpaceGrotesk_500Medium",
    fontSize: 12,
    letterSpacing: 0.2,
  },
  promptText: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
    textAlign: "center",
    marginTop: 40,
  },
  emptyText: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 14,
    marginTop: 12,
    textAlign: "center",
  },
  resultDate: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  resultBody: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 14,
    lineHeight: 21,
  },
  errorWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 18,
  },
  errorText: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontSize: 13,
    flex: 1,
  },
});
