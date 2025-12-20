import React, { useState, useEffect } from 'react';
import { View, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { trpc } from '@/lib/trpc';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function ReportsScreen() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const [weekStartDate, setWeekStartDate] = useState<string>('');

  // Calculate current week's Monday
  useEffect(() => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    setWeekStartDate(monday.toISOString().split('T')[0]);
  }, []);

  const { data: weeklyReport, isLoading: reportLoading } = trpc.reports.getWeeklyReport.useQuery(
    { weekStartDate },
    { enabled: !!weekStartDate }
  );

  const { data: nutritionAdvice, isLoading: adviceLoading } = trpc.reports.getNutritionAdvice.useQuery(
    { weekStartDate },
    { enabled: !!weekStartDate }
  );

  if (reportLoading || adviceLoading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors[colorScheme ?? 'light'].tint} />
      </ThemedView>
    );
  }

  if (!weeklyReport || !nutritionAdvice) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <ThemedText style={styles.errorText}>レポートの読み込みに失敗しました</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]}>
      <ThemedView style={styles.header}>
        <ThemedText style={styles.title}>週間レポート</ThemedText>
        <ThemedText style={styles.subtitle}>
          {weekStartDate} 〜 {weeklyReport.weekEndDate}
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>食事統計</ThemedText>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{weeklyReport.totalMeals}</ThemedText>
            <ThemedText style={styles.statLabel}>総食事数</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{weeklyReport.lunches}</ThemedText>
            <ThemedText style={styles.statLabel}>ランチ</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{weeklyReport.dinners}</ThemedText>
            <ThemedText style={styles.statLabel}>ディナー</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{weeklyReport.completionRate}%</ThemedText>
            <ThemedText style={styles.statLabel}>完了率</ThemedText>
          </View>
        </View>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>カテゴリ別分布</ThemedText>
        <View style={styles.categoryStats}>
          <View style={styles.categoryItem}>
            <ThemedText style={styles.categoryLabel}>和食</ThemedText>
            <ThemedText style={styles.categoryValue}>{weeklyReport.categoryStats.japanese}</ThemedText>
          </View>
          <View style={styles.categoryItem}>
            <ThemedText style={styles.categoryLabel}>洋食</ThemedText>
            <ThemedText style={styles.categoryValue}>{weeklyReport.categoryStats.western}</ThemedText>
          </View>
          <View style={styles.categoryItem}>
            <ThemedText style={styles.categoryLabel}>中華</ThemedText>
            <ThemedText style={styles.categoryValue}>{weeklyReport.categoryStats.chinese}</ThemedText>
          </View>
          <View style={styles.categoryItem}>
            <ThemedText style={styles.categoryLabel}>その他</ThemedText>
            <ThemedText style={styles.categoryValue}>{weeklyReport.categoryStats.other}</ThemedText>
          </View>
        </View>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText style={styles.sectionTitle}>栄養バランス分析</ThemedText>
        <View style={styles.nutritionScore}>
          <ThemedText style={styles.scoreLabel}>栄養スコア</ThemedText>
          <ThemedText style={styles.scoreValue}>{nutritionAdvice.nutritionScore}/100</ThemedText>
        </View>
        <ThemedText style={styles.analysisText}>{nutritionAdvice.analysis}</ThemedText>
        <ThemedText style={styles.recommendationsTitle}>改善アドバイス</ThemedText>
        {nutritionAdvice.recommendations.map((rec: string, index: number) => (
          <ThemedText key={index} style={styles.recommendationItem}>
            • {rec}
          </ThemedText>
        ))}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  section: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    opacity: 0.7,
  },
  categoryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryItem: {
    alignItems: 'center',
    flex: 1,
  },
  categoryLabel: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  categoryValue: {
    fontSize: 20,
    fontWeight: '600',
  },
  nutritionScore: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
  },
  scoreLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  analysisText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  recommendationItem: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
    opacity: 0.9,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 50,
  },
});