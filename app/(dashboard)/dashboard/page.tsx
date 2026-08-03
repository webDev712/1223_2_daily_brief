"use client";

import { Finding, Report, SavedBrief, Task, User, Covered } from "@/lib/types";
import { useUser } from "../../src/components/UserProvider";
import { useDate } from "../../src/components/DateContext";
import Loader from "@/app/src/components/Loader";
import { useState, useEffect } from "react";
import { format, parse } from "date-fns";
import './page.css'
import UserCircle from "@/app/src/components/UserCircle";


export function getGreeting() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  if (hour >= 18 && hour < 22) return "Good evening";
  return "Good night";
}

export default function Dashboard() {
  const today = new Date();

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
      console.log('briefs')
      console.log(data)
      setBriefs(data);


      const users_res = await fetch(`/api/users`);
      if (!users_res.ok) {
        console.error("Failed to load leads");
        setLoading(false)
        return;
      }  
      let leads_data = await users_res.json();
      leads_data = leads_data.filter((a: User) => a.user_role === 'lead').filter((a: User) => a.archived !== true)
      setLeads(leads_data)
      
      setBriefsLoading(false);
      setLoading(false);
    }
    load();
  }, [date]);

  const in_progress_count = briefs.filter((b: SavedBrief) => {
    const briefDate = new Date(b.date);

    const isToday =
      briefDate.getFullYear() === today.getFullYear() &&
      briefDate.getMonth() === today.getMonth() &&
      briefDate.getDate() === today.getDate();

    return !b.freezed && isToday;
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
  return (
    <div className="dashboard">
      {loading ?
              (<Loader></Loader>) : (
        <div>
          <h1>{getGreeting()}, {user.name.split(' ')[0]} 👋</h1>
          <p>Stay on top of your Route Department operations. Here's what needs your attention today.</p>
          <div className="four-block">
            <div img-id="document-yellow">
              <h1>{briefs.length - in_progress_count}/{briefs.length}</h1>
              <div>Daily Briefs</div>
              {in_progress_count === 0 ? 
                (<span>All briefs done</span>) : 
                (<span>{in_progress_count} brief still in progress</span>)}
              {in_progress_count > 0 && 
                (<h2>{in_progress_count} pending</h2>)}
            </div>
            <div img-id="book-blue">
              <h1>{reports_done_count}/{reports_all_count}
              </h1>
              {" "}
              <div>Reports Reviewed</div>
              <span>{reports_all_count - reports_done_count} reports still need review</span>
              {reports_all_count > 0 && (
                <h2>{(reports_done_count / reports_all_count * 100).toFixed()}% done</h2>
              )}
            </div>
            <div img-id="error-yellow">
              <h1>{findning_count}</h1>
              <div>Open Findings</div>
              <span>{h_p_finding_count} high-priority finding</span>
              {h_p_finding_count > 0 && (
                <h2>{h_p_finding_count} high</h2>
              )}
            </div>
            <div img-id="tasks-red">
              <h1>{tasks_count}</h1>
              <div>Tasks this day</div>
              <span>{tasks_done_count} tasks done</span>
              {tasks_count > 0 && (
                <h2>{(tasks_done_count / tasks_count * 100).toFixed()}% done</h2>
              )}
            </div>
          </div>
          <div className="flex j-s-b">
            <div>
              <h3>Route Leads</h3>
              <p>Click a card to open the Daily Brief</p>
            </div>
            <div>{active_leads_today.length} lead{active_leads_today.length > 1 && 's'} active this day</div>
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
                <div className={b.freezed || !isToday ? "brief submitted" : "brief"} key={`b_${b.id}`}>
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
                    <div>{b.freezed || !isToday ? (<div className="submitted">● Submitted</div>) : (<div>● In Progress</div>)}</div>
                    
                  </div>
                  <div>
                    <div className="shift">{b.shift || "No shift selected"}</div>
                    <div>{b.driving ? (<div className="driving">Driving</div>) : (<div className="on-site">On-site</div>)}</div>
                  </div>
                  <div>
                    <div>
                      <div>Reports Reviewed</div>
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
                      <div>findings</div>
                    </div>
                    <div>
                      <span>{b.tasks?.length || 0}</span>
                      <div>tasks</div>
                    </div>
                  </div>
                  {/* TODO: MAKE IT OPEN RIGHT BRIEF (DATE + LEAD) */}
                  <a href={`/daily-brief?date=${format(b.date, 'd-M-yyyy')}&lead_id=${b.lead_id}`} className="button-d-bl">View This Daily Brief   ➯</a>
                </div>
                )
              }
            )}
          </div>) : (<h4>No briefs in progress for this day</h4>)}
          <div style={{marginTop: 20}}>
            <h3>Today's Route Coverage</h3>
            <div className="table-wrapper">

              <div className="covered-container">
                <div>
                  <span>LEAD</span>
                  <span>COVERING FOR</span>
                  <span>ROUTE</span>
                  <span>VAN</span>
                  <span>STOPS</span>
                  <span>WINDOW</span>
                  <span>STATUS</span>
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
                    <div>{route.route_zone || "-"}</div>
                    <div>{route.van || "-"}</div>
                    <div>{route.stops || "-"}</div>
                    <div>{route.windows || "-"}</div>
                    <div><div className={b.freezed || !isToday ? "submitted" : ""}>{b.freezed || !isToday ? "Submitted" : "In Progress"}</div></div>
                  </div>
                ));
              })}
            </div>
            </div>
          </div>
          <div style={{marginTop: 20}}>
            <div className="flex j-s-b">
              <div>
                <h3>Requires attention</h3>
                <p>Ordered by urgency</p>
              </div>
              <div>{attentionCount} items</div>
            </div>
            {attentionCount === 0 && (<h3>No tasks requires attention today</h3>)}
            <div className="attention-container">
             {briefs.map((b: SavedBrief) => {
              return b.findings?.map((finding: Finding, finding_i: number) => {
                if (finding.type === 'high') return (
                  <div className="attention attention_finding" key={`${b.id}_attention_finding_${finding_i}`}>
                    <div>
                      <div>
                        <p>High priority finding</p>
                        <span className="high">High</span>
                      </div>
                      <div>{finding.description}</div>
                    </div>
                    <div>
                      <div>
                        <UserCircle user_name={b.lead_name} size={20}></UserCircle>
                        <div>{b.lead_name}</div>
                      </div>
                      <div>{format(finding.created_at, 'h:m a')}</div>
                    </div>
                  </div>
                )
              }).concat(...b.tasks?.map((task: Task, task_i: number) => {
                if (task.checked === false) return (
                  <div className="attention attention_task" key={`${b.id}_attention_task_${task_i}`}>
                    <div>
                      <div>
                        <p>Pending task</p>
                        <span className="moderate">Attention</span>
                      </div>
                      <div>{task.text}</div>
                    </div>
                    <div>
                      <div>
                        <UserCircle user_name={b.lead_name} size={20}></UserCircle>
                        <div>{b.lead_name}</div>
                      </div>
                    </div>
                  </div>

                )
              }));
            })}
            {briefs.map((b: SavedBrief) => {
              const reports_pending_length = b.reports.filter((report: Report) => report.checked === false).length
              if (reports_pending_length > 0) return (
                  <div className="attention attention_report" key={`${b.id}_attention_reports`}>
                    <div>
                      <div>
                        <p>Incomplete report review</p>
                        <span className="moderate">Attention</span>
                      </div>
                      <div>{reports_pending_length} reports have not been reviewed</div>
                    </div>
                    <div>
                      <div>
                        <UserCircle user_name={b.lead_name} size={20}></UserCircle>
                        <div>{b.lead_name}</div>
                      </div>
                      <div>{reports_pending_length} left</div>
                    </div>
                  </div>
              )
            })}
            {briefs.map((b: SavedBrief) => {
              if (b.lead_id !== b.original_lead_id) return (
                  <div className="attention attention_handoff" key={`${b.id}_attention_handoff`}>
                    <div>
                      <div>
                        <p>Handed Off Brief</p>
                        <span className="moderate">Attention</span>
                      </div>
                      <div>
                        <div>Handed Off from</div>
                        <UserCircle user_name={leads.find(el => el.id === b.original_lead_id)?.name || ""} size={20}></UserCircle>
                        <div>{leads.find(el => el.id === b.original_lead_id)?.name}</div>
                        <div>to</div>
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