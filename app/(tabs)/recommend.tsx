import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useColorScheme } from "@/hooks/use-color-scheme";
import { trpc } from "@/lib/trpc";

type Category = "japanese" | "western" | "chinese" | "other";

interface Recommendation {
  name: string;
  category: Category;
  reason: string;
}

const categoryLabels: Record<string, string> = {
  japanese: "和食",
  western: "洋食",
  chinese: "中華",
  other: "その他",
};

const categoryEmojis: Record<string, string> = {
  japanese: "🍱",
  western: "🍝",
  chinese: "🥟",
  other: "🍽️",
};

function getTodayDate(): string {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

export default function RecommendScreen() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [todayDate] = useState(getTodayDate());

  const { data: todayMeals, refetch: refetchMeals } = trpc.meals.getByDate.useQuery(
    { date: todayDate },
    { enabled: isAuthenticated }
  );

  const utils = trpc.useUtils();
  const getRecommendationsMutation = trpc.recommendations.getDinnerRecommendations.useMutation();
  const createMealMutation = trpc.meals.create.useMutation({
    onSuccess: () => {
      utils.meals.getByDate.invalidate();
      utils.meals.getRecent.invalidate();
    },
  });

  const todayLunch = todayMeals?.find((m) => m.mealType === "lunch");
  const todayDinner = todayMeals?.find((m) => m.mealType === "dinner");

  useEffect(() => {
    if (todayLunch && !todayDinner && recommendations.length === 0) {
      fetchRecommendations();
    }
  }, [todayLunch, todayDinner]);

  const fetchRecommendations = async () => {
    if (!todayLunch) return;

    setIsLoading(true);
    try {
      const result = await getRecommendationsMutation.mutateAsync({
        lunchDishName: todayLunch.dishName,
        lunchCategory: todayLunch.category as Category,
      });
      setRecommendations(result);
    } catch (error) {
      console.error("Failed to get recommendations:", error);
      Alert.alert("エラー", "おすすめの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDinner = async (recommendation: Recommendation) => {
    setIsSelecting(true);
    try {
      await createMealMutation.mutateAsync({
        date: todayDate,
        mealType: "dinner",
        dishName: recommendation.name,
        category: recommendation.category,
        note: `おすすめから選択: ${recommendation.reason}`,
      });
      Alert.alert("記録完了", `${recommendation.name}を今日のディナーに記録しました！`, [
        { text: "OK", onPress: () => router.push("/(tabs)") },
      ]);
    } catch (error) {
      console.error("Failed to record dinner:", error);
      Alert.alert("エラー", "記録に失敗しました");
    } finally {
      setIsSelecting(false);
    }
  };

  if (authLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  // Not logged in - show login prompt with feature explanation
  if (!isAuthenticated) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            styles.centeredContent,
            { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.lockedContainer}>
            <ThemedText style={styles.lockedEmoji}>🔒</ThemedText>
            <ThemedText type="title" style={styles.lockedTitle}>
              ログインが必要です
            </ThemedText>
            <ThemedText style={[styles.lockedSubtitle, { color: colors.textSecondary }]}>
              AIおすすめディナー機能は{"\n"}ログインユーザー限定の機能です
            </ThemedText>

            <View style={[styles.featureCard, { backgroundColor: colors.card }]}>
              <ThemedText style={styles.featureTitle}>✨ この機能でできること</ThemedText>
              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <ThemedText style={styles.featureBullet}>•</ThemedText>
                  <ThemedText style={styles.featureText}>
                    ランチの内容に基づいたAIおすすめ
                  </ThemedText>
                </View>
                <View style={styles.featureItem}>
                  <ThemedText style={styles.featureBullet}>•</ThemedText>
                  <ThemedText style={styles.featureText}>
                    栄養バランスを考慮した提案
                  </ThemedText>
                </View>
                <View style={styles.featureItem}>
                  <ThemedText style={styles.featureBullet}>•</ThemedText>
                  <ThemedText style={styles.featureText}>
                    ワンタップでディナーを記録
                  </ThemedText>
                </View>
              </View>
            </View>

            <Pressable
              style={[styles.loginButton, { backgroundColor: colors.tint }]}
              onPress={() => router.push("/modal")}
            >
              <ThemedText style={styles.loginButtonText}>ログイン / 新規登録</ThemedText>
            </Pressable>

            <Pressable
              style={styles.guestButton}
              onPress={() => router.push("/(tabs)/record")}
            >
              <ThemedText style={[styles.guestButtonText, { color: colors.textSecondary }]}>
                ゲストとしてランチを記録する
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </ThemedView>
    );
  }

  // No lunch recorded yet
  if (!todayLunch) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing.lg }]}>
        <View style={styles.centerContent}>
          <ThemedText style={styles.emoji}>🍱</ThemedText>
          <ThemedText type="subtitle" style={styles.message}>
            まずランチを記録しましょう
          </ThemedText>
          <ThemedText style={[styles.subMessage, { color: colors.textSecondary }]}>
            ランチの内容に基づいて{"\n"}夜ご飯をおすすめします
          </ThemedText>
          <Pressable
            style={[styles.actionButton, { backgroundColor: colors.tint }]}
            onPress={() => router.push("/(tabs)/record")}
          >
            <ThemedText style={styles.actionButtonText}>ランチを記録する</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  // Dinner already recorded
  if (todayDinner) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top + Spacing.lg }]}>
        <View style={styles.centerContent}>
          <ThemedText style={styles.emoji}>✅</ThemedText>
          <ThemedText type="subtitle" style={styles.message}>
            今日のディナーは記録済みです
          </ThemedText>
          <View style={[styles.dinnerCard, { backgroundColor: colors.card }]}>
            <ThemedText style={styles.dinnerEmoji}>
              {categoryEmojis[todayDinner.category]}
            </ThemedText>
            <ThemedText style={styles.dinnerName}>{todayDinner.dishName}</ThemedText>
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
          <Pressable
            style={[styles.secondaryButton, { borderColor: colors.tint }]}
            onPress={() => router.push("/(tabs)")}
          >
            <ThemedText style={[styles.secondaryButtonText, { color: colors.tint }]}>
              ホームに戻る
            </ThemedText>
          </Pressable>
        </View>
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
          <ThemedText style={styles.headerEmoji}>✨</ThemedText>
          <ThemedText type="title">夜ご飯のおすすめ</ThemedText>
        </View>

        {/* Today's Lunch Summary */}
        <View style={[styles.lunchSummary, { backgroundColor: colors.card }]}>
          <ThemedText style={[styles.summaryLabel, { color: colors.textSecondary }]}>
            今日のランチ
          </ThemedText>
          <View style={styles.lunchInfo}>
            <ThemedText style={styles.lunchEmoji}>
              {categoryEmojis[todayLunch.category]}
            </ThemedText>
            <ThemedText style={styles.lunchName}>{todayLunch.dishName}</ThemedText>
          </View>
        </View>

        {/* Loading State */}
        {isLoading && (
          <View style={styles.loadingSection}>
            <ActivityIndicator size="large" color={colors.tint} />
            <ThemedText style={[styles.loadingText, { color: colors.textSecondary }]}>
              AIがおすすめを考え中...
            </ThemedText>
          </View>
        )}

        {/* Recommendations */}
        {!isLoading && recommendations.length > 0 && (
          <View style={styles.recommendationsSection}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              おすすめメニュー
            </ThemedText>
            {recommendations.map((rec, index) => (
              <View
                key={index}
                style={[styles.recommendCard, { backgroundColor: colors.card }]}
              >
                <View style={styles.recommendHeader}>
                  <View style={[styles.rankBadge, { backgroundColor: index === 0 ? colors.tint : colors.textSecondary }]}>
                    <ThemedText style={styles.rankText}>{index + 1}</ThemedText>
                  </View>
                  <View style={styles.recommendInfo}>
                    <ThemedText style={styles.recommendName}>{rec.name}</ThemedText>
                    <View
                      style={[
                        styles.smallBadge,
                        { backgroundColor: colors[rec.category as keyof typeof colors] || colors.tint },
                      ]}
                    >
                      <ThemedText style={styles.smallBadgeText}>
                        {categoryLabels[rec.category]}
                      </ThemedText>
                    </View>
                  </View>
                </View>
                <ThemedText style={[styles.recommendReason, { color: colors.textSecondary }]}>
                  💡 {rec.reason}
                </ThemedText>
                <Pressable
                  style={[styles.selectButton, { backgroundColor: colors.tint }]}
                  onPress={() => handleSelectDinner(rec)}
                  disabled={isSelecting}
                >
                  {isSelecting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <ThemedText style={styles.selectButtonText}>これにする</ThemedText>
                  )}
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Refresh Button */}
        {!isLoading && recommendations.length > 0 && (
          <Pressable
            style={[styles.refreshButton, { borderColor: colors.tint }]}
            onPress={fetchRecommendations}
          >
            <ThemedText style={[styles.refreshButtonText, { color: colors.tint }]}>
              別のおすすめを見る
            </ThemedText>
          </Pressable>
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
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  centeredContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emoji: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  message: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subMessage: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  actionButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  secondaryButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    marginTop: Spacing.lg,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  dinnerCard: {
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.lg,
  },
  dinnerEmoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  dinnerName: {
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 28,
    marginBottom: Spacing.sm,
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
  lunchSummary: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  summaryLabel: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: Spacing.xs,
  },
  lunchInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  lunchEmoji: {
    fontSize: 24,
    marginRight: Spacing.sm,
  },
  lunchName: {
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 26,
  },
  loadingSection: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: 14,
    lineHeight: 20,
  },
  recommendationsSection: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  recommendCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recommendHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  rankText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
    lineHeight: 20,
  },
  recommendInfo: {
    flex: 1,
  },
  recommendName: {
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 26,
    marginBottom: Spacing.xs,
  },
  smallBadge: {
    alignSelf: "flex-start",
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
  recommendReason: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  selectButton: {
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  selectButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  categoryBadge: {
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
  refreshButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    alignItems: "center",
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  lockedContainer: {
    alignItems: "center",
    paddingHorizontal: Spacing.md,
  },
  lockedEmoji: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  lockedTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  lockedSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  featureCard: {
    width: "100%",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  featureList: {
    gap: Spacing.sm,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  featureBullet: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  featureText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  loginButton: {
    width: "100%",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  guestButton: {
    padding: Spacing.md,
  },
  guestButtonText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
