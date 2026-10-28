'use client';

import { useDate } from '../../src/components/DateContext';
import Loader from '../../src/components/Loader';
import { useEffect, useState, useRef } from 'react';
import getColorsFromName from '@/lib/color';
import { format, parse } from "date-fns";
import { toast } from 'sonner';
import { Company, Covered, Report, SavedBrief, Shift, User } from '@/lib/types';
import './page.css'
import { downloadPDF, generateEmailHTML } from '@/lib/documents';
import SmallLoader from '@/app/src/components/SmallLoader';
import { useSearchParams } from 'next/navigation';
import { randomInt } from 'crypto';
import capitalize from '@/lib/text';
import UserCircle from '@/app/src/components/UserCircle';
import ImageUploader from '@/app/src/components/ImageUploader';
import isBlobLink from '@/lib/img';
import scrollToElement from '@/lib/html_document';
import { useLocale, useTranslations } from 'next-intl';


const isBeforeTime = (time: string | undefined) => {
  if (!time) return true;

  const [hour, period] = time.split(" ");
  
  let checkHour = Number(hour);
  
  if (period === "AM") {
      if (checkHour === 12) checkHour = 0;
  } else {
      if (checkHour !== 12) checkHour += 12;
  }
  
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const checkMinutes = checkHour * 60;
  
  return currentMinutes < checkMinutes;
}

