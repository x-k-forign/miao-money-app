import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { appSettings, type AppSetting } from "@/db/schema";

export async function getSetting(key: string): Promise<AppSetting | undefined> {
  const [setting] = await db.select().from(appSettings).where(eq(appSettings.key, key));
  return setting;
}

export async function setSetting(key: string, value: string, valueType = "string"): Promise<void> {
  await db
    .insert(appSettings)
    .values({ key, value, valueType })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, valueType, updatedAt: new Date().toISOString() }
    });
}
