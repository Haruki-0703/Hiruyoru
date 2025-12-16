import { useRouter } from "expo-router";
import { useState, useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useLocalMeals } from "@/hooks/use-local-meals";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { trpc } from "@/lib/trpc";

const categoryLabels: Record<string, string> = {
  japanese: "和食",
  western: "洋食",
  chinese: "中華",
  other: "その他",
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function getMonthDates(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();

  const weeks: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = [];

  for (let i = 0; i < startDayOfWeek; i++) {
    currentWeek.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(new Date(year, month, day));
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  return weeks;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export default function HistoryScreen() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const startDate = formatDate(new Date(year, month, 1));
  const endDate = formatDate(new Date(year, month + 1, 0));

  // Local storage for guest mode
  const { getMealsByDateRange: getLocalMealsByDateRange, loading: localLoading } = useLocalMeals();

  // Server data for logged-in users
  const { data: serverMeals, isLoading: serverLoading } = trpc.meals.getByDateRange.useQuery(
    { startDate, endDate },
    { enabled: isAuthenticated }
  );

  const isLoading = authLoading || (isAuthenticated ? serverLoading : localLoading);
  const monthMeals = isAuthenticated ? serverMeals : getLocalMealsByDateRange(startDate, endDate);

  const mealsByDate = useMemo(() => {
    const map: Record<string, typeof monthMeals> = {};
    if (monthMeals) {
      monthMeals.forEach((meal: any) => {
        if (!map[meal.date]) {
          map[meal.date] = [];
        }
        map[meal.date]!.push(meal);
      });
    }
    return map;
  }, [monthMeals]);

  const weeks = useMemo(() => getMonthDates(year, month), [year, month]);

  const selectedMeals = selectedDate ? mealsByDate[selectedDate] : null;

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  };

  if (authLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={styles.headerEmoji}>📅</ThemedText>
          <ThemedText type="title">食事履歴</ThemedText>
        </View>

        {/* Guest Mode Notice */}
        {!isAuthenticated && (
          <Pressable
            style={[styles.guestNotice, { backgroundColor: colors.tint + "15", borderColor: colors.tint }]}
            onPress={() => router.push("/modal")}
          >
            <ThemedText style={[styles.guestNoticeText, { color: colors.textSecondary }]}>
              📱 ゲストモードの記録を表示中
            </ThemedText>
            <ThemedText style={[styles.guestNoticeLink, { color: colors.tint }]}>
              ログインしてクラウド同期 →
            </ThemedText>
          </Pressable>
        )}

        {/* Month Navigation */}
        <View style={[styles.monthNav, { backgroundColor: colors.card }]}>
          <Pressable onPress={goToPreviousMonth} style={styles.navButton}>
            <ThemedText style={[styles.navButtonText, { color: colors.tint }]}>
              ←
            </ThemedText>
          </Pressable>
          <ThemedText type="subtitle">
            {year}年{month + 1}月
          </ThemedText>
          <Pressable onPress={goToNextMonth} style={styles.navButton}>
            <ThemedText style={[styles.navButtonText, { color: colors.tint }]}>
              →
            </ThemedText>
          </Pressable>
        </View>

        {/* Calendar */}
        <View style={[styles.calendar, { backgroundColor: colors.card }]}>
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((day, index) => (
              <View key={day} style={styles.weekdayCell}>
                <ThemedText
                  style={[
                    styles.weekdayText,
                    {
                      color:
                        index === 0
                          ? colors.error
                          : index === 6
                          ? colors.tint
                          : colors.textSecondary,
                    },
                  ]}
                >
                  {day}
                </ThemedText>
              </View>
            ))}
          </View>

          {isLoading ? (
            <View style={styles.calendarLoading}>
              <ActivityIndicator size="small" color={colors.tint} />
            </View>
          ) : (
            weeks.map((week, weekIndex) => (
              <View key={weekIndex} style={styles.weekRow}>
                {week.map((date, dayIndex) => {
                  if (!date) {
                    return <View key={dayIndex} style={styles.dayCell} />;
                  }

                  const dateStr = formatDate(date);
                  const hasMeals = mealsByDate[dateStr] && mealsByDate[dateStr]!.length > 0;
                  const isSelected = selectedDate === dateStr;
                  const isToday = dateStr === formatDate(new Date());

                  return (
                    <Pressable
                      key={dayIndex}
                      style={[
                        styles.dayCell,
                        isSelected && { backgroundColor: colors.tint },
                        isToday && !isSelected && { borderColor: colors.tint, borderWidth: 2 },
                      ]}
                      onPress={() => setSelectedDate(dateStr)}
                    >
                      <ThemedText
                        style={[
                          styles.dayText,
                          {
                            color:
                              isSelected
                                ? "#FFFFFF"
                                : dayIndex === 0
                                ? colors.error
                                : dayIndex === 6
                                ? colors.tint
                                : colors.text,
                          },
                        ]}
                      >
                        {date.getDate()}
                      </ThemedText>
                      {hasMeals && (
                        <View
                          style={[
                            styles.mealDot,
                            { backgroundColor: isSelected ? "#FFFFFF" : colors.tint },
                          ]}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ))
          )}
        </View>

        {/* Selected Date Details */}
        {selectedDate && (
          <View style={styles.detailsSection}>
            <ThemedText type="subtitle" style={styles.detailsTitle}>
              {new Date(selectedDate + "T00:00:00").toLocaleDateString("ja-JP", {
                month: "long",
                day: "numeric",
                weekday: "long",
              })}
            </ThemedText>

            {selectedMeals && selectedMeals.length > 0 ? (
              selectedMeals.map((meal: any) => (
                <View
                  key={meal.id}
                  style={[styles.mealCard, { backgroundColor: colors.card }]}
                >
                  <View style={styles.mealHeader}>
                    <ThemedText style={styles.mealEmoji}>
                      {meal.mealType === "lunch" ? "🍱" : "🍽️"}
                    </ThemedText>
                    <View style={styles.mealInfo}>
                      <ThemedText style={[styles.mealType, { color: colors.textSecondary }]}>
                        {meal.mealType === "lunch" ? "ランチ" : "ディナー"}
                      </ThemedText>
                      <ThemedText style={styles.mealName}>{meal.dishName}</ThemedText>
                    </View>
                    <View
                      style={[
                        styles.categoryBadge,
                        { backgroundColor: colors[meal.category as keyof typeof colors] || colors.tint },
                      ]}
                    >
                      <ThemedText style={styles.categoryText}>
                        {categoryLabels[meal.category]}
                      </ThemedText>
                    </View>
                  </View>
                  {meal.note && (
                    <ThemedText style={[styles.mealNote, { color: colors.textSecondary }]}>
                      {meal.note}
                    </ThemedText>
                  )}
                </View>
              ))
            ) : (
              <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
                <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
                  この日の記録はありません
                </ThemedText>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  headerEmoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  guestNotice: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  guestNoticeText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  guestNoticeLink: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    textAlign: "center",
    marginTop: Spacing.xs,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  navButton: {
    padding: Spacing.sm,
  },
  navButtonText: {
    fontSize: 24,
    fontWeight: "bold",
  },
  calendar: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: Spacing.sm,
  },
  weekdayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  weekRow: {
    flexDirection: "row",
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.sm,
    margin: 2,
  },
  dayText: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  mealDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
  calendarLoading: {
    paddingVertical: Spacing.xl,
    alignItems: "center",
  },
  detailsSection: {
    marginTop: Spacing.md,
  },
  detailsTitle: {
    marginBottom: Spacing.md,
  },
  mealCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
  },
  mealHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  mealEmoji: {
    fontSize: 32,
    marginRight: Spacing.md,
  },
  mealInfo: {
    flex: 1,
  },
  mealType: {
    fontSize: 12,
    lineHeight: 16,
  },
  mealName: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
  },
  categoryBadge: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  categoryText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 14,
  },
  mealNote: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: Spacing.sm,
    paddingLeft: 48,
  },
  emptyCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
