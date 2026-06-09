import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { configureNotificationRuntime } from "@/services/notificationService";

export function useAppBootstrap(): boolean {
  const [ready, setReady] = useState(false);

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
      await configureNotificationRuntime();
      await generateDueSubscriptionRecords();
    }

    bootstrap()
      .catch((error) => {
        console.warn("App bootstrap failed", error);
      })
      .finally(() => {
        if (mounted) {
          setReady(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return ready;
}
