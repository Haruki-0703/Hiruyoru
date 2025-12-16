import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
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

type Category = "japanese" | "western" | "chinese" | "other";

const categories: { key: Category; label: string; emoji: string }[] = [
  { key: "japanese", label: "和食", emoji: "🍱" },
  { key: "western", label: "洋食", emoji: "🍝" },
  { key: "chinese", label: "中華", emoji: "🥟" },
  { key: "other", label: "その他", emoji: "🍽️" },
];

function getTodayDate(): string {
  const today = new Date();
  return today.toISOString().split("T")[0];
}

type InputMode = "photo" | "text";

export default function RecordScreen() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { addMeal: addLocalMeal } = useLocalMeals();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();

  const [inputMode, setInputMode] = useState<InputMode>("photo");
  const [dishName, setDishName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category>("japanese");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Photo related state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const createMealMutation = trpc.meals.create.useMutation({
    onSuccess: () => {
      utils.meals.getByDate.invalidate();
      utils.meals.getRecent.invalidate();
    },
  });
  
  const analyzeFoodMutation = trpc.imageAnalysis.analyzeFood.useMutation();

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("権限が必要です", "写真ライブラリへのアクセス権限を許可してください。");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      if (result.assets[0].base64 && isAuthenticated) {
        analyzeImage(result.assets[0].base64, result.assets[0].mimeType || "image/jpeg");
      }
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("権限が必要です", "カメラへのアクセス権限を許可してください。");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      if (result.assets[0].base64 && isAuthenticated) {
        analyzeImage(result.assets[0].base64, result.assets[0].mimeType || "image/jpeg");
      }
    }
  };

  const analyzeImage = async (base64: string, mimeType: string) => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeFoodMutation.mutateAsync({
        imageBase64: base64,
        mimeType: mimeType as "image/jpeg" | "image/png" | "image/webp",
      });
      
      if (result.dishName) {
        setDishName(result.dishName);
      }
      if (result.category) {
        setSelectedCategory(result.category as Category);
      }
      if (result.imageUrl) {
        setImageUrl(result.imageUrl);
      }
      if (result.description) {
        setNote(result.description);
      }
    } catch (error) {
      console.error("Image analysis failed:", error);
      Alert.alert("解析エラー", "画像の解析に失敗しました。手動で入力してください。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    if (!dishName.trim()) {
      Alert.alert("入力エラー", "料理名を入力してください");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isAuthenticated) {
        await createMealMutation.mutateAsync({
          date: getTodayDate(),
          mealType: "lunch",
          dishName: dishName.trim(),
          category: selectedCategory,
          note: note.trim() || undefined,
          imageUrl: imageUrl || undefined,
        });
      } else {
        await addLocalMeal({
          date: getTodayDate(),
          mealType: "lunch",
          dishName: dishName.trim(),
          category: selectedCategory,
          note: note.trim() || undefined,
        });
      }

      Alert.alert("記録完了", "ランチを記録しました！", [
        { text: "OK", onPress: () => router.push("/(tabs)") },
      ]);

      // Reset form
      setDishName("");
      setSelectedCategory("japanese");
      setNote("");
      setSelectedImage(null);
      setImageUrl(null);
    } catch (error) {
      console.error("Failed to record meal:", error);
      Alert.alert("エラー", "記録に失敗しました。もう一度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImageUrl(null);
    setDishName("");
    setSelectedCategory("japanese");
    setNote("");
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
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={styles.headerEmoji}>🍱</ThemedText>
          <ThemedText type="title">ランチを記録</ThemedText>
          <ThemedText style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            写真1枚で終わる食事報告
          </ThemedText>
        </View>

        {/* Input Mode Toggle */}
        <View style={[styles.modeToggle, { backgroundColor: colors.card }]}>
          <Pressable
            style={[
              styles.modeButton,
              inputMode === "photo" && { backgroundColor: colors.tint },
            ]}
            onPress={() => setInputMode("photo")}
          >
            <ThemedText
              style={[
                styles.modeButtonText,
                inputMode === "photo" && styles.modeButtonTextActive,
              ]}
            >
              📷 写真で記録
            </ThemedText>
          </Pressable>
          <Pressable
            style={[
              styles.modeButton,
              inputMode === "text" && { backgroundColor: colors.tint },
            ]}
            onPress={() => setInputMode("text")}
          >
            <ThemedText
              style={[
                styles.modeButtonText,
                inputMode === "text" && styles.modeButtonTextActive,
              ]}
            >
              ✏️ テキスト入力
            </ThemedText>
          </Pressable>
        </View>

        {/* Photo Mode */}
        {inputMode === "photo" && (
          <View style={styles.photoSection}>
            {selectedImage ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                {isAnalyzing && (
                  <View style={styles.analyzingOverlay}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                    <ThemedText style={styles.analyzingText}>AIが解析中...</ThemedText>
                  </View>
                )}
                <Pressable style={styles.clearImageButton} onPress={clearImage}>
                  <ThemedText style={styles.clearImageText}>✕</ThemedText>
                </Pressable>
              </View>
            ) : (
              <View style={styles.photoButtons}>
                <Pressable
                  style={[styles.photoButton, { backgroundColor: colors.tint }]}
                  onPress={takePhoto}
                >
                  <ThemedText style={styles.photoButtonEmoji}>📸</ThemedText>
                  <ThemedText style={styles.photoButtonText}>カメラで撮影</ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.photoButton, { backgroundColor: colors.card, borderColor: colors.tint, borderWidth: 2 }]}
                  onPress={pickImage}
                >
                  <ThemedText style={styles.photoButtonEmoji}>🖼️</ThemedText>
                  <ThemedText style={[styles.photoButtonText, { color: colors.tint }]}>
                    ライブラリから選択
                  </ThemedText>
                </Pressable>
              </View>
            )}
            
            {!isAuthenticated && selectedImage && (
              <View style={[styles.guestWarning, { backgroundColor: colors.card }]}>
                <ThemedText style={styles.guestWarningText}>
                  💡 ログインするとAIが自動で料理を認識します
                </ThemedText>
                <Pressable onPress={() => router.push("/modal")}>
                  <ThemedText style={[styles.loginLink, { color: colors.tint }]}>
                    ログインする →
                  </ThemedText>
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* Guest Mode Notice */}
        {!isAuthenticated && inputMode === "text" && (
          <View style={[styles.guestNotice, { backgroundColor: colors.tint + "15", borderColor: colors.tint }]}>
            <ThemedText style={[styles.guestNoticeText, { color: colors.textSecondary }]}>
              📱 ゲストモードで記録中（端末に保存されます）
            </ThemedText>
          </View>
        )}

        {/* Dish Name Input */}
        <View style={styles.inputSection}>
          <ThemedText type="subtitle" style={styles.label}>
            料理名 {isAnalyzing && <ThemedText style={{ color: colors.tint }}>(解析中...)</ThemedText>}
          </ThemedText>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="例: カレーライス、親子丼、パスタ..."
            placeholderTextColor={colors.textDisabled}
            value={dishName}
            onChangeText={setDishName}
            maxLength={100}
          />
        </View>

        {/* Category Selection */}
        <View style={styles.inputSection}>
          <ThemedText type="subtitle" style={styles.label}>
            カテゴリ
          </ThemedText>
          <View style={styles.categoryGrid}>
            {categories.map((cat) => (
              <Pressable
                key={cat.key}
                style={[
                  styles.categoryButton,
                  {
                    backgroundColor:
                      selectedCategory === cat.key
                        ? colors[cat.key as keyof typeof colors] || colors.tint
                        : colors.card,
                    borderColor:
                      selectedCategory === cat.key
                        ? colors[cat.key as keyof typeof colors] || colors.tint
                        : colors.border,
                  },
                ]}
                onPress={() => setSelectedCategory(cat.key)}
              >
                <ThemedText style={styles.categoryEmoji}>{cat.emoji}</ThemedText>
                <ThemedText
                  style={[
                    styles.categoryLabel,
                    {
                      color: selectedCategory === cat.key ? "#FFFFFF" : colors.text,
                    },
                  ]}
                >
                  {cat.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Note Input */}
        <View style={styles.inputSection}>
          <ThemedText type="subtitle" style={styles.label}>
            メモ（任意）
          </ThemedText>
          <TextInput
            style={[
              styles.textInput,
              styles.noteInput,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="味の感想や食べた場所など..."
            placeholderTextColor={colors.textDisabled}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
            maxLength={500}
          />
        </View>

        {/* Submit Button */}
        <Pressable
          style={[
            styles.submitButton,
            {
              backgroundColor: dishName.trim() && !isAnalyzing ? colors.tint : colors.textDisabled,
            },
          ]}
          onPress={handleSubmit}
          disabled={!dishName.trim() || isSubmitting || isAnalyzing}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.submitButtonText}>記録する</ThemedText>
          )}
        </Pressable>
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
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: Spacing.xs,
  },
  modeToggle: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    padding: 4,
    marginBottom: Spacing.lg,
  },
  modeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  modeButtonTextActive: {
    color: "#FFFFFF",
  },
  photoSection: {
    marginBottom: Spacing.lg,
  },
  photoButtons: {
    gap: Spacing.md,
  },
  photoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  photoButtonEmoji: {
    fontSize: 24,
  },
  photoButtonText: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
    color: "#FFFFFF",
  },
  imagePreviewContainer: {
    position: "relative",
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  imagePreview: {
    width: "100%",
    height: 250,
    borderRadius: BorderRadius.lg,
  },
  analyzingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  analyzingText: {
    color: "#FFFFFF",
    marginTop: Spacing.sm,
    fontSize: 14,
    lineHeight: 20,
  },
  clearImageButton: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  clearImageText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    lineHeight: 20,
  },
  guestWarning: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  guestWarningText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  loginLink: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    marginTop: Spacing.xs,
  },
  guestNotice: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  guestNoticeText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  inputSection: {
    marginBottom: Spacing.lg,
  },
  label: {
    marginBottom: Spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 16,
    lineHeight: 24,
  },
  noteInput: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  categoryButton: {
    flex: 1,
    minWidth: "45%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    gap: Spacing.sm,
  },
  categoryEmoji: {
    fontSize: 20,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  submitButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    marginTop: Spacing.md,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 26,
  },
});
