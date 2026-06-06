import { drizzle } from "drizzle-orm/expo-sqlite";
import * as SQLite from "expo-sqlite";
import * as schema from "@/db/schema";

export const sqlite = SQLite.openDatabaseSync("miao_money.db");

export const db = drizzle(sqlite, { schema });

export type AppDatabase = typeof db;
