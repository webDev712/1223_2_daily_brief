const LOCK_NAMESPACE = 846001;
const REQUEST_TIMEOUT_MS = 30000;

const STATIONS = [
  { dept: "Assemble", dateField: "ItemTransaction:assemblyDate", staffField: "ItemTransaction:assembly_staff_id", includePrice: false },
  { dept: "Bag", dateField: "ItemTransaction:baggingDate", staffField: "ItemTransaction:bagging_staff_id", includePrice: false },
  { dept: "Detail", dateField: "ItemTransaction:detailingDate", staffField: "ItemTransaction:detailing_staff_id", includePrice: false },
  { dept: "Press", dateField: "ItemTransaction:pressedDate", staffField: "ItemTransaction:presser_id", includePrice: true },
  { dept: "Spotting", dateField: "ItemTransaction:spottingDate", staffField: "ItemTransaction:spotting_staff_id", includePrice: false },
  { dept: "Pickup/Delivered", dateField: "ItemTransaction:returnedDate", staffField: "ItemTransaction:returned_staff_id", includePrice: false },
];

function normalizeGraphqlUrl(rawUrl) {
  if (!rawUrl) return null;
  const trimmed = String(rawUrl).trim().replace(/\/+$/, "");
  if (!trimmed) return null;
  return trimmed.endsWith("/graphql") ? trimmed : `${trimmed}/graphql`;
}

export function extractGraphqlFromJwt(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    if (typeof payload?.iss === "string" && payload.iss.startsWith("http")) {
      const url = new URL(payload.iss);
      if (url.protocol !== "https:" || !url.hostname.endsWith(".smrtapp.com")) return null;
      return normalizeGraphqlUrl(url.origin);
    }
  } catch {
    return null;
  }
  return null;
}

function formatCompanyDate(timeZone, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function addDays(dateStr, deltaDays) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

function getTzOffsetString(dateStr, timeZone) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
  }).formatToParts(d);
  const tzPart = parts.find(p => p.type === "timeZoneName")?.value || "GMT-8";
  if (tzPart === "GMT" || tzPart === "UTC") return "+00:00";
  const m = tzPart.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!m) return "-08:00";
  return `${m[1]}${m[2].padStart(2, "0")}:${(m[3] || "00").padStart(2, "0")}`;
}

async function gql(smrtUrl, apiKey, query, variables = {}) {
  const res = await fetch(smrtUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`GraphQL HTTP ${res.status}`);
  }
  return res.json();
}

async function fetchRaw(smrtUrl, apiKey, qObj) {
  let all = [];
  let cols = [];
  for (let page = 1; page <= 50; page++) {
    const res = await gql(
      smrtUrl,
      apiKey,
      `query Q($q: String!, $page: Int, $limit: Int) {
        business { queryReports(query: $q, page: $page, limit: $limit) { columns { index name } totalCount values } }
      }`,
      { q: JSON.stringify(qObj), page, limit: 1000 }
    );
    if (res.errors?.length) throw new Error(`GraphQL error: ${res.errors[0].message}`);
    const qr = res.data?.business?.queryReports;
    if (page === 1) cols = qr?.columns || [];
    const vals = qr?.values || [];
    all = all.concat(vals);
    if (vals.length < 1000) break;
  }
  return { rows: all, columns: cols };
}

async function fetchGroupedStaff(smrtUrl, apiKey, dateField, staffField, range) {
  const res = await gql(
    smrtUrl,
    apiKey,
    `query Q($q: String!) { business { queryReports(query: $q, page: 1, limit: 500) { values } } }`,
    {
      q: JSON.stringify({
        filter: {
          f1: { range: { [dateField]: range } },
          f2: { term: { disabled: false } },
          f3: { bool: { must_not: [{ terms: { "Sale:statusBucket": ["deleted"] } }] } },
        },
        columns: [],
        columns2D: { c1: { method: "count", field: null } },
        columns3D: {},
        kpi: {},
        groups: { g1: { field: staffField } },
        report_index: "sale_items",
        view: "table",
      }),
    }
  );
  if (res.errors?.length) throw new Error(`Grouped query error (${staffField}): ${res.errors[0].message}`);
  return (res.data?.business?.queryReports?.values || []).map(v => ({
    staffId: String(v[4]),
  }));
}

