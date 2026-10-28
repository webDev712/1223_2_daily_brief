'use client';

import Loader from "@/app/src/components/Loader";
import { useEffect, useState } from "react";
import { format, parse } from "date-fns";
import { es, enUS } from "date-fns/locale";
import './page.css'
import UserCircle from "@/app/src/components/UserCircle";
import { Finding, SavedBrief, Task, User } from "@/lib/types";
import { useLocale, useTranslations } from "next-intl";


export default function BriefHistory() {
  const t = useTranslations('BriefHistory');
  const locale = useLocale();
  // В date-fns нет отдельной es-MX локали, для испанского используем `es`
  const dfLocale = locale.startsWith('es') ? es : enUS;

  const today = new Date();
  const daysAgo = new Date();
  const [loading, setLoading] = useState(true)
  const [briefs, setBriefs] = useState([]);
  const [allBriefs, setAllBriefs] = useState([]);
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState('');
  const [days, setDays] = useState('7');
  const [status, setStatus] = useState('');
  const [leadsCount, setLeadsCount] = useState(0);

  useEffect(() => {
      async function load() {
        setLoading(true)
        daysAgo.setDate(daysAgo.getDate() - parseInt(days));

        let dateStringFrom = format(daysAgo, "yyyy-MM-dd");
        let dateStringTo = format(new Date(), "yyyy-MM-dd");

        const briefs_res = await fetch(`/api/brief_history?date_from=${dateStringFrom}&date_to=${dateStringTo}`);

        if (!briefs_res.ok) {
          console.error("Failed to load brief history");
          setLoading(false)
          return;
        }
        let briefs_data = await briefs_res.json();
        setAllBriefs(briefs_data)
        briefs_data = briefs_data.filter((b: SavedBrief) => {
          if (selectedLead !== '' && b.lead_id !== selectedLead) return false;
          const briefDate = new Date(b.date);
          if (status !== ''){
            const isToday =
              briefDate.getFullYear() === today.getFullYear() &&
              briefDate.getMonth() === today.getMonth() &&
              briefDate.getDate() === today.getDate();
            if (status === 'progress'){
              if ((today.getTime() - briefDate.getTime()) / 60 / 60 / 24 / 1000 > 1 || b.freezed) return false;
            }
            if (status === 'submitted'){

              if (!b.freezed) return false;
            }
            if (status === 'incomplete'){
              
              if ((today.getTime() - briefDate.getTime()) / 60 / 60 / 24 / 1000 < 1 || b.freezed) return false;
            }
          }
          return (today.getTime() - briefDate.getTime()) / 60 / 60 / 24 / 1000 < parseInt(days);
        })
        setBriefs(briefs_data)
        const unique_leads: string[] = [];
        briefs_data.map((brief: SavedBrief) => { if (unique_leads.indexOf(brief.lead_id) === -1) unique_leads.push(brief.lead_id); })
        setLeadsCount(unique_leads.length)
        setLoading(false)



        const users_res = await fetch(`/api/users`);
        
        if (!users_res.ok) {
          console.error("Failed to load leads");
          setLoading(false)
          return;
        }  
        let leads_data = await users_res.json();
        // leads_data = leads_data.filter((a: User) => a.user_role !== 'manager');
        setLeads(leads_data);
      }
      load();
    }, [status, days, selectedLead]);
  const briefs_submitted = briefs.filter((b: SavedBrief) => { return b.freezed === true }).length
  const briefs_incomplete = briefs.filter((b: SavedBrief) => { 
    const briefDate = new Date(b.date);
    return b.freezed === false && (today.getTime() - briefDate.getTime()) / 60 / 60 / 24 / 1000 > 1 }).length
                  
  return (
    <div className="brief-history">
      {loading ?
        (<Loader></Loader>) : (
          <div>
              <div>
                <div className="four-block">
                  <div img-id="document" onClick={() => setStatus('')}>
                    <h1>{briefs.length}</h1>
                    <div>{t("total_briefs")}</div>
                    <span>{t("last_days_leads", { days, leads: leadsCount })}</span>
                  </div>
                  <div img-id="done" onClick={() => setStatus('submitted')}>
                    <h1>{briefs_submitted}</h1>
                    <div>{t("card_submitted")}</div>
                    <span>{t("completion_rate", { percent: (briefs_submitted / allBriefs.length * 100).toFixed(0) })}</span>
                  </div>
                  <div img-id="clock" onClick={() => setStatus('progress')}>
                    <h1>{briefs.length - briefs_submitted - briefs_incomplete}</h1>
                    <div>{t("card_in_progress")}</div>
                    <span>{t("awaiting_submission")}</span>
                  </div>
                  <div img-id="error" onClick={() => setStatus('incomplete')}>
                    <h1>{briefs_incomplete}</h1>
                    <div>{t("card_incomplete")}</div>
                    <span>{t("percent_of_all", { percent: (briefs_incomplete / allBriefs.length * 100).toFixed(0) })}</span>
                  </div>
                </div>
                <div className="filters">
                  <select defaultValue={selectedLead} name="leads" id="leads" onChange={(e) => setSelectedLead(e.target.value)}>
                    <option value="">{t("all_leads")}</option>
                    {leads.map((l: User) => (<option key={l.id} value={l.id}>{l.name}</option>))}
                  </select>
                  <select name="status" id="status" defaultValue={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">{t("all_statuses")}</option>
                    <option value="submitted">{t("status_submitted")}</option>
                    <option value="progress">{t("status_in_progress")}</option>
                    <option value="incomplete">{t("status_incomplete")}</option>
                  </select>
                  <select name="days" id="days" defaultValue={days} onChange={(e) => setDays(e.target.value)}>
                    <option value="7">{t("last_days", { days: 7 })}</option>
                    <option value="30">{t("last_days", { days: 30 })}</option>
                    <option value="90">{t("last_days", { days: 90 })}</option>
                  </select>
                </div>
              </div>
              {/* TODO: CHECK FILTERS */}
              <div></div>
              <div className="table-wrapper">
                <div className="table">
                  <label>
                    <div>{t("col_date")}</div>
                    <div>{t("col_employee")}</div>
                    <div>{t("col_shift")}</div>
                    <div>{t("col_work_status")}</div>
                    <div>{t("col_reports")}</div>
                    <div>{t("col_findings")}</div>
                    <div>{t("col_tasks")}</div>
                    {/* <div>HANDOFF</div> */}
                    <div>{t("col_status")}</div>
                    {/* <div>VIEW</div> */}
                  </label>
                  {briefs.map((b: SavedBrief) => {
                    const briefDate = parse(b.date, "yyyy-MM-dd", new Date());
                    const isToday =
                      briefDate.getFullYear() === today.getFullYear() &&
                      briefDate.getMonth() === today.getMonth() &&
                      briefDate.getDate() === today.getDate();
                    const reportsPercentage = b.reports.length === 0 ? '100%' : b.reports.filter((r: any) => r.checked === true).length / b.reports.length * 100;
                    return (
                      <label key={b.id}>
                        <div>
                          <div>{isToday ? t("today") : format(briefDate, t.raw("date_short"), { locale: dfLocale })} {b?.created_at && format(new Date(b.created_at), 'hh:mm a')}</div>
                          <span>{format(briefDate, t.raw("date_long"), { locale: dfLocale })}</span>
                        </div>
                        <div>
                          {b.lead_id !== b.original_lead_id && (
                            <div>
                              <UserCircle user_name={leads.find((el: User) => el.id === b.original_lead_id)?.['name'] || 's'} size={25} />
                              <div>{leads.find((el: User) => el.id === b.original_lead_id)?.['name'] || 's'}</div>
                            </div>
                          )}
                          {b.lead_id !== b.original_lead_id && (<div>{'🢃'}</div>)}
                          <div>
                            <UserCircle user_name={leads.find((el: User) => el.id === b.lead_id)?.['name'] || 's'} size={25} />
                            <div>{leads.find((el: User) => el.id === b.lead_id)?.['name'] || 's'}</div>
                          </div>
                        </div>
                        <div>{b.shift || "-"}</div>
                        <div style={{color: (b.driving === true ? '#4361EE' : '')}}>{b.driving === true ? t("work_driving") : t("work_floor")}</div>
                        <div>
                          <div style={{color: (reportsPercentage === 100 || b.reports.length === 0  ? '#12B76A' : '')}}>{b.reports.filter(r => r.checked === true).length}/{b.reports.length}</div>
                          <div className="progress-bar">
                            <span style={{ width: reportsPercentage + "%", backgroundColor: (reportsPercentage === 100 || b.reports.length === 0  ? '#12B76A' : '') }}></span>
                          </div>
                        </div>
                        <div className={b.findings ? (b.findings.length > 1 ? 'red' : 'yellow') : ''}>{b.findings ? b.findings.length : t("none")}</div>
                        <div>{b.tasks.length}</div>
                        {/* <div>HANDOFF</div> */}
                        <div style={{color: (b.freezed ? '#12B76A' : 
                                                (isToday ? '#F79009' : '#f70909'))}}>
                          ● {b.freezed ? t("status_submitted") : 
                                                (isToday ? t("status_in_progress") : t("status_incomplete"))}
                        </div>
                        <input type="checkbox" />
                        <b>
                          <div>{t("findings_label")}</div>
                          <div>{b.findings && b.findings?.length > 0 ? b.findings.map((finding: Finding) => (
                            <div key={`finding_show_${finding.id}`}>
                              <div className={finding.type}></div>
                              <div>{finding.description}</div>
                              <div>{format(new Date(finding.created_at), 'hh:mm aa')}</div>
                            </div>
                          )) : (
                            <h1>{t("no_findings")}</h1>
                          )}</div>
                          <div>{t("tasks_label")}</div>
                          <div>{b.tasks && b.tasks?.length > 0 ? b.tasks.map((task: Task) => (
                            <div key={`task_show_${task.id}`} className={task.checked ? 'checked' : ''}>
                              <div className={task.roll_to_next_brief === true ? 'roll-next-brief' : 'do-not-roll-next-brief'}></div>
                              <div>{task.text}</div>
                              <div>{task.task_type}</div>
                            </div>
                          )) : (
                            <h1>{t("no_tasks")}</h1>
                          )}</div>
                        </b>
                        {/* <div>VIEW</div> */}
                      </label>
                    )
                  })}
                </div>
              </div>
          </div>
        )}
    </div>
  );
}