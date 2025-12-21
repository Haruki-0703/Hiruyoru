import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";
import { router } from "expo-router";

type FavoriteMeal = {
  id: number;
  dishName: string;
  category: "japanese" | "western" | "chinese" | "other";
  note: string | null;
  usageCount: number;
  lastUsedAt: Date | null;
};

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newFavorite, setNewFavorite] = useState({
    dishName: "",
    category: "japanese" as const,
    note: "",
  });

  useEffect(() => {
    if (isAuthenticated) {
      loadFavorites();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const data = await trpc.favorites.list.query();
      setFavorites(data as FavoriteMeal[]);
    } catch (error) {
      console.error("Failed to load favorites:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFavorite = async () => {
    if (!newFavorite.dishName.trim()) {
      Alert.alert("エラー", "料理名を入力してください");
      return;
    }

    try {
      await trpc.favorites.create.mutate(newFavorite);
      setModalVisible(false);
      setNewFavorite({ dishName: "", category: "japanese", note: "" });
      loadFavorites();
    } catch (error) {
      console.error("Failed to add favorite:", error);
      Alert.alert("エラー", "お気に入りの追加に失敗しました");
    }
  };

  const handleUseFavorite = async (favorite: FavoriteMeal) => {
    try {
      await trpc.favorites.use.mutate({ id: favorite.id });
      const today = new Date().toISOString().split("T")[0];
      await trpc.meals.create.mutate({
        date: today,
        mealType: "lunch",
        dishName: favorite.dishName,
        category: favorite.category,
        note: favorite.note || undefined,
      });
      Alert.alert("成功", "ランチを記録しました");
      loadFavorites();
    } catch (error) {
      console.error("Failed to use favorite:", error);
      Alert.alert("エラー", "記録に失敗しました");
    }
  };

  const handleDeleteFavorite = (id: number) => {
    Alert.alert("確認", "このお気に入りを削除しますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: async () => {
          try {
            await trpc.favorites.delete.mutate({ id });
            loadFavorites();
          } catch (error) {
            console.error("Failed to delete favorite:", error);
            Alert.alert("エラー", "削除に失敗しました");
          }
        },
      },
    ]);
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      japanese: "和食",
      western: "洋食",
      chinese: "中華",
      other: "その他",
    };
    return labels[category as keyof typeof labels] || category;
  };

  if (!isAuthenticated) {
    return (
      <ThemedView
        style={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, 20),
            paddingBottom: Math.max(insets.bottom, 20),
          },
        ]}
      >
        <ThemedText type="title" style={styles.title}>
          お気に入り
        </ThemedText>
        <View style={styles.loginPrompt}>
          <ThemedText style={styles.loginText}>
            お気に入り機能を使うにはログインが必要です
          </ThemedText>
          <Pressable
            style={styles.loginButton}
            onPress={() => router.push("/modal")}
          >
            <Text style={styles.loginButtonText}>ログイン</Text>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  if (loading) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </ThemedView>
    );
  }

  return (
    <ThemedView
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 20),
          paddingBottom: Math.max(insets.bottom, 20),
        },
      ]}
    >
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          お気に入り
        </ThemedText>
        <Pressable
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ 追加</Text>
        </Pressable>
      </View>

      {favorites.length === 0 ? (
        <View style={styles.emptyState}>
          <ThemedText style={styles.emptyText}>
            お気に入りメニューがありません
          </ThemedText>
          <ThemedText style={styles.emptySubtext}>
            よく食べるメニューを登録しておくと、ワンタップで記録できます
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.favoriteCard}>
              <View style={styles.favoriteInfo}>
                <ThemedText type="defaultSemiBold" style={styles.dishName}>
                  {item.dishName}
                </ThemedText>
                <ThemedText style={styles.category}>
                  {getCategoryLabel(item.category)}
                </ThemedText>
                {item.note && (
                  <ThemedText style={styles.note}>{item.note}</ThemedText>
                )}
                <ThemedText style={styles.usageCount}>
                  使用回数: {item.usageCount}回
                </ThemedText>
              </View>
              <View style={styles.favoriteActions}>
                <Pressable
                  style={styles.useButton}
                  onPress={() => handleUseFavorite(item)}
                >
                  <Text style={styles.useButtonText}>記録</Text>
                </Pressable>
                <Pressable
                  style={styles.deleteButton}
                  onPress={() => handleDeleteFavorite(item.id)}
                >
                  <Text style={styles.deleteButtonText}>削除</Text>
                </Pressable>
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText type="subtitle" style={styles.modalTitle}>
              お気に入りを追加
            </ThemedText>

            <TextInput
              style={styles.input}
              placeholder="料理名"
              value={newFavorite.dishName}
              onChangeText={(text) =>
                setNewFavorite({ ...newFavorite, dishName: text })
              }
            />

            <View style={styles.categoryButtons}>
              {["japanese", "western", "chinese", "other"].map((cat) => (
                <Pressable
                  key={cat}
                  style={[
                    styles.categoryButton,
                    newFavorite.category === cat &&
                      styles.categoryButtonActive,
                  ]}
                  onPress={() =>
                    setNewFavorite({
                      ...newFavorite,
                      category: cat as any,
                    })
                  }
                >
                  <Text
                    style={[
                      styles.categoryButtonText,
                      newFavorite.category === cat &&
                        styles.categoryButtonTextActive,
                    ]}
                  >
                    {getCategoryLabel(cat)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              style={[styles.input, styles.noteInput]}
              placeholder="メモ（任意）"
              value={newFavorite.note}
              onChangeText={(text) =>
                setNewFavorite({ ...newFavorite, note: text })
              }
              multiline
            />

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>キャンセル</Text>
              </Pressable>
              <Pressable
                style={styles.saveButton}
                onPress={handleAddFavorite}
              >
                <Text style={styles.saveButtonText}>保存</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
  },
  addButton: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loginPrompt: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loginText: {
    fontSize: 16,
    textAlign: "center",
  },
  loginButton: {
    backgroundColor: "#FF6B35",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.6,
  },
  listContent: {
    gap: 12,
  },
  favoriteCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  favoriteInfo: {
    marginBottom: 12,
  },
  dishName: {
    fontSize: 18,
    marginBottom: 4,
  },
  category: {
    fontSize: 14,
    opacity: 0.6,
    marginBottom: 4,
  },
  note: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 4,
  },
  usageCount: {
    fontSize: 12,
    opacity: 0.5,
  },
  favoriteActions: {
    flexDirection: "row",
    gap: 8,
  },
  useButton: {
    flex: 1,
    backgroundColor: "#FF6B35",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  useButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  deleteButton: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "#FF3B30",
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  noteInput: {
    height: 80,
    textAlignVertical: "top",
  },
  categoryButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  categoryButtonActive: {
    backgroundColor: "#FF6B35",
    borderColor: "#FF6B35",
  },
  categoryButtonText: {
    fontSize: 14,
    color: "#666",
  },
  categoryButtonTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#666",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#FF6B35",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
});
