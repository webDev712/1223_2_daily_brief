"use client";

import { Finding, Report, SavedBrief, Task, User, Covered } from "@/lib/types";
import { useUser } from "../../src/components/UserProvider";
import { useDate } from "../../src/components/DateContext";
import Loader from "@/app/src/components/Loader";
import { useState, useEffect } from "react";
import { format, parse } from "date-fns";
import './page.css'
import UserCircle from "@/app/src/components/UserCircle";
import scrollToElement from "@/lib/html_document";
import { useTranslations } from "next-intl";



export default function Dashboard() {
  const today = new Date();

  const t = useTranslations('Dashboard');
  function getGreeting() {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) return t("good_morning")
    if (hour >= 12 && hour < 18) return t("good_afternoon")
    if (hour >= 18 && hour < 22) return t("good_evening")
    return t("good_night")
  }
  const { date } = useDate();
  const [leads, setLeads] = useState<User[]>([])
  const user = useUser();
  const [briefs, setBriefs] = useState<any[]>([]);
  const [briefsLoading, setBriefsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function load() {
      setLoading(true);
      setBriefsLoading(true);
      const dateString = format(date, "yyyy-MM-dd");

      const res = await fetch(`/api/brief_history?date_from=${dateString}&date_to=${dateString}`);

      if (!res.ok) {
        console.error("Failed to load brief history");
        setBriefsLoading(false);
        return;
      }

      const data = await res.json();
      setBriefs(data);


      const users_res = await fetch(`/api/users`);
      if (!users_res.ok) {
        console.error("Failed to load leads");
        setLoading(false)
        return;
      }  
      let leads_data = await users_res.json();
      leads_data = leads_data
        // .filter((a: User) => a.user_role !== 'manager')
        .filter((a: User) => a.archived !== true)
      setLeads(leads_data)
      
      setBriefsLoading(false);
      setLoading(false);
    }
    load();
  }, [date]);

  const in_progress_count = briefs.filter((b: SavedBrief) => {
     return !b.freezed;
  }).length;
  const reports_done_count: number = briefs.reduce((a_b, b: SavedBrief) => a_b + b.reports?.filter((r: Report) => r.checked).length, 0);
  const reports_all_count: number = briefs.reduce((a_b, b: SavedBrief) => a_b + b.reports?.length, 0);
  const findning_count = briefs.reduce((a_b, b: SavedBrief) => {
    if (b.findings !== null) return a_b + b.findings?.length
    else return a_b;
  }, 0);
  const h_p_finding_count = briefs.reduce((a_b, b: SavedBrief) => {
    if (b.findings !== null) return b.findings && a_b + b.findings?.filter((f: Finding) => f.type === 'high').length;
    else return a_b;
  }, 0);
  const tasks_count = briefs.reduce((a_b, b: SavedBrief) => a_b + b.tasks?.length, 0);
  const tasks_done_count = briefs.reduce((a_b, b: SavedBrief) => a_b + b.tasks?.filter((t: Task) => t.checked === true).length, 0);

  const active_leads_today: string[] = []
  briefs.map((b: SavedBrief) => active_leads_today.indexOf(b.lead_id) === -1 ? active_leads_today.push(b.lead_id) : '')

  const attentionCount = briefs.reduce(
    (sum: number, b: SavedBrief) =>
      sum +
      (b.findings?.filter((f: Finding) => f.type === "high").length ?? 0) +
      (b.tasks?.filter((t: Task) => !t.checked).length ?? 0) +
      (b.reports?.filter((r: Report) => !r.checked).length > 0 ? 1 : 0) +
      (b.lead_id !== b.original_lead_id ? 1 : 0),
    0
  )

  const dutiesCount = briefs.reduce(
    (sum: number, b: SavedBrief) =>
      sum +
      (b.findings?.filter((f: Finding) => f.type === "info").length ?? 0) +
      (b.tasks?.filter((t: Task) => t.checked).length ?? 0) +
      (b.reports?.filter((r: Report) => r.checked).length > 0 ? 1 : 0),
    0
  )
  return (
    <div className="dashboard">
      {loading ?
              (<Loader></Loader>) : (
        <div>
          <h1>{getGreeting()}, {user.name.split(' ')[0]} 👋</h1>
          <p>{t("subtitle")}</p>
          <div className="four-block">
            <div img-id="document-yellow" onClick={() => {scrollToElement('briefs')}}>
              <h1>{briefs.length - in_progress_count}/{briefs.length}</h1>
              <div>{t("daily_briefs")}</div>
              {in_progress_count === 0 ? 
                (<span>{t("all_briefs_submitted")}</span>) : 
                (<span>{t("briefs_not_submitted", { count: in_progress_count })}</span>)}
              {in_progress_count > 0 && 
                (<h2>{t("not_submitted_badge", { count: in_progress_count })}</h2>)}
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
          {briefs.length > 0 ? (
            <div className="briefs">
              {briefs.map((b: SavedBrief) => {
                const b_reports_done = b.reports?.reduce((a_r, r: Report) => a_r + (r.checked ? 1 : 0), 0);
                const b_all_reports = b.reports.length;
                const b_reports_done_perc = (b_reports_done / b_all_reports * 100).toFixed();
                const briefDate = new Date(b.date);

                const isToday =
                  briefDate.getFullYear() === today.getFullYear() &&
                  briefDate.getMonth() === today.getMonth() &&
                  briefDate.getDate() === today.getDate();
                return (
                <div className={b.freezed ? "brief submitted" : (!b.freezed && !isToday ? "brief incomplete" : "brief")} key={`b_${b.id}`}>
                  <div className="lane"></div>
                  <div className="header-sm">
                    <div className="user">
                      <UserCircle user_name={b.lead_name} size={45} />
                      <div>{b.lead_name}</div>
                    </div>
                    <div className="arrow">{b.lead_id !== b.original_lead_id && leads.find((el: User) => el.id == b.lead_id)?.name && '>'}</div>

                    {leads.length > 0 && b.lead_id !== b.original_lead_id && leads.find((el: User) => el.id == b.lead_id)?.name ? 
                      (<div className="user">
                        <UserCircle user_name={leads.find(el => el.id == b.lead_id)?.name || ''} size={45}></UserCircle>
                        <div>{` ${leads.find(el => el.id == b.lead_id)?.name}`}</div>
                      </div>) : ''}
                    {b.freezed && (<div><div className="submitted">● {t("status_submitted")}</div></div>)}
                    {!b.freezed && !isToday && (<div><div className="incomplete">● {t("status_incomplete")}</div></div>)}
                    {!b.freezed && isToday && (<div><div>● {t("status_in_progress")}</div></div>)}
                    
                  </div>
                  <div>
                    <div className="shift">{b.shift || t("no_shift")}</div>
                    <div>{b.driving ? (<div className="driving">{t("driving")}</div>) : (<div className="on-site">{t("floor")}</div>)}</div>
                    {b?.created_at && (<div>{t("started_at", { time: format(new Date(b.created_at), 'hh:mm a') })}</div>)}
                  </div>
                  <div>
                    <div>
                      <div>{t("reports_reviewed")}</div>
                      <div style={{color: (b_reports_done_perc === '100' || b.reports.length === 0  
                        ? '#12B76A' : '')}}>{b.reports?.reduce((a_r, r: Report) => a_r + (r.checked ? 1 : 0), 0)}/{b.reports.length}</div>
                    </div>
                    <div className="progress-bar">
                      <span style={{ width: b_reports_done_perc + "%",
                        backgroundColor: (b_reports_done_perc === '100' || b.reports.length === 0  
                        ? '#12B76A' : '') }}></span>
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
                  {/* TODO: MAKE IT OPEN RIGHT BRIEF (DATE + LEAD) */}
                  <a
                    href={`/daily-brief?date=${format(
                      parse(b.date, "yyyy-MM-dd", new Date()),
                      "d-M-yyyy"
                    )}&lead_id=${b.lead_id}`}
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

              {briefs.map((b: SavedBrief) => {
                const briefDate = new Date(b.date);

                const isToday =
                  briefDate.getFullYear() === today.getFullYear() &&
                  briefDate.getMonth() === today.getMonth() &&
                  briefDate.getDate() === today.getDate();

                if (b.driving === true) return b.covered?.map((route: Covered, route_i: number) => (
                  <div className="covered" key={`${b.id}_route_${route_i}`}>
                    <div><UserCircle user_name={b.lead_name} size={20}></UserCircle> {b.lead_name}</div>
                    <div>{route.covering_for || "-"}</div>
                    <div>{leads.find((e: User) => e.id === b.lead_id)?.department}</div>
                    <div>{route.windows || "-"}</div>
                    <div>
                      <div className={b.freezed ? "submitted" :
                                        !b.freezed && !isToday ? "incomplete" : ""}>
                        {b.freezed && (<div><div>{t("status_submitted")}</div></div>)}
                        {!b.freezed && !isToday && (<div><div>{t("status_incomplete")}</div></div>)}
                        {!b.freezed && isToday && (<div><div>{t("status_in_progress")}</div></div>)}
                      </div>
                    </div>
                  </div>
                ));
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
             {briefs.map((b: SavedBrief) => {
              return b.findings?.map((finding: Finding, finding_i: number) => {
                if (finding.type === 'high') return (
                  <div className="attention attention_finding" key={`${b.id}_attention_finding_${finding_i}`}>
                    <div>
                      <div>
                        <p>{t("high_priority_finding")}</p>
                        <span className="high">{t("badge_high")}</span>
                      </div>
                      <div>{finding.description}</div>
                    </div>
                    <div>
                      <div>
                        <UserCircle user_name={b.lead_name} size={20}></UserCircle>
                        <div>{b.lead_name}</div>
                      </div>
                      <div>{format(new Date(finding.created_at), 'h:m a')}</div>
                    </div>
                  </div>
                )
              })
            })}
            {briefs.flatMap((b: SavedBrief) =>
              (b.tasks || [])
                .filter((task: Task) => !task.checked)
                .map((task: Task, task_i: number) => (
                  <div
                    className="attention attention_task"
                    key={`${b.id}_attention_task_${task_i}`}
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
                        <UserCircle user_name={b.lead_name} size={20} />
                        <div>{b.lead_name}</div>
                      </div>

                    </div>
                  </div>
                ))
            )}
            {briefs.map((b: SavedBrief) => {
              const reports_pending_length = b.reports.filter((report: Report) => report.checked === false).length
              if (reports_pending_length > 0) return (
                  <div className="attention attention_report" key={`${b.id}_attention_reports`}>
                    <div>
                      <div>
                        <p>{t("incomplete_report_review")}</p>
                        <span className="moderate">{t("badge_attention")}</span>
                      </div>
                      <div>{t("reports_not_reviewed", { count: reports_pending_length })}</div>
                    </div>
                    <div>
                      <div>
                        <UserCircle user_name={b.lead_name} size={20}></UserCircle>
                        <div>{b.lead_name}</div>
                      </div>
                      <div>{t("left_count", { count: reports_pending_length })}</div>
                    </div>
                  </div>
              )
            })}
            {briefs.map((b: SavedBrief) => {
              if (b.lead_id !== b.original_lead_id) return (
                  <div className="attention attention_handoff" key={`${b.id}_attention_handoff`}>
                    <div>
                      <div>
                        <p>{t("handed_off_brief")}</p>
                        <span className="moderate">{t("badge_attention")}</span>
                      </div>
                      <div>
                        <div>{t("handed_off_from")}</div>
                        <UserCircle user_name={leads.find(el => el.id === b.original_lead_id)?.name || ""} size={20}></UserCircle>
                        <div>{leads.find(el => el.id === b.original_lead_id)?.name}</div>
                        <div>{t("to")}</div>
                        <UserCircle user_name={leads.find(el => el.id === b.lead_id)?.name || ""} size={20}></UserCircle>
                        <div>{leads.find(el => el.id === b.lead_id)?.name}</div>
                      </div>
                    </div>
                    <div>
                      <div>
                        <UserCircle user_name={b.lead_name} size={20}></UserCircle>
                        <div>{b.lead_name}</div>
                      </div>
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
             {briefs.map((b: SavedBrief) => {
              return b.findings?.map((finding: Finding, finding_i: number) => {
                if (finding.type === 'info') return (
                  <div className="attention attention_finding" key={`${b.id}_attention_finding_${finding_i}`}>
                    <div>
                      <div>
                        <p>{t("information_finding")}</p>
                        <span className="info">{t("badge_info")}</span>
                      </div>
                      <div>{finding.description}</div>
                    </div>
                    <div>
                      <div>
                        <UserCircle user_name={b.lead_name} size={20}></UserCircle>
                        <div>{b.lead_name}</div>
                      </div>
                      <div>{format(new Date(finding.created_at), 'h:m a')}</div>
                    </div>
                  </div>
                )
              })
            })}
            {briefs.flatMap((b: SavedBrief) => 
                (b.tasks || [])
                  .filter((task: Task) => task.checked)
                  .map((task: Task) => (
                  <div className="attention attention_task" key={`${b.id}_attention_task_${task.id}`}>
                    <div>
                      <div>
                        <p>{t("completed_task")}</p>
                        <span className="good">{t("badge_tasks")}</span>
                      </div>
                      <div>{task.text}</div>
                    </div>
                    <div>
                      <div className="flex">
                        <UserCircle user_name={b.lead_name} size={20}></UserCircle>
                        <div>{b.lead_name}</div>
                      </div>
                    </div>
                  </div>

                ))
              )}
            {briefs.map((b: SavedBrief) => {
              const reports_done_length = b.reports.filter((report: Report) => report.checked === true).length
              if (reports_done_length > 0) return (
                  <div className="attention attention_report" key={`${b.id}_attention_reports`}>
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
                        <UserCircle user_name={b.lead_name} size={20}></UserCircle>
                        <div>{b.lead_name}</div>
                      </div>
                      <div>{t("done_count", { count: reports_done_length })}</div>
                    </div>
                  </div>
              )
            })}
            {briefs.map((b: SavedBrief) => {
              if (b.lead_id !== b.original_lead_id) return (
                  <div className="attention attention_handoff" key={`${b.id}_attention_handoff`}>
                    <div>
                      <div>
                        <p>{t("handed_off_brief")}</p>
                        <span className="good">{t("badge_attention")}</span>
                      </div>
                      <div>
                        <div>{t("handed_off_from")}</div>
                        <UserCircle user_name={leads.find(el => el.id === b.original_lead_id)?.name || ""} size={20}></UserCircle>
                        <div>{leads.find(el => el.id === b.original_lead_id)?.name}</div>
                        <div>{t("to")}</div>
                        <UserCircle user_name={leads.find(el => el.id === b.lead_id)?.name || ""} size={20}></UserCircle>
                        <div>{leads.find(el => el.id === b.lead_id)?.name}</div>
                      </div>
                    </div>
                    <div>
                      <div>
                        <UserCircle user_name={b.lead_name} size={20}></UserCircle>
                        <div>{b.lead_name}</div>
                      </div>
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