import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

export interface LocalMealRecord {
  id: string;
  date: string;
  mealType: "lunch" | "dinner";
  dishName: string;
  category: "japanese" | "western" | "chinese" | "other";
  note?: string;
  createdAt: string;
}

const STORAGE_KEY = "local_meal_records";

export function useLocalMeals() {
  const [meals, setMeals] = useState<LocalMealRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Load meals from storage
  const loadMeals = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        setMeals(JSON.parse(data));
      }
    } catch (error) {
      console.error("Failed to load meals:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMeals();
  }, [loadMeals]);

  // Save meals to storage
  const saveMeals = useCallback(async (newMeals: LocalMealRecord[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newMeals));
      setMeals(newMeals);
    } catch (error) {
      console.error("Failed to save meals:", error);
    }
  }, []);

  // Add a new meal
  const addMeal = useCallback(
    async (meal: Omit<LocalMealRecord, "id" | "createdAt">) => {
      const newMeal: LocalMealRecord = {
        ...meal,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };
      const newMeals = [newMeal, ...meals];
      await saveMeals(newMeals);
      return newMeal;
    },
    [meals, saveMeals]
  );

  // Get meals by date
  const getMealsByDate = useCallback(
    (date: string) => {
      return meals.filter((m) => m.date === date);
    },
    [meals]
  );

  // Get today's lunch
  const getTodayLunch = useCallback(
    (date: string) => {
      return meals.find((m) => m.date === date && m.mealType === "lunch") || null;
    },
    [meals]
  );

  // Get today's dinner
  const getTodayDinner = useCallback(
    (date: string) => {
      return meals.find((m) => m.date === date && m.mealType === "dinner") || null;
    },
    [meals]
  );

  // Get recent meals
  const getRecentMeals = useCallback(
    (limit: number = 10) => {
      return meals
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit);
    },
    [meals]
  );

  // Get meals by date range
  const getMealsByDateRange = useCallback(
    (startDate: string, endDate: string) => {
      return meals.filter((m) => m.date >= startDate && m.date <= endDate);
    },
    [meals]
  );

  // Delete a meal
  const deleteMeal = useCallback(
    async (id: string) => {
      const newMeals = meals.filter((m) => m.id !== id);
      await saveMeals(newMeals);
    },
    [meals, saveMeals]
  );

  // Refresh data
  const refresh = useCallback(() => {
    loadMeals();
  }, [loadMeals]);

  return {
    meals,
    loading,
    addMeal,
    getMealsByDate,
    getTodayLunch,
    getTodayDinner,
    getRecentMeals,
    getMealsByDateRange,
    deleteMeal,
    refresh,
  };
}
