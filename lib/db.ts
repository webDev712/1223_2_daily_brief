import { Pool } from "pg";

const globalForPg = globalThis as unknown as {
  pgPool: Pool | undefined;
};

export const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString:
      process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/dailybrief_local",
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = pool;
}

export interface SqlFunction {
  (strings: TemplateStringsArray | string, ...values: any[]): Promise<any>;
  query: (text: string, params?: any[]) => Promise<any>;
}

const sqlFn: SqlFunction = Object.assign(
  async function sql(
    strings: TemplateStringsArray | string,
    ...values: any[]
  ): Promise<any> {
    if (Array.isArray(strings) && "raw" in strings) {
      let queryText = strings[0];
      for (let i = 0; i < values.length; i++) {
        queryText += `$${i + 1}` + strings[i + 1];
      }
      const result = await pool.query(queryText, values);
      return result.rows;
    }

    const result = await pool.query(strings as string, values[0] || []);
    return result.rows;
  },
  {
    query: (text: string, params?: any[]) => pool.query(text, params),
  }
);

export default sqlFn;