async function fetchDayFromSmrt(smrtUrl, apiKey, dateStr, timeZone) {
  const offset = getTzOffsetString(dateStr, timeZone);
  const range = { gte: `${dateStr}T00:00:00${offset}`, lte: `${dateStr}T23:59:59${offset}` };

  const rawRecords = [];

  for (const st of STATIONS) {
    const groups = await fetchGroupedStaff(smrtUrl, apiKey, st.dateField, st.staffField, range);
    const stationRows = await Promise.all(
      groups.map(async g => {
        const termVal = Number.isNaN(Number(g.staffId)) ? g.staffId : Number(g.staffId);
        const reqCols = st.includePrice ? [st.dateField, "ChildrenIncluded:itemBuyPrice"] : [st.dateField];
        const raw = await fetchRaw(smrtUrl, apiKey, {
          filter: {
            f1: { range: { [st.dateField]: range } },
            f2: { term: { disabled: false } },
            f3: { terms: { [st.staffField]: [termVal] } },
            f4: { bool: { must_not: [{ terms: { "Sale:statusBucket": ["deleted"] } }] } },
          },
          columns: reqCols,
          columns2D: {},
          columns3D: {},
          kpi: {},
          groups: {},
          report_index: "sale_items",
          view: "table",
        });
        const dtIdx = raw.columns.findIndex(c => c.index === st.dateField);
        const prIdx = st.includePrice ? raw.columns.findIndex(c => c.index === "ChildrenIncluded:itemBuyPrice") : -1;
        const slots = new Set();
        let cents = 0;
        for (const r of raw.rows) {
          const ts = r[dtIdx >= 0 ? dtIdx : 0];
          const ms = Date.parse(ts);
          if (!Number.isNaN(ms)) slots.add(Math.floor(ms / 900000));
          if (st.includePrice && prIdx >= 0) cents += Number(r[prIdx] || 0);
        }
        const pieces = raw.rows.length;
        const hours = Number((slots.size * 0.25).toFixed(2));
        const value = st.includePrice ? Math.round(cents / 100) : 0;
        const ppoh = hours > 0 ? Number((pieces / hours).toFixed(2)) : 0;
        return { staffId: g.staffId, date: dateStr, department: st.dept, pieces, value, hours, ppoh };
      })
    );
    rawRecords.push(...stationRows);
  }

  return rawRecords.map(rec => ({
    external_id: Number(rec.staffId),
    date: rec.date,
    department: rec.department,
    pieces: rec.pieces,
    value: rec.value,
    hours: rec.hours,
    ppoh: rec.ppoh,
  }));
}

export async function resolveCompanies(pool) {
  const res = await pool.query("SELECT id::text AS id, smrt_api_key FROM company WHERE NULLIF(BTRIM(smrt_api_key), '') IS NOT NULL ORDER BY created_at ASC");
  return res.rows.map(row => {
    const apiKey = row.smrt_api_key.trim();
    const smrtUrl = extractGraphqlFromJwt(apiKey);
    if (!smrtUrl) throw new Error(`Invalid SMRT API key for company ${row.id}`);
    return { companyId: row.id, smrtUrl, apiKey };
  });
}

function buildTargetDates(timeZone, options) {
  const opts = options || {};
  if (Array.isArray(opts.dates) && opts.dates.length) {
    return opts.dates;
  }
  const parsedDaysBack = Number(opts.daysBack ?? process.env.SMRT_SYNC_DAYS_BACK ?? 1);
  const daysBack = Number.isInteger(parsedDaysBack) && parsedDaysBack >= 0 && parsedDaysBack <= 14 ? parsedDaysBack : 1;
  const today = formatCompanyDate(timeZone);
  const dates = [];
  for (let d = daysBack; d >= 0; d--) {
    dates.push(addDays(today, -d));
  }
  return dates;
}

