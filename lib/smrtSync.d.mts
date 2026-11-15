import type { Pool } from "pg";

export interface SmrtCompanyConfig {
  companyId: string;
  smrtUrl: string;
  apiKey: string;
}

export interface SmrtSyncOptions {
  dates?: string[];
  daysBack?: number;
}

export interface SmrtCompanySyncResult {
  ok: boolean;
  companyId: string;
  status?: "synced" | "skipped_locked";
  timeZone?: string;
  dates?: string[];
  inserted?: number;
  error?: string;
}

export function extractGraphqlFromJwt(token: string): string | null;
export function resolveCompanies(pool: Pool): Promise<SmrtCompanyConfig[]>;
export function syncCompanyPpoh(pool: Pool, companyConfig: SmrtCompanyConfig, options?: SmrtSyncOptions): Promise<Omit<SmrtCompanySyncResult, "ok">>;
export function syncAllCompanies(pool: Pool, options?: SmrtSyncOptions): Promise<SmrtCompanySyncResult[]>;
