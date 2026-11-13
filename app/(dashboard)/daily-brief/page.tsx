'use client';

import { useDate } from '../../src/components/DateContext';
import Loader from '../../src/components/Loader';
import { useEffect, useState, useRef } from 'react';
import getColorsFromName from '@/lib/color';
import { format, parse } from "date-fns";
import { toast } from 'sonner';
import { Company, Covered, Report, SavedBrief, Shift, User, IdName, DailyLogRow, Department } from '@/lib/types';
import './page.css'
import { downloadPDF, generateEmailHTML } from '@/lib/documents';
import SmallLoader from '@/app/src/components/SmallLoader';
import { useSearchParams } from 'next/navigation';
import { randomInt } from 'crypto';
import capitalize from '@/lib/text';
import UserCircle, { clearOfTheTo } from '@/app/src/components/UserCircle';
import ImageUploader from '@/app/src/components/ImageUploader';
import isBlobLink from '@/lib/img';
import scrollToElement from '@/lib/html_document';
import { useLocale, useTranslations } from 'next-intl';
import { getActionLogCategories } from '@/lib/config';
import { beforeCheckTime } from '@/lib/date';
import { safeUUID } from '@/lib/uuid';
import MentionsHelper from '@/app/src/components/MentionsHelper';
import { sendMessageGlobal } from '@/app/src/components/Chat';


