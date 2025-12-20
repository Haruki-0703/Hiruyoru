import { useRouter } from "expo-router";
import { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
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

function getTodayDate(): string {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

export default function HomeScreen() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const [todayDate] = useState(getTodayDate());
  const [refreshing, setRefreshing] = useState(false);

  // Local storage for guest mode
  const {
    getMealsByDate: getLocalMealsByDate,
    getRecentMeals: getLocalRecentMeals,
    loading: localLoading,
    refresh: refreshLocal,
  } = useLocalMeals();

  // Server data for logged-in users
  const { data: serverMeals, isLoading: serverLoading, refetch: refetchServer } = trpc.meals.getByDate.useQuery(
    { date: todayDate },
    { enabled: isAuthenticated }
  );

  const { data: serverRecentMeals, refetch: refetchRecentServer } = trpc.meals.getRecent.useQuery(
    { limit: 5 },
    { enabled: isAuthenticated }
  );

  // Determine which data source to use
  const isLoading = authLoading || (isAuthenticated ? serverLoading : localLoading);
  
  const todayMeals = isAuthenticated 
    ? serverMeals 
    : getLocalMealsByDate(todayDate);
  
  const recentMeals = isAuthenticated 
    ? serverRecentMeals 
    : getLocalRecentMeals(5);

  const todayLunch = todayMeals?.find((m: any) => m.mealType === "lunch");
  const todayDinner = todayMeals?.find((m: any) => m.mealType === "dinner");

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (isAuthenticated) {
      await Promise.all([refetchServer(), refetchRecentServer()]);
    } else {
      refreshLocal();
    }
    setRefreshing(false);
  }, [isAuthenticated, refetchServer, refetchRecentServer, refreshLocal]);

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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }} />
            <Pressable
              style={[styles.settingsButton, { backgroundColor: colors.card }]}
              onPress={() => router.push("/settings")}
            >
              <ThemedText style={{ fontSize: 20 }}>⚙️</ThemedText>
            </Pressable>
          </View>
          <ThemedText type="title" style={styles.greeting}>
            {isAuthenticated && user?.name 
              ? `こんにちは、${user.name}さん` 
              : "こんにちは"}
          </ThemedText>
          <ThemedText style={[styles.dateText, { color: colors.textSecondary }]}>
            {new Date().toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "long",
            })}
          </ThemedText>
        </View>

        {/* Guest Mode Banner */}
        {!isAuthenticated && (
          <Pressable
            style={[styles.guestBanner, { backgroundColor: colors.tint + "15", borderColor: colors.tint }]}
            onPress={() => router.push("/modal")}
          >
            <View style={styles.guestBannerContent}>
              <ThemedText style={styles.guestBannerEmoji}>✨</ThemedText>
              <View style={styles.guestBannerText}>
                <ThemedText style={[styles.guestBannerTitle, { color: colors.tint }]}>
                  ログインでもっと便利に
                </ThemedText>
                <ThemedText style={[styles.guestBannerSubtitle, { color: colors.textSecondary }]}>
                  AIおすすめ機能・クラウド同期が使えます
                </ThemedText>
              </View>
            </View>
            <ThemedText style={[styles.guestBannerArrow, { color: colors.tint }]}>→</ThemedText>
          </Pressable>
        )}

        {/* Today's Lunch Card */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <ThemedText style={styles.cardEmoji}>🍱</ThemedText>
            <ThemedText type="subtitle">今日のランチ</ThemedText>
          </View>
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.tint} />
          ) : todayLunch ? (
            <View style={styles.mealInfo}>
              <ThemedText style={styles.dishName}>{todayLunch.dishName}</ThemedText>
              <View
                style={[
                  styles.categoryBadge,
                  { backgroundColor: colors[todayLunch.category as keyof typeof colors] || colors.tint },
                ]}
              >
                <ThemedText style={styles.categoryText}>
                  {categoryLabels[todayLunch.category]}
                </ThemedText>
              </View>
              {todayLunch.note && (
                <ThemedText style={[styles.noteText, { color: colors.textSecondary }]}>
                  {todayLunch.note}
                </ThemedText>
              )}
            </View>
          ) : (
            <Pressable
              style={[styles.recordButton, { backgroundColor: colors.tint }]}
              onPress={() => router.push("/(tabs)/record")}
            >
              <ThemedText style={styles.recordButtonText}>ランチを記録する</ThemedText>
            </Pressable>
          )}
        </View>

        {/* Dinner Recommendation Card - Only for logged-in users */}
        {todayLunch && !todayDinner && (
          <Pressable
            style={[
              styles.card, 
              styles.recommendCard, 
              { backgroundColor: isAuthenticated ? colors.tint : colors.card }
            ]}
            onPress={() => {
              if (isAuthenticated) {
                router.push("/(tabs)/recommend");
              } else {
                router.push("/modal");
              }
            }}
          >
            <View style={styles.cardHeader}>
              <ThemedText style={styles.cardEmoji}>✨</ThemedText>
              <ThemedText type="subtitle" style={{ color: isAuthenticated ? "#FFFFFF" : colors.text }}>
                夜ご飯のおすすめ
              </ThemedText>
            </View>
            {isAuthenticated ? (
              <ThemedText style={styles.recommendText}>
                今日のランチに合わせた{"\n"}おすすめメニューをチェック
              </ThemedText>
            ) : (
              <View>
                <ThemedText style={[styles.lockedText, { color: colors.textSecondary }]}>
                  🔒 ログインするとAIが夜ご飯を提案
                </ThemedText>
                <View style={[styles.loginPromptButton, { backgroundColor: colors.tint }]}>
                  <ThemedText style={styles.loginPromptText}>ログインして使う</ThemedText>
                </View>
              </View>
            )}
            {isAuthenticated && (
              <View style={styles.arrowContainer}>
                <ThemedText style={styles.arrowText}>→</ThemedText>
              </View>
            )}
          </Pressable>
        )}

        {/* Today's Dinner Card */}
        {todayDinner && (
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.cardHeader}>
              <ThemedText style={styles.cardEmoji}>🍽️</ThemedText>
              <ThemedText type="subtitle">今日のディナー</ThemedText>
            </View>
            <View style={styles.mealInfo}>
              <ThemedText style={styles.dishName}>{todayDinner.dishName}</ThemedText>
              <View
                style={[
                  styles.categoryBadge,
                  { backgroundColor: colors[todayDinner.category as keyof typeof colors] || colors.tint },
                ]}
              >
                <ThemedText style={styles.categoryText}>
                  {categoryLabels[todayDinner.category]}
                </ThemedText>
              </View>
            </View>
          </View>
        )}

        {/* Recent Meals */}
        {recentMeals && recentMeals.length > 0 && (
          <View style={styles.recentSection}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              最近の食事
            </ThemedText>
            {recentMeals.slice(0, 5).map((meal: any) => (
              <View
                key={meal.id}
                style={[styles.recentItem, { backgroundColor: colors.card }]}
              >
                <View style={styles.recentItemLeft}>
                  <ThemedText style={styles.recentEmoji}>
                    {meal.mealType === "lunch" ? "🍱" : "🍽️"}
                  </ThemedText>
                  <View>
                    <ThemedText style={styles.recentDish}>{meal.dishName}</ThemedText>
                    <ThemedText style={[styles.recentDate, { color: colors.textSecondary }]}>
                      {meal.date} - {meal.mealType === "lunch" ? "ランチ" : "ディナー"}
                    </ThemedText>
                  </View>
                </View>
                <View
                  style={[
                    styles.smallBadge,
                    { backgroundColor: colors[meal.category as keyof typeof colors] || colors.tint },
                  ]}
                >
                  <ThemedText style={styles.smallBadgeText}>
                    {categoryLabels[meal.category]}
                  </ThemedText>
                </View>
              </View>
            ))}
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
    marginBottom: Spacing.lg,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: Spacing.sm,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  greeting: {
    fontSize: 28,
    lineHeight: 36,
  },
  dateText: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: Spacing.xs,
  },
  guestBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  guestBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  guestBannerEmoji: {
    fontSize: 24,
    marginRight: Spacing.sm,
  },
  guestBannerText: {
    flex: 1,
  },
  guestBannerTitle: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  guestBannerSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  guestBannerArrow: {
    fontSize: 18,
    fontWeight: "bold",
  },
  card: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recommendCard: {
    paddingVertical: Spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  cardEmoji: {
    fontSize: 24,
    marginRight: Spacing.sm,
  },
  mealInfo: {
    gap: Spacing.sm,
  },
  dishName: {
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 28,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  categoryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
  },
  recordButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  recordButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  recommendText: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 24,
  },
  lockedText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  loginPromptButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    alignSelf: "flex-start",
  },
  loginPromptText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  arrowContainer: {
    position: "absolute",
    right: Spacing.md,
    top: "50%",
  },
  arrowText: {
    color: "#FFFFFF",
    fontSize: 24,
  },
  recentSection: {
    marginTop: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  recentItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  recentEmoji: {
    fontSize: 24,
    marginRight: Spacing.sm,
  },
  recentDish: {
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 22,
  },
  recentDate: {
    fontSize: 12,
    lineHeight: 16,
  },
  smallBadge: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  smallBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 14,
  },
});
