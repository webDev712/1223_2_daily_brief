'use client';

import Loader from "@/app/src/components/Loader";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import './page.css'
import UserCircle from "@/app/src/components/UserCircle";
import { SavedBrief, User } from "@/lib/types";


export default function BriefHistory() {
  const today = new Date();
  const daysAgo = new Date();
  const [loading, setLoading] = useState(true)
  const [briefs, setBriefs] = useState([]);
  const [allBriefs, setAllBriefs] = useState([]);
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState('');
  const [days, setDays] = useState('7');
  const [status, setStatus] = useState('');
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
          console.log((today.getTime() - briefDate.getTime()) / 60 / 60 / 24 / 1000 < parseInt(days))
          if (status !== ''){
            if (status === 'progress'){
              if (!((today.getTime() - briefDate.getTime()) / 60 / 60 / 24 / 1000 < 1) || b.freezed) return false;
            }
            if (status === 'submitted'){
              if (!((today.getTime() - briefDate.getTime()) / 60 / 60 / 24 / 1000 > 1 || b.freezed)) return false;
            }
          }
          return (today.getTime() - briefDate.getTime()) / 60 / 60 / 24 / 1000 < parseInt(days);
        })
        setBriefs(briefs_data)
        console.log('briefs_data')
        console.log(briefs_data)
        setLoading(false)



        const users_res = await fetch(`/api/users`);
        
        if (!users_res.ok) {
          console.error("Failed to load leads");
          setLoading(false)
          return;
        }  
        let leads_data = await users_res.json();
        leads_data = leads_data.filter((a: User) => a.user_role !== 'manager');
        console.log('leads_data')
        console.log(leads_data)
        setLeads(leads_data);
      }
      load();
    }, [status, days, selectedLead]);
  const briefs_submitted = allBriefs.filter((b: SavedBrief) => {
                    const briefDate = new Date(b.date);
                    const isToday =
                      briefDate.getFullYear() === today.getFullYear() &&
                      briefDate.getMonth() === today.getMonth() &&
                      briefDate.getDate() === today.getDate();
                    return b.freezed === true || !isToday
                  }).length
  return (
    <div className="brief-history">
      {loading ?
        (<Loader></Loader>) : (
          <div>
              <div>
                <div className="four-block">
                  <div img-id="document">
                    <h1>{allBriefs.length}</h1>
                    <div>Total Briefs</div>
                    <span>Last {days} days, {leads.length} leads</span>
                  </div>
                  <div img-id="done">
                    <h1>{briefs_submitted}</h1>
                    <div>Submitted</div>
                    <span>{(briefs_submitted / allBriefs.length * 100).toFixed(0)}% completion rate</span>
                  </div>
                  <div img-id="clock">
                    <h1>{allBriefs.length - briefs_submitted}</h1>
                    <div>In Progress</div>
                    <span>Awaiting submission today</span>
                  </div>
                  <div img-id="error">
                    <h1>{allBriefs.reduce((a: number, b: SavedBrief) => b.findings ? a + b.findings.length : a + 0, 0)}</h1>
                    <div>Total Findings</div>
                    <span>Across all briefs last {days} days</span>
                  </div>
                </div>
                <div className="filters">
                  <select defaultValue={selectedLead} name="leads" id="leads" onChange={(e) => setSelectedLead(e.target.value)}>
                    <option value="">All Leads</option>
                    {leads.map((l: User) => (<option key={l.id} value={l.id}>{l.name}</option>))}
                  </select>
                  <select name="status" id="status" defaultValue={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="">All Statuses</option>
                    <option value="submitted">Submitted</option>
                    <option value="progress">In progress</option>
                  </select>
                  <select name="days" id="days" defaultValue={days} onChange={(e) => setDays(e.target.value)}>
                    <option value="7">Last 7 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                  </select>
                </div>
              </div>
              {/* TODO: CHECK FILTERS */}
              <div></div>
              <div className="table-wrapper">
                <div className="table">
                  <div>
                    <div>DATE</div>
                    <div>EMPLOYEE</div>
                    <div>SHIFT</div>
                    <div>WORK STATUS</div>
                    <div>REPORTS</div>
                    <div>FINDINGS</div>
                    <div>TASKS</div>
                    {/* <div>HANDOFF</div> */}
                    <div>STATUS</div>
                    {/* <div>VIEW</div> */}
                  </div>
                  {briefs.map((b: SavedBrief) => {
                    const briefDate = new Date(b.date);
                    const isToday =
                      briefDate.getFullYear() === today.getFullYear() &&
                      briefDate.getMonth() === today.getMonth() &&
                      briefDate.getDate() === today.getDate();
                    const reportsPercentage = b.reports.length === 0 ? '100%' : b.reports.filter((r: any) => r.checked === true).length / b.reports.length * 100;
                    return (
                      <div key={b.id}>
                        <div>
                          <div>{isToday ? 'Today' : format(b.date, 'MMM d')}</div>
                          <span>{format(b.date, 'MMMM d, yyyy')}</span>
                        </div>
                        <div>
                          {b.lead_id !== b.original_lead_id && (
                            <UserCircle user_name={leads.find((el: User) => el.id === b.original_lead_id)?.['name'] || 's'} size={25} />
                          )}
                          {b.lead_id !== b.original_lead_id && (<div>{'>>'}</div>)}
                          <UserCircle user_name={leads.find((el: User) => el.id === b.lead_id)?.['name'] || 's'} size={25} />
                          {b.lead_id === b.original_lead_id && (<div>{b.lead_name}</div>)}
                          {}
                        </div>
                        <div>{b.shift || "-"}</div>
                        <div style={{color: (b.driving === true ? '#4361EE' : '')}}>{b.driving === true ? '🚐 Driving' : '🏢 On-site'}</div>
                        <div style={{color: (reportsPercentage === 100 || b.reports.length === 0  ? '#12B76A' : '')}}>
                          {b.reports.filter(r => r.checked === true).length}/{b.reports.length}
                          <div className="progress-bar">
                            <span style={{ width: reportsPercentage + "%", backgroundColor: (reportsPercentage === 100 || b.reports.length === 0  ? '#12B76A' : '') }}></span>
                          </div>
                        </div>
                        <div className={b.findings ? (b.findings.length > 1 ? 'red' : 'yellow') : ''}>{b.findings ? b.findings.length : "None"}</div>
                        <div>{b.tasks.length}</div>
                        {/* <div>HANDOFF</div> */}
                        <div style={{color: (b.freezed === true || !isToday ? '#12B76A' : '#F79009')}}>
                          ● {b.freezed === true || !isToday ? 'Submitted' : 'In progress'}
                        </div>
                        {/* <div>VIEW</div> */}
                      </div>
                    )
                  })}
                </div>
              </div>
          </div>
        )}
    </div>
  );
}