export default function DailyBrief() {
  const [user, setUser] = useState<User | null>(null);
  const { date, setDate, today: todayString, timezone, now } = useDate();
  const locale = useLocale();
  const briefTime = new Intl.DateTimeFormat(locale, { timeZone: timezone, hour: 'numeric', minute: '2-digit' });
  const manager = !!user && (user.id === user.main_admin_id || user.permissions.reasign_reports === true
    || (user.permissions.see_all_briefs === true && user.permissions.update_brief === true));
  const isBeforeTime = (time: string | undefined) =>
    user?.id === user?.main_admin_id || user?.permissions.reasign_reports === true || beforeCheckTime(time, timezone, now);
  const readOnly = (b: SavedBrief) => !b.is_department_journal || b.freezed || b.date !== todayString;
  const noAccessEditShort = (b: SavedBrief) => readOnly(b) || !user
    || !b.duties.some(d => d.user_id === user.id && !d.ended_at) || (!manager && !user.permissions.update_brief);
  const noAccessEdit = (b: SavedBrief) => noAccessEditShort(b) || !b.shift;
  const noAccessHandoff = (b: SavedBrief) => readOnly(b) || !user
    || (manager ? false : (!b.duties.some(d => d.user_id === user.id && !d.ended_at)
      || b.handoffs.some(h => h.from_user_id === user.id) || !user.permissions.handoff_brief));
  const noAccessReport = (b: SavedBrief, r: Report) => noAccessEditShort(b) || !user
    || (!manager && !(user.permissions.update_brief && (user.department_id === b.department_id || r.holder_id === user.id)));
  const [submitErrors, setSubmitErrors] = useState<{pending: Report[]; overdue: Report[]}>({pending: [], overdue: []});
  const requestQueue = useRef(Promise.resolve(true));
  const [showSubmit, setShowSubmit] = useState<{briefId: number; reportId: number} | null>(null)
  const [handoffConfirm, setHandoffConfirm] = useState<{
    briefId: string | number;
    departmentId?: string;
    fromUserId: string;
    newLeadId: string;
    shiftId?: number;
    reason: string;
    notes: string;
    isDirect: boolean;
    reportsOnly: boolean;
  } | null>(null);
  const savingRef = useRef(false);
  const [savingCover, setSavingCover] = useState(false)
  const [showAddCover, setShowAddCover] = useState(false)
  const [showCallout, setShowCallout] = useState(false)
  const [reportToCallout, setReportToCallout] = useState<Report>()
  const [findingText, setFindingText] = useState('')
  const [findingCursor, setFindingCursor] = useState(0)
  const [findingFocused, setFindingFocused] = useState(false)
  const [mentionedUsers, setMentionedUsers] = useState<string[]>([])
  const findingTextareaRef = useRef<HTMLTextAreaElement>(null)

  const changeBrief = (b: SavedBrief, action: string, values: Record<string, unknown> = {}) => {
    const request = requestQueue.current.then(async () => {
      savingRef.current = true;
      try {
        const res = await fetch("/api/update_todays_brief", {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({id: b.id, action, ...values}),
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.error === 'day_incomplete') {
            setSubmitErrors({pending: data.pending, overdue: data.overdue});
          } else {
            const key = 'errors.' + data.error;
            toast.error(translation.has(key) ? translation(key) : translation('save_failed'));
          }
          setReload(previous => previous + 1);
          return false;
        }
        setBriefs((previous: SavedBrief[]) => data.brief
          ? previous.map(brief => brief.id === b.id ? data.brief : brief)
          : previous.filter(brief => brief.id !== b.id));
        setAllBriefs((previous: SavedBrief[]) => data.brief
          ? previous.map(brief => brief.id === b.id ? data.brief : brief)
          : previous.filter(brief => brief.id !== b.id));
        if (!data.brief) setReload(previous => previous + 1);
        if (action === 'complete' && data.brief?.reports.length && data.brief.reports.every((r: Report) => r.checked)) {
          setSubmitErrors({pending: [], overdue: []});
          setShowSubmit({briefId: b.id, reportId: Number(values.report_id)});
        }
        return true;
      } catch {
        toast.error(translation('save_failed'));
        return false;
      } finally {
        savingRef.current = false;
      }
    });
    requestQueue.current = request;
    return request;
  };

  const addCover = async (b: SavedBrief, covered: Covered[]) => {
    setSavingCover(true);
    if (await changeBrief(b, 'add_cover', {cover: covered[covered.length - 1]})) setShowAddCover(false);
    setSavingCover(false);
  };

  const removeCover = async (b: SavedBrief, id: string) => {
    setSavingCover(true);
    await changeBrief(b, 'remove_cover', {cover_id: id});
    setSavingCover(false);
  };

  const startMyBrief = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({department_id: departmentBrief?.department_id ?? selectedDepartment, shift_id: Number(selectedShift), date: dateString}),
      });
      if (!res.ok) {
        toast.error(translation('start_failed'));
        return;
      }
      setShowSelectShift(false);
      setSelectedShift("");
      setReload(previous => previous + 1);
    } catch {
      toast.error(translation('start_failed'));
    } finally {
      setLoading(false);
    }
  };

  const submitBrief = async (b: SavedBrief) => {
    if (await changeBrief(b, 'submit')) setShowSubmit(null);
  };

  const addFinding = async (b: SavedBrief, finding: any) => {
    if (await changeBrief(b, 'finding', {finding: {id: safeUUID(), ...finding}})) {
      const notificationText = translation('mentionedNotification', {
        action: finding.description.slice(0, 20),
        date: b.date,
        department: b.department_name
      });

      mentionedUsers
        .filter(user_id => user_id !== user?.id)
        .forEach(user_id => {
          sendMessageGlobal({
            text: notificationText,
            from_user: user!.id,
            to_user: user_id,
            timestamp: new Date(),
          });
        });
      if (mentionedUsers.length > 0) toast.success('Mentioned users was notified!')
      setShowAddFinding(false);
      setSendFindingToTracker(false);
      setFindingText('');
      setFindingCursor(0);
      setMentionedUsers([]);
      setFindingFocused(false);    }
  };

  const changeTask = async (b: SavedBrief, task: any) => {
    const previous = b.tasks.find(item => item.id === task.id);
    const changes: Record<string, unknown> = {id: task.id, text: task.text ?? previous?.text};
    if (task.checked !== previous?.checked) changes.checked = task.checked;
    if (task.roll_to_next_brief !== previous?.roll_to_next_brief) changes.roll_to_next_brief = task.roll_to_next_brief;
    await changeBrief(b, 'task', {task: changes});
  };

  const addTask = async (b: SavedBrief, task: any) => {
    if (await changeBrief(b, 'add_task', {task})) setShowAddTask(false);
  };

  const changeShift = async (b: SavedBrief, shift: string, user_id?: string) => {
    await changeBrief(b, 'shift', {shift_id: Number(shift), user_id});
  };

  const changeDrivingStatus = async (b: SavedBrief, driving_status: boolean, user_id?: string) => {
    await changeBrief(b, 'driving', {driving: driving_status, user_id});
  };

  const updateReports = async (b: SavedBrief, r: Report, checked: boolean, send = true) => {
    const previous = b.reports.find(report => report.id === r.id);
    if (!previous) return;
    const action = checked !== previous.checked ? (checked ? 'complete' : 'undo')
      : r.holder_id !== previous.holder_id ? (!r.holder_id ? 'withdraw'
        : !previous.holder_id && r.holder_id === user?.id ? 'take' : 'reassign')
      : 'value';
    if (!send || action === 'value') {
      setBriefs((briefs: SavedBrief[]) => briefs.map(brief => brief.id === b.id
        ? {...brief, reports: brief.reports.map(report => report.id === r.id ? {...report, text: r.text} : report)}
        : brief));
      if (!send) return;
    }
    await changeBrief(b, action, {report_id: r.id, text: r.text ?? '', holder_id: r.holder_id});
  };

  const handoffBrief = async (
    b: SavedBrief,
    action: 'request' | 'accept' | 'decline' | 'direct_transfer' = 'request',
    handoff?: SavedBrief['handoffs'][number],
    shift_id?: number,
    decline_reason?: string,
    from_user_id?: string,
    new_lead_id?: string,
    reason?: string,
    notes?: string,
    reports_only = false
  ) => {
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      const fromId = from_user_id || (document.getElementById(`handoff_from_${b.id}`) as HTMLSelectElement)?.value || user?.id;
      const toId = new_lead_id || (document.getElementById(`handoff_to_${b.id}`) as HTMLSelectElement)?.value;
      const reasonVal = reason !== undefined ? reason : (document.getElementById(`handoff_reason_${b.id}`) as HTMLInputElement)?.value;
      const notesVal = notes !== undefined ? notes : (document.getElementById(`handoff_notes_${b.id}`) as HTMLTextAreaElement)?.value;

      const res = await fetch("/api/handoffBrief", {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          brief_id: b.id,
          department_id: b.department_id,
          action,
          handoff_id: handoff?.id,
          shift_id,
          decline_reason,
          from_user_id: fromId,
          new_lead_id: toId,
          reason: reasonVal,
          notes: notesVal,
          reports_only,
        }),
      });
      if (res.ok) {
        setHandoffConfirm(null);
        setShowSelectShift(false);
        setPendingHandoff(null);
        setDecliningHandoff(null);
        setDeclineReason("");
        setReload(previous => previous + 1);
      } else {
        const data = await res.json();
        const key = 'errors.' + data.error;
        toast.error(translation.has(key) ? translation(key) : (translation.has(data.error) ? translation(data.error) : translation('handoff_failed')));
        setReload(previous => previous + 1);
      }
    } catch {
      toast.error(translation('handoff_failed'));
    } finally {
      savingRef.current = false;
    }
  };
  const searchParams = useSearchParams();

  
  const param_date = searchParams.get('date');
  const param_lead_id = searchParams.get('lead_id');

  useEffect(() => {
    if (param_date) setDate(parse(param_date, 'dd-MM-yyyy', new Date()));
  }, [param_date, setDate]);

  const [reload, setReload] = useState(0);
  const [leads, setLeads] = useState<User[]>([])
  const [briefs, setRealBriefs] = useState<SavedBrief[]>([])
  const [allBriefs, setAllBriefs] = useState<SavedBrief[]>([])
  const dateString = format(date, "yyyy-MM-dd");
  const setBriefs = (b: any, load=false) => { setRealBriefs(b) }

  const [showAddFinding, setShowAddFinding] = useState(false)
  const [sendFindingToTracker, setSendFindingToTracker] = useState(false)
  const actionLogCategories = getActionLogCategories().sort((a: IdName, b: IdName) => a.name.localeCompare(b.name));
  const [showAddTask, setShowAddTask] = useState(false)
  const [shifts, setShifts] = useState<Shift[]>([])
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [company, setCompany] = useState<Company>();
  const translation = useTranslations('DailyBrief');
  const [showSelectShift, setShowSelectShift] = useState(false);
  const [selectedShift, setSelectedShift] = useState<string>("");
  const [pendingHandoff, setPendingHandoff] = useState<{brief: SavedBrief; handoff: SavedBrief['handoffs'][number]} | null>(null);
  const [decliningHandoff, setDecliningHandoff] = useState<{brief: SavedBrief; handoff: SavedBrief['handoffs'][number]} | null>(null);
  const [declineReason, setDeclineReason] = useState<string>("");
  const [handoffFrom, setHandoffFrom] = useState<Record<string, string>>({});
  const [handoffTo, setHandoffTo] = useState<Record<string, string>>({});
  const [handoffShift, setHandoffShift] = useState<Record<string, string>>({});

  const param_department_id = searchParams.get('department_id');
  const param_brief_id = searchParams.get('brief_id');
  const param_finding_id = searchParams.get('finding_id');
  const [activeBriefId, setActiveBriefId] = useState<string | null>(param_brief_id);
  useEffect(() => {
    setActiveBriefId(param_brief_id);
  }, [param_brief_id]);
  
  

  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!loading && param_finding_id && briefs.length > 0) {
      setTimeout(() => scrollToElement(`finding_div_${param_finding_id}`), 150);
    }
  }, [loading, param_finding_id, briefs.length]);
  useEffect(() => {
    async function load() {
      try {
        const me_res = await fetch("/api/me");
        const me_user = await me_res.json();
        setUser(me_user);
        const users_res = await fetch("/api/users");
        const leads_data = await users_res.json();
        setLeads(leads_data);
        const company_res = await fetch("/api/company");
        const company_data = await company_res.json();
        setCompany(company_data[0]);
        const departments_res = await fetch(`/api/departments?date=${dateString}`);
        const departments_data = (await departments_res.json()).filter((d: Department) => d.is_main);
        setDepartments(departments_data);
        const department_id = param_department_id
          || leads_data.find((lead: User) => lead.id === param_lead_id)?.department_id
          || me_user.department_id;
        setSelectedDepartment(departments_data.some((d: Department) => d.id === department_id)
          ? department_id : departments_data[0]?.id ?? null);
        if (!departments_data.length) setLoading(false);
      } catch {
        toast.error(translation('load_failed'));
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!selectedDepartment) return;
    if (activeBriefId && briefs.some(b => b.id === Number(activeBriefId) && b.date !== dateString)) {
      setActiveBriefId(null);
      return;
    }
    let active = true;
    let fetching = false;
    async function load(background = false) {
      if (fetching) return;
      fetching = true;
      const request = requestQueue.current;
      if (!background) setLoading(true);
      try {
        const deptRes = await fetch(`/api/departments?date=${dateString}`);
        if (deptRes.ok) {
          const deptData = (await deptRes.json()).filter((d: Department) => d.is_main);
          if (active) {
            setDepartments(deptData);
            if (deptData.length && selectedDepartment && !deptData.some((d: Department) => d.id === selectedDepartment)) {
              setSelectedDepartment(deptData[0].id);
              return;
            }
          }
        }
        const url = activeBriefId ? `/api/brief?id=${activeBriefId}`
          : `/api/brief_history?date_from=${dateString}&date_to=${dateString}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('load_failed');
        const data: SavedBrief[] = await res.json();
        if (!active) return;
        if (background && (savingRef.current || request !== requestQueue.current
          || document.activeElement?.matches('input, textarea, select, [contenteditable="true"]'))) return;
        setAllBriefs(data);
        if (activeBriefId) {
          if (data[0]?.department_id && data[0].department_id !== selectedDepartment) setSelectedDepartment(data[0].department_id);
          if (data[0]?.date && !param_date && data[0].date !== dateString) setDate(parse(data[0].date, "yyyy-MM-dd", new Date()));
          setBriefs(data);
        } else {
          const departmentBriefs = data.filter(b => b.department_id === selectedDepartment);
          const journals = departmentBriefs.filter(b => b.is_department_journal);
          setBriefs(journals.length ? journals : departmentBriefs);
        }
      } catch {
        if (active && !background) toast.error(translation('load_failed'));
      } finally {
        fetching = false;
        if (active && !background) setLoading(false);
      }
    }
    load();
    const refresh = () => {
      if (dateString !== todayString || document.visibilityState !== 'visible' || savingRef.current
        || document.activeElement?.matches('input, textarea, select, [contenteditable="true"]')) return;
      load(true);
    };
    const interval = dateString === todayString ? setInterval(refresh, 5000) : null;
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      active = false;
      if (interval !== null) clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [date, selectedDepartment, reload, activeBriefId, todayString]);

    useEffect(() => {
      async function load() {
        const shifts_res = await fetch(`/api/shifts`)
        if (!shifts_res.ok) {
          console.log("Failed while fetching shifts")
          setLoading(false)
          return;
        }
        let shifts = await shifts_res.json()
        setShifts(shifts)
      }

      load();
    }, [])

  const addReportFinding = (r: Report, b: SavedBrief) => {
    setShowAddFinding(true);
    setTimeout(() => {
      scrollToElement('add-finding');
      setFindingText(`Finding related to report "${r.name}":`)
    }, 300)
  }
  const departments_to_display = departments.filter(d => manager || user?.permissions.see_all_briefs
    || d.id === user?.department_id || allBriefs.some(b => b.department_id === d.id));
  const departmentBrief = briefs.find(b => b.is_department_journal);
  const canStart = dateString === todayString && !!selectedDepartment && (!activeBriefId || !!departmentBrief)
    && (!departmentBrief || !readOnly(departmentBrief)) && (manager
      || (user?.permissions.update_brief && (user.department_id === (departmentBrief?.department_id ?? selectedDepartment)
        || departmentBrief?.reports.some(r => r.holder_id === user.id))));
  const at_row_date = new Date()
  at_row_date.setHours(0, 0, 0, 0);
  const defaultNewAuditLogRow = {
    date: at_row_date.toISOString(),
    user_id: user?.id,
    department_id: user?.department_id ?? '',
    shift: '',
    category: 'Finding',
    severity: '',
    date_resolved: null,
    text: '',
    status: 'Unset',
    actions: null,
  }

  const sendActionTrackerRow = async (b: SavedBrief, severity: string, text: string) => {
    const io_owner_top_list = leads.filter((u: User) => u.department === user?.department)
      .sort((a: User, b: User) => 
        Object.keys(b.permissions).filter((p_key: string) => 
          b.permissions[p_key] === true
        ).length - 
        Object.keys(a.permissions).filter((p_key: string) => 
          a.permissions[p_key] === true
        ).length
      )
    if (io_owner_top_list.length === 0) {
      console.log('io_owner_top_list === 0')
      return;
    }
    setLoading(true);
    const newActionTrackerRow: DailyLogRow = {
      ...defaultNewAuditLogRow,
      user_id: io_owner_top_list[0].id,
      shift: b.shift ?? "",
      severity: severity,
      text: text
    }


    const action_tracker_res = await fetch('/api/daily_log', {
      method: "POST",
      headers: {
          "Content-Type": "application/json",
      },
      body: JSON.stringify(newActionTrackerRow)
    });
    if (!action_tracker_res.ok){
      console.error('Error while sending Action Tracker Row.');
      setLoading(false);
      return false;
    }
    setLoading(false);
    return true;
  }

  return (
    <div className="daily-brief">
      <div>
        <div onClick={() => {history.back()}}>{translation('back')}</div>
        <div>{translation('daily_briefs')}</div>
      </div>
      <div>
        {departments_to_display.length > 0 && (
          <div className="leads" style={{display: departments_to_display.length > 0 ? "flex" : "none", gap: "10px"}}>
            <div className='choose'>
              <span>{translation('choose_department')}</span>
            </div>
            {departments_to_display.sort((a, b) => a.name.localeCompare(b.name)).map((d) => {
              let colors = getColorsFromName(clearOfTheTo(d.name));
              return (
                <label className='lead' style={{
                    backgroundColor: selectedDepartment === d.id ? colors.dark : colors.light,
                    color: selectedDepartment === d.id ? "white" : "#a1a1a1"}} key={d.id}>
                  <input type='radio' name='lead' checked={selectedDepartment === d.id} onChange={() => {setActiveBriefId(null); setSelectedDepartment(d.id)}} />
                  <UserCircle user_name={d.name} size={24}></UserCircle> {d.name}
                </label>)
            })}
          </div>
        ) }
        <br></br>
        <br></br>
        {loading ?
         (<Loader></Loader>)
         : (<div className='briefs'>
                {showSelectShift && (
                  <div className='confirm'>
                    <div>
                      <h1>{translation('select_your_shift_first')}</h1>
                      <p>{translation('selecting_shift_is')}</p>
                      <select className='shift-select input' value={selectedShift} onChange={(e) => {setSelectedShift(e.target.value)}}>
                        <option value="">-</option>
                        {shifts.map((s: Shift) => {
                          return (<option key={s.id} value={s.id}>{s.name}</option>)
                        })}
                      </select>
                      <div>
                        <div className='button-w-bl' onClick={() => {setShowSelectShift(false); setPendingHandoff(null)}}>{translation('cancel')}</div>
                        <div className={selectedShift === "" ? 'button-d-bl d' : 'button-d-bl'} onClick={() => {if (selectedShift !== "") { if (pendingHandoff) handoffBrief(pendingHandoff.brief, 'accept', pendingHandoff.handoff, Number(selectedShift)); else startMyBrief(); }}}>{translation('confirm')}</div>
                      </div>
                    </div>
                  </div>
                )}
                {decliningHandoff && (
                  <div className='confirm'>
                    <div>
                      <h1>{translation('decline_handoff')}?</h1>
                      <input
                        className='input'
                        style={{width: '80%', margin: '0 auto'}}
                        type='text'
                        value={declineReason}
                        onChange={(e) => setDeclineReason(e.target.value)}
                        placeholder={translation('decline_reason')}
                      />
                      <div>
                        <div className='button-w-bl' onClick={() => {setDecliningHandoff(null); setDeclineReason("")}}>{translation('cancel')}</div>
                        <div className={declineReason.trim() === "" ? 'button-d-bl d' : 'button-d-bl'} onClick={() => {if (declineReason.trim() !== "") handoffBrief(decliningHandoff.brief, 'decline', decliningHandoff.handoff, undefined, declineReason)}}>{translation('confirm')}</div>
                      </div>
                    </div>
                  </div>
                )}
            {briefs.length == 0 || !user
              ? (<div></div>) 
              : briefs.map((b: SavedBrief, b_i) => {
                if (user){
                const duties = b.is_department_journal ? b.duties
                  : [{user_id: b.lead_id, name: b.lead_name, shift_id: b.shift_id, shift: b.shift, driving: b.driving, ended_at: null, handed_to: null}];
                const drivers = duties.filter(d => !d.ended_at && d.driving && (manager || d.user_id === user.id));
                const hasCoverage = Boolean(duties.some(d => !d.ended_at && d.driving) || (b.covered && b.covered.length > 0));
                const reports_sorted = b.reports.sort((a: Report, b: Report) => ['opening', 'midday', 'closing', 'ongoing'].indexOf(a.day_time) - ['opening', 'midday', 'closing', 'ongoing'].indexOf(b.day_time));
                return (
                  <div className='brief' id={`b-${b.id}`} key={`b-${b.id}`}>
                    <div className='shift-info'>
                      <div>
                        <h1>{b.department_name} {translation('brief')}, {b.date ? format(parse(b.date, "yyyy-MM-dd", new Date()), "MMMM d, yyyy") : translation('unknown_date')}{(!b.date || b.date < todayString || b.freezed) && <> ({translation(b.freezed ? 'frozen_submitted' : 'frozen_day_passed')})</>}</h1>
                        <div className='button-w-bl' style={{marginLeft: "auto"}} onClick={() => {generateEmailHTML(b)}} >{translation('copy_for_email')}</div>
                        <div className='button-w-bl' onClick={() => {downloadPDF(b)}}>{translation('save_as_pdf')}</div>
                        {showSubmit?.briefId === b.id && (
                          <div className='confirm'>
                            <div>
                              <h1>{translation('submit_daily_brief')}?</h1>
                              {!submitErrors.pending.length && !submitErrors.overdue.length && <p>{translation('submit_whole_day')}</p>}
                              <p>{translation('after_submission')} <strong>{translation('read_only')}</strong></p>
                              <p>{translation('freezed')}</p>
                              <p>{translation('cancel_submit_notice')}</p>
                              {submitErrors.pending.length > 0 && <div><strong>{translation('pending_reports')}</strong><ul>{submitErrors.pending.map(r => <li key={r.id}>{[r.name, capitalize(r.day_time), r.shift_name].filter(Boolean).join(', ')}</li>)}</ul></div>}
                              {submitErrors.overdue.length > 0 && <div><strong>{translation('overdue_reports')}</strong><ul>{submitErrors.overdue.map(r => <li key={r.id}>{[r.name, capitalize(r.day_time), r.shift_name, r.check_before].filter(Boolean).join(', ')}</li>)}</ul></div>}
                              <div>
                                <div className='button-w-bl' onClick={async () => {
                                  if (await changeBrief(b, 'undo', {report_id: showSubmit.reportId})) setShowSubmit(null);
                                }}>{translation('cancel_submit')}</div>
                                <div className={submitErrors.pending.length || submitErrors.overdue.length ? 'button-d-bl d' : 'button-d-bl'} onClick={() => {if (!submitErrors.pending.length && !submitErrors.overdue.length) submitBrief(b)}}>{translation('submit_brief')}</div>
                              </div>
                            </div>
                          </div>
                        )}
                        {handoffConfirm && handoffConfirm.briefId === b.id && (
                          <div className='confirm'>
                            <div>
                              <h1>{translation(handoffConfirm.reportsOnly ? 'transfer_reports' : handoffConfirm.isDirect ? 'transfer_shift' : 'handoff_daily_brief')}?</h1>
                              <p>{translation(handoffConfirm.reportsOnly ? 'transfer_reports_only' : handoffConfirm.isDirect ? 'transfer_immediate' : 'handoff_same_day')}</p>
                              <div>
                                <div className='button-w-bl' onClick={() => setHandoffConfirm(null)}>{translation('cancel')}</div>
                                <div className='button-d-bl' onClick={() => {
                                  handoffBrief(
                                    b,
                                    handoffConfirm.isDirect ? 'direct_transfer' : 'request',
                                    undefined,
                                    handoffConfirm.shiftId,
                                    undefined,
                                    handoffConfirm.fromUserId,
                                    handoffConfirm.newLeadId,
                                    handoffConfirm.reason,
                                    handoffConfirm.notes,
                                    handoffConfirm.reportsOnly
                                  );
                                  setHandoffConfirm(null);
                                }}>{translation(handoffConfirm.isDirect ? 'confirm' : 'hand_off_this_brief')}</div>
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
                                {[true, false].map(local => (
                                  <optgroup key={String(local)} label={translation(local ? 'department_employees' : 'other_employees')}>
                                    {leads.filter(u => !u.archived && (u.permissions.update_brief || u.id === company?.main_admin_id)
                                      && (u.department_id === b.department_id) === local)
                                      .sort((a, b) => a.name.localeCompare(b.name)).map(u => (
                                        <option value={u.id} key={u.id}>{u.name}</option>
                                      ))}
                                  </optgroup>
                                ))}
                              </select>
                              <div>
                                <div className='button-w-bl' onClick={() => {setShowCallout(false)}}>{translation('cancel')}</div>
                                <div className='button-d-bl' onClick={async () => {
                                  const holder_id = (document.getElementById('new_holder_id') as HTMLSelectElement).value;
                                  if (reportToCallout && await changeBrief(b, 'reassign', {
                                    report_id: reportToCallout.id,
                                    holder_id: holder_id === 'NULL' ? null : holder_id
                                  })) setShowCallout(false);
                                }}>{translation('confirm')}</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div>
                        <div style={{display: 'flex', justifyContent: 'left', gap: 32, width: '100%'}}>
                        <div style={{flex: 1}}>
                          <span>{translation('lead')}</span>
                          {duties.map((d, i) => {
                            let AB_name = "";
                            try{
                              AB_name += d.name.split(" ")[0][0];
                              if (d.name.split(" ")[1]) AB_name += d.name.split(" ")[1][0];
                            }catch{}
                            return <div style={{display: 'flex', gap: 10, height: 25, marginBottom: i < duties.length - 1 ? 10 : 0}} key={d.user_id}>
                              <div className='user' style={{ backgroundColor: getColorsFromName(d.name).medium }}><div>{AB_name}</div></div>
                              <div>{d.name} - {b.department_name}</div>
                            </div>;
                          })}
                        </div>
                        <div>
                          <span>{translation('duty_status')}</span>
                          {duties.map((d, i) => {
                            const reports = b.reports.filter(r => r.holder_id === d.user_id);
                            const pending = b.handoffs.find(h => h.from_user_id === d.user_id);
                            return <div key={d.user_id} style={{height: 25, marginBottom: i < duties.length - 1 ? 10 : 0, whiteSpace: 'nowrap'}}>
                              {d.ended_at ? translation('duty_transferred', {name: d.handed_to ?? ''})
                                : pending ? translation('duty_awaiting', {name: pending.to_name})
                                : !reports.length ? translation('duty_pending')
                                : reports.every(r => r.checked) ? translation('duty_completed') : translation('duty_in_progress')}
                            </div>;
                          })}
                        </div>
                        <div>
                          <span>{translation('shift')}</span>
                          {duties.map((d, i) => {
                            const canEditDutyShift = !readOnly(b) && !d.ended_at && (manager || (!noAccessEditShort(b) && d.user_id === user.id));
                            return <select key={d.user_id} style={{display: 'block', height: 25, marginBottom: i < duties.length - 1 ? 10 : 0}} className={(!canEditDutyShift ? 'shift-select d' : '') + (!d.shift ? 'pulse-shift' : '')} disabled={!canEditDutyShift} onChange={(e) => {changeShift(b, e.target.value, d.user_id)}} value={d.shift_id ?? ''}>
                              {shifts.map((s: Shift) => {
                                return (<option key={s.id} value={s.id}>{s.name}</option>)
                              })}
                            </select>;
                          })}
                        </div>
                        <div style={{width: 150}}>
                          <span>{translation('personal_reports')}</span>
                          {duties.map((d, i) => {
                            const reports = b.reports.filter(r => r.holder_id === d.user_id);
                            const done = reports.filter(r => r.checked).length;
                            return <div key={d.user_id} style={{height: 25, marginBottom: i < duties.length - 1 ? 10 : 0}}>
                              <div style={{fontSize: 12, lineHeight: '18px'}}>{translation('personal_report_counts', {taken: reports.length, done})}</div>
                              <div className='progress-bar' style={{width: '100%', margin: 0}}>
                                <span style={{width: reports.length ? done / reports.length * 100 + '%' : '0%', backgroundColor: reports.length > 0 && done === reports.length ? '#059669' : undefined}}></span>
                              </div>
                            </div>;
                          })}
                        </div>
                        <div>
                            <span>{translation('work_assignment')}</span>
                            {duties.map((d, i) => {
                              const canEditDriving = !readOnly(b) && !d.ended_at && (manager || (!noAccessEdit(b) && d.user_id === user.id));
                              return (
                                <label key={d.user_id} style={{height: 25, marginBottom: i < duties.length - 1 ? 10 : 0}} className={(d.driving ? 'driving' : '') + (!canEditDriving ? ' d' : '')}>
                                  <input
                                    type="checkbox"
                                    className={!canEditDriving ? "d" : ""}
                                    disabled={!canEditDriving}
                                    checked={d.driving}
                                    onChange={(e) => changeDrivingStatus(b, e.target.checked, d.user_id)}
                                  />
                                  <div>{d.driving ? translation('driving') : translation('floor')}</div>
                                </label>
                              );
                            })}
                        </div>
                        </div>
                        {duties.length === 0 && (
                          <div className='no-duty-block'>
                            {translation('no_active_shifts')}
                          </div>
                        )}
                      </div>
                      <div style={{display: hasCoverage ? 'flex' : 'none', height: 'max-content', padding: '10px 0 15px', margin: '15px', border: '1px solid #c7d2fe'}}>
                        {hasCoverage && (() => {
                          const canAddCover = !readOnly(b) && (manager || !noAccessEdit(b)) && drivers.length > 0;
                          return (
                            <>
                              <div style={{height: hasCoverage ? 'max-content' : 0}} className={!canAddCover ? 'shift-select d' : ''} onClick={() => {if (canAddCover) setShowAddCover(true)}}>+ {translation('add_coverage')}</div>
                              {b.covered && b.covered.length > 0 && b.covered.map((route: Covered, route_i: number) => {
                                const driver_id = route.driver_id ?? (!b.is_department_journal ? b.lead_id : '');
                                const driver_name = route.driver_name ?? (!b.is_department_journal ? b.lead_name : '');
                                const canEditCover = !readOnly(b) && (manager || (!noAccessEdit(b) && driver_id === user.id));
                                return (
                                <div style={{height: hasCoverage ? 'max-content' : 0}} key={`${b.id}_route_${route_i}`}>
                                  <div className={!canEditCover ? 'shift-select d' : ''} onClick={() => {if (canEditCover) removeCover(b, route.id)}}>
                                    <input className={!canEditCover ? 'shift-select d' : ''} type="button" />
                                  </div>
                                  <div>
                                    <span>{translation('driver')}</span>
                                    <select value={driver_id} disabled className="d">
                                      {driver_id && !drivers.some(d => d.user_id === driver_id) && <option value={driver_id} hidden>{driver_name}</option>}
                                      {drivers.map(d => <option key={d.user_id} value={d.user_id}>{d.name}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <span>{translation('covering_for')}</span>
                                    <input type="text" className="d" placeholder={translation('drive_out')} value={route.covering_for} onChange={() => {}} disabled />
                                  </div>
                                  <div>
                                    <span>{translation('route_zone')}</span>
                                    <input type="text" className="d" placeholder={translation('route_zone')} value={route.route_zone} onChange={() => {}} disabled />
                                  </div>
                                  <div>
                                    <span>{translation('van')}</span>
                                    <input type="text" className="d" placeholder={translation('van')} value={route.van} onChange={() => {}} disabled />
                                  </div>
                                  <div>
                                    <span>{translation('stops')}</span>
                                    <input type="number" className="d" placeholder={translation('stops')} value={route.stops} onChange={() => {}} disabled />
                                  </div>
                                  <div>
                                    <span>{translation('window')}</span>
                                    <input type="text" className="d" placeholder={translation('window')} value={route.windows} onChange={() => {}} disabled />
                                  </div>
                                  <div>
                                    <div className=''></div>
                                  </div>
                                </div>);
                              })}
                              {savingCover === true && (<SmallLoader></SmallLoader>)}
                              {showAddCover ? (<div>
                                <div className={!canAddCover ? 'shift-select d' : ''} onClick={() => {if (canAddCover) setShowAddCover(false)}}>
                                  <input type="button" />
                                </div>
                                <div>
                                  <span>{translation('driver')}</span>
                                  <select id={`${b.id}_driver`} defaultValue={drivers.some(d => d.user_id === user.id) ? user.id : drivers.length === 1 ? drivers[0].user_id : ''}>
                                    <option value="" disabled>{translation('select_driver')}</option>
                                    {drivers.map(d => <option key={d.user_id} value={d.user_id}>{d.name}</option>)}
                                  </select>
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
                                  <div className={!canAddCover ? 'button-d-bl-sm d' : 'button-d-bl-sm'} onClick={() => {
                                    if (!canAddCover) return;
                                    const newRoute = [...(b?.covered ?? []), {
                                      id: safeUUID(),
                                      driver_id: (document.getElementById(`${b.id}_driver`) as HTMLSelectElement)?.value || '',
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
                            </>
                          );
                        })()}
                      </div>
                      {(() => {
                        const myHandoffs = !readOnly(b) ? b.handoffs.filter(h => h.to_user_id === user.id) : [];
                        if (myHandoffs.length > 0) {
                          return (
                            <div style={{padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 10}}>
                              {myHandoffs.map(h => {
                                const senderReports = b.reports.filter(r => r.holder_id === h.from_user_id);
                                const senderDone = senderReports.filter(r => r.checked).length;
                                const defaultShift = String(h.from_shift_id ?? duties.find(d => d.user_id === h.from_user_id)?.shift_id ?? "");
                                return (
                                  <div key={h.id} style={{display: 'flex', flexDirection: 'column', gap: 10}}>
                                    <div style={{fontSize: 14, fontWeight: 500, color: '#101828'}}>
                                      {translation('handoff_review', {name: h.from_name, done: senderDone, taken: senderReports.length})}
                                    </div>
                                    {h.reason && <div style={{fontSize: 13, color: '#667085'}}><strong>{translation('reason')}: </strong>{h.reason}</div>}
                                    {h.notes && <div style={{fontSize: 13, color: '#667085', whiteSpace: 'pre-wrap'}}><strong>{translation('notes')}: </strong>{h.notes}</div>}
                                    <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10}}>
                                      <div className='button-d-bl' onClick={() => {
                                        setPendingHandoff({brief: b, handoff: h});
                                        setSelectedShift(defaultShift);
                                        setShowSelectShift(true);
                                      }}>{translation('accept_handoff')}</div>
                                      <div className='button-w-bl' onClick={() => {
                                        setDecliningHandoff({brief: b, handoff: h});
                                        setDeclineReason("");
                                      }}>{translation('decline_handoff')}</div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }
                        if (canStart && !duties.some(d => d.user_id === user.id && !d.ended_at)) {
                          return (
                            <div style={{padding: '0 20px 20px', display: 'flex', justifyContent: 'flex-end'}}>
                              <div className='button-d-bl' onClick={() => {setPendingHandoff(null); setSelectedShift(""); setShowSelectShift(true)}}>{translation('start_duty')}</div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <div className='reports'>
                      <div>{translation('reports_of_department')} "{b.department_name}": <span>{b.reports.filter((r: Report) => r.checked === true).length} of {b.reports.length} {translation('reviewed')} ({translation('yours')} {b.reports.filter((r: Report) => r.holder_id === user.id && r.checked).length} / {b.reports.filter((r: Report) => r.holder_id === user.id).length})</span></div>
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
                                {r.shift_name && <div style={{fontSize: 10}}>{r.shift_name}</div>}
                                {r.check_before && (<div style={{ fontSize: 10, fontWeight: 600, lineHeight: 1.2 }}>{translation('check_before')}: {r.check_before}</div>)}
                              </div>
                              <div>{r.source}</div>
                              <div>{translation('assignee')}: <div className=''>{leads.find((lead: User) => lead.id === r.holder_id)?.name ?? '-'}</div></div>
                              <div style={{color: '#000000', fontSize: 14, fontFamily: 'inherit'}}>{r.metric ?? 'No Metric'}</div>
                              <div className={noAccessEdit(b) ? 'd' : ''} onClick={() => {if (!noAccessEdit(b)) addReportFinding(r, b)}}></div>
                              <span className={r.timestamp ? translation('done') : translation('pending')}>{r.timestamp ? briefTime.format(new Date(r.timestamp)) : b.freezed === true ? 'Not Done' : 'Pending'}</span>
                              <div className={r.checked || noAccessEdit(b) || (!manager && user.department_id !== b.department_id) ? 'button-d-bl-sm d' : 'button-d-bl-sm'} onClick={() => {if (!r.checked && !noAccessEdit(b) && (manager || user.department_id === b.department_id)) updateReports(b, {...r, holder_id: user.id}, r.checked)}}>{translation('take')}</div>

                            </div>)
                        )}
                        {reports_sorted.filter((r: Report) => r.holder_id === user.id).map(
                          (r: Report, i: number) => (
                            <div className={(i === 0 ? 'report border-top reports-you-took' : 'report') + (isBeforeTime(r.check_before)  ? '' : ' red-background')} key={r.id}>
                              <input className={noAccessReport(b, r) || (!r.checked && !isBeforeTime(r.check_before)) ? 'd' : ''} disabled={noAccessReport(b, r) || (!r.checked && !isBeforeTime(r.check_before))} type='checkbox' checked={r.checked} onChange={() => {
                                const metric_lowercase = r.metric?.toLowerCase();
                                if ((metric_lowercase === 'metric' || 
                                     metric_lowercase === 'count' ||
                                     metric_lowercase === 'free-text' ||
                                     metric_lowercase === 'yes/no' ||
                                     metric_lowercase === 'image'
                                ) && !r.checked && !r.text){
                                  toast.error(translation('input_report_value_first'));
                                  return;
                                }
                                updateReports(b, r, !r.checked);
                              }} />
                              <div>{r.name}</div>
                              <div>
                                <div>{capitalize(r.day_time)}</div>
                                {r.shift_name && <div style={{fontSize: 10}}>{r.shift_name}</div>}
                                {r.check_before && (<div style={{ fontSize: 10, fontWeight: 600, lineHeight: 1.2 }}>{translation('check_before')}: {r.check_before}</div>)}
                              </div>
                              <div>{r.source}</div>
                              <div>{translation('assignee')}: <div className='green' style={{display: 'flex', gap: '5px'}}><UserCircle user_name={leads.find((lead: User) => lead.id === r.holder_id)?.name || 'A'} size={15}></UserCircle><span>{leads.find((lead: User) => lead.id === r.holder_id)?.name} (You)</span></div></div>
                              <div style={{ display: 'flex', flexDirection: 'column', color: '#000000', fontSize: 14, fontFamily: 'inherit' }}>
                                <div className="flex" style={{ gap: 5, marginBottom: 5 }}>
                                  {r.metric ? (<div style={{ margin: 'auto 0' }}>{r.metric}</div>) : 'No Metric'}
                                  {(r.metric === 'Image') && r.checked !== true && (
                                    <ImageUploader disabled={(r.checked ?? false) || noAccessReport(b, r) || !isBeforeTime(r.check_before)} send_url_to={(url) => {
                                      if (!r.checked && !noAccessReport(b, r) && isBeforeTime(r.check_before)) {
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
                                        className={r.checked || noAccessReport(b, r) || !isBeforeTime(r.check_before) ? 'input d' : 'input'}
                                        value={r.text ?? ''}
                                        disabled={(r.checked ?? false) || noAccessReport(b, r) || !isBeforeTime(r.check_before)}
                                        type="number"

                                        onChange={(e) => {
                                            if (!r.checked && !noAccessReport(b, r) && isBeforeTime(r.check_before)) {
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
                                            if (r.checked || noAccessReport(b, r) || !isBeforeTime(r.check_before)) return;

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
                                        className={r.checked || noAccessReport(b, r) || !isBeforeTime(r.check_before) ? 'input d' : 'input'}
                                        style={{ transition: 'none' }}
                                        defaultValue={r.text ?? ''}
                                        disabled={!!r.checked || noAccessReport(b, r) || !isBeforeTime(r.check_before)}
                                        onBlur={(e) => {
                                          if (r.checked || noAccessReport(b, r) || !isBeforeTime(r.check_before)) return;
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
                                        ></textarea>
                                )}
                                {(r.metric === 'Yes/No') && (
                                  <div className='flex' style={{ gap: 5, padding: '0 0 0 2px' }}>
                                    <input
                                          className={r.checked || noAccessReport(b, r) || !isBeforeTime(r.check_before)  ? 'input d' : 'input'}
                                          checked={r.text === "Yes"}
                                          disabled={!!r.checked || noAccessReport(b, r) || !isBeforeTime(r.check_before)}
                                          type="checkbox"
  
                                          onChange={(e) => {
                                              if (!r.checked && !noAccessReport(b, r) && isBeforeTime(r.check_before)) {
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
                                          className={r.checked || noAccessReport(b, r) || !isBeforeTime(r.check_before) ? 'input d' : 'input'}
                                          checked={r.text === "No"}
                                          disabled={!!r.checked || noAccessReport(b, r) || !isBeforeTime(r.check_before)}
                                          type="checkbox"
  
                                          onChange={(e) => {
                                              if (!r.checked && !noAccessReport(b, r) && isBeforeTime(r.check_before)) {
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
                                    {r.checked !== true && !noAccessReport(b, r) && isBeforeTime(r.check_before) && (
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
                              <div className={noAccessEdit(b) ? 'd' : ''} onClick={() => {if (!noAccessEdit(b)) addReportFinding(r, b)}}></div>

                              <span className={r.timestamp ? translation('done') : translation('pending')}>{r.timestamp ? briefTime.format(new Date(r.timestamp)) : b.freezed === true ? 'Not Done' : 'Pending'}</span>
                              <div className={r.checked || noAccessReport(b, r) ? 'button-d-bl-sm d' : 'button-d-bl-sm'}
                                onClick={() => {if (!r.checked && !noAccessReport(b, r) ) updateReports(b, {...r, holder_id: null}, r.checked)}}
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
                                {r.shift_name && <div style={{fontSize: 10}}>{r.shift_name}</div>}
                                {r.check_before && (<div style={{ fontSize: 10, fontWeight: 600, lineHeight: 1.2 }}>{translation('check_before')}: {r.check_before}</div>)}
                              </div>
                              <div>{r.source}</div>
                              <div>{translation('assignee')}: <div className='' style={{display: 'flex', gap: '5px'}}><UserCircle user_name={leads.find((lead: User) => lead.id === r.holder_id)?.name || 'A'} size={15}></UserCircle><span>{leads.find((lead: User) => lead.id === r.holder_id)?.name}</span></div></div>
                              <div style={{ display: 'flex', flexDirection: 'column', color: '#000000', fontSize: 14, fontFamily: 'inherit' }}><div>{r.metric ?? 'No Metric'}</div>{r.checked && r.metric === 'Image' && r.text && isBlobLink(r.text) === true && 
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
                              <div className={noAccessEdit(b) ? 'd' : ''} onClick={() => {if (!noAccessEdit(b)) addReportFinding(r, b)}}></div>
                              <span className={r.timestamp ? translation('done') : translation('pending')}>{r.timestamp ? briefTime.format(new Date(r.timestamp)) : b.freezed === true ? 'Not Done' : 'Pending'}</span>
                              {
                                manager && !readOnly(b) && !r.checked ? (
                                  <div className={readOnly(b) ? 'button-d-bl-sm d' : 'button-d-bl-sm'}
                                    onClick={() => {if (!readOnly(b)) {setReportToCallout({...r}); setShowCallout(true); }}}
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
                          <div className={(!manager && noAccessEdit(b)) || readOnly(b) ? 'd' : ''} onClick={() => {if ((manager || !noAccessEdit(b)) && !readOnly(b)) setShowAddFinding(true)}}>+ {translation('add_finding')}</div>
                        </div>
                        <div>{b.findings && b.findings?.length > 0 ? b.findings.map(f => {
                          const authorName = (f.user_id && leads.find((u: User) => u.id === f.user_id)?.name)
                            || (!b.is_department_journal ? (leads.find((u: User) => u.id === b.lead_id)?.name || b.lead_name) : '');
                          const assigneeName = f.assigned_to_user_id ? leads.find((u: User) => u.id === f.assigned_to_user_id)?.name : '';
                          const userLabel = authorName && assigneeName && assigneeName !== authorName
                            ? `${authorName} → ${assigneeName}`
                            : (authorName || assigneeName || '');
                          return (
                            <div key={`finding_div_${f.id}`} id={`finding_div_${f.id}`} className={`finding ${f.type}-container`}>
                              <div>
                                <div className={f.type}>{f.type}</div>
                                <div>{f.description}</div>
                              </div>
                              <div>{[userLabel, f.created_at && briefTime.format(new Date(f.created_at))].filter(Boolean).join(', ')}</div>
                            </div>
                          );
                        }) : (<h3>{!showAddFinding ? translation('no_findings_yet') : ''}</h3>)}
                          {showAddFinding && <div className='add-finding' id='add-finding'>
                            <div>
                              <span>{translation('choose_status')}</span>
                              <select disabled={(!manager && noAccessEdit(b)) || readOnly(b)} id={`new_f_type_${b.id}`}>
                                <option value='high'>{translation('high')}</option>
                                <option value='moderate'>{translation('moderate')}</option>
                                <option value='info'>{translation('info')}</option>
                              </select>
                            </div>
<div>
  <span>{translation('write_description')}</span>
  <div className="finding-description-wrapper">
    <textarea
      ref={findingTextareaRef}
      disabled={(!manager && noAccessEdit(b)) || readOnly(b)}
      id={`new_f_name_${b.id}`}
      placeholder={translation('anything_the_next_lead_needs_to_know')}
      value={findingText}
      onChange={e => {
        const newText = e.target.value;

        setFindingText(newText);
        setFindingCursor(e.target.selectionStart);

        setMentionedUsers(
          leads
            .filter(u => !u.archived && newText.includes(`@${u.name}`))
            .map(u => u.id)
        );
      }}
      onClick={e => setFindingCursor(e.currentTarget.selectionStart)}
      onKeyUp={e => setFindingCursor(e.currentTarget.selectionStart)}
      onSelect={e => setFindingCursor(e.currentTarget.selectionStart)}
      onFocus={() => setFindingFocused(true)}
      onBlur={() => setFindingFocused(false)}
    />

    <MentionsHelper
      users={leads.filter(u => !u.archived)}
      isFocused={findingFocused}
      value={findingText}
      cursorPosition={findingCursor}
      onSelect={(selectedUser, start, end) => {
        const mention = `@${selectedUser.name} `;

        const newText =
          findingText.slice(0, start) +
          mention +
          findingText.slice(end);

        const newCursor = start + mention.length;

        setFindingText(newText);
        setFindingCursor(newCursor);

        setMentionedUsers(prev =>
          prev.includes(selectedUser.id)
            ? prev
            : [...prev, selectedUser.id]
        );

        requestAnimationFrame(() => {
          findingTextareaRef.current?.focus();
          findingTextareaRef.current?.setSelectionRange(
            newCursor,
            newCursor
          );
        });
      }}
    />
  </div>
</div>                            {sendFindingToTracker && (
                              <>
                                <div>
                                  <span>{translation('category')}</span>
                                  <select disabled={(!manager && noAccessEdit(b)) || readOnly(b)} id={`new_f_category_${b.id}`} defaultValue={actionLogCategories[0]?.name ?? ''}>
                                    {actionLogCategories.map((c: IdName) => (
                                      <option key={c.id} value={c.name}>{c.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <span>{translation('assignee')}</span>
                                  <select disabled={(!manager && noAccessEdit(b)) || readOnly(b)} id={`new_f_assignee_${b.id}`} defaultValue={user.id}>
                                    <option value="">{translation('dont_assign')}</option>
                                    <optgroup label={translation('department_employees')}>
                                      {leads.filter(u => !u.archived && u.department_id === b.department_id).map(u => (
                                        <option key={u.id} value={u.id}>{u.name}</option>
                                      ))}
                                    </optgroup>
                                    <optgroup label={translation('other_employees')}>
                                      {leads.filter(u => !u.archived && u.department_id !== b.department_id).map(u => (
                                        <option key={u.id} value={u.id}>{u.name} - {u.department}</option>
                                      ))}
                                    </optgroup>
                                  </select>
                                </div>
                              </>
                            )}
                            <div>
                              <label className='send-to-action-tracker'>
                                <span>{translation('send_to_action_tracker')}</span>
                                <input type="checkbox" id="send-to-action-tracker" checked={sendFindingToTracker} onChange={(e) => setSendFindingToTracker(e.target.checked)} />
                              </label>
                              <div className='cancel' onClick={() => {setShowAddFinding(false); setSendFindingToTracker(false); setFindingText(''); setFindingCursor(0); setMentionedUsers([]); setFindingFocused(false);}}>{translation('cancel')}</div>
                              <input className='button-d-bl-sm' disabled={(!manager && noAccessEdit(b)) || readOnly(b)} type="button" value={translation('add_finding')} onClick={() => { addFinding(b, {
                                    type: (document.getElementById(`new_f_type_${b.id}`) as HTMLSelectElement)?.value || '',
                                    description: findingText,
                                    send_to_action_tracker: sendFindingToTracker,
                                    category: sendFindingToTracker ? ((document.getElementById(`new_f_category_${b.id}`) as HTMLSelectElement)?.value || actionLogCategories[0]?.name || '') : undefined,
                                    assigned_to_user_id: sendFindingToTracker ? ((document.getElementById(`new_f_assignee_${b.id}`) as HTMLSelectElement)?.value || null) : undefined,
                                  });
                                }}/>
                            </div>
                          </div>}
                        </div>
                      </div>
                      <div className='tasks'>
                        <div>
                          <h1>{translation('tasks')}:</h1>
                          <div className={(!manager && noAccessEdit(b)) || readOnly(b) ? 'd' : ''} onClick={() => {if((manager || !noAccessEdit(b)) && !readOnly(b)) setShowAddTask(true)}}>+ {translation('add_task')}</div>
                        </div>
                        <div>
                          {b.tasks && b.tasks?.length > 0 ? b.tasks.map(t => (
                            <label key={`task_label_${t.id || safeUUID()}`} id={`task_label_${t.id || safeUUID()}`} className={(!manager && noAccessEdit(b)) || readOnly(b) ? 'task d' : 'task'}>
                              <input key={`${t.id}-task-input`} type='checkbox' checked={t.checked ?? false} disabled={(!manager && noAccessEdit(b)) || readOnly(b)} onChange={() => { if ((manager || !noAccessEdit(b)) && !readOnly(b)) changeTask(b, {
                                    ...t,
                                    checked: !(t.checked ?? false),
                                  });
                                }}/>
                              <div data-img={t.roll_to_next_brief === true ? "roll-next-brief" : "do-not-roll-next-brief"} className={(!manager && noAccessEdit(b)) || readOnly(b) ? 'd' : ''} onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if ((manager || !noAccessEdit(b)) && !readOnly(b)) changeTask(b, {
                                  ...t,
                                  roll_to_next_brief: !t.roll_to_next_brief
                                });
                              }}></div>
                              <div key={`${t.id}-task-text`}>{t.text}</div>
                              <div key={`${t.id}-task-type`}>{t.task_type}</div>
                            </label>)) : (<h3>{!showAddTask ? translation('no_tasks_yet') : ""}</h3>)
                          }
                        </div>
                        {showAddTask && (<div className='add-task'>
                            <div className='cancel' onClick={() => {setShowAddTask(false)}}></div>
                            <div>
                              <span>{translation('task_name')}</span>
                              <input disabled={(!manager && noAccessEdit(b)) || readOnly(b)} id={`new_t_name_${b.id}`} type='text' placeholder={translation('task_description')} />
                            </div>
                            <div>
                              <span>{translation('action')}</span>
                              <select disabled={(!manager && noAccessEdit(b)) || readOnly(b)} id={`new_t_type_${b.id}`}>
                                <option value='Report follow-up'>{translation('report_follow_up')}</option>
                                <option value='Site visit'>{translation('site_visit')}</option>
                                <option value='Shop / vehicle'>{translation('shop_vehicle')}</option>
                                <option value='Admin'>{translation('admin')}</option>
                                <option value='Other'>{translation('other')}</option>
                              </select>
                            </div>
                            <input disabled={(!manager && noAccessEdit(b)) || readOnly(b)} type="button" value="Add" className='button-d-bl-sm' onClick={() => {
                              const custom_id = safeUUID();
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
                    {(manager || (user.permissions.update_brief && user.permissions.handoff_brief)) && (() => {
                      const dutyUserIds = b.duties.filter(d => !d.ended_at).map(d => d.user_id);
                      const reportUserIds = b.reports.filter(r => r.holder_id && !r.checked).map(r => r.holder_id as string);
                      const userOnDuty = b.duties.some(d => d.user_id === user.id && !d.ended_at);
                      const candidateIds = Array.from(new Set([
                        ...(userOnDuty || reportUserIds.includes(user.id) ? [user.id] : []),
                        ...dutyUserIds,
                        ...reportUserIds
                      ]));
                      if (candidateIds.length === 0) candidateIds.push(user.id);

                      const currentFromId = handoffFrom[b.id] || (candidateIds.includes(user.id) ? user.id : candidateIds[0] || user.id);
                      const isSenderOnDuty = b.duties.some(d => d.user_id === currentFromId && !d.ended_at);
                      const isDirect = manager && (currentFromId !== user.id || !isSenderOnDuty);

                      return (
                        <div className="handoff">
                          <h1>{translation('handoff')}:</h1>
                          <div>
                            <div>
                              {manager && (
                                <div>
                                  <span>{translation('transfer_from')}</span>
                                  <select
                                    id={`handoff_from_${b.id}`}
                                    className={noAccessHandoff(b) ? 'd' : ''}
                                    disabled={noAccessHandoff(b)}
                                    value={currentFromId}
                                    onChange={(e) => setHandoffFrom(prev => ({...prev, [b.id]: e.target.value}))}
                                  >
                                    {candidateIds.map(uid => {
                                      const u = leads.find(l => l.id === uid) || (uid === user.id ? user : null);
                                      const name = u?.name || uid;
                                      const count = b.reports.filter(r => r.holder_id === uid && !r.checked).length;
                                      return (
                                        <option value={uid} key={uid}>
                                          {uid === user.id ? `${name} (${translation('myself')})` : `${name} (${count} reports)`}
                                        </option>
                                      );
                                    })}
                                  </select>
                                </div>
                              )}
                              {(() => {
                                const eligibleRecipients = leads.filter(u => !u.archived && u.id !== currentFromId && (u.id === company?.main_admin_id
                                  || u.permissions.reasign_reports || (u.permissions.update_brief
                                    && (u.permissions.handoff_brief || u.permissions.see_all_briefs))));
                                const defaultRecipient = eligibleRecipients.filter(u => u.department_id === b.department_id).sort((a, b) => a.name.localeCompare(b.name))[0]
                                  || eligibleRecipients.sort((a, b) => a.name.localeCompare(b.name))[0];
                                const currentToId = handoffTo[b.id] || defaultRecipient?.id || '';
                                const isRecipientOnDuty = b.duties.some(d => d.user_id === currentToId && !d.ended_at);
                                const isHandoffDisabled = noAccessHandoff(b) || (isDirect && !isRecipientOnDuty && !handoffShift[b.id]);

                                return (
                                  <>
                                    <div>
                                      <span>{translation('recipient')}</span>
                                      <select
                                        id={`handoff_to_${b.id}`}
                                        className={noAccessHandoff(b) ? 'd' : ''}
                                        disabled={noAccessHandoff(b)}
                                        value={currentToId}
                                        onChange={(e) => setHandoffTo(prev => ({...prev, [b.id]: e.target.value}))}
                                      >
                                        {[true, false].map(local => {
                                          const group = eligibleRecipients
                                            .filter(u => (u.department_id === b.department_id) === local)
                                            .sort((a, b) => a.name.localeCompare(b.name));
                                          if (!group.length) return null;
                                          return (
                                            <optgroup key={String(local)} label={translation(local ? 'department_employees' : 'other_employees')}>
                                              {group.map(u => <option value={u.id} key={u.id}>{u.name}</option>)}
                                            </optgroup>
                                          );
                                        })}
                                      </select>
                                    </div>
                                    {isDirect && (
                                      <div>
                                        <span>{translation('shift')}</span>
                                        <select
                                          id={`handoff_shift_${b.id}`}
                                          className={noAccessHandoff(b) ? 'd' : ''}
                                          disabled={noAccessHandoff(b)}
                                          value={handoffShift[b.id] ?? ''}
                                          onChange={(e) => setHandoffShift(prev => ({...prev, [b.id]: e.target.value}))}
                                        >
                                          <option value="">{translation(!isSenderOnDuty && !isRecipientOnDuty ? 'do_not_start_duty' : isRecipientOnDuty ? 'select_shift_optional' : 'select_shift')}</option>
                                          {shifts.filter(s => !s.archived).map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                          ))}
                                        </select>
                                      </div>
                                    )}
                                    <div>
                                      <span>{translation('reason')}</span>
                                      <input className={noAccessHandoff(b) ? 'd' : ''} id={`handoff_reason_${b.id}`} disabled={noAccessHandoff(b)} type='text' placeholder={translation('reason')}></input>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                            <div>
                              <span>{translation('notes')}</span>
                              <textarea className={noAccessHandoff(b) ? 'd' : ''} disabled={noAccessHandoff(b)} id={`handoff_notes_${b.id}`} placeholder={translation('anything_the_next_lead_needs_to_know')}></textarea>
                            </div>
                            {(() => {
                              const eligibleRecipients = leads.filter(u => !u.archived && u.id !== currentFromId && (u.id === company?.main_admin_id
                                || u.permissions.reasign_reports || (u.permissions.update_brief
                                  && (u.permissions.handoff_brief || u.permissions.see_all_briefs))));
                              const defaultRecipient = eligibleRecipients.filter(u => u.department_id === b.department_id).sort((a, b) => a.name.localeCompare(b.name))[0]
                                || eligibleRecipients.sort((a, b) => a.name.localeCompare(b.name))[0];
                              const currentToId = handoffTo[b.id] || defaultRecipient?.id || '';
                              const isRecipientOnDuty = b.duties.some(d => d.user_id === currentToId && !d.ended_at);
                              const reportsOnly = isDirect && !isSenderOnDuty && !isRecipientOnDuty && !handoffShift[b.id];
                              const isHandoffDisabled = noAccessHandoff(b) || (isDirect && !reportsOnly && !isRecipientOnDuty && !handoffShift[b.id]);

                              return (
                                <input
                                  className={isHandoffDisabled ? 'button-d-bl-sm tg d' : 'button-d-bl-sm tg'}
                                  type="button"
                                  disabled={isHandoffDisabled}
                                  value={translation(reportsOnly ? 'transfer_reports' : isDirect ? 'transfer_shift' : 'complete_handoff')}
                                  onClick={() => {
                                    if (isHandoffDisabled) return;
                                    const reasonInput = document.getElementById(`handoff_reason_${b.id}`) as HTMLInputElement;
                                    const notesInput = document.getElementById(`handoff_notes_${b.id}`) as HTMLTextAreaElement;
                                    const shiftVal = handoffShift[b.id];
                                    setHandoffConfirm({
                                      briefId: b.id,
                                      departmentId: b.department_id,
                                      fromUserId: currentFromId,
                                      newLeadId: currentToId,
                                      shiftId: shiftVal ? Number(shiftVal) : undefined,
                                      reason: reasonInput?.value || '',
                                      notes: notesInput?.value || '',
                                      isDirect,
                                      reportsOnly
                                    });
                                  }}
                                />
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })()}
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