'use client';

import Loader from "@/app/src/components/Loader";
import { useEffect, useState } from "react";
import { format, parse } from "date-fns";
import { es, enUS } from "date-fns/locale";
import './page.css'
import UserCircle from "@/app/src/components/UserCircle";
import { Department, Finding, SavedBrief, Task, User } from "@/lib/types";
import { useLocale, useTranslations } from "next-intl";
import { useDate } from "@/app/src/components/DateContext";
import Link from "next/link";


export default function BriefHistory() {
  const t = useTranslations('BriefHistory');
  const locale = useLocale();
  const dfLocale = locale.startsWith('es') ? es : enUS;
  const { today: todayString, timezone } = useDate();
  const briefTime = new Intl.DateTimeFormat(locale, { timeZone: timezone, hour: '2-digit', minute: '2-digit' });

  const [loading, setLoading] = useState(true)
  const [briefs, setBriefs] = useState<SavedBrief[]>([]);
  const [allBriefs, setAllBriefs] = useState<SavedBrief[]>([]);
  const [leads, setLeads] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedLead, setSelectedLead] = useState('');
  const [days, setDays] = useState('7');
  const [status, setStatus] = useState('');
  const [leadsCount, setLeadsCount] = useState(0);

  useEffect(() => {
      async function load() {
        setLoading(true)
        const baseDate = parse(todayString, "yyyy-MM-dd", new Date());
        const daysAgo = new Date(baseDate);
        if (days !== 'all') {
          daysAgo.setDate(daysAgo.getDate() - parseInt(days));
        }

        let dateStringFrom = format(daysAgo, "yyyy-MM-dd");
        let dateStringTo = todayString;

        const [briefs_res, users_res, departments_res] = await Promise.all([
          fetch(days === 'all' ? `/api/brief_history` : `/api/brief_history?date_from=${dateStringFrom}&date_to=${dateStringTo}`),
          fetch(`/api/users`),
          fetch(`/api/departments`)
        ]);

        if (!briefs_res.ok) {
          console.error("Failed to load brief history");
          setLoading(false)
          return;
        }
        if (!users_res.ok) {
          console.error("Failed to load leads");
          setLoading(false)
          return;
        }
        let leads_data = await users_res.json();
        setLeads(leads_data);
        if (departments_res.ok) {
          const departments_data = (await departments_res.json()).filter((d: Department) => d.is_main);
          setDepartments(departments_data);
        }

        let briefs_data = await briefs_res.json();
        briefs_data = briefs_data.filter((b: SavedBrief) => {
          if (selectedDepartment !== '') {
            const deptId = b.department_id || leads_data.find((u: User) => u.id === b.lead_id)?.department_id;
            if (deptId !== selectedDepartment) return false;
          }
          if (selectedLead !== '' && b.lead_id !== selectedLead && b.original_lead_id !== selectedLead && !b.duties?.some(d => d.user_id === selectedLead)) return false;
          if (days !== 'all') {
            if (!b.date || b.date < dateStringFrom || b.date > dateStringTo) return false;
          }
          return true;
        });
        setAllBriefs(briefs_data);
        briefs_data = briefs_data.filter((b: SavedBrief) => {
          const isToday = b.date === todayString;
          const notStarted = !b.freezed && b.is_department_journal && b.duty_count === 0;
          if (status !== ''){
            if (status === 'progress'){
              if (!isToday || b.freezed || notStarted) return false;
            }
            if (status === 'submitted'){
              if (!b.freezed) return false;
            }
            if (status === 'incomplete'){
              if (!b.date || b.date >= todayString || b.freezed || notStarted) return false;
            }
            if (status === 'not_started' && !notStarted) return false;
          }
          return true;
        })
        setBriefs(briefs_data)
        const unique_leads: string[] = [];
        briefs_data.forEach((brief: SavedBrief) => {
          const ids = brief.is_department_journal && brief.duties?.length
            ? brief.duties.map(d => d.user_id)
            : [brief.lead_id];
          ids.forEach(id => {
            if (id && unique_leads.indexOf(id) === -1) unique_leads.push(id);
          });
        })
        setLeadsCount(unique_leads.length)
        setLoading(false)
      }
      load();
    }, [status, days, selectedLead, selectedDepartment, todayString]);
  const briefs_submitted = briefs.filter((b: SavedBrief) => { return b.freezed === true }).length
  const briefs_incomplete = briefs.filter((b: SavedBrief) => { 
    return b.freezed === false && b.date && b.date < todayString
      && (!b.is_department_journal || b.duty_count > 0) }).length
  const briefs_in_progress = briefs.filter(b => !b.freezed && b.date === todayString
    && (!b.is_department_journal || b.duty_count > 0)).length;
  const startedBriefs = allBriefs.filter(b => b.freezed || !b.is_department_journal || b.duty_count > 0);
  const completionRate = startedBriefs.length
    ? (startedBriefs.filter(b => b.freezed).length / startedBriefs.length * 100).toFixed(0) : '0';
                  
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
                    <span>{days === 'all' ? t("all_history") : t("last_days_leads", { days, leads: leadsCount })}</span>
                  </div>
                  <div img-id="done" onClick={() => setStatus('submitted')}>
                    <h1>{briefs_submitted}</h1>
                    <div>{t("card_submitted")}</div>
                    <span>{t("completion_rate", { percent: completionRate })}</span>
                  </div>
                  <div img-id="clock" onClick={() => setStatus('progress')}>
                    <h1>{briefs_in_progress}</h1>
                    <div>{t("card_in_progress")}</div>
                    <span>{t("awaiting_submission")}</span>
                  </div>
                  <div img-id="error" onClick={() => setStatus('incomplete')}>
                    <h1>{briefs_incomplete}</h1>
                    <div>{t("card_incomplete")}</div>
                    <span>{t("percent_of_all", { percent: allBriefs.length ? (briefs_incomplete / allBriefs.length * 100).toFixed(0) : '0' })}</span>
                  </div>
                </div>
                <div className="filters">
                  <select value={selectedDepartment} name="departments" id="departments" onChange={(e) => setSelectedDepartment(e.target.value)}>
                    <option value="">{t("all_departments")}</option>
                    {departments.map((d: Department) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                  </select>
                  <select value={selectedLead} name="leads" id="leads" onChange={(e) => setSelectedLead(e.target.value)}>
                    <option value="">{t("all_leads")}</option>
                    {leads.map((l: User) => (<option key={l.id} value={l.id}>{l.name}</option>))}
                  </select>
                  <select name="status" id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">{t("all_statuses")}</option>
                    <option value="submitted">{t("status_submitted")}</option>
                    <option value="progress">{t("status_in_progress")}</option>
                    <option value="incomplete">{t("status_incomplete")}</option>
                    <option value="not_started">{t("status_not_started")}</option>
                  </select>
                  <select name="days" id="days" value={days} onChange={(e) => setDays(e.target.value)}>
                    <option value="7">{t("last_days", { days: 7 })}</option>
                    <option value="30">{t("last_days", { days: 30 })}</option>
                    <option value="90">{t("last_days", { days: 90 })}</option>
                    <option value="all">{t("all_history")}</option>
                  </select>
                </div>
              </div>
              <div></div>
              <div className="table-wrapper">
                <div className="table">
                  <label>
                    <div>{t("col_date")}</div>
                    <div>{t("col_department")}</div>
                    <div>{t("col_employee")}</div>
                    <div>{t("col_shift")}</div>
                    <div>{t("col_work_status")}</div>
                    <div>{t("col_reports")}</div>
                    <div>{t("col_findings")}</div>
                    <div>{t("col_tasks")}</div>
                    <div>{t("col_status")}</div>
                  </label>
                  {briefs.map((b: SavedBrief) => {
                    const briefDate = b.date ? parse(b.date, "yyyy-MM-dd", new Date()) : null;
                    const isToday = b.date === todayString;
                    const notStarted = !b.freezed && b.is_department_journal && b.duty_count === 0;
                    const reportsPercentage = b.reports.length === 0 ? '100%' : b.reports.filter((r: any) => r.checked === true).length / b.reports.length * 100;
                    const timeValue = notStarted ? null : b.started_at || b.created_at;
                    const departmentName = b.department_name
                      || leads.find((el: User) => el.id === b.original_lead_id)?.department
                      || leads.find((el: User) => el.id === b.lead_id)?.department
                      || '-';
                    return (
                      <label key={b.id}>
                        <div>
                          <div>{briefDate ? (isToday ? t("today") : format(briefDate, t.raw("date_short"), { locale: dfLocale })) : t("unknown_date")} {timeValue && briefTime.format(new Date(timeValue))}</div>
                          <span>{briefDate ? format(briefDate, t.raw("date_long"), { locale: dfLocale }) : '-'}</span>
                        </div>
                        <div>{departmentName}</div>
                        <div className={b.is_department_journal && b.duties?.length ? "duty-employees" : undefined}>
                          {b.is_department_journal && b.duties?.length ? (
                            b.duties.map(d => (
                              <div key={d.user_id} className="duty-employee-item">
                                <UserCircle user_name={d.name} size={25} />
                                <div>{d.name}{d.handed_to ? ` → ${d.handed_to}` : ''}</div>
                              </div>
                            ))
                          ) : b.is_department_journal ? '-' : (
                            <>
                              {b.lead_id !== b.original_lead_id && (
                                <div>
                                  <UserCircle user_name={leads.find((el: User) => el.id === b.original_lead_id)?.['name'] || 's'} size={25} />
                                  <div>{leads.find((el: User) => el.id === b.original_lead_id)?.['name'] || 's'}</div>
                                </div>
                              )}
                              {b.lead_id !== b.original_lead_id && (<div>{'🢃'}</div>)}
                              <div>
                                <UserCircle user_name={leads.find((el: User) => el.id === b.lead_id)?.['name'] || b.lead_name || 's'} size={25} />
                                <div>{leads.find((el: User) => el.id === b.lead_id)?.['name'] || b.lead_name || 's'}</div>
                              </div>
                            </>
                          )}
                        </div>
                        <div>
                          {b.is_department_journal && b.duties?.length ? (
                            b.duties.map(d => <div key={d.user_id}>{d.shift || "-"}</div>)
                          ) : (
                            b.shift || "-"
                          )}
                        </div>
                        <div style={!b.is_department_journal ? {color: (b.driving === true ? '#4361EE' : '')} : undefined}>
                          {b.is_department_journal && b.duties?.length ? (
                            b.duties.map(d => (
                              <div key={d.user_id} style={{color: (d.driving === true ? '#4361EE' : '')}}>
                                {d.driving === true ? t("work_driving") : t("work_floor")}
                              </div>
                            ))
                          ) : (
                            b.is_department_journal ? '-' : b.driving === true ? t("work_driving") : t("work_floor")
                          )}
                        </div>
                        <div>
                          <div style={{color: (reportsPercentage === 100 || b.reports.length === 0  ? '#12B76A' : '')}}>{b.reports.filter(r => r.checked === true).length}/{b.reports.length}</div>
                          <div className="progress-bar">
                            <span style={{ width: reportsPercentage + "%", backgroundColor: (reportsPercentage === 100 || b.reports.length === 0  ? '#12B76A' : '') }}></span>
                          </div>
                        </div>
                        <div className={b.findings ? (b.findings.length > 1 ? 'red' : 'yellow') : ''}>{b.findings ? b.findings.length : t("none")}</div>
                        <div>{b.tasks.length}</div>
                        <div style={{color: (b.freezed ? '#12B76A' : notStarted ? '#98A2B3' :
                                                (isToday ? '#F79009' : '#f70909'))}}>
                          ● {b.freezed ? t("status_submitted") : notStarted ? t("status_not_started") :
                                                (isToday ? t("status_in_progress") : t("status_incomplete"))}
                        </div>
                        <input type="checkbox" />
                        <b>
                          <div>{t("findings_label")}</div>
                          <div>{b.findings && b.findings?.length > 0 ? b.findings.map((finding: Finding) => (
                            <div key={`finding_show_${finding.id}`}>
                              <div className={finding.type}></div>
                              <div>{finding.description}</div>
                              <div>{finding.created_at ? briefTime.format(new Date(finding.created_at)) : ''}</div>
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
                          <div>
                            <Link
                              href={`/daily-brief?brief_id=${b.id}${briefDate ? `&date=${format(briefDate, 'dd-MM-yyyy')}` : ''}${b.department_id ? `&department_id=${b.department_id}` : ''}`}
                              className="button-d-bl-sm view-brief-link"
                            >
                              {t("view_brief")}
                            </Link>
                          </div>
                        </b>
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