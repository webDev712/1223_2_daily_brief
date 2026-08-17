'use client';

import { useDate } from '../../src/components/DateContext';
import Loader from '../../src/components/Loader';
import { useEffect, useState, useRef } from 'react';
import getColorsFromName from '@/lib/color';
import { format, parse } from "date-fns";
import { toast } from 'sonner';
import { Covered, SavedBrief, Shift, User } from '@/lib/types';
import './page.css'
import { downloadPDF, generateEmailHTML } from '@/lib/documents';
import SmallLoader from '@/app/src/components/SmallLoader';
import { useSearchParams } from 'next/navigation';


export default function DailyBrief() {
  const [user, setUser] = useState<User | null>(null);
  const today = new Date();

  const noAccessEdit = (b: SavedBrief) => { 
    const briefDate = new Date(b.date);

    const isToday =
      briefDate.getFullYear() === today.getFullYear() &&
      briefDate.getMonth() === today.getMonth() &&
      briefDate.getDate() === today.getDate();
    return (user?.role === "manager" || user?.id !== b.lead_id || b.freezed === true || !isToday) && user?.permissions.update_brief === false };
  const [showSubmit, setShowSubmit] = useState(false)
  const [showHandoff, setShowHandoff] = useState(false)
  const savingRef = useRef(false);
  const [savingCover, setSavingCover] = useState(false)
  const [showAddCover, setShowAddCover] = useState(false)

  const addCover = async (b: SavedBrief, covered: Covered[]) => {
    setSavingCover(true)
    const updatedBrief = {
      ...b,
      covered: covered
    };
    const res = await fetch("/api/update_todays_brief", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedBrief),
    });
    setBriefs((prev: any) =>
      prev.map((brief: any) =>
        brief.id === b.id ? updatedBrief : brief
      )
    );
    setShowAddCover(false)
    setSavingCover(false)
  }

  const removeCover = async (b: SavedBrief, id: string) => {
    setSavingCover(true)
    const updatedBrief = {
      ...b,
      covered: b.covered.filter((cover: Covered) => cover.id !== id)
    };
    const res = await fetch("/api/update_todays_brief", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedBrief),
    });
    setBriefs((prev: any) =>
      prev.map((brief: any) =>
        brief.id === b.id ? updatedBrief : brief
      )
    );
    setSavingCover(false)
  }

  const startMyBrief = async () => {
    setLoading(true)
    const res = await fetch("/api/brief", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({lead_id: user?.id, lead_letter: user?.lead_letter, lead_name: user?.name}),
    });
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
    setLoading(false)
    setShowSubmit(false)
    if (res.status === 200) setReload(prev => prev + 1);
  }
  const addFinding = async ( b: any, finding: any ) => {
    if (savingRef.current) return;
    savingRef.current = true;
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
    savingRef.current = false;
  };

  const changeTask = async (b: any, task: any) => {
    if (savingRef.current) return;

    savingRef.current = true;
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
    savingRef.current = false;
  };

  const addTask = async ( b: any, task: any ) => {
    if (savingRef.current) return;

    savingRef.current = true;
    setShowAddTask(false)
    const updatedBrief = {
      ...b,
      tasks: [
        ...(b.tasks || []),
        {
          ...task, custom_id: undefined,
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
    savingRef.current = false;
  };

  const changeShift = async ( b: any, shift: string) => {
    if (savingRef.current) return;

    savingRef.current = true;
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
    savingRef.current = false;
  };

  const changeDrivingStatus = ( b: SavedBrief, driving_status: boolean) => {
    if (savingRef.current) return;

    savingRef.current = true;
    
    const updatedBrief = {
      ...b,
      driving: driving_status
    };

    setBriefs((prev: any) =>
      prev.map((brief: any) =>
        brief.id === b.id ? updatedBrief : brief
      )
    );

    fetch("/api/update_todays_brief", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedBrief),
    });
    savingRef.current = false;
  };


  const updateReports = async ( b: any, r: any, checked: boolean ) => {
    if (savingRef.current) return;

    savingRef.current = true;
    
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
    savingRef.current = false;
  };

  const handoffBrief = async (b: any) => {
    if (savingRef.current) return;

    savingRef.current = true;
    
    setLoading(true)
    const res = await fetch("/api/handoffBrief", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        brief_id: b.id,
        lead_id: b.lead_id,
        new_lead_id: (document.getElementById(`handoff_to_${b.id}`) as HTMLSelectElement)?.value,
        reason: (document.getElementById(`handoff_reason_${b.id}`) as HTMLSelectElement)?.value,
        notes: (document.getElementById(`handoff_notes_${b.id}`) as HTMLTextAreaElement)?.value,      
      }),
    });
    savingRef.current = false;
    setShowHandoff(false)
    if (res.ok) { setReload(prev => prev + 1); }
  }
  const searchParams = useSearchParams();

  const { date, setDate } = useDate();
  
  const param_date = searchParams.get('date');
  const param_lead_id = searchParams.get('lead_id');

  if (param_date) {
    useEffect(() => {
      setDate(parse(param_date, 'dd-MM-yyyy', new Date()));
    }, [])
  }

  const [reload, setReload] = useState(0);
  const [leads, setLeads] = useState<User[]>([])
  const [briefs, setRealBriefs] = useState([])
  const [allBriefs, setAllBriefs] = useState([])
  const dateString = format(date, "yyyy-MM-dd");
  const setBriefs = (b: any, load=false) => { setRealBriefs(b) }

  const [showAddFinding, setShowAddFinding] = useState(false)
  const [showAddTask, setShowAddTask] = useState(false)
  const [shifts, setShifts] = useState([])
  const [selectedLead, setRealSelectedLead] = useState(null)

  const setSelectedLead = (lead: any) => {
    setRealSelectedLead(lead)
  }
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    async function load() {
      const me_res = await fetch("/api/me");
      const me_user = await me_res.json();
      console.log('me_user')
      console.log(me_user)
      setUser(me_user)
      const users_res = await fetch(`/api/users`);
      if (!users_res.ok) {
        console.error("Failed to load leads");
        setLoading(false)
        return;
      }  
      let leads_data = await users_res.json();
      leads_data = leads_data.filter((a: User) => a.user_role !== 'manager')
      setLeads(leads_data)
      let lead_id = selectedLead;
      
      if (param_lead_id){
        setSelectedLead(param_lead_id)
      }
      else{
        if (leads_data.some((el: User) => el.id === me_user.id)) setRealSelectedLead(me_user.id);
        else{
          if ((leads_data.length > 0) && (!lead_id)) setRealSelectedLead(leads_data[0].id);
        }
      }
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
        setAllBriefs(briefs_data)
        console.log('briefs_data')
        console.log(briefs_data)
        briefs_data = briefs_data.filter((a: SavedBrief) => a.lead_id === lead_id)
        await setBriefs(briefs_data)
        
        if (briefs_data.length > 0){
          const shifts_res = await fetch(`/api/shifts`)
          if (!shifts_res.ok) {
            console.log("Failed while fetching shifts")
            setLoading(false)
            return;
          }
          let shifts = await shifts_res.json()
  
          if (!shifts.find((s: Shift) => s.name == briefs_data[0].shift) && briefs_data[0].shift !== '' && briefs_data[0].shift !== ' ' && briefs_data[0].shift) {
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
          {leads.filter((u: User) => allBriefs.filter((brief: SavedBrief) => brief.lead_id === u.id).length > 0 || !u.archived).map((u: User, i) => {
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
        <br></br>
        <br></br>
        {loading ?
         (<Loader></Loader>)
         : (<div className='briefs'>
            {allBriefs.filter(
              (b: SavedBrief) => b.original_lead_id === selectedLead).length === 0 && selectedLead === user?.id && (
              <div className='no-briefs'>
                <h1>You have not started your own Brief today</h1>
                {selectedLead === user?.id && date.getDate() === today.getDate() ? (<div className='button-d-bl' onClick={() => {startMyBrief()}}>Start My Brief</div>) : (<div></div>)}
              </div>
            )}
            {briefs.length == 0 || (user?.role == 'lead' && false && !briefs.some((b: SavedBrief) => b.lead_id == user?.id)) 
              ? (<div></div>) 
              : briefs.map((b: SavedBrief, b_i) => {
                if ((shifts.length > 0) && (user?.permissions.see_all_briefs === true || (b.lead_id == user?.id))){
                let AB_name = "";
                try{
                  AB_name += b.lead_name.split(" ")[0][0];
                  if (b.lead_name.split(" ")[1]) AB_name += b.lead_name.split(" ")[1][0];
                }catch{}
                return (
                  <div className='brief' id={`b-${b.id}`} key={`b-${b.id}`}>
                    <div className='shift-info'>
                      <div>
                        <h1>Shift information</h1>
                        <div className='button-w-bl' style={{marginLeft: "auto"}} onClick={() => {generateEmailHTML(b)}} >Copy for Email</div>
                        <div className='button-w-bl' onClick={() => {downloadPDF(b)}}>Save as PDF</div>
                        <div className={noAccessEdit(b) ? 'button-d-bl d tg' : 'button-d-bl tg'} onClick={() => {if (!noAccessEdit(b)) setShowSubmit(true)}}>Submit Brief</div>
                        {showSubmit && (
                          <div className='confirm'>
                            <div>
                              <h1>Submit Daily Brief?</h1>
                              <p>After submission <strong>this Daily Brief will become read-only.</strong></p>
                              <p>You will no longer be able to edit reports, tasks, findings, or notes.</p>
                              <div>
                                <div className='button-w-bl' onClick={() => {setShowSubmit(false)}}>Cancel</div>
                                <div className='button-d-bl' onClick={() => submitBrief(b)}>Submit Brief</div>
                              </div>
                            </div>
                          </div>
                        )}
                        {showHandoff && (
                          <div className='confirm'>
                            <div>
                              <h1>Handoff Daily Brief?</h1>
                              <p>After handing off this Daily Brief <strong>you will not be able to see it</strong> (only in case, Lead you handing off this Daily Brief will give you it back).</p>
                              <p><strong>You will not be able to create another brief today.</strong></p>
                              <div>
                                <div className='button-w-bl' onClick={() => {setShowHandoff(false)}}>Cancel</div>
                                <div className='button-d-bl' onClick={() => handoffBrief(b)}>Hand off this Brief</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div>
                        <div style={{flex: 1}}>
                          <span>Lead</span>
                          <div style={{display: 'flex', gap: 10}}>
                            <div className='user' style={{ backgroundColor: getColorsFromName(b.lead_name).medium }}><div>{AB_name}</div></div>
                            <div>{b.lead_id !== b.original_lead_id ? `Handed Off from` : ''} {b.lead_name} - {leads.find((el: User) => el.id == b.lead_id)?.department || ""}</div>
                          </div>
                        </div>
                        <div>
                          <span>Shift</span>
                          <select className={noAccessEdit(b) ? 'shift-select d' : ''} disabled={noAccessEdit(b)} onChange={(e) => {changeShift(b, e.target.value)}} defaultValue={b.shift || ''}>
                            {shifts.map((s: Shift) => {
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
                            <label className={b.driving ? (noAccessEdit(b) ? 'driving d' : 'driving') : (noAccessEdit(b) ? 'd' : '')}>
                              <input
                                type="checkbox"
                                className={noAccessEdit(b) ? "d" : ""}
                                disabled={noAccessEdit(b)}
                                checked={b.driving}
                                onChange={(e) => changeDrivingStatus(b, e.target.checked)}
                              />
                              <div>{b.driving ? 'Driving' : 'On-site'}</div>
                            </label>
                        </div>
                      </div>
                      <div style={{height: b.driving === true ? 'max-content' : 0, padding: b.driving === true ? '10px 0 15px' : 0, margin: b.driving === true ? '15px' : 0, border: b.driving === true ? '1px solid #c7d2fe' : 'none'}}>
                        <div style={{height: b.driving === true ? 'max-content' : 0}} className={noAccessEdit(b) ? 'shift-select d' : ''} onClick={() => {if (!noAccessEdit(b)) setShowAddCover(true)}}>+ Add Coverage</div>
                        {b.covered && b.covered.length > 0 && b.covered.map((route: Covered, route_i: number) => (
                          <div style={{height: b.driving === true ? 'max-content' : 0}} key={`${b.id}_route_${route_i}`}>
                            <div className={noAccessEdit(b) ? 'shift-select d' : ''} onClick={() => {if (!noAccessEdit(b)) removeCover(b, route.id)}}>
                              <input className={noAccessEdit(b) ? 'shift-select d' : ''} type="button" />
                            </div>
                            <div>
                              <span>Covering For</span>
                              <input type="text" className='d' placeholder='Drive out' value={route.covering_for} onChange={() => {}} disabled />
                            </div>
                            <div>
                              <span>Route/Zone</span>
                              <input type="text" className='d' placeholder='Route/Zone' value={route.route_zone} onChange={() => {}} disabled  />
                            </div>
                            <div>
                              <span>Van</span>
                              <input type="text" className='d' placeholder='Van' value={route.van} onChange={() => {}} disabled  />
                            </div>
                            <div>
                              <span>Stops</span>
                              <input type="number" className='d' placeholder='Stops' value={route.stops} onChange={() => {}} disabled  />
                            </div>
                            <div>
                              <span>Window</span>
                              <input type="text" className='d' placeholder='Window' value={route.windows} onChange={() => {}} disabled  />
                            </div>
                            <div>
                              <div className=''></div>
                            </div>
                          </div>))}
                        {savingCover === true && (<SmallLoader></SmallLoader>)}
                        {showAddCover ? (<div>
                          <div className={noAccessEdit(b) ? 'shift-select d' : ''} onClick={() => {if (!noAccessEdit(b)) setShowAddCover(false)}}>
                            <input type="button" />
                          </div>
                          <div>
                            <span>Covering For</span>
                            <input type="text" placeholder='Drive out' id={`${b.id}_covering_for`} />
                          </div>
                          <div>
                            <span>Route/Zone</span>
                            <input type="text" placeholder='Route/Zone' id={`${b.id}_route_zone`} />
                          </div>
                          <div>
                            <span>Van</span>
                            <input type="text" placeholder='Van' id={`${b.id}_van`} />
                          </div>
                          <div>
                            <span>Stops</span>
                            <input type="number" placeholder='Stops' id={`${b.id}_stops`} />
                          </div>
                          <div>
                            <span>Window</span>
                            <input type="text" placeholder='Window' id={`${b.id}_window`} />
                          </div>
                          <div>
                            <span></span>
                            <div className='button-d-bl-sm' onClick={() => {
                              const newRoute = [...(b?.covered ?? []), {
                                id: crypto.randomUUID(),
                                covering_for: (document.getElementById(`${b.id}_covering_for`) as HTMLTextAreaElement)?.value || '',
                                route_zone: (document.getElementById(`${b.id}_route_zone`) as HTMLTextAreaElement)?.value || '',
                                van: (document.getElementById(`${b.id}_van`) as HTMLTextAreaElement)?.value || '',
                                stops: Number((document.getElementById(`${b.id}_stops`) as HTMLTextAreaElement)?.value) || 0,
                                windows: (document.getElementById(`${b.id}_window`) as HTMLTextAreaElement)?.value || '',
                              }];
                              addCover(b, newRoute);
                            }}>Add</div>
                          </div>
                        </div>) : (<h3>{b?.covered.length === 0 ? "No Coverage yet" : ""}</h3>)}
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
                          <input className={noAccessEdit(b) ? 'd' : ''} disabled={noAccessEdit(b)} type='checkbox' checked={r.checked} onChange={() => {updateReports(b, r, !r.checked)}} />
                          <div>{r.name}</div>
                          <div>{r.source}</div>
                          <span className={r.timestamp ? 'done' : 'pending'}>{r.timestamp ? format(new Date(r.timestamp), "h:mm a") : b.freezed === true ? 'Not Done' : 'Pending'}</span>
                        </div>)
                      )}</div>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <div className="findings">
                        <div>
                          <h1>Findings:</h1>
                          <div className={noAccessEdit(b) ? 'd' : ''} onClick={() => {if (!noAccessEdit(b)) setShowAddFinding(true)}}>+ Add Finding</div>
                        </div>
                        <div>{b.findings && b.findings?.length > 0 ? b.findings.map(f => (
                          <div key={`finding_div_${f.id}`} className={`finding ${f.type}-container`}>
                            <div>
                              <div>{f.description}</div>
                              <div className={f.type}>{f.type}</div>
                            </div>
                            <div>{f.created_at && format(new Date(f.created_at), "h:mm a")}</div>
                          </div>
                        )) : (<h3>{!showAddFinding ? 'No Findings yet' : ''}</h3>)}
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
                              <textarea disabled={noAccessEdit(b)} id={`new_f_name_${b.id}`} placeholder="Anything the next Lead needs to know…" />
                            </div>
                            <div>
                              <div className='cancel' onClick={() => {setShowAddFinding(false)}}>Cancel</div>
                              <input className='button-d-bl-sm' disabled={noAccessEdit(b)} type="button" value="Add Finding" onClick={() => { addFinding(b, {
                                    type: (document.getElementById(`new_f_type_${b.id}`) as HTMLTextAreaElement)?.value || '',
                                    description: (document.getElementById(`new_f_name_${b.id}`) as HTMLTextAreaElement)?.value || '',
                                  });
                                }}/>
                            </div>
                          </div>}
                        </div>
                      </div>
                      <div className='tasks'>
                        <div>
                          <h1>Tasks:</h1>
                          <div className={noAccessEdit(b) ? 'd' : ''} onClick={() => {if(!noAccessEdit(b)) setShowAddTask(true)}}>+ Add task</div>
                        </div>
                        <div>
                          {b.tasks && b.tasks?.length > 0 ? b.tasks.map(t => (
                            <label key={`task_label_${t.id}`} id={`task_label_${t.id}`} className={noAccessEdit(b) ? 'task d' : 'task'}>
                              <input key={`${t.id}-task-input`} type='checkbox' checked={t.checked ?? false} onChange={() => { if (!noAccessEdit(b)) changeTask(b, {
                                    ...t,
                                    checked: !(t.checked ?? false),
                                  });
                                }}/>
                              <div key={`${t.id}-task-text`}>{t.text}</div>
                              <div key={`${t.id}-task-type`}>{t.task_type}</div>
                            </label>)) : (<h3>{!showAddTask ? "No Tasks yet" : ""}</h3>)
                          }
                        </div>
                        {showAddTask && (<div className='add-task'>
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
                                custom_id: crypto.randomUUID(),
                                task_type: (document.getElementById(`new_t_type_${b.id}`) as HTMLTextAreaElement)?.value || '',
                                text: (document.getElementById(`new_t_name_${b.id}`) as HTMLTextAreaElement)?.value || '',
                              });
                            }}/>

                          </div>)}
                      </div>
                    </div>
                    {user.permissions.handoff_brief && (<div className="handoff">
                      <h1>Handoff:</h1>
                      <div>
                        <div>
                          <div>
                            <span>Recipient</span>
                            <select id={`handoff_to_${b.id}`} className={noAccessEdit(b) ? 'd' : ''} disabled={noAccessEdit(b)}>
                              {leads.map((u: User) => b.lead_id != u.id && (<option value={u.id} key={u.id}>{u.name}</option>))}
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
                        <input className={noAccessEdit(b) ? 'button-d-bl-sm tg d' : 'button-d-bl-sm tg'} type="button" value="Complete handoff" onClick={() => { if(!noAccessEdit(b)) setShowHandoff(true) }}/>
                      </div>
                    </div>)}
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