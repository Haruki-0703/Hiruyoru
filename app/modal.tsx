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

type AuthStep = "idle" | "connecting" | "authenticating" | "completing" | "success" | "error";

export default function ModalScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const { isAuthenticated, loading, logout, user } = useAuth();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authStep, setAuthStep] = useState<AuthStep>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getStepMessage = (step: AuthStep): string => {
    switch (step) {
      case "connecting":
        return "認証サーバーに接続中...";
      case "authenticating":
        return "認証情報を確認中...";
      case "completing":
        return "ログイン処理を完了中...";
      case "success":
        return "ログイン成功！";
      case "error":
        return errorMessage || "エラーが発生しました";
      default:
        return "";
    }
  };

  const getErrorUserMessage = (error: string): string => {
    if (error.includes("network") || error.includes("Network")) {
      return "ネットワーク接続を確認してください。Wi-Fiまたはモバイルデータが有効か確認してください。";
    }
    if (error.includes("cancel") || error.includes("Cancel")) {
      return "ログインがキャンセルされました。もう一度お試しください。";
    }
    if (error.includes("timeout") || error.includes("Timeout")) {
      return "接続がタイムアウトしました。しばらく待ってから再度お試しください。";
    }
    if (error.includes("invalid") || error.includes("Invalid")) {
      return "認証情報が無効です。再度ログインしてください。";
    }
    return "予期せぬエラーが発生しました。しばらく待ってから再度お試しください。";
  };

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      setAuthStep("connecting");
      setErrorMessage(null);
      
      const loginUrl = getLoginUrl();

      if (Platform.OS === "web") {
        setAuthStep("authenticating");
        window.location.href = loginUrl;
        return;
      }

      setAuthStep("authenticating");
      const result = await WebBrowser.openAuthSessionAsync(
        loginUrl,
        undefined,
        {
          preferEphemeralSession: false,
          showInRecents: true,
        }
      );

      if (result.type === "cancel") {
        setAuthStep("error");
        setErrorMessage("ログインがキャンセルされました。");
        return;
      }

      if (result.type === "success" && result.url) {
        setAuthStep("completing");
        
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
          setAuthStep("error");
          setErrorMessage(getErrorUserMessage(error));
          return;
        }

        if (code && state) {
          setAuthStep("success");
          setTimeout(() => {
            router.push({
              pathname: "/oauth/callback" as any,
              params: { code, state },
            });
          }, 500);
        } else {
          setAuthStep("error");
          setErrorMessage("認証情報の取得に失敗しました。再度お試しください。");
        }
      }
    } catch (error) {
      console.error("[Auth] Login error:", error);
      setAuthStep("error");
      setErrorMessage(getErrorUserMessage(String(error)));
    } finally {
      if (authStep !== "success") {
        setTimeout(() => {
          setIsLoggingIn(false);
          if (authStep === "error") {
            setTimeout(() => setAuthStep("idle"), 3000);
          }
        }, 1000);
      }
    }
  };

  const handleRetry = () => {
    setAuthStep("idle");
    setErrorMessage(null);
    setIsLoggingIn(false);
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

          {/* Auth Step Indicator */}
          {authStep !== "idle" && (
            <View style={[styles.stepIndicator, { backgroundColor: authStep === "error" ? colors.errorLight : colors.card }]}>
              <View style={styles.stepRow}>
                {authStep === "error" ? (
                  <ThemedText style={[styles.stepIcon, { color: colors.error }]}>⚠️</ThemedText>
                ) : authStep === "success" ? (
                  <ThemedText style={[styles.stepIcon, { color: colors.success }]}>✓</ThemedText>
                ) : (
                  <ActivityIndicator size="small" color={colors.tint} />
                )}
                <ThemedText style={[
                  styles.stepText,
                  authStep === "error" && { color: colors.error },
                  authStep === "success" && { color: colors.success },
                ]}>
                  {getStepMessage(authStep)}
                </ThemedText>
              </View>
              
              {/* Progress dots */}
              {authStep !== "error" && (
                <View style={styles.progressDots}>
                  <View style={[styles.dot, { backgroundColor: colors.tint }]} />
                  <View style={[styles.dot, { backgroundColor: ["authenticating", "completing", "success"].includes(authStep) ? colors.tint : colors.border }]} />
                  <View style={[styles.dot, { backgroundColor: ["completing", "success"].includes(authStep) ? colors.tint : colors.border }]} />
                  <View style={[styles.dot, { backgroundColor: authStep === "success" ? colors.tint : colors.border }]} />
                </View>
              )}

              {/* Retry button for errors */}
              {authStep === "error" && (
                <Pressable style={[styles.retryButton, { borderColor: colors.error }]} onPress={handleRetry}>
                  <ThemedText style={[styles.retryText, { color: colors.error }]}>再試行</ThemedText>
                </Pressable>
              )}
            </View>
          )}

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
            <View style={[styles.comparisonRow, { borderTopColor: colors.border }]}>
              <ThemedText style={styles.comparisonFeature}>グループ機能</ThemedText>
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
                <>
                  <ThemedText style={styles.emailIcon}>✉️</ThemedText>
                  <ThemedText style={styles.emailText}>メールでログイン</ThemedText>
                </>
              )}
            </Pressable>
          </View>

          <ThemedText style={[styles.terms, { color: colors.textSecondary }]}>
            ログインすることで、利用規約とプライバシーポリシーに同意したものとみなされます。
          </ThemedText>

          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ThemedText style={[styles.backText, { color: colors.textSecondary }]}>
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
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  emoji: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  stepIndicator: {
    width: "100%",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    alignItems: "center",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  stepIcon: {
    fontSize: 20,
  },
  stepText: {
    fontSize: 14,
    lineHeight: 20,
  },
  progressDots: {
    flexDirection: "row",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  retryButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
  },
  retryText: {
    fontSize: 14,
    fontWeight: "600",
  },
  comparisonCard: {
    width: "100%",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
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
  },
  comparisonCheck: {
    width: 70,
    textAlign: "center",
    fontSize: 16,
  },
  comparisonX: {
    width: 70,
    textAlign: "center",
    fontSize: 16,
  },
  loginButtons: {
    width: "100%",
    gap: Spacing.md,
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
    fontSize: 20,
    fontWeight: "bold",
    color: "#4285F4",
  },
  googleText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
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
    fontSize: 20,
  },
  appleText: {
    fontSize: 16,
    fontWeight: "600",
  },
  emailButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  emailIcon: {
    fontSize: 18,
  },
  emailText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  terms: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  backButton: {
    paddingVertical: Spacing.md,
  },
  backText: {
    fontSize: 16,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  infoCard: {
    width: "100%",
    borderRadius: BorderRadius.md,
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
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    width: "100%",
  },
  featureCard: {
    width: "100%",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  featureList: {
    gap: Spacing.sm,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  featureCheck: {
    fontSize: 16,
    color: "#34C759",
  },
  featureText: {
    fontSize: 14,
  },
  logoutButton: {
    width: "100%",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
