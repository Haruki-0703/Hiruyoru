import { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  TextInput,
  Alert,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

type Group = {
  id: number;
  name: string;
  description: string | null;
  inviteCode: string;
  ownerId: number;
  memberRole: string;
};

export default function GroupsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const utils = trpc.useUtils();
  const { data: groups, isLoading } = trpc.groups.myGroups.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createGroupMutation = trpc.groups.create.useMutation({
    onSuccess: () => {
      utils.groups.myGroups.invalidate();
      setShowCreateModal(false);
      setGroupName("");
      setGroupDescription("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error) => {
      Alert.alert("エラー", error.message);
    },
  });

  const joinGroupMutation = trpc.groups.join.useMutation({
    onSuccess: () => {
      utils.groups.myGroups.invalidate();
      setShowJoinModal(false);
      setInviteCode("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("成功", "グループに参加しました！");
    },
    onError: (error) => {
      Alert.alert("エラー", error.message);
    },
  });

  const leaveGroupMutation = trpc.groups.leave.useMutation({
    onSuccess: () => {
      utils.groups.myGroups.invalidate();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const deleteGroupMutation = trpc.groups.delete.useMutation({
    onSuccess: () => {
      utils.groups.myGroups.invalidate();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await utils.groups.myGroups.invalidate();
    setRefreshing(false);
  }, [utils]);

  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      Alert.alert("エラー", "グループ名を入力してください");
      return;
    }
    createGroupMutation.mutate({
      name: groupName.trim(),
      description: groupDescription.trim() || undefined,
    });
  };

  const handleJoinGroup = () => {
    if (inviteCode.length !== 8) {
      Alert.alert("エラー", "招待コードは8文字です");
      return;
    }
    joinGroupMutation.mutate({ inviteCode: inviteCode.toUpperCase() });
  };

  const handleShareInviteCode = async (group: Group) => {
    try {
      await Share.share({
        message: `「${group.name}」に参加しよう！\n招待コード: ${group.inviteCode}\n\nヒルヨルアプリで家族の食事を共有しましょう！`,
      });
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  const handleLeaveGroup = (group: Group) => {
    Alert.alert(
      "グループを退出",
      `「${group.name}」から退出しますか？`,
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "退出",
          style: "destructive",
          onPress: () => leaveGroupMutation.mutate({ groupId: group.id }),
        },
      ]
    );
  };

  const handleDeleteGroup = (group: Group) => {
    Alert.alert(
      "グループを削除",
      `「${group.name}」を削除しますか？\nこの操作は取り消せません。`,
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: () => deleteGroupMutation.mutate({ groupId: group.id }),
        },
      ]
    );
  };

  // Guest mode view
  if (!isAuthenticated) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>グループ</ThemedText>
        </View>
        <View style={styles.guestContainer}>
          <ThemedText style={[styles.guestIcon, { color: colors.tint }]}>👨‍👩‍👧‍👦</ThemedText>
          <ThemedText type="subtitle" style={styles.guestTitle}>
            家族・グループ機能
          </ThemedText>
          <ThemedText style={[styles.guestDescription, { color: colors.textSecondary }]}>
            ログインすると、家族やグループで食事情報を共有し、{"\n"}
            みんなのランチを考慮した夜ご飯の提案を受けられます。
          </ThemedText>
          <Pressable
            style={[styles.loginButton, { backgroundColor: colors.tint }]}
            onPress={() => router.push("/modal")}
          >
            <ThemedText style={styles.loginButtonText}>ログインして利用する</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  const renderGroupItem = ({ item }: { item: Group }) => (
    <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.groupHeader}>
        <View style={styles.groupInfo}>
          <ThemedText type="subtitle" style={styles.groupName}>{item.name}</ThemedText>
          {item.description && (
            <ThemedText style={[styles.groupDescription, { color: colors.textSecondary }]}>
              {item.description}
            </ThemedText>
          )}
        </View>
        <View style={[styles.roleBadge, { backgroundColor: item.memberRole === "owner" ? colors.tint : colors.border }]}>
          <ThemedText style={[styles.roleText, { color: item.memberRole === "owner" ? "#fff" : colors.text }]}>
            {item.memberRole === "owner" ? "オーナー" : "メンバー"}
          </ThemedText>
        </View>
      </View>

      <View style={styles.inviteCodeSection}>
        <ThemedText style={[styles.inviteLabel, { color: colors.textSecondary }]}>招待コード</ThemedText>
        <View style={styles.inviteCodeRow}>
          <ThemedText style={[styles.inviteCode, { color: colors.tint }]}>{item.inviteCode}</ThemedText>
          <Pressable
            style={[styles.shareButton, { backgroundColor: colors.tint }]}
            onPress={() => handleShareInviteCode(item)}
          >
            <ThemedText style={styles.shareButtonText}>共有</ThemedText>
          </Pressable>
        </View>
      </View>

      <View style={styles.groupActions}>
        {item.memberRole === "owner" ? (
          <Pressable
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteGroup(item)}
          >
            <ThemedText style={styles.deleteButtonText}>グループを削除</ThemedText>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.actionButton, { borderColor: colors.error }]}
            onPress={() => handleLeaveGroup(item)}
          >
            <ThemedText style={[styles.actionButtonText, { color: colors.error }]}>退出</ThemedText>
          </Pressable>
        )}
      </View>
    </View>
  );

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>グループ</ThemedText>
      </View>

      {/* Action buttons */}
      <View style={styles.actionButtons}>
        <Pressable
          style={[styles.primaryButton, { backgroundColor: colors.tint }]}
          onPress={() => setShowCreateModal(true)}
        >
          <ThemedText style={styles.primaryButtonText}>+ グループを作成</ThemedText>
        </Pressable>
        <Pressable
          style={[styles.secondaryButton, { borderColor: colors.tint }]}
          onPress={() => setShowJoinModal(true)}
        >
          <ThemedText style={[styles.secondaryButtonText, { color: colors.tint }]}>招待コードで参加</ThemedText>
        </Pressable>
      </View>

      {/* Groups list */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : groups && groups.length > 0 ? (
        <FlatList
          data={groups}
          renderItem={renderGroupItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
          }
        />
      ) : (
        <View style={styles.emptyContainer}>
          <ThemedText style={[styles.emptyIcon, { color: colors.textSecondary }]}>👨‍👩‍👧‍👦</ThemedText>
          <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
            グループがありません{"\n"}
            新しいグループを作成するか、{"\n"}
            招待コードで参加しましょう
          </ThemedText>
        </View>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <ThemedText type="subtitle" style={styles.modalTitle}>新しいグループを作成</ThemedText>
            
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="グループ名"
              placeholderTextColor={colors.textDisabled}
              value={groupName}
              onChangeText={setGroupName}
              maxLength={100}
            />
            
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="説明（任意）"
              placeholderTextColor={colors.textDisabled}
              value={groupDescription}
              onChangeText={setGroupDescription}
              multiline
              maxLength={500}
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, { borderColor: colors.border }]}
                onPress={() => setShowCreateModal(false)}
              >
                <ThemedText>キャンセル</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalPrimaryButton, { backgroundColor: colors.tint }]}
                onPress={handleCreateGroup}
                disabled={createGroupMutation.isPending}
              >
                {createGroupMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText style={styles.modalPrimaryButtonText}>作成</ThemedText>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Join Group Modal */}
      {showJoinModal && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <ThemedText type="subtitle" style={styles.modalTitle}>招待コードで参加</ThemedText>
            
            <TextInput
              style={[styles.input, styles.codeInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="招待コード（8文字）"
              placeholderTextColor={colors.textDisabled}
              value={inviteCode}
              onChangeText={(text) => setInviteCode(text.toUpperCase())}
              maxLength={8}
              autoCapitalize="characters"
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, { borderColor: colors.border }]}
                onPress={() => setShowJoinModal(false)}
              >
                <ThemedText>キャンセル</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalPrimaryButton, { backgroundColor: colors.tint }]}
                onPress={handleJoinGroup}
                disabled={joinGroupMutation.isPending}
              >
                {joinGroupMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText style={styles.modalPrimaryButtonText}>参加</ThemedText>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      )}
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
  title: {
    fontSize: 28,
    lineHeight: 36,
  },
  actionButtons: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  groupCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    lineHeight: 24,
  },
  groupDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  roleBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "600",
  },
  inviteCodeSection: {
    marginVertical: Spacing.sm,
  },
  inviteLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  inviteCodeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  inviteCode: {
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 2,
  },
  shareButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
  },
  shareButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  groupActions: {
    marginTop: Spacing.sm,
  },
  actionButton: {
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    borderWidth: 1,
  },
  actionButtonText: {
    fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: "rgba(255, 59, 48, 0.1)",
    borderColor: "transparent",
  },
  deleteButtonText: {
    color: "#FF3B30",
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  emptyText: {
    textAlign: "center",
    lineHeight: 24,
  },
  guestContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  guestIcon: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  guestTitle: {
    marginBottom: Spacing.sm,
  },
  guestDescription: {
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  loginButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  loginButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.md,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  modalTitle: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  codeInput: {
    textAlign: "center",
    fontSize: 24,
    letterSpacing: 4,
    fontWeight: "bold",
  },
  modalButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    borderWidth: 1,
  },
  modalPrimaryButton: {
    borderWidth: 0,
  },
  modalPrimaryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
