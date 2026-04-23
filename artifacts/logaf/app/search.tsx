import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
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
import { SearchResultSheet } from "@/components/SearchResultSheet";
import { VoiceRecorderButton } from "@/components/VoiceRecorderButton";
import { useColors } from "@/hooks/useColors";
import { useJournalStore } from "@/hooks/useJournalStore";
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
];

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

const FILTER_OPTIONS = [
  { label: "This week", key: "week" },
  { label: "This month", key: "month" },
  { label: "Last 3 months", key: "3months" },
  { label: "This year", key: "year" },
  { label: "All time", key: "all" },
];

function getDateFilter(filterKey: string) {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");

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
  return null;
}

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

function getResultDate(result: SearchResult): Date | null {
  const raw = result.metadata?.date ?? result.updatedAt;
  if (!raw) return null;
  const parsed = new Date(raw.length === 10 ? `${raw}T00:00:00` : raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function applyDateFilter(results: SearchResult[], filterKey: string): SearchResult[] {
  const dateFrom = getDateFilter(filterKey);
  if (!dateFrom) return results;
  const cutoff = new Date(`${dateFrom}T00:00:00`);
  return results.filter((result) => {
    const d = getResultDate(result);
    return d ? d >= cutoff : true;
  });
}

function SkeletonCard() {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.5)).current;
  const shimmer = "rgba(180, 200, 220, 0.15)";

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        opacity,
        backgroundColor: colors.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 16,
        gap: 10,
      }}
    >
      <View
        style={{
          width: 110,
          height: 10,
          borderRadius: 5,
          backgroundColor: shimmer,
        }}
      />
      <View
        style={{
          width: "100%",
          height: 13,
          borderRadius: 6,
          backgroundColor: shimmer,
        }}
      />
      <View
        style={{
          width: "80%",
          height: 13,
          borderRadius: 6,
          backgroundColor: shimmer,
        }}
      />
      <View
        style={{
          width: "55%",
          height: 13,
          borderRadius: 6,
          backgroundColor: shimmer,
        }}
      />
      <View
        style={{
          width: "100%",
          height: 2,
          borderRadius: 1,
          backgroundColor: shimmer,
        }}
      />
    </Animated.View>
  );
}

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = useJournalStore();

  const [query, setQuery] = useState("");
  const [allResults, setAllResults] = useState<SearchResult[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [chipStartIndex, setChipStartIndex] = useState(0);
  const [profileSuggestions, setProfileSuggestions] = useState<string[]>([]);
  const [inputFocused, setInputFocused] = useState(false);

  const placeholderOpacity = useRef(new Animated.Value(1)).current;
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
  const suggestionPills = profileSuggestions.length
    ? profileSuggestions
    : visibleSuggestionChips;

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(placeholderOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => {
        setSuggestionIndex((prev) => (prev + 1) % SEARCH_SUGGESTIONS.length);
        Animated.timing(placeholderOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }).start();
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [placeholderOpacity]);

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
    return () => {
      cancelled = true;
    };
  }, [profile.supermemoryContainerTag, profile.supermemoryKey]);

  const handleSearch = useCallback(
    async (text: string) => {
      const value = text.trim();
      if (!value) {
        setAllResults([]);
        setResults([]);
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
      console.log("[search] start", {
        query: value,
        filter: activeFilter,
        containerTag: profile.supermemoryContainerTag?.trim() || null,
      });

      const res = await searchMemories(
        profile.supermemoryKey,
        value,
        profile.supermemoryContainerTag || null,
      );
      if (res.success && res.data) {
        console.log("[search] success", {
          results: res.data.results?.length ?? 0,
        });
        const nextAll = res.data.results ?? [];
        setAllResults(nextAll);
        setResults(applyDateFilter(nextAll, activeFilter));
      } else {
        console.log("[search] failed", res.error);
        setAllResults([]);
        setResults([]);
        setError(res.error ?? "Search failed.");
      }
      setLoading(false);
    },
    [activeFilter, profile.supermemoryContainerTag, profile.supermemoryKey],
  );

  useEffect(() => {
    setResults(applyDateFilter(allResults, activeFilter));
  }, [activeFilter, allResults]);

  const showPrompt = !loading && !hasSearched && query.trim().length === 0;
  const showNoResults = !loading && hasSearched && results.length === 0 && !error;

  const lockScreen = useMemo(() => {
    if (profile.supermemoryEnabled) return null;
    return (
      <View
        style={[
          styles.lockRoot,
          {
            backgroundColor: colors.background,
            paddingTop: insets.top + 24,
          },
        ]}
      >
        <DotGrid />
        <View style={styles.lockIconWrap}>
          <View style={styles.lockHaloOuter} />
          <View style={styles.lockHaloInner} />
          <Feather name="lock" size={32} color={colors.accent} />
        </View>
        <Text style={[styles.lockTitle, { color: colors.text }]}>Search is locked</Text>
        <Text style={[styles.lockBody, { color: colors.textMuted }]}>
          Enable Supermemory to search your journal semantically - ask anything
          about your past.
        </Text>
        <Pressable
          onPress={() => router.push("/settings")}
          style={[styles.lockBtn, { backgroundColor: colors.accent }]}
        >
          <Text style={styles.lockBtnText}>Enable in Settings</Text>
        </Pressable>
      </View>
    );
  }, [colors, insets.top, profile.supermemoryEnabled]);

  if (lockScreen) {
    return (
      <View style={{ flex: 1 }}>
        <StatusBar style="light" />
        {lockScreen}
      </View>
    );
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
              style={[
                styles.placeholder,
                { color: colors.textDim, opacity: placeholderOpacity },
              ]}
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
              setResults([]);
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

      {!loading && allResults.length > 0 ? (
        <View style={styles.filtersWrap}>
          {FILTER_OPTIONS.map((item) => {
            const active = activeFilter === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setActiveFilter(item.key)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active ? colors.accent : colors.cardAlt,
                    borderColor: active ? colors.accentRing : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterLabel,
                    { color: active ? "#0a0a0a" : colors.textMuted },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : !loading && query.trim().length === 0 ? (
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
                {
                  borderColor: colors.accentRing,
                },
              ]}
            >
              <Text
                numberOfLines={2}
                style={[styles.suggestionLabel, { color: colors.accent }]}
              >
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
          <View style={{ gap: 10, paddingHorizontal: 16, paddingTop: 12 }}>
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

        {!loading && results.length > 0 ? (
          <View style={{ gap: 12, marginTop: 14 }}>
            {results.map((result, idx) => (
              <Pressable
                key={`${result.id}-${idx}`}
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
                <Text style={[styles.resultDate, { color: colors.accent }]}>
                  {formatDisplayDate(result.metadata?.date ?? result.updatedAt)}
                </Text>
                <Text numberOfLines={3} style={[styles.resultBody, { color: colors.text }]}>
                  {result.memory ?? ""}
                </Text>
                <View
                  style={[
                    styles.scoreTrack,
                    {
                      backgroundColor: colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.scoreFill,
                      {
                        width: `${Math.round((result.similarity ?? 0) * 100)}%`,
                        backgroundColor: colors.accent,
                      },
                    ]}
                  />
                </View>
              </Pressable>
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
    fontFamily: "Inter_600SemiBold",
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
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  input: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    padding: 0,
  },
  filtersWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  filterPill: {
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  filterLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 0.2,
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
    fontFamily: "Inter_500Medium",
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
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 0.2,
  },
  promptText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    textAlign: "center",
    marginTop: 40,
  },
  emptyText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    marginTop: 12,
    textAlign: "center",
  },
  resultDate: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  resultBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
  },
  scoreTrack: {
    height: 2,
    borderRadius: 1,
    overflow: "hidden",
  },
  scoreFill: {
    height: 2,
    borderRadius: 1,
    opacity: 0.6,
  },
  skeletonCard: {
    height: 104,
    borderRadius: 14,
    borderWidth: 1,
  },
  errorWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 18,
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    flex: 1,
  },
  lockRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  lockIconWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  lockHaloOuter: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(196,244,65,0.06)",
  },
  lockHaloInner: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(196,244,65,0.1)",
  },
  lockTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 20,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  lockBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },
  lockBtn: {
    marginTop: 28,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 999,
  },
  lockBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#0a0a0a",
  },
});
