import { useState, useEffect, useCallback } from "react";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const NOTIFICATION_PERMISSION_KEY = "notification_permission_asked";
const LUNCH_REMINDER_IDENTIFIER = "lunch-reminder";

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useNotifications() {
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("12:00");

  // Check current permission status
  const checkPermission = useCallback(async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionStatus(status);
    return status;
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    
    if (existingStatus === "granted") {
      setPermissionStatus("granted");
      return true;
    }

    const { status } = await Notifications.requestPermissionsAsync();
    setPermissionStatus(status);
    await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, "true");
    
    return status === "granted";
  }, []);

  // Schedule lunch reminder notification
  const scheduleLunchReminder = useCallback(async (time: string = "12:00") => {
    // Cancel existing reminder first
    await Notifications.cancelScheduledNotificationAsync(LUNCH_REMINDER_IDENTIFIER).catch(() => {});

    const [hours, minutes] = time.split(":").map(Number);

    // Schedule daily notification
    await Notifications.scheduleNotificationAsync({
      identifier: LUNCH_REMINDER_IDENTIFIER,
      content: {
        title: "🍱 ランチを記録しよう！",
        body: "今日のお昼ご飯は何を食べましたか？記録して夜ご飯のおすすめをもらいましょう！",
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hours,
        minute: minutes,
      },
    });

    setReminderTime(time);
    setIsEnabled(true);
    await AsyncStorage.setItem("lunch_reminder_enabled", "true");
    await AsyncStorage.setItem("lunch_reminder_time", time);

    return true;
  }, []);

  // Cancel lunch reminder
  const cancelLunchReminder = useCallback(async () => {
    await Notifications.cancelScheduledNotificationAsync(LUNCH_REMINDER_IDENTIFIER).catch(() => {});
    setIsEnabled(false);
    await AsyncStorage.setItem("lunch_reminder_enabled", "false");
  }, []);

  // Load saved settings
  useEffect(() => {
    const loadSettings = async () => {
      const enabled = await AsyncStorage.getItem("lunch_reminder_enabled");
      const time = await AsyncStorage.getItem("lunch_reminder_time");
      
      setIsEnabled(enabled === "true");
      if (time) setReminderTime(time);
      
      await checkPermission();
    };

    loadSettings();
  }, [checkPermission]);

  // Send immediate test notification
  const sendTestNotification = useCallback(async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🍱 テスト通知",
        body: "通知が正常に動作しています！",
        sound: true,
      },
      trigger: null, // Immediate
    });
  }, []);

  return {
    permissionStatus,
    isEnabled,
    reminderTime,
    requestPermission,
    checkPermission,
    scheduleLunchReminder,
    cancelLunchReminder,
    sendTestNotification,
  };
}