export default function DailyBrief() {
  const [user, setUser] = useState<User | null>(null);
  const today = new Date();

  const noAccessEdit = (b: SavedBrief) => { 
    const todayString =
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const isToday = b.date === todayString;
  
    return (user?.id !== b.lead_id || b.freezed === true || !isToday) || user?.permissions.update_brief === false 
  };
  const [showSubmit, setShowSubmit] = useState(false)
  const [showHandoff, setShowHandoff] = useState(false)
  const savingRef = useRef(false);
  const [savingCover, setSavingCover] = useState(false)
  const [showAddCover, setShowAddCover] = useState(false)
  const [showCallout, setShowCallout] = useState(false)
  const [reportToCallout, setReportToCallout] = useState<Report>()

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
      // body: JSON.stringify({lead_id: '70f17f42-a21d-427b-9020-846177458e85', lead_letter: 'S', lead_name: "Serafin", date: format(date, "yyyy-MM-dd"), created_at: new Date()}),
      body: JSON.stringify({lead_id: user?.id, lead_letter: user?.lead_letter, lead_name: user?.name, date: format(date, "yyyy-MM-dd"), created_at: new Date()}),
    });
    if (res.status === 200) setReload(prev => prev + 1);
    toast.info(translation('select_shift_reminder'));
  }

  const submitBrief = async (b: any) => {
    if (!b.shift || b.shift === ''){
      toast.error(translation('select_shift_to_submit_brief'));
      return;
    }
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


  const updateReports = async ( b: any, r: any, checked: boolean, send=true ) => {
    if (send){
      if (savingRef.current) return;
  
      savingRef.current = true;
      

    }
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
    if (send) {
      await fetch("/api/update_todays_brief", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedBrief),
      });
      savingRef.current = false;
    }
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
  const [company, setCompany] = useState<Company>();
  const translation = useTranslations('DailyBrief');

  const setSelectedLead = (lead: any) => {
    setRealSelectedLead(lead)
  }
  // const locale = useLocale();
  // locale.startsWith("es")
    
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    async function load() {
      const me_res = await fetch("/api/me");
      const me_user = await me_res.json();
      setUser(me_user)
      const users_res = await fetch(`/api/users`);
      if (!users_res.ok) {
        console.error("Failed to load leads");
        setLoading(false)
        return;
      }  
      let leads_data = await users_res.json();
      // leads_data = leads_data.filter((a: User) => a.user_role !== 'manager')
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
      const company_res = await fetch('/api/company');
      const company_data = await company_res.json();
      console.log('company_data')
      console.log(company_data)
      setCompany(company_data[0]);

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
  
          setShifts(shifts)
          // if (!shifts.find((s: Shift) => s.name == briefs_data[0].shift) && briefs_data[0].shift !== '' && briefs_data[0].shift !== ' ' && briefs_data[0].shift) {
          //   shifts.push({name: briefs_data[0].shift})
          // }
          // else{ setShifts(shifts); }
        }
        setLoading(false)
      }
      load();
    }, [date, selectedLead, reload]);

  const addReportFinding = (r: Report, b: SavedBrief) => {
    setShowAddFinding(true);
    setTimeout(() => {
      scrollToElement('add-finding');
      if (document.getElementById(`new_f_name_${b.id}`) as HTMLTextAreaElement) 
        (document.getElementById(`new_f_name_${b.id}`) as HTMLTextAreaElement).value = 
      `Finding related to report "${r.name}":`
    }, 300)
  }
  const leads_to_display = leads.filter(
            (u: User) => 
              (allBriefs.filter((brief: SavedBrief) => brief.lead_id === u.id).length > 0) || (u.permissions.update_brief === true && u.id === user?.id)
          )
  return (
    <div className="daily-brief">
      <div>
        <div onClick={() => {history.back()}}>{translation('back')}</div>
        <div>{translation('daily_briefs')}</div>
      </div>
      <div>
        {leads_to_display.length > 0 && (
          <div className="leads" style={{display: leads.length > 0 ? "flex" : "none", gap: "10px"}}>
            <div className='choose'>
              <span>{translation('choose_lead')}</span>
            </div>
            {leads_to_display.sort((a: User, b: User) => a.name.localeCompare(b.name)).map((u: User, i) => {
              let colors = getColorsFromName(u.name);
              if (u.user_role.toLowerCase() === 'manager' && u.id !== user?.id && company?.main_admin_id !== user?.id) return;
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
        ) }
        <br></br>
        <br></br>
        {loading ?
         (<Loader></Loader>)
         : (<div className='briefs'>
            {allBriefs.filter(
              (b: SavedBrief) => b.original_lead_id === selectedLead).length === 0 && selectedLead === user?.id && (
              <div className='no-briefs'>
                <h1>{translation('own_brief_not_started')}</h1>
                {selectedLead === user?.id && date.getDate() === today.getDate() ? (<div className='button-d-bl' onClick={() => {startMyBrief()}}>{translation('start_my_brief')}</div>) : (<div></div>)}
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
                const reports_sorted = b.reports.sort((a: Report, b: Report) => ['opening', 'midday', 'closing', 'ongoing'].indexOf(a.day_time) - ['opening', 'midday', 'closing', 'ongoing'].indexOf(b.day_time));
                return (
                  <div className='brief' id={`b-${b.id}`} key={`b-${b.id}`}>
                    <div className='shift-info'>
                      <div>
                        <h1>{translation('shift_info')} ({`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}` !== b.date ? (b.freezed === true ? 'Freezed - brief day passed' : 'Freezed - brief submitted') : (b.freezed === true ? 'Freezed - brief submitted' : translation('active_owner_can_edit'))}){b.shift ? ` - shift ${b.shift}` : ``} </h1>
                        <div className='button-w-bl' style={{marginLeft: "auto"}} onClick={() => {generateEmailHTML(b)}} >{translation('copy_for_email')}</div>
                        <div className='button-w-bl' onClick={() => {downloadPDF(b)}}>{translation('save_as_pdf')}</div>
                        <div className={noAccessEdit(b) ? 'button-d-bl d tg' : 'button-d-bl tg'} onClick={() => {if (!noAccessEdit(b)) setShowSubmit(true)}}>{translation('submit_brief')}</div>
                        {showSubmit && (
                          <div className='confirm'>
                            <div>
                              <h1>{translation('submit_daily_brief')}?</h1>
                              <p>{translation('after_submission')} <strong>{translation('read_only')}</strong></p>
                              <p>{translation('freezed')}</p>
                              <div>
                                <div className='button-w-bl' onClick={() => {setShowSubmit(false)}}>{translation('cancel')}</div>
                                <div className='button-d-bl' onClick={() => submitBrief(b)}>{translation('submit_brief')}</div>
                              </div>
                            </div>
                          </div>
                        )}
                        {showHandoff && (
                          <div className='confirm'>
                            <div>
                              <h1>{translation('handoff_daily_brief')}?</h1>
                              <p>{translation('after_handing_off_this_daily_brief')} <strong>{translation('you_will_not_be_able_to_see_it')}</strong> {translation('only_in_case')}</p>
                              <p><strong>{translation('another_brief_today')}</strong></p>
                              <div>
                                <div className='button-w-bl' onClick={() => {setShowHandoff(false)}}>{translation('cancel')}</div>
                                <div className='button-d-bl' onClick={() => handoffBrief(b)}>{translation('hand_off_this_brief')}</div>
                              </div>
                            </div>
                          </div>
                        )}
                        {showCallout && (
                          <div className='confirm callout'>
                            <div>
                              <h1>{translation('call_out_report')} "{reportToCallout?.name}"?</h1>
                              <p>{translation('assign_another')}</p>
                              <select className='input' style={{width: '50%', margin: '0 auto'}} id='new_holder_id'>
                                <option value="NULL">{translation('dont_assign')}</option>
                                {leads.map((u: User) => 
                                  !u.archived &&
                                  // b.lead_id !== user.id &&
                                  reportToCallout?.holder_id !== u.id &&
                                  leads.find((u_local: User) => u_local.id === reportToCallout?.holder_id)?.department_id === u.department_id && 
                                  (
                                    <option value={u.id} key={u.id}>{u.name}</option>
                                  ))}
                              </select>
                              <div>
                                <div className='button-w-bl' onClick={() => {setShowCallout(false)}}>{translation('cancel')}</div>
                                <div className='button-d-bl' onClick={() => {
                                  if (`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}` === b.date) 
                                    {
                                      const new_holder_id = (document.getElementById('new_holder_id') as HTMLSelectElement).value ?? null;
                                      updateReports(b, {...reportToCallout, holder_id: new_holder_id === "NULL" ? null : new_holder_id}, false);
                                      setShowCallout(false);
                                    }
                                }}>{translation('confirm')}</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div>
                        <div style={{flex: 1}}>
                          <span>{translation('lead')}</span>
                          <div style={{display: 'flex', gap: 10}}>
                            <div className='user' style={{ backgroundColor: getColorsFromName(b.lead_name).medium }}><div>{AB_name}</div></div>
                            <div>{b.lead_id !== b.original_lead_id ? `Handed Off from` : ''} {b.lead_name} - {leads.find((el: User) => el.id == b.lead_id)?.department || ""}</div>
                          </div>
                        </div>
                        <div>
                          <span>{translation('shift')}</span>
                          <select className={noAccessEdit(b) ? 'shift-select d' : ''} disabled={noAccessEdit(b)} onChange={(e) => {changeShift(b, e.target.value)}} defaultValue={b.shift || ''}>
                            <option value={""}>-</option>
                            {shifts.map((s: Shift) => {
                              return (<option key={s.name} value={s.name}>{s.name}</option>)
                            })}
                          </select>
                        </div>
                        <div>
                          <span>{translation('date')}</span>
                          <div>{format(
                              parse(b.date, "yyyy-MM-dd", new Date()),
                              "MMMM d, yyyy"
                          )} {b?.created_at && format(new Date(b.created_at), 'hh:mm a')}</div>
                        </div>
                        <div>
                            <span>{translation('work_assignment')}</span>
                            <label className={b.driving ? (noAccessEdit(b) ? 'driving d' : 'driving') : (noAccessEdit(b) ? 'd' : '')}>
                              <input
                                type="checkbox"
                                className={noAccessEdit(b) ? "d" : ""}
                                disabled={noAccessEdit(b)}
                                checked={b.driving}
                                onChange={(e) => changeDrivingStatus(b, e.target.checked)}
                              />
                              <div>{b.driving ? translation('driving') : translation('floor')}</div>
                            </label>
                        </div>
                      </div>
                      <div style={{height: b.driving === true ? 'max-content' : 0, padding: b.driving === true ? '10px 0 15px' : 0, margin: b.driving === true ? '15px' : 0, border: b.driving === true ? '1px solid #c7d2fe' : 'none'}}>
                        <div style={{height: b.driving === true ? 'max-content' : 0}} className={noAccessEdit(b) ? 'shift-select d' : ''} onClick={() => {if (!noAccessEdit(b)) setShowAddCover(true)}}>+ {translation('add_coverage')}</div>
                        {b.covered && b.covered.length > 0 && b.covered.map((route: Covered, route_i: number) => (
                          <div style={{height: b.driving === true ? 'max-content' : 0}} key={`${b.id}_route_${route_i}`}>
                            <div className={noAccessEdit(b) ? 'shift-select d' : ''} onClick={() => {if (!noAccessEdit(b)) removeCover(b, route.id)}}>
                              <input className={noAccessEdit(b) ? 'shift-select d' : ''} type="button" />
                            </div>
                            <div>
                              <span>{translation('covering_for')}</span>
                              <input type="text" className='d' placeholder={translation('drive_out')} value={route.covering_for} onChange={() => {}} disabled />
                            </div>
                            <div>
                              <span>{translation('route_zone')}</span>
                              <input type="text" className='d' placeholder={translation('route_zone')} value={route.route_zone} onChange={() => {}} disabled  />
                            </div>
                            <div>
                              <span>{translation('van')}</span>
                              <input type="text" className='d' placeholder={translation('van')} value={route.van} onChange={() => {}} disabled  />
                            </div>
                            <div>
                              <span>{translation('stops')}</span>
                              <input type="number" className='d' placeholder={translation('stops')} value={route.stops} onChange={() => {}} disabled  />
                            </div>
                            <div>
                              <span>{translation('window')}</span>
                              <input type="text" className='d' placeholder={translation('window')} value={route.windows} onChange={() => {}} disabled  />
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
                            <span>{translation('covering_for')}</span>
                            <input type="text" placeholder={translation('drive_out')} id={`${b.id}_covering_for`} />
                          </div>
                          <div>
                            <span>{translation('route_zone')}</span>
                            <input type="text" placeholder={translation('route_zone')} id={`${b.id}_route_zone`} />
                          </div>
                          <div>
                            <span>{translation('van')}</span>
                            <input type="text" placeholder={translation('van')} id={`${b.id}_van`} />
                          </div>
                          <div>
                            <span>{translation('stops')}</span>
                            <input type="number" placeholder={translation('stops')} id={`${b.id}_stops`} />
                          </div>
                          <div>
                            <span>{translation('window')}</span>
                            <input type="text" placeholder={translation('window')} id={`${b.id}_window`} />
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
                            }}>{translation('add')}</div>
                          </div>
                        </div>) : (<h3>{b?.covered.length === 0 ? translation('no_coverage_yet') : ""}</h3>)}
                      </div>
                    </div>
                    <div className='reports'>
                      <div>{translation('reports_of_department')} "{leads.find((lead_local: User) => b.lead_id === lead_local.id)?.department}": <span>{b.reports.filter((r: Report) => r.checked === true).length} of {b.reports.length} {translation('reviewed')} ({translation('yours')} {b.reports.filter((r: Report) => r.holder_id === user.id && r.checked).length} / {b.reports.filter((r: Report) => r.holder_id === user.id).length})</span></div>
                      <div>
                        <div className='progress-bar'>
                          <span style={{width: b.reports.length === 0 ? '100%' : b.reports.filter((r: any) => r.checked === true).length / b.reports.length * 100 + "%"}}></span>
                        </div>
                        {reports_sorted.filter((r: Report) => !r.holder_id).map(
                          (r: Report, i: number) => (
                            <div className={i === 0 ? 'report reports-to-assign' : 'report'} key={r.id}>
                              {/* <input className={noAccessEdit(b) ? 'd' : ''} disabled={noAccessEdit(b)} type='checkbox' checked={r.checked} onChange={() => {updateReports(b, r, !r.checked)}} /> */}
                              <div></div>
                              <div>{r.name}</div>
                              <div>
                                <div>{capitalize(r.day_time)}</div>
                                {r.check_before && (<div style={{ fontSize: 10, fontWeight: 600, lineHeight: 1.2 }}>{translation('check_before')}: {r.check_before}</div>)}
                              </div>
                              <div>{r.source}</div>
                              <div>{translation('assignee')}: <div className=''>{leads.find((lead: User) => lead.id === r.holder_id)?.name ?? '-'}</div></div>
                              <div style={{color: '#000000'}}>{r.metric ?? 'No Metric'}</div>
                              <div onClick={() => {addReportFinding(r, b)}}></div>
                              <span className={r.timestamp ? translation('done') : translation('pending')}>{r.timestamp ? format(new Date(r.timestamp), "h:mm a") : b.freezed === true ? 'Not Done' : 'Pending'}</span>
                              <div className={noAccessEdit(b) || user.id !== b.lead_id ? 'button-d-bl-sm d' : 'button-d-bl-sm'} onClick={() => {if (!noAccessEdit(b) && b.lead_id === user.id) updateReports(b, {...r, holder_id: user.id}, r.checked)}}>{translation('take')}</div>

                            </div>)
                        )}
                        {reports_sorted.filter((r: Report) => r.holder_id === user.id).map(
                          (r: Report, i: number) => (
                            <div className={(i === 0 ? 'report border-top reports-you-took' : 'report') + (isBeforeTime(r.check_before)  ? '' : ' red-background')} key={r.id}>
                              <input className={noAccessEdit(b) || !isBeforeTime(r.check_before) ? 'd' : ''} disabled={noAccessEdit(b) || !isBeforeTime(r.check_before)} type='checkbox' checked={r.checked} onChange={() => {
                                const metric_lowercase = r.metric?.toLowerCase();
                                if ((metric_lowercase === 'metric' || 
                                     metric_lowercase === 'count' ||
                                     metric_lowercase === 'free-text' ||
                                     metric_lowercase === 'yes/no' ||
                                     metric_lowercase === 'image'
                                ) && r.text === ''){
                                  toast.error(translation('input_report_value_first'));
                                  return;
                                }
                                updateReports(b, r, !r.checked);
                              }} />
                              <div>{r.name}</div>
                              <div>
                                <div>{capitalize(r.day_time)}</div>
                                {r.check_before && (<div style={{ fontSize: 10, fontWeight: 600, lineHeight: 1.2 }}>{translation('check_before')}: {r.check_before}</div>)}
                              </div>
                              <div>{r.source}</div>
                              <div>{translation('assignee')}: <div className='green' style={{display: 'flex', gap: '5px'}}><UserCircle user_name={leads.find((lead: User) => lead.id === r.holder_id)?.name || 'A'} size={15}></UserCircle>{leads.find((lead: User) => lead.id === r.holder_id)?.name} (You)</div></div>
                              <div style={{ display: 'flex', flexDirection: 'column', color: '#000000' }}>
                                <div className="flex" style={{ gap: 5, marginBottom: 5 }}>
                                  {r.metric ? (<div style={{ margin: 'auto 0' }}>{r.metric}</div>) : 'No Metric'}
                                  {(r.metric === 'Image') && r.checked !== true && (
                                    <ImageUploader disabled={(r.checked ?? false) || noAccessEdit(b) || !isBeforeTime(r.check_before)} send_url_to={(url) => {
                                      if (!r.checked && !noAccessEdit(b) && isBeforeTime(r.check_before)) {
                                          updateReports(
                                              b,
                                              {
                                                  ...r,
                                                  text: url
                                              },
                                              r.checked,
                                              true,
                                          );
                                      }
                                    }} ></ImageUploader>
                                  )}
                                </div>

                                {(r.metric === 'Metric' || r.metric === 'Count') && (
                                    <input
                                        className={r.checked || !noAccessEdit(b) || !isBeforeTime(r.check_before) ? 'input d' : 'input'}
                                        value={r.text ?? ''}
                                        disabled={(r.checked ?? false) || noAccessEdit(b) || !isBeforeTime(r.check_before)}
                                        type="number"

                                        onChange={(e) => {
                                            if (!r.checked && !noAccessEdit(b) && isBeforeTime(r.check_before)) {
                                                updateReports(
                                                    b,
                                                    {
                                                        ...r,
                                                        text: e.target.value
                                                    },
                                                    r.checked,
                                                    false
                                                );
                                            }
                                        }}

                                        onBlur={(e) => {
                                            if (r.checked || noAccessEdit(b) || !isBeforeTime(r.check_before)) return;

                                            let value = e.target.value;
                                            let start_value = e.target.value;

                                            if (value !== ''){
                                              if (
                                                  r.metric_range_from != null &&
                                                  Number(value) < Number(r.metric_range_from)
                                              ) {
                                                  value = String(r.metric_range_from);
                                              }
  
                                              if (
                                                  r.metric_range_to != null &&
                                                  Number(value) > Number(r.metric_range_to)
                                              ) {
                                                  value = String(r.metric_range_to);
                                              }
                                            }

                                            updateReports(
                                                b,
                                                {
                                                    ...r,
                                                    text: r.metric === 'Metric' ? value : start_value
                                                },
                                                r.checked
                                            );
                                        }}

                                        placeholder={r.metric === 'Metric' ? `From ${r.metric_range_from} to ${r.metric_range_to}` : 'Value'}
                                    />
                                )}
                                {(r.metric === 'Free-text') && (
                                  <textarea 
                                        className={r.checked || noAccessEdit(b) || !isBeforeTime(r.check_before) ? 'input d' : 'input'}
                                        style={{ transition: 'none' }}
                                        defaultValue={r.text ?? ''}
                                        disabled={!!r.checked || noAccessEdit(b) || !isBeforeTime(r.check_before)}
                                        onBlur={(e) => {
                                          if (r.checked || noAccessEdit(b) || !isBeforeTime(r.check_before)) return;
                                          const text = e.currentTarget.value;
                                          if (text !== (r.text ?? '')) {
                                              updateReports(
                                                  b,
                                                  {
                                                      ...r,
                                                      text,
                                                  },
                                                  r.checked,
                                                  true
                                              );
                                          }

                                        }} 
                                        // onBlur={(e) => { updateReports( b, {...r, text: e.target.value}, r.checked, true ); }}
                                        ></textarea>
                                  // <input
                                  //       className={r.checked ? 'input d' : 'input'}
                                  //       value={r.text ?? ''}
                                  //       disabled={r.checked ?? false}
                                  //       type="text"

                                  //       onChange={(e) => {
                                  //           if (!r.checked) {
                                  //               updateReports(
                                  //                   b,
                                  //                   {
                                  //                       ...r,
                                  //                       text: e.target.value
                                  //                   },
                                  //                   r.checked,
                                  //                   false
                                  //               );
                                  //           }
                                  //       }} 
                                  //       onBlur={() => { updateReports( b, {...r,}, r.checked, true ); }}
                                  //       />
                                )}
                                {(r.metric === 'Yes/No') && (
                                  <div className='flex' style={{ gap: 5, padding: '0 0 0 2px' }}>
                                    <input
                                          className={r.checked || noAccessEdit(b) || !isBeforeTime(r.check_before)  ? 'input d' : 'input'}
                                          checked={r.text === "Yes"}
                                          disabled={!!r.checked || noAccessEdit(b) || !isBeforeTime(r.check_before)}
                                          type="checkbox"
  
                                          onChange={(e) => {
                                              if (!r.checked && !noAccessEdit(b) && isBeforeTime(r.check_before)) {
                                                  updateReports(
                                                      b,
                                                      {
                                                          ...r,
                                                          text: e.target.checked ? 'Yes' : ''
                                                      },
                                                      r.checked,
                                                      true,
                                                  );
                                              }
                                          }} />
                                    <div style={{padding: '0 3px'}}>/</div>
                                    <input
                                          className={r.checked || noAccessEdit(b) || !isBeforeTime(r.check_before) ? 'input d' : 'input'}
                                          checked={r.text === "No"}
                                          disabled={!!r.checked || noAccessEdit(b) || !isBeforeTime(r.check_before)}
                                          type="checkbox"
  
                                          onChange={(e) => {
                                              if (!r.checked && !noAccessEdit(b) && isBeforeTime(r.check_before)) {
                                                  updateReports(
                                                      b,
                                                      {
                                                          ...r,
                                                          text: e.target.checked ? 'No' : ''
                                                      },
                                                      r.checked,
                                                      true,
                                                  );
                                              }
                                          }} />
                                  </div>
                                
                                )}
                                
                                {r.metric === 'Image' && r.text && isBlobLink(r.text) === true && 
                                  (<div style={{ position: 'relative' }}>
                                    {r.checked !== true && (
                                      <div className="x" style={{ position: 'absolute', right: 5, top: 5 }} onClick={() => {
                                        updateReports(
                                              b,
                                              {
                                                  ...r,
                                                  text: ''
                                              },
                                              r.checked,
                                              true,
                                          );
                                      }}>x</div>
                                    )}
                                    {r.text && (
                                      <label>
                                        <input type="checkbox" style={{ display: 'none' }} />

                                        <img src={`/api/blob_image?pathname=${r.text.slice(57)}`}  alt='Image' className='input' />
                                        <div style={{position: 'relative'}}>
                                          <div className="x" style={{ position: 'absolute', right: 5, top: 5 }}   onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();

                                              const checkbox = e.currentTarget
                                                .closest('label')
                                                ?.querySelector<HTMLInputElement>('input[type="checkbox"]');

                                              if (checkbox) checkbox.checked = false;
                                            }}>x</div>
                                          <img className='img-fullscreen input ' src={`/api/blob_image?pathname=${r.text.slice(57)}`} alt='Image' />
                                        </div>

                                      </label>
                                    )}
                                  </div>) }
                                
                            </div>
                              <div onClick={() => {addReportFinding(r, b)}}></div>

                              <span className={r.timestamp ? translation('done') : translation('pending')}>{r.timestamp ? format(new Date(r.timestamp), "h:mm a") : b.freezed === true ? 'Not Done' : 'Pending'}</span>
                              <div className={r.checked || user.id !== b.lead_id || noAccessEdit(b) || !isBeforeTime(r.check_before) ? 'button-d-bl-sm d' : 'button-d-bl-sm'} 
                                onClick={() => {if (!r.checked && user.id === b.lead_id && !noAccessEdit(b) && isBeforeTime(r.check_before) ) updateReports(b, {...r, holder_id: null}, r.checked)}}
                              >{translation('withdraw')}</div>
                            </div>)
                        )}
                        {reports_sorted.filter((r: Report) => r.holder_id && r.holder_id !== user.id).map(
                          (r: Report, i: number) => (
                            <div className={i === 0 ? 'report border-top reports-other-users-took' : 'report'} key={r.id}>
                              {/* <input className={noAccessEdit(b) ? 'd' : ''} disabled={noAccessEdit(b)} type='checkbox' checked={r.checked} onChange={() => {updateReports(b, r, !r.checked)}} /> */}
                              <div></div>
                              <div>{r.name}</div>
                              <div>
                                <div>{capitalize(r.day_time)}</div>
                                {r.check_before && (<div style={{ fontSize: 10, fontWeight: 600, lineHeight: 1.2 }}>{translation('check_before')}: {r.check_before}</div>)}
                              </div>
                              <div>{r.source}</div>
                              <div>{translation('assignee')}: <div className='' style={{display: 'flex', gap: '5px'}}><UserCircle user_name={leads.find((lead: User) => lead.id === r.holder_id)?.name || 'A'} size={15}></UserCircle>{leads.find((lead: User) => lead.id === r.holder_id)?.name}</div></div>
                              <div style={{ display: 'flex', flexDirection: 'column', color: '#000000' }}><div>{r.metric ?? 'No Metric'}</div>{r.checked && r.metric === 'Image' && r.text && isBlobLink(r.text) === true && 
                                  (<div style={{ position: 'relative' }}>
                                    {r.text && (
                                      <label>
                                        <input type="checkbox" style={{ display: 'none' }} />

                                        <img src={`/api/blob_image?pathname=${r.text.slice(57)}`}  alt='Image' />
                                        <div style={{position: 'relative'}}>
                                          <div className="x" style={{ position: 'absolute', right: 5, top: 5 }}   onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();

                                              const checkbox = e.currentTarget
                                                .closest('label')
                                                ?.querySelector<HTMLInputElement>('input[type="checkbox"]');

                                              if (checkbox) checkbox.checked = false;
                                            }}>x</div>
                                          <img className='img-fullscreen input ' src={`/api/blob_image?pathname=${r.text.slice(57)}`} alt='Image' />
                                        </div>

                                      </label>
                                    )}
                                  </div>) }
                              {r.checked && r.metric !== 'Image' && (<strong>{r.text}</strong>)}
                              </div>
                              <div onClick={() => {addReportFinding(r, b)}}></div>
                              <span className={r.timestamp ? translation('done') : translation('pending')}>{r.timestamp ? format(new Date(r.timestamp), "h:mm a") : b.freezed === true ? 'Not Done' : 'Pending'}</span>
                              {
                                user.permissions.reasign_reports === true && `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}` === b.date ? (
                                  <div className={`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}` !== b.date ? 'button-d-bl-sm d' : 'button-d-bl-sm'} 
                                    onClick={() => {console.log(r); setReportToCallout({...r}); setShowCallout(true); }}
                                  >{translation('call-out')}</div>
                                ) : (<div></div>)
                              }
                            </div>)
                        )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <div className="findings">
                        <div>
                          <h1>{translation('findings')}:</h1>
                          <div className={noAccessEdit(b) ? 'd' : ''} onClick={() => {if (!noAccessEdit(b)) setShowAddFinding(true)}}>+ {translation('add_finding')}</div>
                        </div>
                        <div>{b.findings && b.findings?.length > 0 ? b.findings.map(f => (
                          <div key={`finding_div_${f.id}`} className={`finding ${f.type}-container`}>
                            <div>
                              <div>{f.description}</div>
                              <div className={f.type}>{f.type}</div>
                            </div>
                            <div>{f.created_at && format(new Date(f.created_at), "h:mm a")}</div>
                          </div>
                        )) : (<h3>{!showAddFinding ? translation('no_findings_yet') : ''}</h3>)}
                          {showAddFinding && <div className='add-finding' id='add-finding'>
                            <div>
                              <span>{translation('choose_status')}</span>
                              <select disabled={noAccessEdit(b)} id={`new_f_type_${b.id}`}>
                                <option value='high'>{translation('high')}</option>
                                <option value='moderate'>{translation('moderate')}</option>
                                <option value='info'>{translation('info')}</option>
                              </select>
                            </div>
                            <div>
                              <span>{translation('write_description')}</span>
                              <textarea disabled={noAccessEdit(b)} id={`new_f_name_${b.id}`} placeholder={translation('anything_the_next_lead_needs_to_know')} />
                            </div>
                            <div>
                              <div className='cancel' onClick={() => {setShowAddFinding(false)}}>{translation('cancel')}</div>
                              <input className='button-d-bl-sm' disabled={noAccessEdit(b)} type="button" value={translation('add_finding')} onClick={() => { addFinding(b, {
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
                          <h1>{translation('tasks')}:</h1>
                          <div className={noAccessEdit(b) ? 'd' : ''} onClick={() => {if(!noAccessEdit(b)) setShowAddTask(true)}}>+ {translation('add_task')}</div>
                        </div>
                        <div>
                          {b.tasks && b.tasks?.length > 0 ? b.tasks.map(t => (
                            <label key={`task_label_${t.id || crypto.randomUUID()}`} id={`task_label_${t.id || crypto.randomUUID()}`} className={noAccessEdit(b) ? 'task d' : 'task'}>
                              <input key={`${t.id}-task-input`} type='checkbox' checked={t.checked ?? false} onChange={() => { if (!noAccessEdit(b)) changeTask(b, {
                                    ...t,
                                    checked: !(t.checked ?? false),
                                  });
                                }}/>
                              <div data-img={t.roll_to_next_brief === true ? "roll-next-brief" : "do-not-roll-next-brief"} className={noAccessEdit(b) ? 'd' : ''} onClick={() => {if (!noAccessEdit(b)) changeTask(b, {
                                ...t,
                                roll_to_next_brief: !t.roll_to_next_brief
                              })}}></div>
                              <div key={`${t.id}-task-text`}>{t.text}</div>
                              <div key={`${t.id}-task-type`}>{t.task_type}</div>
                            </label>)) : (<h3>{!showAddTask ? translation('no_tasks_yet') : ""}</h3>)
                          }
                        </div>
                        {showAddTask && (<div className='add-task'>
                            <div className='cancel' onClick={() => {setShowAddTask(false)}}></div>
                            <div>
                              <span>{translation('task_name')}</span>
                              <input disabled={noAccessEdit(b)} id={`new_t_name_${b.id}`} type='text' placeholder={translation('task_description')} />
                            </div>
                            <div>
                              <span>{translation('action')}</span>
                              <select disabled={noAccessEdit(b)} id={`new_t_type_${b.id}`}>
                                <option value='Report follow-up'>{translation('report_follow_up')}</option>
                                <option value='Site visit'>{translation('site_visit')}</option>
                                <option value='Shop / vehicle'>{translation('shop_vehicle')}</option>
                                <option value='Admin'>{translation('admin')}</option>
                                <option value='Other'>{translation('other')}</option>
                              </select>
                            </div>
                            <input disabled={noAccessEdit(b)} type="button" value="Add" className='button-d-bl-sm' onClick={() => {
                              const custom_id = crypto.randomUUID();
                              addTask(b, {
                                id: custom_id,
                                custom_id: custom_id,
                                task_type: (document.getElementById(`new_t_type_${b.id}`) as HTMLTextAreaElement)?.value || '',
                                text: (document.getElementById(`new_t_name_${b.id}`) as HTMLTextAreaElement)?.value || '',
                              });
                            }}/>

                          </div>)}
                      </div>
                    </div>
                    {user.permissions.handoff_brief && (<div className="handoff">
                      <h1>{translation('handoff')}:</h1>
                      <div>
                        <div>
                          <div>
                            <span>{translation('recipient')}</span>
                            <select id={`handoff_to_${b.id}`} className={noAccessEdit(b) ? 'd' : ''} disabled={noAccessEdit(b)}>
                              {leads.map((u: User) => b.lead_id != u.id && (<option value={u.id} key={u.id}>{u.name}</option>))}
                            </select>
                          </div>
                          <div>
                            <span>{translation('reason')}</span>
                            <input className={noAccessEdit(b) ? 'd' : ''} id={`handoff_reason_${b.id}`} disabled={noAccessEdit(b)} type='text' placeholder={translation('reason')}></input>
                          </div>
                        </div>
                        <div>
                          <span>{translation('notes')}</span>
                          <textarea  className={noAccessEdit(b) ? 'd' : ''} disabled={noAccessEdit(b)} id={`handoff_notes_${b.id}`} placeholder={translation('anything_the_next_lead_needs_to_know')}></textarea>
                        </div>
                        <input className={noAccessEdit(b) ? 'button-d-bl-sm tg d' : 'button-d-bl-sm tg'} type="button" value={translation('complete_handoff')} onClick={() => { if(!noAccessEdit(b)) setShowHandoff(true) }}/>
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