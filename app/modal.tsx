import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, View, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { getLoginUrl } from "@/constants/oauth";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function ModalScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const { isAuthenticated, loading, logout, user } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      const loginUrl = getLoginUrl();

      if (Platform.OS === "web") {
        window.location.href = loginUrl;
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(
        loginUrl,
        undefined,
        {
          preferEphemeralSession: false,
          showInRecents: true,
        }
      );

      if (result.type === "success" && result.url) {
        let url: URL;
        if (result.url.startsWith("exp://") || result.url.startsWith("exps://")) {
          const urlStr = result.url.replace(/^exp(s)?:\/\//, "http://");
          url = new URL(urlStr);
        } else {
          url = new URL(result.url);
        }

        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");

        if (error) {
          console.error("[Auth] OAuth error:", error);
          return;
        }

        if (code && state) {
          router.push({
            pathname: "/oauth/callback" as any,
            params: { code, state },
          });
        }
      }
    } catch (error) {
      console.error("[Auth] Login error:", error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  // Already logged in - show account info
  if (isAuthenticated) {
    return (
      <ThemedView
        style={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, 20),
            paddingBottom: Math.max(insets.bottom, 20),
            paddingLeft: Math.max(insets.left, 20),
            paddingRight: Math.max(insets.right, 20),
          },
        ]}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={[styles.avatarContainer, { backgroundColor: colors.tint }]}>
              <ThemedText style={styles.avatarText}>
                {user?.name?.charAt(0) || user?.email?.charAt(0) || "U"}
              </ThemedText>
            </View>
            
            <ThemedText type="title" style={styles.title}>
              アカウント
            </ThemedText>
            
            <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
              <View style={styles.infoRow}>
                <ThemedText style={[styles.infoLabel, { color: colors.textSecondary }]}>名前</ThemedText>
                <ThemedText style={styles.infoValue}>{user?.name || "未設定"}</ThemedText>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.infoRow}>
                <ThemedText style={[styles.infoLabel, { color: colors.textSecondary }]}>メール</ThemedText>
                <ThemedText style={styles.infoValue}>{user?.email || "未設定"}</ThemedText>
              </View>
            </View>

            <View style={[styles.featureCard, { backgroundColor: colors.card }]}>
              <ThemedText style={styles.featureTitle}>✨ プレミアム機能</ThemedText>
              <View style={styles.featureList}>
                <View style={styles.featureItem}>
                  <ThemedText style={styles.featureCheck}>✓</ThemedText>
                  <ThemedText style={styles.featureText}>AIおすすめディナー機能</ThemedText>
                </View>
                <View style={styles.featureItem}>
                  <ThemedText style={styles.featureCheck}>✓</ThemedText>
                  <ThemedText style={styles.featureText}>クラウドデータ同期</ThemedText>
                </View>
                <View style={styles.featureItem}>
                  <ThemedText style={styles.featureCheck}>✓</ThemedText>
                  <ThemedText style={styles.featureText}>複数デバイス対応</ThemedText>
                </View>
              </View>
            </View>

            <Pressable
              style={[styles.logoutButton, { borderColor: colors.error }]}
              onPress={logout}
            >
              <ThemedText style={[styles.logoutText, { color: colors.error }]}>ログアウト</ThemedText>
            </Pressable>

            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <ThemedText style={[styles.backText, { color: colors.textSecondary }]}>
                戻る
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </ThemedView>
    );
  }

  // Not logged in - show login options
  return (
    <ThemedView
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 20),
          paddingBottom: Math.max(insets.bottom, 20),
          paddingLeft: Math.max(insets.left, 20),
          paddingRight: Math.max(insets.right, 20),
        },
      ]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <ThemedText style={styles.emoji}>🍽️</ThemedText>
          <ThemedText type="title" style={styles.title}>
            ログイン / 新規登録
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
            アカウントを作成して{"\n"}すべての機能を使いましょう
          </ThemedText>

          {/* Feature comparison */}
          <View style={[styles.comparisonCard, { backgroundColor: colors.card }]}>
            <View style={styles.comparisonHeader}>
              <View style={styles.comparisonCol}>
                <ThemedText style={[styles.comparisonTitle, { color: colors.textSecondary }]}>
                  ゲスト
                </ThemedText>
              </View>
              <View style={styles.comparisonCol}>
                <ThemedText style={[styles.comparisonTitle, { color: colors.tint }]}>
                  ログイン
                </ThemedText>
              </View>
            </View>
            
            <View style={[styles.comparisonRow, { borderTopColor: colors.border }]}>
              <ThemedText style={styles.comparisonFeature}>ランチ記録</ThemedText>
              <ThemedText style={styles.comparisonCheck}>✓</ThemedText>
              <ThemedText style={styles.comparisonCheck}>✓</ThemedText>
            </View>
            <View style={[styles.comparisonRow, { borderTopColor: colors.border }]}>
              <ThemedText style={styles.comparisonFeature}>履歴閲覧</ThemedText>
              <ThemedText style={styles.comparisonCheck}>✓</ThemedText>
              <ThemedText style={styles.comparisonCheck}>✓</ThemedText>
            </View>
            <View style={[styles.comparisonRow, { borderTopColor: colors.border }]}>
              <ThemedText style={styles.comparisonFeature}>AIおすすめ</ThemedText>
              <ThemedText style={[styles.comparisonX, { color: colors.textDisabled }]}>✕</ThemedText>
              <ThemedText style={[styles.comparisonCheck, { color: colors.tint }]}>✓</ThemedText>
            </View>
            <View style={[styles.comparisonRow, { borderTopColor: colors.border }]}>
              <ThemedText style={styles.comparisonFeature}>クラウド同期</ThemedText>
              <ThemedText style={[styles.comparisonX, { color: colors.textDisabled }]}>✕</ThemedText>
              <ThemedText style={[styles.comparisonCheck, { color: colors.tint }]}>✓</ThemedText>
            </View>
          </View>

          {/* Login buttons */}
          <View style={styles.loginButtons}>
            <Pressable
              style={[
                styles.googleButton,
                { backgroundColor: "#FFFFFF", borderColor: colors.border },
                isLoggingIn && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <ActivityIndicator color="#4285F4" />
              ) : (
                <>
                  <ThemedText style={styles.googleIcon}>G</ThemedText>
                  <ThemedText style={styles.googleText}>Googleでログイン</ThemedText>
                </>
              )}
            </Pressable>

            <Pressable
              style={[
                styles.appleButton,
                { backgroundColor: colorScheme === "dark" ? "#FFFFFF" : "#000000" },
                isLoggingIn && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <ActivityIndicator color={colorScheme === "dark" ? "#000000" : "#FFFFFF"} />
              ) : (
                <>
                  <ThemedText style={[styles.appleIcon, { color: colorScheme === "dark" ? "#000000" : "#FFFFFF" }]}>
                    
                  </ThemedText>
                  <ThemedText style={[styles.appleText, { color: colorScheme === "dark" ? "#000000" : "#FFFFFF" }]}>
                    Appleでログイン
                  </ThemedText>
                </>
              )}
            </Pressable>

            <Pressable
              style={[
                styles.emailButton,
                { backgroundColor: colors.tint },
                isLoggingIn && styles.buttonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <ThemedText style={styles.emailText}>メールアドレスで続ける</ThemedText>
              )}
            </Pressable>
          </View>

          <ThemedText style={[styles.termsText, { color: colors.textSecondary }]}>
            ログインすることで、利用規約とプライバシーポリシーに同意したことになります
          </ThemedText>

          <Pressable style={styles.skipButton} onPress={() => router.back()}>
            <ThemedText style={[styles.skipText, { color: colors.textSecondary }]}>
              ゲストとして続ける
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: Spacing.md,
  },
  emoji: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  infoCard: {
    width: "100%",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  infoLabel: {
    fontSize: 14,
    lineHeight: 20,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  divider: {
    height: 1,
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
    alignItems: "center",
  },
  featureCheck: {
    fontSize: 16,
    color: "#34C759",
    marginRight: Spacing.sm,
  },
  featureText: {
    fontSize: 14,
    lineHeight: 20,
  },
  comparisonCard: {
    width: "100%",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  comparisonHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingBottom: Spacing.sm,
  },
  comparisonCol: {
    width: 70,
    alignItems: "center",
  },
  comparisonTitle: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  comparisonRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  comparisonFeature: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  comparisonCheck: {
    width: 70,
    textAlign: "center",
    fontSize: 16,
    color: "#34C759",
  },
  comparisonX: {
    width: 70,
    textAlign: "center",
    fontSize: 16,
  },
  loginButtons: {
    width: "100%",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4285F4",
  },
  googleText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    lineHeight: 24,
  },
  appleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  appleIcon: {
    fontSize: 18,
    fontWeight: "bold",
  },
  appleText: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  emailButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  emailText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    lineHeight: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  termsText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  skipButton: {
    padding: Spacing.md,
  },
  skipText: {
    fontSize: 14,
    lineHeight: 20,
  },
  logoutButton: {
    width: "100%",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  backButton: {
    padding: Spacing.md,
  },
  backText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
