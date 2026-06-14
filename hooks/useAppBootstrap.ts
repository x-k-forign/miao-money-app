import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import { configureNotificationRuntime } from "@/services/notificationService";

export interface AppBootstrapState {
  error: string | null;
  ready: boolean;
  retry: () => void;
}

export function useAppBootstrap(): AppBootstrapState {
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const retry = useCallback(() => {
    setError(null);
    setReady(false);
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      if (Platform.OS === "web") {
        return;
      }

      const [{ initializeDatabase }, { seedDefaultCategories }, { generateDueSubscriptionRecords }] =
        await Promise.all([
          import("@/db/init"),
          import("@/db/seedCategories"),
          import("@/services/subscriptionService")
        ]);

      await initializeDatabase();
      await seedDefaultCategories();
      await Promise.allSettled([configureNotificationRuntime(), generateDueSubscriptionRecords()]);
    }

    bootstrap()
      .then(() => {
        if (mounted) {
          setReady(true);
        }
      })
      .catch((error) => {
        console.warn("App bootstrap failed", error);
        if (mounted) {
          setError(error instanceof Error ? error.message : String(error));
        }
      });

    return () => {
      mounted = false;
    };
  }, [attempt]);

  return { error, ready, retry };
}
