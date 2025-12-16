import { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  Switch,
  Alert,
  ScrollView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";

const REMINDER_TIMES = [
  { label: "11:00", value: "11:00" },
  { label: "11:30", value: "11:30" },
  { label: "12:00", value: "12:00" },
  { label: "12:30", value: "12:30" },
  { label: "13:00", value: "13:00" },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuth();
  
  const {
    permissionStatus,
    isEnabled,
    reminderTime,
    requestPermission,
    scheduleLunchReminder,
    cancelLunchReminder,
    sendTestNotification,
  } = useNotifications();

  const [notificationsEnabled, setNotificationsEnabled] = useState(isEnabled);
  const [selectedTime, setSelectedTime] = useState(reminderTime);

  useEffect(() => {
    setNotificationsEnabled(isEnabled);
    setSelectedTime(reminderTime);
  }, [isEnabled, reminderTime]);

  const handleNotificationToggle = async (value: boolean) => {
    if (value) {
      // Request permission if not granted
      if (permissionStatus !== "granted") {
        const granted = await requestPermission();
        if (!granted) {
          Alert.alert(
            "通知の許可が必要です",
            "設定アプリから通知を許可してください。",
            [{ text: "OK" }]
          );
          return;
        }
      }
      
      await scheduleLunchReminder(selectedTime);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      await cancelLunchReminder();
    }
    setNotificationsEnabled(value);
  };

  const handleTimeChange = async (time: string) => {
    setSelectedTime(time);
    if (notificationsEnabled) {
      await scheduleLunchReminder(time);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleTestNotification = async () => {
    if (permissionStatus !== "granted") {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert("通知の許可が必要です", "設定アプリから通知を許可してください。");
        return;
      }
    }
    await sendTestNotification();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("テスト通知を送信しました", "通知が届いたか確認してください。");
  };

  const handleLogout = () => {
    Alert.alert(
      "ログアウト",
      "ログアウトしますか？",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "ログアウト",
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/");
          },
        },
      ]
    );
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={{ color: colors.tint }}>← 戻る</ThemedText>
        </Pressable>
        <ThemedText type="title" style={styles.title}>設定</ThemedText>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Notification Settings */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>通知設定</ThemedText>
          
          <View style={[styles.settingRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.settingInfo}>
              <ThemedText style={styles.settingLabel}>ランチリマインダー</ThemedText>
              <ThemedText style={[styles.settingDescription, { color: colors.textSecondary }]}>
                毎日指定時刻にランチ記録のリマインドを送信
              </ThemedText>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: colors.border, true: colors.tint }}
              thumbColor="#fff"
            />
          </View>

          {notificationsEnabled && (
            <View style={[styles.timeSelector, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ThemedText style={styles.timeSelectorLabel}>リマインド時刻</ThemedText>
              <View style={styles.timeOptions}>
                {REMINDER_TIMES.map((time) => (
                  <Pressable
                    key={time.value}
                    style={[
                      styles.timeOption,
                      {
                        backgroundColor: selectedTime === time.value ? colors.tint : colors.background,
                        borderColor: selectedTime === time.value ? colors.tint : colors.border,
                      },
                    ]}
                    onPress={() => handleTimeChange(time.value)}
                  >
                    <ThemedText
                      style={[
                        styles.timeOptionText,
                        { color: selectedTime === time.value ? "#fff" : colors.text },
                      ]}
                    >
                      {time.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <Pressable
            style={[styles.testButton, { borderColor: colors.tint }]}
            onPress={handleTestNotification}
          >
            <ThemedText style={[styles.testButtonText, { color: colors.tint }]}>
              テスト通知を送信
            </ThemedText>
          </Pressable>
        </View>

        {/* Account Section */}
        {isAuthenticated && (
          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>アカウント</ThemedText>
            
            <View style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ThemedText style={styles.userName}>{user?.name || "ユーザー"}</ThemedText>
              <ThemedText style={[styles.userEmail, { color: colors.textSecondary }]}>
                {user?.email || "メールアドレス未設定"}
              </ThemedText>
            </View>

            <Pressable
              style={[styles.logoutButton, { backgroundColor: "rgba(255, 59, 48, 0.1)" }]}
              onPress={handleLogout}
            >
              <ThemedText style={styles.logoutButtonText}>ログアウト</ThemedText>
            </Pressable>
          </View>
        )}

        {/* App Info */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>アプリ情報</ThemedText>
          
          <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.infoRow}>
              <ThemedText style={[styles.infoLabel, { color: colors.textSecondary }]}>バージョン</ThemedText>
              <ThemedText>v0.4.0</ThemedText>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: colors.border }]} />
            <View style={styles.infoRow}>
              <ThemedText style={[styles.infoLabel, { color: colors.textSecondary }]}>ビルド</ThemedText>
              <ThemedText>2024.12.16</ThemedText>
            </View>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  backButton: {
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: 28,
    lineHeight: 36,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
    fontSize: 18,
    lineHeight: 24,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  settingInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  settingDescription: {
    fontSize: 13,
    marginTop: 4,
  },
  timeSelector: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  timeSelectorLabel: {
    fontSize: 14,
    marginBottom: Spacing.sm,
  },
  timeOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  timeOption: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
  timeOptionText: {
    fontSize: 14,
    fontWeight: "500",
  },
  testButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  testButtonText: {
    fontWeight: "600",
  },
  userCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  userName: {
    fontSize: 18,
    fontWeight: "600",
  },
  userEmail: {
    fontSize: 14,
    marginTop: 4,
  },
  logoutButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "#FF3B30",
    fontWeight: "600",
  },
  infoCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: Spacing.md,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoDivider: {
    height: 1,
  },
});
