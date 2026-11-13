"use client";

import { Finding, Report, SavedBrief, Task, User, Covered, Department } from "@/lib/types";
import { useUser } from "../../src/components/UserProvider";
import { useDate } from "../../src/components/DateContext";
import Loader from "@/app/src/components/Loader";
import { useState, useEffect } from "react";
import { format, parse } from "date-fns";
import './page.css'
import UserCircle from "@/app/src/components/UserCircle";
import scrollToElement from "@/lib/html_document";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import randomInt from "@/lib/num";


export default function Dashboard() {
  const { date, today: todayString, timezone, now } = useDate();

  const t = useTranslations('Dashboard');
  function getGreeting() {
    const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: timezone, hour: '2-digit', hourCycle: 'h23' }).format(now));

    if (hour >= 5 && hour < 12) return t("good_morning")
    if (hour >= 12 && hour < 18) return t("good_afternoon")
    if (hour >= 18 && hour < 22) return t("good_evening")
    return t("good_night")
  }
  const formatTime = (value: string) =>
    new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(value));
  const [leads, setLeads] = useState<User[]>([])
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filters, setFilters] = useState({
    department: ''
  });
  const user = useUser();
  const [briefs, setBriefs] = useState<SavedBrief[]>([]);
  const [briefsLoading, setBriefsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  async function load() {
      setBriefsLoading(true);
      const dateString = format(date, "yyyy-MM-dd");

      const res = await fetch(`/api/brief_history?date_from=${dateString}&date_to=${dateString}`);

      if (!res.ok) {
        console.error("Failed to load brief history");
        setBriefsLoading(false);
        return;
      }

      const data: SavedBrief[] = await res.json();

      const users_res = await fetch(`/api/users`);
      if (!users_res.ok) {
        console.error("Failed to load leads");
        setLoading(false)
        return;
      }  
      let leads_data = await users_res.json();
      leads_data = leads_data
        .filter((a: User) => a.archived !== true)
      setLeads(leads_data)
      
      const departments_res = await fetch(`/api/departments?date=${dateString}`);
      if (!departments_res.ok) {
          console.error("Failed to load departments");
          setLoading(false);
          return;
      }
      let departments_data: Department[] = await departments_res.json();
      setDepartments(departments_data);

      const canSeeAll = user.id === user.main_admin_id || user.permissions.reasign_reports === true
        || user.permissions.see_all_briefs === true || user.permissions.see_dashboard === true;
      const mainDepartments = departments_data.filter((d: Department) => d.is_main
        && (canSeeAll || d.id === user.department_id || data.some(b => b.department_id === d.id)));

      const combined: SavedBrief[] = mainDepartments.flatMap(d => {
        const deptRows = data.filter(b =>
          (b.department_id || leads_data.find((u: User) => u.id === b.lead_id)?.department_id) === d.id
        );
        if (deptRows.length === 0) {
          return [];
        }
        const journal = deptRows.find(b => b.is_department_journal);
        if (journal) {
          return { ...journal, department_id: d.id, department_name: journal.department_name || d.name };
        }
        const legacyDuties = deptRows
          .filter(row => row.lead_name || row.shift)
          .map(row => ({
            user_id: row.lead_id || String(row.id),
            name: row.lead_name || '',
            shift_id: row.shift_id || 0,
            shift: row.shift || '',
            started_at: row.created_at || '',
            driving: Boolean(row.driving),
            ended_at: null,
            handed_to: null,
          }));
        if (deptRows.length === 1) {
          return {
            ...deptRows[0],
            department_id: d.id,
            department_name: deptRows[0].department_name || d.name,
            duties: deptRows[0].duties?.length ? deptRows[0].duties : legacyDuties,
          };
        }
        const handoffRow = deptRows.find(b => b.lead_id && b.original_lead_id && b.lead_id !== b.original_lead_id) ?? deptRows[0];
        const reports = Array.from(new Map(deptRows.flatMap(b => b.reports ?? []).map(r => [r.id, r])).values());
        const tasks = Array.from(new Map(deptRows.flatMap(b => b.tasks ?? []).map(task => [task.id, task])).values());
        const findings = Array.from(new Map(deptRows.flatMap(b => b.findings ?? []).map(f => [f.id || `${f.type}_${f.created_at}_${f.description}`, f])).values());
        const covered = Array.from(new Map(deptRows.flatMap(b => (b.covered ?? []).map(c => ({
          ...c,
          driver_id: c.driver_id ?? b.lead_id,
          driver_name: c.driver_name ?? b.lead_name,
        }))).map(c => [c.id || `${c.covering_for}_${c.route_zone}_${c.windows}`, c])).values());
        const earliest = deptRows
          .map(b => b.created_at)
          .filter(Boolean)
          .sort()[0];
        return {
          ...deptRows[0],
          department_id: d.id,
          department_name: d.name,
          duties: legacyDuties,
          lead_name: [...new Set(deptRows.map(b => b.lead_name?.trim()).filter(Boolean))].join(', '),
          shift: [...new Set(deptRows.map(b => b.shift?.trim()).filter(Boolean))].join(', ') || null,
          driving: deptRows.some(b => b.driving),
          freezed: deptRows.every(b => b.freezed),
          lead_id: handoffRow.lead_id,
          original_lead_id: handoffRow.original_lead_id,
          created_at: earliest,
          reports,
          tasks,
          findings,
          covered,
        };
      }).sort((a, b) => (b.freezed || !b.is_department_journal || b.duty_count > 0 ? 2 : b.reports?.length ? 1 : 0)
        - (a.freezed || !a.is_department_journal || a.duty_count > 0 ? 2 : a.reports?.length ? 1 : 0) || a.department_name.localeCompare(b.department_name));

      setBriefs(combined);
      setBriefsLoading(false);
      setLoading(false);
    }
  useEffect(() => {
    setLoading(true);
    load();
  }, [date, todayString]);

  const activeDuties = (b: SavedBrief) =>
    b.is_department_journal ? (b.duties ?? []).filter(d => !d.ended_at) : [];

  const currentLeadName = (b: SavedBrief) => {
    if (b.is_department_journal) {
      const active = activeDuties(b);
      if (active.length) return active.map(d => d.name).join(', ');
      if (b.duties?.length) return b.duties.map(d => d.name).join(', ');
    }
    return b.lead_name || '';
  };

  const handoffPair = (b: SavedBrief, includePending = false) => {
    if (b.lead_id && b.original_lead_id && b.lead_id !== b.original_lead_id) {
      const from = leads.find((el: User) => el.id === b.original_lead_id)?.name
        || b.duties?.find(d => d.user_id === b.original_lead_id)?.name || '';
      const to = leads.find((el: User) => el.id === b.lead_id)?.name || b.lead_name || '';
      if (from && to && from !== to) return { from, to };
    }
    const transferred = b.duties?.find(d => d.ended_at && d.handed_to);
    if (transferred && transferred.handed_to) return { from: transferred.name, to: transferred.handed_to };
    if (includePending && b.handoffs?.length) {
      return { from: b.handoffs[0].from_name, to: b.handoffs[0].to_name };
    }
    return null;
  };

  const briefs_filtered = briefs.filter((b: SavedBrief) =>
    (filters.department === "" || b.department_id === filters.department)
  );
  const briefs_count = briefs_filtered.length;

  const active_briefs = briefs_filtered.filter((b: SavedBrief) => b.freezed || !b.is_department_journal || b.duty_count > 0);
  const submitted_count = active_briefs.filter((b: SavedBrief) => b.freezed).length;
  const in_progress_count = active_briefs.filter((b: SavedBrief) => !b.freezed && b.date === todayString).length;
  const not_started_count = briefs_filtered.length - active_briefs.length;

  const reports_done_count: number = active_briefs
  .reduce((a_b, b: SavedBrief) => a_b + (b.reports?.filter((r: Report) => r.checked).length ?? 0), 0);
  
  const reports_all_count: number = active_briefs
  .reduce((a_b, b: SavedBrief) => a_b + (b.reports?.length ?? 0), 0);
  
  const findning_count = briefs_filtered.reduce((a_b, b: SavedBrief) => {
    if (b.findings !== null) return a_b + (b.findings?.length ?? 0)
    else return a_b;
  }, 0);
  const h_p_finding_count = briefs_filtered.reduce((a_b, b: SavedBrief) => {
    if (b.findings !== null) return a_b + (b.findings?.filter((f: Finding) => f.type === 'high').length ?? 0);
    else return a_b;
  }, 0);
  const tasks_count = briefs_filtered.reduce((a_b, b: SavedBrief) => a_b + (b.tasks?.length ?? 0), 0);
  const tasks_done_count = briefs_filtered.reduce((a_b, b: SavedBrief) => a_b + (b.tasks?.filter((t: Task) => t.checked === true).length ?? 0), 0);

  const active_leads_today = active_briefs;

  const attentionCount = briefs_filtered.reduce(
    (sum: number, b: SavedBrief) =>
      sum +
      (b.findings?.filter((f: Finding) => f.type === "high").length ?? 0) +
      (b.tasks?.filter((t: Task) => !t.checked).length ?? 0) +
      ((!b.is_department_journal || b.duty_count > 0) && (b.reports?.filter((r: Report) => !r.checked).length ?? 0) > 0 ? 1 : 0) +
      (handoffPair(b, true) ? 1 : 0),
    0
  )

  const dutiesCount = briefs_filtered.reduce(
    (sum: number, b: SavedBrief) =>
      sum +
      (b.findings?.filter((f: Finding) => f.type === "info").length ?? 0) +
      (b.tasks?.filter((t: Task) => t.checked).length ?? 0) +
      ((b.reports?.filter((r: Report) => r.checked).length ?? 0) > 0 ? 1 : 0) +
      (handoffPair(b, false) ? 1 : 0),
    0
  )
  useEffect(() => {
      const interval = setInterval(() => {
          if (document.visibilityState !== 'visible') return;
          load()
      }, 60000);

      return () => clearInterval(interval);
  }, []);
  

  return (
    <div className="dashboard">
      {loading ?
              (<Loader></Loader>) : (
        <div>
          <h1 className="flex">
            <div>
              {getGreeting()}, {user.name.split(' ')[0]} {['👋', '💼', '📋', '📝', '📌', '📊', '📈', '⚙️', '🗂️'][parseInt(format(new Date(), 'dd')) % 8]}
            </div>
            <div className="flex">
              <h1>{t('display_for')}</h1>
              <select className="input" value={filters.department} onChange={(e) => setFilters({department: e.target.value})}>
                <option value="">{t('entire_company')} ({briefs.length} brief{(briefs.length > 1 || briefs.length === 0) && 's'})</option>
                {departments.slice().sort((a: Department, b: Department) =>
                  {
                    const diff = active_briefs.filter((brief: SavedBrief) => brief.department_id === b.id).length -
                    active_briefs.filter((brief: SavedBrief) => brief.department_id === a.id).length
                    if (diff === 0) return a.name.localeCompare(b.name);
                    return diff;
                  }
                ).map((department: Department) => {
                  if (department.is_main){
                    let briefs_count_filtered = briefs.filter((brief: SavedBrief) => brief.department_id === department.id).length
                    return (
                      <option key={`filter_dashboard_by_department_${department.id}`} value={department.id}>{t('department')} {department.name}</option>
                    )
                  }
                })}
              </select>
            </div>
          </h1>
          <p>{t("subtitle")}</p>
          <div className="four-block">
            <div img-id="document-yellow" onClick={() => {scrollToElement('briefs')}}>
              <h1>{submitted_count}/{active_briefs.length}</h1>
              <div>{t("daily_briefs")}</div>
              {active_briefs.length === 0 ? (
                <span>{t("no_active_briefs")}</span>
              ) : submitted_count === active_briefs.length ? (
                <span>{t("all_briefs_submitted")}</span>
              ) : (
                <span>{t("briefs_not_submitted", { count: active_briefs.length - submitted_count })}</span>
              )}
              <div className="brief-badges">
                {submitted_count > 0 && (
                  <span className="badge-submitted">{t("submitted_badge", { count: submitted_count })}</span>
                )}
                {in_progress_count > 0 && (
                  <span className="badge-active">{t("active_badge", { count: in_progress_count })}</span>
                )}
                {not_started_count > 0 && (
                  <span className="badge-not-started">{t("not_started_badge", { count: not_started_count })}</span>
                )}
              </div>
            </div>
            <div img-id="book-blue" onClick={() => {scrollToElement('duties-done')}}>
              <h1>{reports_done_count}/{reports_all_count}
              </h1>
              {" "}
              <div>{t("reports_reviewed")}</div>
              <span>{t("reports_need_review", { count: reports_all_count - reports_done_count })}</span>
              {reports_all_count > 0 && (
                <h2>{t("percent_done", { percent: (reports_done_count / reports_all_count * 100).toFixed() })}</h2>
              )}
            </div>
            <div img-id="error-yellow" onClick={() => {scrollToElement('requires-attention')}}>
              <h1>{findning_count}</h1>
              <div>{t("open_findings")}</div>
              <span>{t("high_priority_findings", { count: h_p_finding_count })}</span>
              {h_p_finding_count > 0 && (
                <h2>{t("high_badge", { count: h_p_finding_count })}</h2>
              )}
            </div>
            <div img-id="tasks-red" onClick={() => {scrollToElement('requires-attention')}}>
              <h1>{tasks_count}</h1>
              <div>{t("tasks_this_day")}</div>
              <span>{t("tasks_done", { count: tasks_done_count })}</span>
              {tasks_count > 0 && (
                <h2>{t("percent_done", { percent: (tasks_done_count / tasks_count * 100).toFixed() })}</h2>
              )}
            </div>
          </div>
          <div className="flex j-s-b" id="briefs">
            <div>
              <h3>{t("daily_briefs")}</h3>
              <p>{t("click_card_hint")}</p>
            </div>
            <div>{t("briefs_active", { count: active_leads_today.length })}</div>
          </div>
          {briefs_count > 0 ? (
            <div className="briefs">
              {briefs_filtered.map((b: SavedBrief) => {
                const b_reports_done = b.reports?.reduce((a_r, r: Report) => a_r + (r.checked ? 1 : 0), 0) ?? 0;
                const b_all_reports = b.reports?.length ?? 0;
                const notStarted = !b.freezed && b.is_department_journal && b.duty_count === 0;
                const b_reports_done_perc = b_all_reports > 0 ? (b_reports_done / b_all_reports * 100).toFixed() : (notStarted ? '0' : '100');
                const isAllDone = !notStarted && (b_reports_done_perc === '100' || b_all_reports === 0);
                const isToday = b.date === todayString;
                const startedAt = notStarted ? null : b.started_at || b.created_at;
                return (
                <div className={b.freezed ? "brief submitted" : (notStarted ? "brief not-started" : (!isToday ? "brief incomplete" : "brief"))} key={`b_${b.department_id}_${b.id}`}>
                  <div className="lane"></div>
                  <div className="header-sm">
                    <div className="user">
                      <UserCircle user_name={b.department_name} size={45} />
                      <div>{b.department_name}</div>
                    </div>
                    {b.freezed && (<div><div className="submitted">● {t("status_submitted")}</div></div>)}
                    {notStarted && (<div><div className="not-started">● {t(b_all_reports === 0 ? "status_no_report" : "status_not_started")}</div></div>)}
                    {!b.freezed && !notStarted && !isToday && (<div><div className="incomplete">● {t("status_incomplete")}</div></div>)}
                    {!b.freezed && !notStarted && isToday && (<div><div>● {t("status_in_progress")}</div></div>)}
                    
                  </div>
                  <div className="duties-list">
                    {b.duties?.length ? b.duties.map((d, duty_i) => {
                      const dutyReports = b.reports?.filter(r => r.holder_id === d.user_id) ?? [];
                      const dutyPendingHandoff = b.handoffs?.find(h => h.from_user_id === d.user_id);
                      const dutyStatus = d.ended_at
                        ? t("duty_transferred", { name: d.handed_to ?? "" })
                        : dutyPendingHandoff
                        ? t("duty_awaiting", { name: dutyPendingHandoff.to_name })
                        : !dutyReports.length
                        ? t("duty_pending")
                        : dutyReports.every(r => r.checked)
                        ? t("duty_completed")
                        : t("duty_in_progress");
                      const dutyStartedAt = d.started_at || startedAt;

                      return (
                        <div className="duty-row" key={`${d.user_id}_${duty_i}`}>
                          <div className="shift">
                            {[d.shift || t("no_shift"), d.name].filter(Boolean).join(", ")}
                          </div>
                          <div className="duty-status">
                            {dutyStatus}
                          </div>
                          <div>
                            {d.driving ? (
                              <div className="driving">{t("driving")}</div>
                            ) : (
                              <div className="on-site">{t("floor")}</div>
                            )}
                          </div>
                          {dutyStartedAt && (
                            <div>
                              {t("started_at", { time: formatTime(dutyStartedAt) })}
                            </div>
                          )}
                        </div>
                      );
                    }) : (
                      <div className="duty-row">
                        <div className="shift">{t("no_shift")}</div>
                        <div>
                          {b.driving ? (
                            <div className="driving">{t("driving")}</div>
                          ) : (
                            <div className="on-site">{t("floor")}</div>
                          )}
                        </div>
                        {startedAt && (
                          <div>
                            {t("started_at", { time: formatTime(startedAt) })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <div>
                      <div>{t("reports_reviewed")}</div>
                      <div style={{color: (isAllDone ? '#12B76A' : '')}}>{b_reports_done}/{b_all_reports}</div>
                    </div>
                    <div className="progress-bar">
                      <span style={{ width: b_reports_done_perc + "%",
                        backgroundColor: (isAllDone ? '#12B76A' : '') }}></span>
                    </div>
                  </div>
                  <div>
                    <div>
                      <span>{b.findings?.length || 0}</span>
                      <div>{t("findings")}</div>
                    </div>
                    <div>
                      <span>{b.tasks?.length || 0}</span>
                      <div>{t("tasks")}</div>
                    </div>
                  </div>
                  <a
                    href={`/daily-brief?date=${format(
                      parse(b.date, "yyyy-MM-dd", new Date()),
                      "d-M-yyyy"
                    )}&department_id=${b.department_id}`}
                    className="button-d-bl"
                  >{t("view_brief")}   ➯</a>
                </div>
                )
              }
            )}
          </div>) : (<h4>{t("no_briefs")}</h4>)}
          <div style={{marginTop: 20}}>
            <h3>{t("todays_coverage")}</h3>
            <div className="table-wrapper">

              <div className="covered-container">
                <div>
                  <span>{t("col_employee")}</span>
                  <span>{t("col_covering_for")}</span>
                  <span>{t("col_department")}</span>
                  <span>{t("col_window")}</span>
                  <span>{t("col_status")}</span>
                </div>

              {briefs_filtered.map((b: SavedBrief) => {
                const isToday = b.date === todayString;
                const notStarted = !b.freezed && b.is_department_journal && b.duty_count === 0;

                return b.covered?.map((route: Covered, route_i: number) => {
                  const driverName = route.driver_name || leads.find((e: User) => e.id === route.driver_id)?.name || currentLeadName(b) || b.department_name;
                  return (
                  <div className="covered" key={`${b.department_id}_${b.id}_route_${route_i}`}>
                    <div><UserCircle user_name={driverName} size={20}></UserCircle> {driverName}</div>
                    <div>{route.covering_for || "-"}</div>
                    <div>{b.department_name}</div>
                    <div>{route.windows || "-"}</div>
                    <div>
                      <div className={b.freezed ? "submitted" :
                                        notStarted ? "not-started" : !isToday ? "incomplete" : ""}>
                        {b.freezed && (<div><div>{t("status_submitted")}</div></div>)}
                        {notStarted && (<div><div>{t(b.reports?.length ? "status_not_started" : "status_no_report")}</div></div>)}
                        {!b.freezed && !notStarted && !isToday && (<div><div>{t("status_incomplete")}</div></div>)}
                        {!b.freezed && !notStarted && isToday && (<div><div>{t("status_in_progress")}</div></div>)}
                      </div>
                    </div>
                  </div>
                  );
                });
              })}
            </div>
            </div>
          </div>
          <div style={{marginTop: 20}}>
            <div className="flex j-s-b">
              <div id="requires-attention">
                <h3>{t("requires_attention")}</h3>
                <p>{t("ordered_by_urgency")}</p>
              </div>
              <div>{t("items_count", { count: attentionCount })}</div>
            </div>
            {attentionCount === 0 && (<h3>{t("no_attention")}</h3>)}
            <div className="attention-container">
             {briefs_filtered.map((b: SavedBrief) => {
              const leadName = currentLeadName(b);
              const href = `/daily-brief?date=${format(parse(b.date, "yyyy-MM-dd", new Date()), "d-M-yyyy")}&department_id=${b.department_id}`;
              return b.findings?.map((finding: Finding, finding_i: number) => {
                const authorName = leads.find((u: User) => u.id === (finding as any).user_id)?.name || leadName;
                if (finding.type === 'high') return (
                  <div className="attention attention_finding" key={`${b.department_id}_${b.id}_attention_finding_${finding_i}`} style={{ cursor: "pointer" }} onClick={() => { window.location.href = href; }}>
                    <div>
                      <div>
                        <p>{t("high_priority_finding")}</p>
                        <span className="high">{t("badge_high")}</span>
                      </div>
                      <div>{finding.description}</div>
                    </div>
                    <div>
                      <div>
                        <UserCircle user_name={b.department_name} size={20}></UserCircle>
                        <div>{b.department_name}</div>
                      </div>
                      <div>{[authorName, formatTime(finding.created_at)].filter(Boolean).join(", ")}</div>
                    </div>
                  </div>
                )
              })
            })}
            {briefs_filtered.flatMap((b: SavedBrief) => {
              const leadName = currentLeadName(b);
              const href = `/daily-brief?date=${format(parse(b.date, "yyyy-MM-dd", new Date()), "d-M-yyyy")}&department_id=${b.department_id}`;
              return (b.tasks || [])
                .filter((task: Task) => !task.checked)
                .map((task: Task, task_i: number) => (
                  <div
                    className="attention attention_task"
                    key={`${b.department_id}_${b.id}_attention_task_${task_i}`}
                    style={{ cursor: "pointer" }}
                    onClick={() => { window.location.href = href; }}
                  >
                    <div>
                      <div>
                        <p>{t("pending_task")}</p>
                        <span className="moderate">{t("badge_attention")}</span>
                      </div>

                      <div>{task.text}</div>
                    </div>

                    <div>
                      <div className="flex">
                        <UserCircle user_name={b.department_name} size={20} />
                        <div>{b.department_name}</div>
                      </div>
                      {leadName && <div>{leadName}</div>}
                    </div>
                  </div>
                ));
            })}
            {briefs_filtered.map((b: SavedBrief) => {
              const reports_pending_length = b.reports.filter((report: Report) => report.checked === false).length;
              const leadName = currentLeadName(b);
              const href = `/daily-brief?date=${format(parse(b.date, "yyyy-MM-dd", new Date()), "d-M-yyyy")}&department_id=${b.department_id}`;
              if ((!b.is_department_journal || b.duty_count > 0) && reports_pending_length > 0) return (
                  <div className="attention attention_report" key={`${b.department_id}_${b.id}_attention_reports`} style={{ cursor: "pointer" }} onClick={() => { window.location.href = href; }}>
                    <div>
                      <div>
                        <p>{t("incomplete_report_review")}</p>
                        <span className="moderate">{t("badge_attention")}</span>
                      </div>
                      <div>{t("reports_not_reviewed", { count: reports_pending_length })}</div>
                    </div>
                    <div>
                      <div>
                        <UserCircle user_name={b.department_name} size={20}></UserCircle>
                        <div>{b.department_name}</div>
                      </div>
                      <div>{[leadName, t("left_count", { count: reports_pending_length })].filter(Boolean).join(", ")}</div>
                    </div>
                  </div>
              )
            })}
            {briefs_filtered.map((b: SavedBrief) => {
              const handoff = handoffPair(b, true);
              const leadName = currentLeadName(b);
              const href = `/daily-brief?date=${format(parse(b.date, "yyyy-MM-dd", new Date()), "d-M-yyyy")}&department_id=${b.department_id}`;
              if (handoff) return (
                  <div className="attention attention_handoff" key={`${b.department_id}_${b.id}_attention_handoff`} style={{ cursor: "pointer" }} onClick={() => { window.location.href = href; }}>
                    <div>
                      <div>
                        <p>{t("handed_off_brief")}</p>
                        <span className="moderate">{t("badge_attention")}</span>
                      </div>
                      <div>
                        <div>{t("handed_off_from")}</div>
                        <UserCircle user_name={handoff.from} size={20}></UserCircle>
                        <div>{handoff.from}</div>
                        <div>{t("to")}</div>
                        <UserCircle user_name={handoff.to} size={20}></UserCircle>
                        <div>{handoff.to}</div>
                      </div>
                    </div>
                    <div>
                      <div>
                        <UserCircle user_name={b.department_name} size={20}></UserCircle>
                        <div>{b.department_name}</div>
                      </div>
                      {leadName && <div>{leadName}</div>}
                    </div>
                  </div>
              )
            })}
            </div>
          </div>
          <div style={{marginTop: 20}}>
            <div className="flex j-s-b">
              <div id="duties-done">
                <h3>{t("duties_done")}</h3>
                <p>{t("duties_subtitle")}</p>
              </div>
              <div>{t("items_count", { count: dutiesCount })}</div>
            </div>
            {dutiesCount === 0 && (<h3>{t("no_duties")}</h3>)}
            <div className="attention-container duties-container">
             {briefs_filtered.map((b: SavedBrief) => {
              const leadName = currentLeadName(b);
              const href = `/daily-brief?date=${format(parse(b.date, "yyyy-MM-dd", new Date()), "d-M-yyyy")}&department_id=${b.department_id}`;
              return b.findings?.map((finding: Finding, finding_i: number) => {
                const authorName = leads.find((u: User) => u.id === (finding as any).user_id)?.name || leadName;
                if (finding.type === 'info') return (
                  <div className="attention attention_finding" key={`${b.department_id}_${b.id}_attention_finding_${finding_i}`} style={{ cursor: "pointer" }} onClick={() => { window.location.href = href; }}>
                    <div>
                      <div>
                        <p>{t("information_finding")}</p>
                        <span className="info">{t("badge_info")}</span>
                      </div>
                      <div>{finding.description}</div>
                    </div>
                    <div>
                      <div>
                        <UserCircle user_name={b.department_name} size={20}></UserCircle>
                        <div>{b.department_name}</div>
                      </div>
                      <div>{[authorName, formatTime(finding.created_at)].filter(Boolean).join(", ")}</div>
                    </div>
                  </div>
                )
              })
            })}
            {briefs_filtered.flatMap((b: SavedBrief) => {
                const leadName = currentLeadName(b);
                const href = `/daily-brief?date=${format(parse(b.date, "yyyy-MM-dd", new Date()), "d-M-yyyy")}&department_id=${b.department_id}`;
                return (b.tasks || [])
                  .filter((task: Task) => task.checked)
                  .map((task: Task) => (
                  <div className="attention attention_task" key={`${b.department_id}_${b.id}_attention_task_${task.id}`} style={{ cursor: "pointer" }} onClick={() => { window.location.href = href; }}>
                    <div>
                      <div>
                        <p>{t("completed_task")}</p>
                        <span className="good">{t("badge_tasks")}</span>
                      </div>
                      <div>{task.text}</div>
                    </div>
                    <div>
                      <div className="flex">
                        <UserCircle user_name={b.department_name} size={20}></UserCircle>
                        <div>{b.department_name}</div>
                      </div>
                      {leadName && <div>{leadName}</div>}
                    </div>
                  </div>

                ));
              })}
            {briefs_filtered.map((b: SavedBrief) => {
              const reports_done_length = b.reports.filter((report: Report) => report.checked === true).length;
              const leadName = currentLeadName(b);
              const href = `/daily-brief?date=${format(parse(b.date, "yyyy-MM-dd", new Date()), "d-M-yyyy")}&department_id=${b.department_id}`;
              if (reports_done_length > 0) return (
                  <div className="attention attention_report" key={`${b.department_id}_${b.id}_attention_reports`} style={{ cursor: "pointer" }} onClick={() => { window.location.href = href; }}>
                    <div>
                      <div>
                        <p>{t("reports_progress")}</p>
                        <span className="good">{t("badge_reports")}</span>
                      </div>
                      <div>{reports_done_length === b.reports.length
                        ? t("all_reports_reviewed", { count: reports_done_length })
                        : t("reports_reviewed_count", { count: reports_done_length })}</div>
                    </div>
                    <div>
                      <div>
                        <UserCircle user_name={b.department_name} size={20}></UserCircle>
                        <div>{b.department_name}</div>
                      </div>
                      <div>{[leadName, t("done_count", { count: reports_done_length })].filter(Boolean).join(", ")}</div>
                    </div>
                  </div>
              )
            })}
            {briefs_filtered.map((b: SavedBrief) => {
              const handoff = handoffPair(b, false);
              const leadName = currentLeadName(b);
              const href = `/daily-brief?date=${format(parse(b.date, "yyyy-MM-dd", new Date()), "d-M-yyyy")}&department_id=${b.department_id}`;
              if (handoff) return (
                  <div className="attention attention_handoff" key={`${b.department_id}_${b.id}_attention_handoff`} style={{ cursor: "pointer" }} onClick={() => { window.location.href = href; }}>
                    <div>
                      <div>
                        <p>{t("handed_off_brief")}</p>
                        <span className="good">{t("badge_attention")}</span>
                      </div>
                      <div>
                        <div>{t("handed_off_from")}</div>
                        <UserCircle user_name={handoff.from} size={20}></UserCircle>
                        <div>{handoff.from}</div>
                        <div>{t("to")}</div>
                        <UserCircle user_name={handoff.to} size={20}></UserCircle>
                        <div>{handoff.to}</div>
                      </div>
                    </div>
                    <div>
                      <div>
                        <UserCircle user_name={b.department_name} size={20}></UserCircle>
                        <div>{b.department_name}</div>
                      </div>
                      {leadName && <div>{leadName}</div>}
                    </div>
                  </div>
              )
            })}
            </div>
          </div>
        </div>)}
    </div>
  );
}