export async function syncCompanyPpoh(pool, companyConfig, options) {
  const { companyId, smrtUrl, apiKey } = companyConfig;
  const client = await pool.connect();
  let lockAcquired = false;
  try {
    const lockRes = await client.query(
      "SELECT pg_try_advisory_lock($1::int, hashtext($2::text)) AS locked",
      [LOCK_NAMESPACE, companyId]
    );
    lockAcquired = Boolean(lockRes.rows[0]?.locked);
    if (!lockAcquired) {
      return { companyId, status: "skipped_locked", inserted: 0 };
    }

    const metaRes = await gql(
      smrtUrl,
      apiKey,
      `{
        business {
          generalSettings { timeZone }
          employees { id name }
        }
      }`
    );
    if (metaRes.errors?.length) throw new Error(metaRes.errors[0].message);

    const timeZone = metaRes.data?.business?.generalSettings?.timeZone || "America/Los_Angeles";
    const employees = metaRes.data?.business?.employees || [];

    const targetDates = buildTargetDates(timeZone, options);
    const rowsToInsert = [];
    for (const d of targetDates) {
      const dayRows = await fetchDayFromSmrt(smrtUrl, apiKey, d, timeZone);
      rowsToInsert.push(...dayRows);
    }

    await client.query("BEGIN");
    const staff = employees.filter(e => e.name?.trim());
    const BATCH_SIZE = 200;
    for (let i = 0; i < staff.length; i += BATCH_SIZE) {
      const batch = staff.slice(i, i + BATCH_SIZE);
      const values = [];
      const placeholders = batch.map((r, idx) => {
        values.push(companyId, r.id, r.name.trim());
        return `($${idx * 3 + 1}::uuid, $${idx * 3 + 2}::integer, $${idx * 3 + 3}::text)`;
      });
      await client.query(
        `INSERT INTO smrt_employee (company_id, external_id, name)
         VALUES ${placeholders.join(", ")}
         ON CONFLICT (company_id, external_id) DO UPDATE SET name = EXCLUDED.name
         WHERE smrt_employee.name IS DISTINCT FROM EXCLUDED.name`,
        values
      );
    }

    let inserted = 0;
    for (let i = 0; i < rowsToInsert.length; i += BATCH_SIZE) {
      const batch = rowsToInsert.slice(i, i + BATCH_SIZE);
      const values = [companyId];
      const placeholders = batch.map((r, idx) => {
        const offset = idx * 7 + 2;
        values.push(r.external_id, r.date, r.department, r.pieces, r.value, r.hours, r.ppoh);
        return `($${offset}::integer, $${offset + 1}::date, $${offset + 2}::text, $${offset + 3}::double precision, $${offset + 4}::integer, $${offset + 5}::double precision, $${offset + 6}::double precision)`;
      });
      const insertRes = await client.query(
        `WITH incoming (external_id, date, department, pieces, value, hours, ppoh) AS (
           VALUES ${placeholders.join(", ")}
         ), updated AS (
           UPDATE ppoh_master p
           SET pieces = v.pieces, value = v.value, hours = v.hours, ppoh = v.ppoh,
               delta_ppoh = CASE WHEN p.target_ppoh > 0 THEN ROUND((v.ppoh - p.target_ppoh)::numeric, 2)::double precision ELSE 0 END,
               efficiency = CASE WHEN p.target_ppoh > 0 THEN ROUND((v.ppoh / p.target_ppoh * 100)::numeric, 2)::double precision ELSE 0 END
           FROM incoming v
           WHERE p.company_id = $1::uuid AND p.external_id = v.external_id AND p.date = v.date AND p.department = v.department
           RETURNING p.external_id, p.date, p.department
         )
         INSERT INTO ppoh_master
           (external_id, date, department, pieces, value, hours, ppoh, target_ppoh, delta_ppoh, efficiency, notes, company_id)
         SELECT v.external_id, v.date, v.department, v.pieces, v.value, v.hours, v.ppoh, 0, 0, 0, '', $1::uuid
         FROM incoming v
         WHERE NOT EXISTS (
           SELECT 1 FROM updated u WHERE u.external_id = v.external_id AND u.date = v.date AND u.department = v.department
         )`,
        values
      );
      inserted += insertRes.rowCount || 0;
    }

    await client.query("COMMIT");
    return {
      companyId,
      status: "synced",
      timeZone,
      dates: targetDates,
      inserted,
    };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    if (lockAcquired) {
      await client.query("SELECT pg_advisory_unlock($1::int, hashtext($2::text))", [LOCK_NAMESPACE, companyId]).catch(() => {});
    }
    client.release();
  }
}

export async function syncAllCompanies(pool, options) {
  const opts = options || {};
  const companies = await resolveCompanies(pool);
  const results = [];
  for (const company of companies) {
    try {
      const result = await syncCompanyPpoh(pool, company, opts);
      results.push({ ok: true, ...result });
    } catch (err) {
      results.push({
        ok: false,
        companyId: company.companyId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return results;
}
