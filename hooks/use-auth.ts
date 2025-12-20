import * as Api from "@/lib/api";
import * as Auth from "@/lib/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import { trpc } from "@/lib/trpc";
import { useLocalMeals } from "@/hooks/use-local-meals";

type UseAuthOptions = {
  autoFetch?: boolean;
};

export function useAuth(options?: UseAuthOptions) {
  const { autoFetch = true } = options ?? {};
  const [user, setUser] = useState<Auth.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { meals: localMeals, clearMeals } = useLocalMeals();
  const syncMutation = trpc.meals.syncLocalMeals.useMutation();

  const fetchUser = useCallback(async () => {
    console.log("[useAuth] fetchUser called");
    try {
      setLoading(true);
      setError(null);

      // Web platform: use cookie-based auth, fetch user from API
      if (Platform.OS === "web") {
        console.log("[useAuth] Web platform: fetching user from API...");
        
        // Retry logic for API calls
        let apiUser = null;
        let retries = 3;
        let lastError: Error | null = null;
        
        while (retries > 0) {
          try {
            apiUser = await Api.getMe();
            console.log("[useAuth] API user response:", apiUser);
            break; // Success, exit retry loop
          } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            retries--;
            console.warn(`[useAuth] API call failed, retries left: ${retries}`, lastError);
            if (retries > 0) {
              // Wait before retrying (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, 1000 * (4 - retries)));
            }
          }
        }

        if (apiUser) {
          const userInfo: Auth.User = {
            id: apiUser.id,
            openId: apiUser.openId,
            name: apiUser.name,
            email: apiUser.email,
            loginMethod: apiUser.loginMethod,
            lastSignedIn: new Date(apiUser.lastSignedIn),
          };
          setUser(userInfo);
          // Cache user info in localStorage for faster subsequent loads
          await Auth.setUserInfo(userInfo);
          console.log("[useAuth] Web user set from API:", userInfo);

          // Sync local meals to server if any exist
          if (localMeals.length > 0) {
            console.log("[useAuth] Syncing local meals to server:", localMeals.length);
            try {
              const syncResult = await syncMutation.mutateAsync(localMeals);
              console.log("[useAuth] Sync result:", syncResult);
              // Clear local meals after successful sync
              await clearMeals();
              console.log("[useAuth] Local meals cleared after sync");
            } catch (syncError) {
              console.error("[useAuth] Failed to sync local meals:", syncError);
              // Don't fail the login if sync fails
            }
          }
        } else {
          console.log("[useAuth] Web: No authenticated user from API");
          setUser(null);
          await Auth.clearUserInfo();
          if (lastError) {
            setError(lastError);
          }
        }
        return;
      }

      // Native platform: use token-based auth
      console.log("[useAuth] Native platform: checking for session token...");
      const sessionToken = await Auth.getSessionToken();
      console.log(
        "[useAuth] Session token:",
        sessionToken ? `present (${sessionToken.substring(0, 20)}...)` : "missing",
      );
      if (!sessionToken) {
        console.log("[useAuth] No session token, setting user to null");
        setUser(null);
        return;
      }

      // Use cached user info for native (token validates the session)
      const cachedUser = await Auth.getUserInfo();
      console.log("[useAuth] Cached user:", cachedUser);
      if (cachedUser) {
        console.log("[useAuth] Using cached user info");
        setUser(cachedUser);

        // Sync local meals to server if any exist
        if (localMeals.length > 0) {
          console.log("[useAuth] Syncing local meals to server:", localMeals.length);
          try {
            const syncResult = await syncMutation.mutateAsync(localMeals);
            console.log("[useAuth] Sync result:", syncResult);
            // Clear local meals after successful sync
            await clearMeals();
            console.log("[useAuth] Local meals cleared after sync");
          } catch (syncError) {
            console.error("[useAuth] Failed to sync local meals:", syncError);
            // Don't fail the login if sync fails
          }
        }
      } else {
        console.log("[useAuth] No cached user, setting user to null");
        setUser(null);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch user");
      console.error("[useAuth] fetchUser error:", error);
      setError(error);
      setUser(null);
    } finally {
      setLoading(false);
      console.log("[useAuth] fetchUser completed, loading:", false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await Api.logout();
    } catch (err) {
      console.error("[Auth] Logout API call failed:", err);
      // Continue with logout even if API call fails
    } finally {
      await Auth.removeSessionToken();
      await Auth.clearUserInfo();
      setUser(null);
      setError(null);
    }
  }, []);

  const isAuthenticated = useMemo(() => Boolean(user), [user]);

  useEffect(() => {
    console.log("[useAuth] useEffect triggered, autoFetch:", autoFetch, "platform:", Platform.OS);
    if (autoFetch) {
      if (Platform.OS === "web") {
        // Web: fetch user from API directly (user will login manually if needed)
        console.log("[useAuth] Web: fetching user from API...");
        fetchUser();
      } else {
        // Native: check for cached user info first for faster initial load
        Auth.getUserInfo().then((cachedUser) => {
          console.log("[useAuth] Native cached user check:", cachedUser);
          if (cachedUser) {
            console.log("[useAuth] Native: setting cached user immediately");
            setUser(cachedUser);
            setLoading(false);
          } else {
            // No cached user, check session token
            fetchUser();
          }
        });
      }
    } else {
      console.log("[useAuth] autoFetch disabled, setting loading to false");
      setLoading(false);
    }
  }, [autoFetch, fetchUser]);

  useEffect(() => {
    console.log("[useAuth] State updated:", {
      hasUser: !!user,
      loading,
      isAuthenticated,
      error: error?.message,
    });
  }, [user, loading, isAuthenticated, error]);

  return {
    user,
    loading,
    error,
    isAuthenticated,
    refresh: fetchUser,
    logout,
  };
}
