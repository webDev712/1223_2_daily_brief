import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { SavedBrief } from './types';
import { format } from "date-fns";
import { toast } from 'sonner';

export function generateEmailHTML(b: SavedBrief) {
  const badge = {
    high: "#dc3545",
    moderate: "#f0ad4e",
    info: "#0d6efd",
  };

  const reviewed = b.reports.filter((r: any) => r.checked);

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
        max-width:760px;
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
            ">HELENA'S CLEANERS
            </div>

            <h1 style="
                margin:8px 0 0;
                font-size:30px;
                font-weight:700;
            ">
                Daily Lead Brief
            </h1>

            <div style="opacity:.8;margin-top:8px;">
                ${format(new Date(), "MMMM d, yyyy")}
            </div>
        </div>

        <div style="padding:30px;">

            <h2 style="margin-top:0;">
                Lead ${b.letter} — ${b.lead_name}
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
                    <td>${reviewed.length} / ${b.reports_all_count}</td>
                </tr>
            </table>

            <h3 style="color:#caa85d;">Reports</h3>

            ${
              reviewed.length
                ? `
            <table style="width:100%;border-collapse:collapse;">
                ${reviewed
                  .map(
                    (r: any) => `
                    <tr>
                        <td style="padding:8px 0;">✅</td>
                        <td>${r.name || "Untitled Report"}</td>
                        <td>${r.source}</td>
                        <td align="right">
                            ${
                              r.timestamp
                                ? format(new Date(r.timestamp), "h:mm a")
                                : ""
                            }
                        </td>
                    </tr>
                `
                  )
                  .join("")}
            </table>
            `
                : `<p>No reports reviewed.</p>`
            }

            ${
              b.findings?.length
                ? `
            <h3 style="margin-top:35px;color:#caa85d;">Findings</h3>

            ${b.findings
              .map(
                (f: any) => `
                <div style="
                    margin:8px 0;
                    padding:10px 14px;
                    border-left:5px solid ${badge[f.type as keyof typeof badge]};
                    background:#fafafa;
                ">
                    ${f.description}
                </div>
            `
              )
              .join("")}
            `
                : ""
            }

            <h3 style="margin-top:35px;color:#caa85d;">Tasks</h3>

            ${
              b.tasks?.length
                ? `
                ${b.tasks
                  .map(
                    (t: any) => `
                    <div style="
                        padding:8px 0;
                        border-bottom:1px solid #eee;
                    ">
                        ${
                          t.checked
                            ? "✅"
                            : "⬜"
                        }
                        <b>${t.text}</b>

                        <span style="
                            color:#888;
                            font-size:13px;
                        ">
                            (${t.task_type})
                        </span>
                    </div>
                `
                  )
                  .join("")}
            `
                : "<p>No tasks.</p>"
            }

            ${
              b.notes
                ? `
            <h3 style="margin-top:35px;color:#caa85d;">Notes</h3>

            <div style="
                background:#fafafa;
                border-left:4px solid #caa85d;
                padding:16px;
                line-height:1.6;
            ">
                ${b.notes}
            </div>
            `
                : ""
            }

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
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: "#4c7a3c",
    borderColor: "#4c7a3c",
  },
  badge: {
    borderRadius: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginRight: 10,
  },
  badgeText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
  },
  rowText: {
    fontSize: 9.5,
    flex: 1,
  },
  rowTextChecked: {
    color: PDF_COLORS.mutedText,
    textDecoration: "line-through",
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
    <View style={pdfStyles.section} wrap={false}>
      <View style={pdfStyles.sectionHeader}>
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
        return (
          <View key={r.id ?? i} style={[pdfStyles.row, i === reports.length - 1 ? pdfStyles.rowLast : {}]}>
            <View style={[pdfStyles.checkbox, r.checked ? pdfStyles.checkboxChecked : {}]} />
            {r.source ? (
              <View style={[pdfStyles.badge, { backgroundColor: c.bg }]}>
                <Text style={[pdfStyles.badgeText, { color: c.text }]}>
                  {r.source.toUpperCase()}
                </Text>
              </View>
            ) : null}
            <Text style={[pdfStyles.rowText, r.checked ? pdfStyles.rowTextChecked : {}]}>
              {r.name || "Untitled report"}
            </Text>
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
        return (
          <View key={f.id ?? i} style={[pdfStyles.row, i === findings.length - 1 ? pdfStyles.rowLast : {}]}>
            <View style={[pdfStyles.badge, { backgroundColor: c.bg }]}>
              <Text style={[pdfStyles.badgeText, { color: c.text }]}>{c.label}</Text>
            </View>
            <Text style={pdfStyles.rowText}>{f.description}</Text>
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
            <View key={t.id ?? i} style={[pdfStyles.row, i === groupTasks.length - 1 ? pdfStyles.rowLast : {}]}>
              <View style={[pdfStyles.checkbox, t.checked ? pdfStyles.checkboxChecked : {}]} />
              <Text style={[pdfStyles.rowText, t.checked ? pdfStyles.rowTextChecked : {}]}>{t.text}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function DailyBriefDocument({ brief }: { brief: any }) {
  const reviewed = (brief.reports || []).filter((r: any) => r.checked);
  const total = brief.reports_all_count ?? (brief.reports ? brief.reports.length : 0);

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.eyebrow}>HELENA'S CLEANERS · ROUTE DEPARTMENT</Text>
          <Text style={pdfStyles.title}>Daily Lead Brief</Text>
          <Text style={pdfStyles.subtitle}>
            {brief.date ? format(new Date(brief.date), "EEEE, MMMM d, yyyy") : ""}
          </Text>
        </View>

        <PdfSectionCard eyebrow={`LEAD ${brief.letter ?? ""}`} title={brief.lead_name}>
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

          <Text style={pdfStyles.blockLabel}>REPORTS</Text>
          <PdfReportsList reports={brief.reports ?? []} />
        </PdfSectionCard>

        <PdfSectionCard eyebrow="ISSUES LOGGED" title="Findings">
          <PdfFindingsList findings={brief.findings ?? []} />
        </PdfSectionCard>

        <PdfSectionCard eyebrow="ACTION ITEMS" title="Tasks">
          <PdfTasksList tasks={brief.tasks ?? []} />
        </PdfSectionCard>

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
    link.download = `daily-brief-${brief.id}-${
      brief.date ? format(new Date(brief.date), "yyyy-MM-dd") : "brief"
    }.pdf`;
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
