import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { SavedBrief } from './types';
import { format, parse } from "date-fns";
import { toast } from 'sonner';

function formatBriefDate(dateStr: string | null | undefined, fmt: string, fallback: string = "Unknown Date"): string {
  if (!dateStr) return fallback;
  try {
    const d = dateStr.includes("T") ? new Date(dateStr) : parse(dateStr, "yyyy-MM-dd", new Date());
    return format(d, fmt);
  } catch {
    return fallback;
  }
}

function capitalizeText(str: string | null | undefined): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function generateEmailHTML(b: SavedBrief) {
  const badge = {
    high: "#dc3545",
    moderate: "#f0ad4e",
    info: "#0d6efd",
  };

  const reviewed = (b.reports || []).filter((r: any) => r.checked);
  const total = b.reports_all_count ?? (b.reports ? b.reports.length : 0);
  const companyName = b.company_name || "HELENA'S CLEANERS";
  const departmentName = b.department_name || "";
  const dateFormatted = formatBriefDate(b.date, "MMMM d, yyyy");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
    <meta charset="utf-8" />
    </head>

    <body style="
        margin:0;
        padding:30px;
        background:#f5f5f5;
        font-family:Arial,Helvetica,sans-serif;
        color:#333;
    ">

    <div style="
        max-width:820px;
        margin:auto;
        background:white;
        border-radius:12px;
        overflow:hidden;
        box-shadow:0 8px 25px rgba(0,0,0,.08);
    ">

        <div style="
            background:#1f2328;
            color:white;
            padding:28px;
        ">
            <div style="
                color:#caa85d;
                font-size:14px;
                letter-spacing:2px;
                text-transform:uppercase;
            ">${companyName.toUpperCase()}${departmentName ? ` · ${departmentName.toUpperCase()} DEPARTMENT` : ""}
            </div>

            <h1 style="
                margin:8px 0 0;
                font-size:30px;
                font-weight:700;
            ">
                ${departmentName ? `${departmentName} Brief` : "Daily Lead Brief"}
            </h1>

            <div style="opacity:.8;margin-top:8px;">
                ${dateFormatted}
            </div>
        </div>

        <div style="padding:30px;">

            ${b.is_department_journal && b.duties && b.duties.length > 0 ? `
            <h2 style="margin-top:0;">
                ${departmentName ? `${departmentName} Department` : "Team"}
            </h2>

            <table style="width:100%;border-collapse:collapse;margin-bottom:15px;font-size:14px;">
                <thead>
                    <tr style="border-bottom:2px solid #eee;text-align:left;color:#666;">
                        <th style="padding:8px 4px;">Employee</th>
                        <th style="padding:8px 4px;">Shift</th>
                        <th style="padding:8px 4px;">Assignment</th>
                        <th style="padding:8px 4px;">Reports</th>
                        <th style="padding:8px 4px;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${b.duties.map((d: any) => {
                        const userReports = (b.reports || []).filter((r: any) => r.holder_id === d.user_id);
                        const userDone = userReports.filter((r: any) => r.checked).length;
                        const status = d.ended_at
                            ? `Transferred to ${d.handed_to || "another lead"}`
                            : (userReports.length === 0 ? "Pending" : (userDone === userReports.length ? "Completed" : "In progress"));
                        return `
                        <tr style="border-bottom:1px solid #f0f0f0;">
                            <td style="padding:8px 4px;"><b>${d.name}</b></td>
                            <td style="padding:8px 4px;">${d.shift || "-"}</td>
                            <td style="padding:8px 4px;">${d.driving ? "🚚 Driving" : "🏢 Floor"}</td>
                            <td style="padding:8px 4px;">${userDone} / ${userReports.length}</td>
                            <td style="padding:8px 4px;">${status}</td>
                        </tr>
                        `;
                    }).join("")}
                </tbody>
            </table>

            <div style="margin-bottom:25px;font-size:14px;color:#555;">
                <b>Total Reports Reviewed:</b> ${reviewed.length} / ${total}
            </div>
            ` : `
            <h2 style="margin-top:0;">
                Lead ${b.letter ? `${b.letter} — ` : ""}${b.lead_name}
            </h2>

            <table style="width:100%;border-collapse:collapse;margin-bottom:30px;">
                <tr>
                    <td><b>Shift</b></td>
                    <td>${b.shift || "-"}</td>
                </tr>

                <tr>
                    <td><b>Driving</b></td>
                    <td>${b.driving ? "🚚 Yes" : "🏢 No"}</td>
                </tr>

                <tr>
                    <td><b>Reports Reviewed</b></td>
                    <td>${reviewed.length} / ${total}</td>
                </tr>
            </table>
            `}

            <h3 style="color:#caa85d;margin-bottom:12px;">Reports</h3>

            ${(b.reports && b.reports.length > 0) ? `
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <thead>
                    <tr style="border-bottom:2px solid #eee;text-align:left;color:#666;">
                        <th style="padding:6px 4px;width:24px;"></th>
                        <th style="padding:6px 4px;">Report</th>
                        <th style="padding:6px 4px;">Schedule</th>
                        <th style="padding:6px 4px;">Source</th>
                        <th style="padding:6px 4px;">Employee</th>
                        <th style="padding:6px 4px;">Result</th>
                        <th style="padding:6px 4px;text-align:right;">Time</th>
                    </tr>
                </thead>
                <tbody>
                    ${b.reports.map((r: any) => {
                        const schedule = [r.day_time ? capitalizeText(r.day_time) : "", r.shift_name].filter(Boolean).join(" · ");
                        const isImg = r.metric === "Image" && r.text;
                        const resultDisplay = isImg
                            ? `<a href="${r.text}" target="_blank" style="color:#0d6efd;text-decoration:none;">📷 Photo</a>`
                            : (r.text ? r.text : (r.checked ? "Completed" : "-"));
                        const timeDisplay = r.timestamp ? format(new Date(r.timestamp), "h:mm a") : "-";
                        return `
                        <tr style="border-bottom:1px solid #f0f0f0;">
                            <td style="padding:8px 4px;">${r.checked ? "✅" : "⬜"}</td>
                            <td style="padding:8px 4px;"><b>${r.name || "Untitled Report"}</b></td>
                            <td style="padding:8px 4px;color:#666;">${schedule || "-"}</td>
                            <td style="padding:8px 4px;"><span style="background:#f0f0f0;padding:2px 6px;border-radius:3px;font-size:11px;">${r.source || "-"}</span></td>
                            <td style="padding:8px 4px;">${(r.checked ? r.completed_by_name : null) || r.holder_name || "-"}</td>
                            <td style="padding:8px 4px;">${resultDisplay}</td>
                            <td style="padding:8px 4px;text-align:right;color:#666;">${timeDisplay}</td>
                        </tr>
                        `;
                    }).join("")}
                </tbody>
            </table>
            ` : `<p>No reports on file.</p>`}

            ${b.findings?.length ? `
            <h3 style="margin-top:35px;color:#caa85d;">Findings</h3>

            ${b.findings.map((f: any) => `
                <div style="
                    margin:8px 0;
                    padding:10px 14px;
                    border-left:5px solid ${badge[f.type as keyof typeof badge] || badge.info};
                    background:#fafafa;
                ">
                    <div>${f.description}</div>
                    <div style="font-size:12px;color:#888;margin-top:4px;">
                        ${[
                            f.type ? f.type.toUpperCase() : null,
                            f.category ? `Category: ${f.category}` : null,
                            f.created_at ? format(new Date(f.created_at), "h:mm a") : null
                        ].filter(Boolean).join(" · ")}
                    </div>
                </div>
            `).join("")}
            ` : ""}

            <h3 style="margin-top:35px;color:#caa85d;">Tasks</h3>

            ${b.tasks?.length ? `
                ${b.tasks.map((t: any) => `
                    <div style="
                        padding:8px 0;
                        border-bottom:1px solid #eee;
                    ">
                        ${t.checked ? "✅" : "⬜"}
                        <b>${t.text}</b>

                        <span style="
                            color:#888;
                            font-size:13px;
                        ">
                            (${t.task_type})
                        </span>
                    </div>
                `).join("")}
            ` : "<p>No tasks.</p>"}

            ${b.covered && b.covered.length > 0 ? `
            <h3 style="margin-top:35px;color:#caa85d;">Coverage</h3>

            <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <thead>
                    <tr style="border-bottom:2px solid #eee;text-align:left;color:#666;">
                        <th style="padding:6px 4px;">Driver</th>
                        <th style="padding:6px 4px;">Covering For</th>
                        <th style="padding:6px 4px;">Route Zone</th>
                        <th style="padding:6px 4px;">Van</th>
                        <th style="padding:6px 4px;">Stops</th>
                        <th style="padding:6px 4px;">Windows</th>
                    </tr>
                </thead>
                <tbody>
                    ${b.covered.map((c: any) => `
                    <tr style="border-bottom:1px solid #f0f0f0;">
                        <td style="padding:8px 4px;"><b>${c.driver_name || "-"}</b></td>
                        <td style="padding:8px 4px;">${c.covering_for || "-"}</td>
                        <td style="padding:8px 4px;">${c.route_zone || "-"}</td>
                        <td style="padding:8px 4px;">${c.van || "-"}</td>
                        <td style="padding:8px 4px;">${c.stops ?? "-"}</td>
                        <td style="padding:8px 4px;">${c.windows || "-"}</td>
                    </tr>
                    `).join("")}
                </tbody>
            </table>
            ` : ""}

            ${b.notes ? `
            <h3 style="margin-top:35px;color:#caa85d;">Notes</h3>

            <div style="
                background:#fafafa;
                border-left:4px solid #caa85d;
                padding:16px;
                line-height:1.6;
            ">
                ${b.notes}
            </div>
            ` : ""}

        </div>

    </div>

    </body>
    </html>
  `;
  navigator.clipboard.write([
    new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([html.replace(/<[^>]+>/g, "")], {
        type: "text/plain",
      }),
    }),
  ]);
  toast.success("Brief copied for email!");
}

const PDF_COLORS = {
  headerBg: "#1f2328",
  headerAccent: "#caa85d",
  headerSubtext: "#c9c9cd",
  cream: "#f3e9d2",
  creamAccent: "#caa85d",
  bodyText: "#2b2b2e",
  mutedText: "#6b6b70",
  divider: "#e6e2d4",
  cardBorder: "#e7e0cc",
  white: "#ffffff",
};

const FINDING_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: "#f8d7da", text: "#842029", label: "HIGH" },
  moderate: { bg: "#fff0d6", text: "#8a5a1a", label: "MODERATE" },
  info: { bg: "#d6e4f0", text: "#1f4566", label: "INFO" },
};

const SOURCE_BADGE: Record<string, { bg: string; text: string }> = {
  SMRT: { bg: "#dcd3b2", text: "#5b4e24" },
  SHEET: { bg: "#c7ddb5", text: "#33511f" },
  FLEETIO: { bg: "#b9d3e8", text: "#1f4566" },
  PAYCOM: { bg: "#e8b9d3", text: "#661f45" },
};

function sourceBadgeColor(source: string) {
  const key = (source || "").trim().toUpperCase();
  return SOURCE_BADGE[key] ?? { bg: "#e3e3e3", text: "#3a3a3a" };
}

const pdfStyles = StyleSheet.create({
  page: {
    paddingBottom: 40,
    backgroundColor: PDF_COLORS.white,
    fontSize: 10,
    color: PDF_COLORS.bodyText,
    fontFamily: "Helvetica",
  },
  header: {
    backgroundColor: PDF_COLORS.headerBg,
    paddingHorizontal: 32,
    paddingVertical: 26,
    marginBottom: 20,
  },
  eyebrow: {
    color: PDF_COLORS.headerAccent,
    fontSize: 9,
    letterSpacing: 2,
    marginBottom: 10,
    fontFamily: "Helvetica-Bold",
  },
  title: {
    color: PDF_COLORS.white,
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },
  subtitle: {
    color: PDF_COLORS.headerSubtext,
    fontSize: 10,
  },
  section: {
    marginHorizontal: 32,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: PDF_COLORS.cardBorder,
    borderRadius: 4,
    overflow: "hidden",
  },
  sectionHeader: {
    backgroundColor: PDF_COLORS.cream,
    borderLeftWidth: 3,
    borderLeftColor: PDF_COLORS.creamAccent,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionEyebrow: {
    fontSize: 8,
    letterSpacing: 1.5,
    color: "#8a7530",
    fontFamily: "Helvetica-Bold",
    marginBottom: 3,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: "#3a3320",
  },
  sectionBody: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  metaText: {
    fontSize: 9.5,
    color: PDF_COLORS.bodyText,
  },
  metaHighlight: {
    color: "#b4791e",
    fontFamily: "Helvetica-Bold",
  },
  metaDivider: {
    marginHorizontal: 6,
    color: PDF_COLORS.mutedText,
  },
  blockLabel: {
    fontSize: 8,
    letterSpacing: 1.2,
    color: PDF_COLORS.mutedText,
    fontFamily: "Helvetica-Bold",
    marginTop: 8,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: PDF_COLORS.divider,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  checkbox: {
    width: 9,
    height: 9,
    borderWidth: 1,
    borderColor: "#9a9a9a",
    borderRadius: 2,
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: "#4c7a3c",
    borderColor: "#4c7a3c",
  },
  badge: {
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
  },
  reportContent: {
    flex: 1,
  },
  reportName: {
    fontSize: 9.5,
    color: PDF_COLORS.bodyText,
  },
  reportMeta: {
    fontSize: 7.5,
    color: PDF_COLORS.mutedText,
    marginTop: 2,
  },
  rowText: {
    fontSize: 9.5,
  },
  rowTextChecked: {
    color: PDF_COLORS.mutedText,
  },
  rowTime: {
    fontSize: 8,
    color: PDF_COLORS.mutedText,
    marginLeft: 6,
  },
  groupLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#3a3320",
    marginTop: 10,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 9.5,
    color: PDF_COLORS.mutedText,
    fontStyle: "italic",
  },
  notesText: {
    fontSize: 9.5,
    color: PDF_COLORS.bodyText,
    lineHeight: 1.4,
  },
  tableHeader: {
    flexDirection: "row",
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#d0d0d0",
    marginBottom: 4,
  },
  tableHeaderCol: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#6b6b70",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
    alignItems: "center",
  },
  tableCol: {
    fontSize: 8.5,
    color: PDF_COLORS.bodyText,
  },
});

function PdfSectionCard({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={pdfStyles.section}>
      <View style={pdfStyles.sectionHeader} wrap={false}>
        <Text style={pdfStyles.sectionEyebrow}>{eyebrow}</Text>
        <Text style={pdfStyles.sectionTitle}>{title}</Text>
      </View>
      <View style={pdfStyles.sectionBody}>{children}</View>
    </View>
  );
}

function PdfReportsList({ reports }: { reports: any[] }) {
  if (!reports || reports.length === 0) {
    return <Text style={pdfStyles.emptyText}>No reports on file.</Text>;
  }
  return (
    <View>
      {reports.map((r: any, i: number) => {
        const c = sourceBadgeColor(r.source);
        const schedule = [r.day_time ? capitalizeText(r.day_time) : "", r.shift_name].filter(Boolean).join(" · ");
        const employeeName = (r.checked ? r.completed_by_name : null) || r.holder_name;
        const metaDetails = [
          schedule ? `[${schedule}]` : null,
          employeeName ? `Employee: ${employeeName}` : null,
          r.metric === "Image" ? (r.text ? "Photo attached" : null) : (r.text ? `Val: ${r.text}` : null),
        ].filter(Boolean).join(" | ");

        return (
          <View key={r.id ?? i} style={[pdfStyles.row, i === reports.length - 1 ? pdfStyles.rowLast : {}]} wrap={false}>
            <View style={[pdfStyles.checkbox, r.checked ? pdfStyles.checkboxChecked : {}]} />
            {r.source ? (
              <View style={[pdfStyles.badge, { backgroundColor: c.bg }]}>
                <Text style={[pdfStyles.badgeText, { color: c.text }]}>
                  {r.source.toUpperCase()}
                </Text>
              </View>
            ) : null}
            <View style={pdfStyles.reportContent}>
              <Text style={[pdfStyles.reportName, r.checked ? pdfStyles.rowTextChecked : {}]}>
                {r.name || "Untitled report"}
              </Text>
              {metaDetails ? (
                <Text style={pdfStyles.reportMeta}>
                  {metaDetails}
                </Text>
              ) : null}
            </View>
            {r.timestamp ? (
              <Text style={pdfStyles.rowTime}>{format(new Date(r.timestamp), "h:mm a")}</Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function PdfFindingsList({ findings }: { findings: any[] }) {
  if (!findings || findings.length === 0) {
    return <Text style={pdfStyles.emptyText}>No findings logged.</Text>;
  }
  return (
    <View>
      {findings.map((f: any, i: number) => {
        const c = FINDING_BADGE[f.type] ?? FINDING_BADGE.info;
        const details = [
          f.category ? `Category: ${f.category}` : null,
          f.created_at ? format(new Date(f.created_at), "h:mm a") : null,
        ].filter(Boolean).join(" | ");

        return (
          <View key={f.id ?? i} style={[pdfStyles.row, i === findings.length - 1 ? pdfStyles.rowLast : {}]} wrap={false}>
            <View style={[pdfStyles.badge, { backgroundColor: c.bg }]}>
              <Text style={[pdfStyles.badgeText, { color: c.text }]}>{c.label}</Text>
            </View>
            <View style={pdfStyles.reportContent}>
              <Text style={pdfStyles.reportName}>{f.description}</Text>
              {details ? (
                <Text style={pdfStyles.reportMeta}>
                  {details}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function PdfTasksList({ tasks }: { tasks: any[] }) {
  if (!tasks || tasks.length === 0) {
    return <Text style={pdfStyles.emptyText}>No tasks assigned.</Text>;
  }
  const groups = tasks.reduce((acc: Record<string, any[]>, t: any) => {
    const key = t.task_type || "Other";
    (acc[key] ||= []).push(t);
    return acc;
  }, {});

  return (
    <View>
      {Object.entries(groups).map(([groupName, groupTasks]: [string, any[]]) => (
        <View key={groupName}>
          <Text style={pdfStyles.groupLabel}>
            {groupName} ({groupTasks.filter((t) => t.checked).length}/{groupTasks.length})
          </Text>
          {groupTasks.map((t: any, i: number) => (
            <View key={t.id ?? i} style={[pdfStyles.row, i === groupTasks.length - 1 ? pdfStyles.rowLast : {}]} wrap={false}>
              <View style={[pdfStyles.checkbox, t.checked ? pdfStyles.checkboxChecked : {}]} />
              <Text style={[pdfStyles.rowText, t.checked ? pdfStyles.rowTextChecked : {}]}>{t.text}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function PdfCoverageList({ covered }: { covered: any[] }) {
  if (!covered || covered.length === 0) {
    return <Text style={pdfStyles.emptyText}>No coverage entries.</Text>;
  }
  return (
    <View>
      <View style={pdfStyles.tableHeader}>
        <Text style={[pdfStyles.tableHeaderCol, { width: "22%" }]}>DRIVER</Text>
        <Text style={[pdfStyles.tableHeaderCol, { width: "24%" }]}>COVERING FOR</Text>
        <Text style={[pdfStyles.tableHeaderCol, { width: "18%" }]}>ZONE</Text>
        <Text style={[pdfStyles.tableHeaderCol, { width: "12%" }]}>VAN</Text>
        <Text style={[pdfStyles.tableHeaderCol, { width: "10%" }]}>STOPS</Text>
        <Text style={[pdfStyles.tableHeaderCol, { width: "14%" }]}>WINDOWS</Text>
      </View>
      {covered.map((c: any, i: number) => (
        <View key={c.id ?? i} style={pdfStyles.tableRow} wrap={false}>
          <Text style={[pdfStyles.tableCol, { width: "22%", fontFamily: "Helvetica-Bold" }]}>{c.driver_name || "-"}</Text>
          <Text style={[pdfStyles.tableCol, { width: "24%" }]}>{c.covering_for || "-"}</Text>
          <Text style={[pdfStyles.tableCol, { width: "18%" }]}>{c.route_zone || "-"}</Text>
          <Text style={[pdfStyles.tableCol, { width: "12%" }]}>{c.van || "-"}</Text>
          <Text style={[pdfStyles.tableCol, { width: "10%" }]}>{c.stops ?? "-"}</Text>
          <Text style={[pdfStyles.tableCol, { width: "14%" }]}>{c.windows || "-"}</Text>
        </View>
      ))}
    </View>
  );
}

function DailyBriefDocument({ brief }: { brief: any }) {
  const reviewed = (brief.reports || []).filter((r: any) => r.checked);
  const total = brief.reports_all_count ?? (brief.reports ? brief.reports.length : 0);
  const companyName = brief.company_name || "HELENA'S CLEANERS";
  const departmentName = brief.department_name || "";
  const subtitleDate = formatBriefDate(brief.date, "EEEE, MMMM d, yyyy");

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.eyebrow}>
            {companyName.toUpperCase()}{departmentName ? ` · ${departmentName.toUpperCase()} DEPARTMENT` : ""}
          </Text>
          <Text style={pdfStyles.title}>
            {departmentName ? `${departmentName} Brief` : "Daily Lead Brief"}
          </Text>
          <Text style={pdfStyles.subtitle}>{subtitleDate}</Text>
        </View>

        {brief.is_department_journal && brief.duties && brief.duties.length > 0 ? (
          <PdfSectionCard eyebrow="DEPARTMENT TEAM" title={departmentName || "Daily Brief"}>
            <View style={pdfStyles.metaRow}>
              <Text style={pdfStyles.metaText}>
                Reports reviewed:{" "}
                <Text style={pdfStyles.metaHighlight}>
                  {reviewed.length} / {total}
                </Text>
              </Text>
              <Text style={pdfStyles.metaDivider}>|</Text>
              <Text style={pdfStyles.metaText}>
                {brief.driving ? "Driving active" : "On-site"}
              </Text>
            </View>

            <View style={{ marginTop: 4 }}>
              <View style={pdfStyles.tableHeader}>
                <Text style={[pdfStyles.tableHeaderCol, { width: "26%" }]}>EMPLOYEE</Text>
                <Text style={[pdfStyles.tableHeaderCol, { width: "26%" }]}>SHIFT</Text>
                <Text style={[pdfStyles.tableHeaderCol, { width: "22%" }]}>ASSIGNMENT</Text>
                <Text style={[pdfStyles.tableHeaderCol, { width: "26%" }]}>STATUS</Text>
              </View>
              {brief.duties.map((d: any, i: number) => {
                const userReports = (brief.reports || []).filter((r: any) => r.holder_id === d.user_id);
                const userDone = userReports.filter((r: any) => r.checked).length;
                const status = d.ended_at
                  ? `Transferred to ${d.handed_to || "lead"}`
                  : (userReports.length === 0 ? "Pending" : (userDone === userReports.length ? "Completed" : "In progress"));

                return (
                  <View key={d.user_id ?? i} style={pdfStyles.tableRow} wrap={false}>
                    <Text style={[pdfStyles.tableCol, { width: "26%", fontFamily: "Helvetica-Bold" }]}>{d.name}</Text>
                    <Text style={[pdfStyles.tableCol, { width: "26%" }]}>{d.shift || "-"}</Text>
                    <Text style={[pdfStyles.tableCol, { width: "22%" }]}>{d.driving ? "Driving" : "Floor"}</Text>
                    <Text style={[pdfStyles.tableCol, { width: "26%", fontSize: 8, color: PDF_COLORS.mutedText }]}>{status}</Text>
                  </View>
                );
              })}
            </View>
          </PdfSectionCard>
        ) : (
          <PdfSectionCard eyebrow={`EMPLOYEE ${brief.letter ?? ""}`} title={brief.lead_name}>
            <View style={pdfStyles.metaRow}>
              <Text style={pdfStyles.metaText}>
                Shift — <Text style={{ color: PDF_COLORS.bodyText }}>{brief.shift || "—"}</Text>
              </Text>
              <Text style={pdfStyles.metaDivider}>|</Text>
              <Text style={pdfStyles.metaText}>
                Reports reviewed:{" "}
                <Text style={pdfStyles.metaHighlight}>
                  {reviewed.length} / {total}
                </Text>
              </Text>
              <Text style={pdfStyles.metaDivider}>|</Text>
              <Text style={pdfStyles.metaText}>{brief.driving ? "Driving" : "On-site"}</Text>
            </View>
          </PdfSectionCard>
        )}

        <PdfSectionCard eyebrow="SCHEDULED REPORTS" title="Reports">
          <PdfReportsList reports={brief.reports ?? []} />
        </PdfSectionCard>

        <PdfSectionCard eyebrow="ISSUES LOGGED" title="Findings">
          <PdfFindingsList findings={brief.findings ?? []} />
        </PdfSectionCard>

        <PdfSectionCard eyebrow="ACTION ITEMS" title="Tasks">
          <PdfTasksList tasks={brief.tasks ?? []} />
        </PdfSectionCard>

        {brief.covered && brief.covered.length > 0 ? (
          <PdfSectionCard eyebrow="ROUTE COVERAGE" title="Coverage">
            <PdfCoverageList covered={brief.covered} />
          </PdfSectionCard>
        ) : null}

        {brief.notes ? (
          <PdfSectionCard eyebrow="SUMMARY" title="Notes">
            <Text style={pdfStyles.notesText}>{brief.notes}</Text>
          </PdfSectionCard>
        ) : null}
      </Page>
    </Document>
  );
}

export const downloadPDF = async (brief: any) => {
  try {
    const blob = await pdf(<DailyBriefDocument brief={brief} />).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateFormatted = brief.date ? formatBriefDate(brief.date, "yyyy-MM-dd", "brief") : "brief";
    link.download = `daily-brief-${brief.id}-${dateFormatted}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success("PDF downloaded!");
  } catch (err) {
    console.error(err);
    toast.error("Failed to generate PDF");
  }
};
