function unavailableDatabaseClient(name: string): never {
  throw new Error(`${name} is unavailable on web. Use the service-layer web fallback instead.`);
}

export const sqlite = new Proxy(
  {},
  {
    get() {
      return () => unavailableDatabaseClient("SQLite");
    }
  }
);

export const db = new Proxy(
  {},
  {
    get() {
      return () => unavailableDatabaseClient("Drizzle database");
    }
  }
) as any;

export type AppDatabase = typeof db;
