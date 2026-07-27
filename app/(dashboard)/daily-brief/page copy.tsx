'use client';

import { useDate } from '../../src/components/DateContext';
import Loader from '../../src/components/Loader';
import { useEffect, useState } from 'react';
import getColorsFromName from '@/lib/color';
import { format } from "date-fns";
import { toast } from 'sonner';
import './page.css';

export function generateEmailHTML(b: any) {
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

export const downloadPDF = (brief: any) => {}



export default function DailyBrief() {
  const [user, setUser] = useState(null);
  const today = new Date();

  const noAccessEdit = (b) => { 
    const briefDate = new Date(b.date);

    const isToday =
      briefDate.getFullYear() === today.getFullYear() &&
      briefDate.getMonth() === today.getMonth() &&
      briefDate.getDate() === today.getDate();
    return (user.role === "manager" || user.id !== b.lead_id || b.freezed === true || !isToday) && true };
  const [showSubmit, setShowSubmit] = useState(false)

  const startMyBrief = async () => {
    setLoading(true)
    const res = await fetch("/api/brief", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({lead_id: user.id, lead_letter: user.lead_letter, lead_name: user.name}),
    });
    console.log(res)
    if (res.status === 200) setReload(prev => prev + 1);
  }

  const submitBrief = async (b: any) => {
    setLoading(true)
    const updatedBrief = {
      ...b,
      freezed: true
    };
    const res = await fetch("/api/update_todays_brief", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedBrief),
    });
    console.log('submitBrief')
    setLoading(false)
    setShowSubmit(false)
    if (res.status === 200) setReload(prev => prev + 1);
  }
  const addFinding = async ( b: any, finding: any ) => {
    setShowAddFinding(false)
    const updatedBrief = {
      ...b,
      findings: [
        ...(b.findings || []),
        {
          id: crypto.randomUUID(),
          ...finding,
          created_at: new Date().toISOString()
        }
      ]
    };

    setBriefs((prev: any) =>
      prev.map((brief: any) =>
        brief.id === b.id ? updatedBrief : brief
      )
    );

    const res = await fetch("/api/update_todays_brief", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedBrief),
    });
  };

  const changeTask = async (b: any, task: any) => {
    setShowAddTask(false);

    const updatedBrief = {
      ...b,
      tasks: b.tasks.map((el: any) =>
        el.id === task.id ? task : el
      ),
    };

    setBriefs((prev: any) =>
      prev.map((brief: any) =>
        brief.id === b.id ? updatedBrief : brief
      )
    );

    await fetch("/api/update_todays_brief", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedBrief),
    });
  };

  const addTask = async ( b: any, task: any ) => {
    console.log(task)
    setShowAddTask(false)
    const updatedBrief = {
      ...b,
      tasks: [
        ...(b.tasks || []),
        {
          ...task,
        }
      ]
    };

    setBriefs((prev: any) =>
      prev.map((brief: any) =>
        brief.id === b.id ? updatedBrief : brief
      )
    );

    await fetch("/api/update_todays_brief", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedBrief),
    });
  };

  const changeShift = async ( b: any, shift: string) => {
    const updatedBrief = {
      ...b,
      shift: shift
    };

    setBriefs((prev: any) =>
      prev.map((brief: any) =>
        brief.id === b.id ? updatedBrief : brief
      )
    );

    await fetch("/api/update_todays_brief", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedBrief),
    });
  };

  const changeDrivingStatus = async ( b: any, driving_status: string) => {
    const updatedBrief = {
      ...b,
      driving_today: driving_status === 'driving' ? true : false
    };

    setBriefs((prev: any) =>
      prev.map((brief: any) =>
        brief.id === b.id ? updatedBrief : brief
      )
    );

    await fetch("/api/update_todays_brief", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedBrief),
    });
  };


  const updateReports = async ( b: any, r: any, checked: boolean ) => {
    const reportExists = b.reports.some((report: any) => report.id === r.id);
    const updatedBrief = {
      ...b,
      reports: reportExists
        ? b.reports.map((report: any) =>
            report.id === r.id
              ? {
                  ...report,
                  ...r,
                  checked,
                  timestamp: checked ? new Date().toISOString() : null,
                }
              : report
          )
        : [
            ...b.reports,
            {
              ...r,
              checked,
              timestamp: checked ? new Date().toISOString() : null,
            },
          ],
    };

    setBriefs((prev: any) =>
      prev.map((brief: any) =>
        brief.id === b.id ? updatedBrief : brief
      )
    );

    await fetch("/api/update_todays_brief", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedBrief),
    });
  };

  const handoffBrief = async (b: any) => {
    const res = await fetch("/api/handoffBrief", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        brief_id: b.id,
        lead_id: b.lead_id,
        new_lead_id: document.getElementById(`handoff_to_${b.id}`)?.value,
        reason: document.getElementById(`handoff_reason_${b.id}`)?.value,
        notes:document.getElementById(`handoff_notes_${b.id}`)?.value,
      }),
    });
    if (res.ok) { setReload(prev => prev + 1); }
  }

  const { date } = useDate();
  const [reload, setReload] = useState(0);
  const [leads, setLeads] = useState([])
  const [briefs, setRealBriefs] = useState([])
  const dateString = format(date, "yyyy-MM-dd");
  const setBriefs = (b: any, load=false) => { setRealBriefs(b) }

  const [showAddFinding, setShowAddFinding] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [shifts, setShifts] = useState([])
  const [selectedLead, setRealSelectedLead] = useState(null)

  const setSelectedLead = (lead: any) => {
    if (!loading){ setRealSelectedLead(lead) }
  }
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    async function load() {
      fetch("/api/me")
        .then(r => r.json())
        .then(setUser)
      const users_res = await fetch(`/api/users`);
      if (!users_res.ok) {
        console.error("Failed to load leads");
        setLoading(false)
        return;
      }  
      let leads_data = await users_res.json();
      leads_data = leads_data.filter(a => a.user_role === 'lead')
      setLeads(leads_data)
      let lead_id = selectedLead;
      if ((leads_data.length > 0) && (!lead_id)) setRealSelectedLead(leads_data[0].id);
    }
    load()
  }, [])
  
  useEffect(() => {
      if (!selectedLead) return;

      async function load() {
        setLoading(true)
        let lead_id = selectedLead;
        const briefs_res = await fetch(`/api/brief_history?date_from=${dateString}&date_to=${dateString}`);

        if (!briefs_res.ok) {
          console.error("Failed to load brief history");
          setLoading(false)
          return;
        }
        let briefs_data = await briefs_res.json();
        console.log('briefs_data')
        console.log(briefs_data)
        briefs_data = briefs_data.filter(a => a.lead_id === lead_id)
        await setBriefs(briefs_data)
        
        if (briefs_data.length > 0){
          const shifts_res = await fetch(`/api/shifts`)
          if (!shifts_res.ok) {
            console.log("Failed while fetching shifts")
            setLoading(false)
            return;
          }
          let shifts = await shifts_res.json()
  
          if (!shifts.find(s => s.name == briefs_data[0].shift)) {
            shifts.push({name: briefs_data[0].shift})
            setShifts(shifts)
          }
          else{ setShifts(shifts); }
        }
        setLoading(false)
      }
      load();
    }, [date, selectedLead, reload]);
  return (
    <div className="daily-brief">
      <div>
        <div onClick={() => {history.back()}}>Back</div>
        <div>Daily Briefs</div>
      </div>
      <div>
        <div className="leads" style={{display: leads.length > 0 ? "flex" : "none", gap: "10px"}}>
          <div className='choose'>
            <span>Choose ROUTE Lead</span>
          </div>
          {leads.map((u, i) => {
            let colors = getColorsFromName(u.name);
            return (
              <label className='lead' style={{
                  backgroundColor: selectedLead === u.id ? colors.medium : colors.light, 
                  color: selectedLead === u.id ? "white" : "#a1a1a1"}} key={i}>
                <input type='radio' name='lead' checked={selectedLead === u.id} onChange={() => {setSelectedLead(u.id)}} />
                <span style={{
                  backgroundColor: selectedLead === u.id ? colors.dark : colors.medium,
                  color: selectedLead === u.id ? "white" : "white"
                  }}>{u.name.split(" ")[0][0]}{u.name.split(" ")[1] ? u.name.split(" ")[1][0] : ""}</span> {u.name}
              </label>)
          })}
        </div>
        {/* {selectedLead} */}
        <br></br>
        <br></br>
        {loading ?
         (<Loader></Loader>)
         : (<div className='briefs'>
            {briefs.length == 0 || (user.role == 'lead' && false && !briefs.some(b => b.lead_id == user.id)) 
              ? (<div className='no-briefs'>
                <h1>No Briefs started for {selectedLead === user.id ? 'you' : 'this lead' } {date.getDate() === today.getDate() ? 'today' : 'this day'}</h1>
                {selectedLead === user.id && date.getDate() === today.getDate() ? (<div className='button-d-bl' onClick={() => {startMyBrief()}}>Start My Brief</div>) : (<div></div>)}
              </div>) 
              : briefs.map((b, b_i) => {
                if ((shifts.length > 0) && (user.role == "manager" || (b.lead_id == user.id))){
                let AB_name = "";
                try{
                  AB_name += b.lead_name.split(" ")[0][0];
                  AB_name += b.lead_name.split(" ")[1][0];
                }catch{}
                return (
                  <div className='brief' id={`b-${b.id}`} key={`b-${b.id}`}>
                    <div className='shift-info'>
                      <div>
                        <h1>Shift information</h1>
                        <div className='button-w-bl' style={{marginLeft: "auto"}} onClick={() => {navigator.clipboard.writeText(generateEmailHTML(b))}} >Copy for Email</div>
                        <div className='button-w-bl' onClick={() => {downloadPDF(b)}}>Save as PDF</div>
                        <div className={noAccessEdit(b) ? 'button-d-bl d tg' : 'button-d-bl tg'} onClick={() => {if (!noAccessEdit(b)) setShowSubmit(true)}}>Submit Brief</div>
                        {showSubmit && (
                          <div className='confirm-submit'>
                            <div>
                              <h1>Submit Daily Brief?</h1>
                              <p>After submission this Daily Brief will become read-only.</p>
                              <p>You will no longer be able to edit reports, tasks, findings, or notes.</p>
                              <div>
                                <div className='button-w-bl' onClick={() => {setShowSubmit(false)}}>Cancel</div>
                                <div className='button-d-bl' onClick={() => submitBrief(b)}>Submit Brief</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div>
                        <div style={{width: 250}}>
                          <span>Lead</span>
                          <div style={{display: 'flex', gap: 10}}>
                            <div className='user' style={{ backgroundColor: getColorsFromName(b.lead_name).medium }}><div>{AB_name}</div></div>
                            <div>Lead {b.lead_id !== b.original_lead_id ? `Handed Off b))}} from` : ''} {b.letter} - {b.lead_name}</div>
                          </div>
                        </div>
                        <div>
                          <span>Shift</span>
                          <select className={noAccessEdit(b) ? 'd' : ''} disabled={noAccessEdit(b)} onChange={(e) => {changeShift(b, e.target.value)}} defaultValue={b.shift}>
                            {shifts.map(s => {
                              return (<option key={s.name} value={s.name}>{s.name}</option>)
                            })}
                          </select>
                        </div>
                        <div>
                          <span>Date</span>
                          <div>{format(b.date, 'MMMM d, yyyy')}</div>
                        </div>
                        <div>
                            <span>Driving Status</span>
                            <select className={noAccessEdit(b) ? 'd' : ''} disabled={noAccessEdit(b)} onChange={(e) => {changeDrivingStatus(b, e.target.value)}} defaultValue={b.driving === true ? 'driving' : 'not driving'}>
                              <option value="driving">Driving</option>
                              <option value="not driving">On-site</option>
                            </select>
                        </div>
                      </div>
                    </div>
                    <div className='reports'>
                      <div>Reports: <span>{b.reports.filter((r: any) => r.checked === true).length} of {b.reports.length} reviewed</span></div>
                      <div>
                        <div className='progress-bar'>
                          <span style={{width: b.reports.length === 0 ? '100%' : b.reports.filter((r: any) => r.checked === true).length / b.reports.length * 100 + "%"}}></span>
                        </div>
                        {b.reports.map(
                        (r: any) => (
                        <div className='report' key={r.id}>
                          <input className={noAccessEdit(b) ? 'd' : ''} disabled={noAccessEdit(b)} type='checkbox' checked={r.checked} onChange={() => {updateReports(b, r, !r.checked, new Date())}} />
                          <div>{r.name}</div>
                          <div>{r.source}</div>
                          <span className={r.timestamp ? 'done' : 'pending'}>{r.timestamp ? format(new Date(r.timestamp), "h:mm a") : b.freezed === true ? 'Not Done' : 'Pending'}</span>
                        </div>)
                      )}</div>
                    </div>


                    {/* Projects:
                    <div>
                      {b.projects.map(
                        (p: any, p_i: number) => (<div className='project' key={p_i}>
                          <input type='checkbox' checked={p.checked} onChange={() => {updateProject(b, p, !p.checked, p.name, p.text)}} />
                          <div></div>
                          {p.name} | {p.text}
                        </div>)
                      )}
                    </div> */}



                    <div style={{ display: 'flex', gap: 10 }}>
                      <div className="findings">
                        <div>
                          <h1>Findings:</h1>
                          <div className={noAccessEdit(b) ? 'd' : ''} onClick={() => {if (!noAccessEdit(b)) setShowAddFinding(true)}}>+ Add Finding</div>
                        </div>
                        <div>{b.findings && b.findings.map(f => (
                          <div key={JSON.stringify(f)} className={`finding ${f.type}-container`}>
                            <div>
                              <div>{f.description}</div>
                              <div className={f.type}>{f.type}</div>
                            </div>
                            <div>{f.created_at && format(new Date(f.created_at), "h:mm a")}</div>
                          </div>
                        ))}
                          {showAddFinding && <div className='add-finding'>
                            <div>
                              <span>Choose Status</span>
                              <select disabled={noAccessEdit(b)} id={`new_f_type_${b.id}`}>
                                <option value='high'>High</option>
                                <option value='moderate'>Moderate</option>
                                <option value='info'>Info</option>
                              </select>
                            </div>
                            <div>
                              <span>Write Description</span>
                              <textarea disabled={noAccessEdit(b)} type="text" id={`new_f_name_${b.id}`} placeholder="Anything the next Lead needs to know…" />
                            </div>
                            <div>
                              <div className='cancel' onClick={() => {setShowAddFinding(false)}}>Cancel</div>
                              <input className='button-d-bl-sm' disabled={noAccessEdit(b)} type="button" value="Add Finding" onClick={() => { addFinding(b, {
                                    type: document.getElementById(`new_f_type_${b.id}`)?.value || '',
                                    description: document.getElementById(`new_f_name_${b.id}`)?.value || '',
                                  });
                                }}/>
                            </div>
                          </div>}
                        </div>
                      </div>
                      <div className='tasks'>
                        <div>
                          <h1>Tasks:</h1>
                          <div className={noAccessEdit(b) ? 'd' : ''} onClick={() => {if(!noAccessEdit(b)) setShowAddTask(true)}}>Add task +</div>
                        </div>
                        <div>{b.tasks && b.tasks.map(t => (<label key={t.id} className={noAccessEdit(b) ? 'task d' : 'task'}>
                          <input type='checkbox' checked={t.checked} onChange={() => { if (!noAccessEdit(b)) changeTask(b, {...t, checked: !t.checked});
                            }}/>
                          <div>{t.text}</div> <div>{t.task_type}</div>
                        </label>))}</div>
                        {showAddTask && <div className='add-task'>
                            <div className='cancel' onClick={() => {setShowAddTask(false)}}></div>
                            <div>
                              <span>Task Name</span>
                              <input disabled={noAccessEdit(b)} id={`new_t_name_${b.id}`} type='text' placeholder='Task description...' />
                            </div>
                            <div>
                              <span>Action</span>
                              <select disabled={noAccessEdit(b)} id={`new_t_type_${b.id}`}>
                                <option value='Report follow-up'>Report follow-up</option>
                                <option value='Site visit'>Site visit</option>
                                <option value='Shop / vehicle'>Shop / vehicle</option>
                                <option value='Admin'>Admin</option>
                                <option value='Other'>Other</option>
                              </select>
                            </div>
                            <input disabled={noAccessEdit(b)} type="button" value="Add" className='button-d-bl-sm' onClick={() => { addTask(b, {
                                task_type: document.getElementById(`new_t_type_${b.id}`)?.value || '',
                                text: document.getElementById(`new_t_name_${b.id}`)?.value || '',
                              });
                            }}/>

                          </div>}
                      </div>
                    </div>
                    <div className="handoff">
                      <h1>Handoff:</h1>
                      <div>
                        <div>
                          <div>
                            <span>Recipient</span>
                            <select id={`handoff_to_${b.id}`} className={noAccessEdit(b) ? 'd' : ''} disabled={noAccessEdit(b)}>
                              {leads.map(u => b.lead_id != u.id && (<option value={u.id} key={u.id}>{u.name}</option>))}
                            </select>
                          </div>
                          <div>
                            <span>Reason</span>
                            <input className={noAccessEdit(b) ? 'd' : ''} id={`handoff_reason_${b.id}`} disabled={noAccessEdit(b)} type='text' placeholder='Reason'></input>
                          </div>
                        </div>
                        <div>
                          <span>Notes</span>
                          <textarea  className={noAccessEdit(b) ? 'd' : ''} disabled={noAccessEdit(b)} id={`handoff_notes_${b.id}`} placeholder='Anything another Lead needs to know…'></textarea>
                        </div>
                        <input className={noAccessEdit(b) ? 'button-d-bl-sm tg d' : 'button-d-bl-sm tg'} type="button" value="Complete handoff" onClick={() => { if(!noAccessEdit(b)) handoffBrief(b) }}/>
                      </div>
                    </div>
                    </div>
                )
              }
            })}
          </div>)
        }
      </div>
    </div>
  );
}

