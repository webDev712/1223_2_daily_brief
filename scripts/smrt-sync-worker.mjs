import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { syncAllCompanies } from "../lib/smrtSync.mjs";

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectDir = path.resolve(__dirname, "..");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*([^#=]+?)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1].trim();
    if (!key || process.env[key] !== undefined) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnvFile(path.join(projectDir, ".env.local"));
loadEnvFile(path.join(projectDir, ".env"));

const args = process.argv.slice(2);
const runOnce = args.includes("--once");
const dateArgs = args.filter(a => /^\d{4}-\d{2}-\d{2}$/.test(a));

const parsedInterval = Number(process.env.SMRT_SYNC_INTERVAL_MINUTES || 15);
const intervalMinutes = Number.isFinite(parsedInterval) && parsedInterval >= 1 ? parsedInterval : 15;
const intervalMs = intervalMinutes * 60 * 1000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/dailybrief_local",
  connectionTimeoutMillis: 15000,
  query_timeout: 30000,
});

let isRunning = false;
let shuttingDown = false;
let timer = null;

async function runTick() {
  if (isRunning || shuttingDown) return true;
  isRunning = true;
  const startedAt = new Date().toISOString();
  console.log(`[${startedAt}] SMRT sync started`);
  try {
    const options = dateArgs.length ? { dates: dateArgs } : {};
    const results = await syncAllCompanies(pool, options);
    console.log(`[${new Date().toISOString()}] SMRT sync finished:`, JSON.stringify(results));
    return results.every(r => r.ok);
  } catch (err) {
    console.error(`[${new Date().toISOString()}] SMRT sync error:`, err);
    return false;
  } finally {
    isRunning = false;
  }
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}, stopping SMRT sync worker...`);
  if (timer) clearInterval(timer);
  while (isRunning) {
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  await pool.end().catch(() => {});
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

if (runOnce) {
  runTick()
    .then(async ok => {
      await pool.end().catch(() => {});
      process.exit(ok ? 0 : 1);
    })
    .catch(async err => {
      console.error(err);
      await pool.end().catch(() => {});
      process.exit(1);
    });
} else {
  console.log(`SMRT sync worker running every ${intervalMinutes} minute(s)`);
  runTick();
  timer = setInterval(runTick, intervalMs);
}
