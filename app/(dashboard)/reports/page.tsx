'use client';

import { Department, Report, ReportSchedule, SavedBrief, Shift, User } from "@/lib/types";
import scrollToElement from "@/lib/html_document";
import Loader from "@/app/src/components/Loader";
import { useEffect, useState } from "react";
import getReportsTypes, { getWeekDays } from "@/lib/config";
import { format } from "date-fns";
import { toast } from "sonner";
import './page.css'
import { useDate } from "@/app/src/components/DateContext";
import { useTranslations } from "next-intl";
import { safeUUID } from "@/lib/uuid";

// 12 AM, 1 AM, ... 11 PM (значения сохраняются в БД как раньше)
const CHECK_BEFORE_HOURS = Array.from({ length: 24 }, (_, h) => `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`);

const newSchedule = (): ReportSchedule => ({
  slot_key: safeUUID(), position: 1, once_per: 'day', weekday_mask: null, month_day: null,
  day_time: 'ongoing', shift_id: null, holder_id: null, check_before: null,
});

export default function Reports() {
  const t = useTranslations('Reports');
  const tr = (key: string) => t(key as any);

  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<Report[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [reportsObject, setReportsObject] = useState<Record<string, Report[]>>({});
  const [briefs, setBriefs] = useState([]);
  const [user, setUser] = useState<User | null>(null);
  const [leads, setLeads] = useState<User[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [departments, setDeparments] = useState<Department[]>([]);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showAssigned, setShowAssigned] = useState(false);
  const [showAssignedReport, setShowAssignedReport] = useState<Report | null>(null);
  const [showAddReport, setShowAddReport] = useState(false);
  const [reportDepartmentId, setReportDepartmentId] = useState<string>();
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);

  // Названия дней недели берём из lib/config, но переводим, если есть ключ в JSON
  const weekDays = getWeekDays().map((d: { full: string; small: string }) => ({
    full: t.has(`weekday_full_${d.full}` as any) ? tr(`weekday_full_${d.full}`) : d.full,
    small: t.has(`weekday_small_${d.small}` as any) ? tr(`weekday_small_${d.small}`) : d.small,
  }))
  const metricLabels: Record<string, string> = {
    "No Metric": t("metric_none"),
    "Count": t("metric_count"),
    "Metric": t("metric_metric"),
    "Yes/No": t("metric_yes_no"),
    "Free-text": t("metric_free_text"),
    "Image": t("metric_image"),
  }
  const [reload, setReload] = useState(0);
  const [deparmentsWithNoReports, setDeparmentsWithNoReports] = useState<Department[]>([]);
  
  const [scrollToIdAfterReload, setScrollToIdAfterReload] = useState<string | null>()
  
  const [reportToAddNameAndSource, setReportToAddNameAndSource] = useState({name: '', source: ''});
  const [reportToAdd, setReportToAdd] = useState<Report>({
      id: 0,
      name: '',
      text: '',
      checked: false,
      saved_brief_id: 0,
      source: getReportsTypes()[0],
      metric: 'No Metric',
      metric_range_from: 0,
      metric_range_to: 100,
      archived: false,
      once_per: 'day',
      timestamp: (new Date()).toString(),
      edit: true,
      start_at_day: '1',
      assigned_to: {
          all: {
          assigned: true,
          list: [],
        },
        person: {
          assigned: true,
          list: [],
        },
        department: {
          assigned: true,
          list: [],
        },
      },
      day_time: 'ongoing',
      schedules: [],
    })

  const changeReports = (new_report: Report) => {
    const id = new_report.id
    setReports(prev =>
      prev.map(report =>
        report.id === id
          ? new_report
          : report
      )
    );
  };

  const renderScheduleFields = (r: Report, part: 'period' | 'time' | 'holder' | 'day_time' | 'shift' | 'deadline', departmentId: string | undefined, editing: boolean, slotKey?: string) => {
    const schedules = r.schedules ?? [];
    const change = (next: ReportSchedule[]) => {
      const updated = {...r, schedules: next.map((s, i) => ({...s, position: i + 1}))};
      setReportToAdd(updated);
    };
    return <div className={(editing ? 'edit' : 'show') + ' schedule-stack'}>
      {schedules.filter(s => slotKey === undefined || s.slot_key === slotKey).map(s => {
        const update = (values: Partial<ReportSchedule>) => change(schedules.map(slot => slot.slot_key === s.slot_key ? {...slot, ...values} : slot));
        return <div className='schedule-entry' key={s.slot_key}>
          {part === 'period' && (editing ? <>
            <select className='input' value={s.once_per} onChange={e => update({once_per: e.target.value as ReportSchedule['once_per'], weekday_mask: e.target.value === 'week' ? 1 : null, month_day: e.target.value === 'month' ? 1 : null})}>
              <option value='day'>{t('period_day')}</option>
              <option value='week'>{t('period_week')}</option>
              <option value='month'>{t('period_month')}</option>
            </select>
            {s.once_per === 'week' && <div>{weekDays.map((day, i) => <label className='week_day_select' key={i}>
              <span>{day.small}</span>
              <input type='checkbox' checked={!!((s.weekday_mask ?? 0) & (1 << i))} onChange={e => update({weekday_mask: e.target.checked ? (s.weekday_mask ?? 0) | (1 << i) : (s.weekday_mask ?? 0) & ~(1 << i)})} />
            </label>)}</div>}
            {s.once_per === 'month' && <select className='input' value={s.month_day ?? 1} onChange={e => update({month_day: Number(e.target.value)})}>
              {Array.from({length: 31}, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
            </select>}
          </> : <>
            {s.once_per === 'day' ? t('schedule_day') : s.once_per === 'week'
              ? t('schedule_week', {holder: '', days: weekDays.filter((_, i) => (s.weekday_mask ?? 0) & (1 << i)).map(day => day.small).join(', ')})
              : t('schedule_month', {holder: '', day: s.month_day ?? ''})}
          </>)}
          {(part === 'time' || part === 'day_time') && (editing ?
            <select className='input' value={s.day_time} onChange={e => update({day_time: e.target.value})}>
              <option value='opening'>{t('day_time_opening')}</option>
              <option value='midday'>{t('day_time_midday')}</option>
              <option value='closing'>{t('day_time_closing')}</option>
              <option value='ongoing'>{t('day_time_ongoing')}</option>
            </select> : <div>{tr('day_time_' + s.day_time)}</div>)}
          {(part === 'time' || part === 'shift') && (editing ?
            <select className='input' value={s.shift_id ?? ''} onChange={e => update({shift_id: e.target.value ? Number(e.target.value) : null})}>
              <option value=''>{t('any_shift')}</option>
              {shifts.filter(shift => !shift.archived).map(shift => <option key={shift.id} value={shift.id}>{shift.name}</option>)}
            </select> : s.shift_id !== null && <div>{shifts.find(shift => Number(shift.id) === s.shift_id)?.name}</div>)}
          {(part === 'time' || part === 'deadline') && (editing ?
            <label className='schedule-deadline'>
              {slotKey === undefined && t('check_before')}
              <select className='input' value={s.check_before ?? ''} onChange={e => update({check_before: e.target.value || null})}>
                <option value=''>-</option>
                {CHECK_BEFORE_HOURS.map(hour => <option key={hour} value={hour}>{hour}</option>)}
              </select>
            </label> : s.check_before && <div>{t('before_time', {time: s.check_before})}</div>)}
          {part === 'holder' && (editing ? <select className='input' value={s.holder_id ?? ''} onChange={e => update({holder_id: e.target.value || null})}>
            <option value=''>{t('any_employee')}</option>
            {leads.filter(lead => lead.department_id === departmentId).map(lead => <option key={lead.id} value={lead.id}>{lead.name}</option>)}
          </select> : allUsers.find(lead => lead.id === s.holder_id)?.name)}
        </div>;
      })}
    </div>;
  };

  const deleteReport = async (reportToDelete: Report | null) => {
    if (reportToDelete === null) return;
    if (await saveReport(reportToDelete)) {
      changeReports(reportToDelete);
      setShowConfirmDelete(false);
      toast.success(t("toast_deleted"));
    }
  }

  const saveReport = async (r: Report) => {
    try {
      const res = await fetch("/api/report", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(r),
      });
      if (res.status === 200) {
        setReports(prev =>
          prev.map(report =>
            report.id === r.id
              ? { ...r, edit: false }
              : report
          )
        )
        if (r.archived !== true) toast.success(t("toast_updated"));
        return true;
      }
      else{
        const data = await res.json();
        const key = 'errors.' + data.error;
        toast.error(t.has(key) ? tr(key) : t("toast_save_error"));
      }
    } catch {
      toast.error(t("toast_save_error"));
    }
    return false;
  }

  const addReport = async (new_report: Report) => {
    const res = await fetch("/api/report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({...new_report, archived: false}),
    })
    if (res.status === 200) {
      toast.success(t("toast_added"));
      const json = await res.json();
      const id = json.id;
      setScrollToIdAfterReload(`report_${id}`);
      setReload(prev => prev + 1);
      setShowAddReport(false);
    }
    else {
      const data = await res.json();
      const key = 'errors.' + data.error;
      toast.error(t.has(key) ? tr(key) : t("toast_add_error"));
    }
  }
  useEffect(() => {
    async function load() {
      setLoading(true)
      const me_res = await fetch("/api/me");
      const me_user = await me_res.json();
      setUser(me_user)


      let departments_res = await fetch("/api/departments");
      if (!departments_res.ok){
          console.error("Failed to load departments");
          setLoading(false)
          return;
      }
      let departments_data = await departments_res.json();
      departments_data = departments_data
      .filter((department: Department) => department.is_main)
      .sort((a: Department, b: Department) => {
        if (a.name === me_user?.department) return -1;
        if (b.name === me_user?.department) return 1;

        return a.name.localeCompare(b.name);
      });

      setDeparments(departments_data)


      const reports_res = await fetch(`/api/reports`);

      if (!reports_res.ok) {
        console.error("Failed to load brief history");
        setLoading(false)
        return;
      }
      let reports_data = await reports_res.json();
      setReports(reports_data)

      reports_data.forEach((report: Report) => {
        if (report.assigned_to.department.assigned === true || report.assigned_to.all.assigned === true) {
          departments_data.forEach((department: Department) => {
            if (report.assigned_to.department.list.indexOf(department.id) !== -1 || report.assigned_to.all.assigned === true){
              if (Object.keys(reportsObject).indexOf(department.name) === -1){
                reportsObject[department.name] = [ report ];
              }
              else{
                reportsObject[department.name].push(report);
              }
            }
          })
        }
      })
      reportsObject['Shared Reports'] = [ ...reports_data ]
      const dateString = format(new Date(), "yyyy-MM-dd");

      const res = await fetch(`/api/brief_history?date_from=${dateString}&date_to=${dateString}`);

      if (!res.ok) {
        console.error("Failed to load brief history");
        setLoading(false);
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
      setAllUsers(leads_data);
      const shifts_res = await fetch('/api/shifts');
      if (shifts_res.ok) setShifts(await shifts_res.json());
      leads_data = leads_data.filter((a: User) => 
        // a.user_role !== 'manager' && 
        a.archived !== true);
      setLeads(leads_data);

      const departments_with_no_reports = departments_data.filter((department: Department) => {
        return reports_data.filter((report: Report) => {
          return report.archived === false && (report.assigned_to.all.assigned === true || (report.assigned_to.department.assigned === true && report.assigned_to.department.list.indexOf(department.id) !== -1)) 
        }).length === 0
      })

      setDeparmentsWithNoReports(departments_with_no_reports)
      setLoading(false);
      if (scrollToIdAfterReload) {
        setTimeout(() => {
          scrollToElement(scrollToIdAfterReload);
          setScrollToIdAfterReload(null);
        }, 1000)
      }
    }
    load();
  }, [reload]);

  const assignReport = (report: Report | null) => {
    if (!report) return;
    if (report.id === reportToAdd.id){
      setReportToAdd(report);
    }
    else{
      setReports(prev =>
        prev.map(r =>
          r.id === report.id
            ? report
            : r
        )
      );
      saveReport(report)
    }
    setShowAssigned(false);
  }
  
  const shouldShowReportToday = (report: Report) => {
    const date = new Date()
    switch (report.once_per) {
      case "day":
        return true;

      case "week":
        return date.getDay() + 1 === Number(report.start_at_day);

      case "month":
        return date.getDate() === Number(report.start_at_day);

      default:
        return false;
    }
  };

  const active_reports_count = reports.filter(shouldShowReportToday).filter((r: Report) => r.archived !== true).length
  const reports_map = new Map<string, number>();

  briefs.forEach((brief: SavedBrief) => {
    brief.reports?.forEach(report => {
      if (report.checked) {
        reports_map.set(report.name, (reports_map.get(report.name) ?? 0) + 1);
      }
    });
  });

  const done_by_all = [...reports_map.values()].filter(
    count => count === briefs.length
  ).length;

  const done_by_all_percent =
    active_reports_count === 0
      ? 100
      : Math.round((done_by_all / active_reports_count) * 100);
  const activeReports = reports
  .filter(shouldShowReportToday)
  .filter((report) => report.archived !== true);

const getAssignedLeadIds = (report: Report): string[] => {
  const assigned = report.assigned_to;

  if (!assigned) {
    return [];
  }

  // Report assigned to ALL leads
  if (assigned.all?.assigned === true) { return leads.map((lead) => String(lead.id)); }

  const assignedLeadIds = new Set<string>();

  // Directly assigned leads
  if (assigned.person?.assigned) { assigned.person.list.forEach((leadId) => {
                                    assignedLeadIds.add(String(leadId)); });
  }

  // Assigned departments
  if (assigned.department?.assigned) {
    leads.forEach((lead) => {
      if (assigned.department.list.includes(String(lead.department))) {
        assignedLeadIds.add(String(lead.id));
      }
    });
  }

  return Array.from(assignedLeadIds);
};

const getAssignedDepartmentIds = (report: Report): string[] => {
  const assigned = report.assigned_to;

  if (!assigned) {
    return [];
  }

  // Report assigned to all departments
  if (assigned.all?.assigned === true) {
    return departments.map((department) => String(department.id));
  }

  // Report assigned to specific departments
  if (assigned.department?.assigned === true) {
    return assigned.department.list.map(String);
  }

  return [];
};

const total_reports = activeReports.reduce((total, report) => {
  const assignedDepartmentIds = getAssignedDepartmentIds(report);

  return total + assignedDepartmentIds.length;
}, 0);
  const isAllAssigned = (report: Report | null) => {
  if (!report) return false;

  const personList = report.assigned_to.person.list.map(String);
  const departmentList = report.assigned_to.department.list.map(String);

  const allLeadsSelected =
    leads.length > 0 &&
    leads.every((lead) =>
      personList.includes(String(lead.id))
    );

  const allDepartmentsSelected =
    departments.length > 0 &&
    departments.every((department) =>
      departmentList.includes(String(department.id))
    );

  try{
    if (showAssignedReport?.assigned_to.all.assigned === true) return true;
  }
  catch{}

  return allLeadsSelected && allDepartmentsSelected;
};
const [reportSearch, setReportSearch] = useState('');

    const toggleAll = (checked: boolean) => {
      setShowAssignedReport((prev: Report | null) => {
        if (!prev) return null;
        return {
          ...prev,
          assigned_to: {
            all: {
              assigned: checked,
              list: [],
            },
            person: {
              assigned: checked,
              list: checked ? leads.map((lead: User) => String(lead.id)) : [],
            },
            department: {
              assigned: checked,
              list: checked ? departments.map((department: Department) => String(department.id)) : [],
            },
          },
        };
      });
    };
const toggleLead = (
  leadId: string,
  checked: boolean
) => {
  setShowAssignedReport((prev) => {
    if (!prev) return null;

    const currentList = prev.assigned_to.person.list;

    const newList = checked
      ? [...currentList, leadId]
      : currentList.filter((id) => id !== leadId);

    return {
      ...prev,
      assigned_to: {
        ...prev.assigned_to,

        all: {
          ...prev.assigned_to.all,
          assigned: false,
        },

        person: {
          ...prev.assigned_to.person,
          assigned: newList.length > 0,
          list: newList,
        },
      },
    };
  });
};
const reportMatchesSearch = (report: Report) => {
  return report.name
    .toLowerCase()
    .includes(reportSearch.toLowerCase()) ||
    report.source
    .toLowerCase()
    .includes(reportSearch.toLowerCase());
};

const toggleDepartment = (
  departmentId: string,
  checked: boolean
) => {
  setShowAssignedReport((prev) => {
    if (!prev) return null;

    const currentList = prev.assigned_to.department.list;

    const newList = checked
      ? [...currentList, departmentId]
      : currentList.filter((id) => id !== departmentId);

    return {
      ...prev,

      assigned_to: {
        ...prev.assigned_to,

        // ВАЖНО:
        // ручное изменение department выключает All
        all: {
          ...prev.assigned_to.all,
          assigned: false,
        },

        department: {
          ...prev.assigned_to.department,
          assigned: newList.length > 0,
          list: newList,
        },
      },
    };
  });
};
return (
    <div className="reports">
      {showConfirmDelete && (
        <div className='confirm'>
          <div>
            <h1>{t("confirm_delete_title")}</h1>
            <p>{t.rich("delete_warning", { strong: (chunks) => <strong>{chunks}</strong> })}</p>
            <p>{t("delete_hidden")}</p>
            <div>
              <div className='button-w-bl' onClick={() => {setShowConfirmDelete(false)}}>{t("cancel")}</div>
              <div className='button-d-bl' onClick={() => {deleteReport(reportToDelete)}}>{t("delete_report")}</div>
            </div>
          </div>
        </div>
      )}
      {showAddReport && (
        <div className='confirm add-report'>
          <div>
            <h1>{t(reportToAdd.id === 0 ? 'add_title' : 'edit_title')}</h1>
            <div>
              <div>
                <div>{t("field_name")}</div>
                <div>
                  <input type="text" id="new_report_name" placeholder={t("placeholder_report_name")} value={reportToAdd.name} onChange={e => setReportToAdd({...reportToAdd, name: e.target.value})}/>
                </div>
              </div>
              <div>
                <div>{t("field_source")}</div>
                <div>
                  <select id="new_report_source" className="input" value={reportToAdd.source} onChange={e => setReportToAdd({...reportToAdd, source: e.target.value})}>
                      {getReportsTypes().map((report_type: string) => (
                        <option key={`report_type_option_${report_type}`} value={report_type}>{report_type}</option>
                      ))}
                    </select>
                </div>
              </div>
              <div>
                <div>{t('field_metric')}</div>
                <div className='report-metric-fields'>
                  <select className='input' value={reportToAdd.metric ?? 'No Metric'} onChange={e => {
                    setReportToAdd({...reportToAdd, metric: e.target.value});
                    e.currentTarget.blur();
                  }}>
                    <option value="No Metric">{t("metric_none")}</option>
                    <option value="Count">{t("metric_count")}</option>
                    <option value="Metric">{t("metric_metric")}</option>
                    <option value="Yes/No">{t("metric_yes_no")}</option>
                    <option value="Free-text">{t("metric_free_text")}</option>
                    <option value="Image">{t("metric_image")}</option>
                  </select>
                  {reportToAdd.metric === 'Metric' && <div className='metric_range'>
                    <label>
                      <span>{t("from")}</span>
                      <input className='input' type='number' value={reportToAdd.metric_range_from ?? 0} onChange={e => setReportToAdd({...reportToAdd, metric_range_from: Number(e.target.value)})}/>
                    </label>
                    <label>
                      <span>{t("to")}</span>
                      <input className='input' type='number' value={reportToAdd.metric_range_to ?? 100} onChange={e => setReportToAdd({...reportToAdd, metric_range_to: Number(e.target.value)})}/>
                    </label>
                  </div>}
                </div>
              </div>
              <section className='schedule-add'>
                {reportToAdd.schedules?.map((slot) => <section className='schedule-slot' key={slot.slot_key}>
                  <div className='schedule-slot-fields'>
                    <div>
                      <span>{t('field_period')}</span>
                      {renderScheduleFields(reportToAdd, 'period', reportDepartmentId, true, slot.slot_key)}
                    </div>
                    <div>
                      <span>{t('field_day_time')}</span>
                      {renderScheduleFields(reportToAdd, 'day_time', reportDepartmentId, true, slot.slot_key)}
                    </div>
                    <div>
                      <span>{t('field_shift')}</span>
                      {renderScheduleFields(reportToAdd, 'shift', reportDepartmentId, true, slot.slot_key)}
                    </div>
                    <div>
                      <span>{t('field_employee')}</span>
                      {renderScheduleFields(reportToAdd, 'holder', reportDepartmentId, true, slot.slot_key)}
                    </div>
                    <div>
                      <span>{t('check_before')}</span>
                      {renderScheduleFields(reportToAdd, 'deadline', reportDepartmentId, true, slot.slot_key)}
                    </div>
                    <div className='schedule-slot-action'>
                      {(reportToAdd.schedules?.length ?? 0) > 1 && (
                        <button type='button' className='button-w-bl schedule-slot-remove' onClick={() => setReportToAdd({...reportToAdd, schedules: reportToAdd.schedules?.filter(s => s.slot_key !== slot.slot_key).map((s, index) => ({...s, position: index + 1}))})}>{t('remove_slot')}</button>
                      )}
                    </div>
                  </div>
                </section>)}
                <button type='button' className='button-w-bl' onClick={() => setReportToAdd({...reportToAdd, schedules: [...(reportToAdd.schedules ?? []), {...newSchedule(), position: (reportToAdd.schedules?.length ?? 0) + 1}]})}>{t('add_slot')}</button>
              </section>
            </div>
            <div>
              <div className='button-w-bl' onClick={() => {setShowAddReport(false)}}>{t("cancel")}</div>
              <div className='button-d-bl' onClick={async () => {
                if (reportToAdd.id === 0) await addReport(reportToAdd);
                else if (await saveReport(reportToAdd)) setShowAddReport(false);
              }}>{t(reportToAdd.id === 0 ? 'add_report' : 'save')}</div>
            </div>
          </div>
        </div>
      )}
      {showAssigned && (
        <div className='confirm assign'>
          <div>
            <h1>{t("assign_title", { name: showAssignedReport?.name ?? '' })}</h1>
            <div className="select all">
              <div>
                <label>
                    <input checked={isAllAssigned(showAssignedReport)} onChange={(e) => { toggleAll(e.currentTarget.checked);}} type="checkbox" />
                    <div>{t("all_leads")}</div>
                  </label>
              </div>
            </div>
            <div className="select">
              <div className="select-leads">
                <h6>{t("leads")}</h6>
                {leads.map((lead: User) => 
                  <label key={`select_lead_${lead.id}`}>
                   <input
                      type="checkbox"
                      checked={
                        showAssignedReport?.assigned_to?.all?.assigned ||
                        showAssignedReport?.assigned_to?.person.list.includes(
                          String(lead.id)
                        ) ||
                        false
                      }
                      onChange={(e) =>
                        toggleLead(
                          String(lead.id),
                          e.currentTarget.checked
                        )
                      }
                    />
                    <div>{lead.name}</div>
                  </label>
                )}
              </div>
              <div className="select-deparments">
                <h6>{t("departments")}</h6>
                {departments.map((department: Department) => 
                  <label key={`select_department_${department.id}`}>
                    <input
                      type="checkbox"
                      checked={
                        showAssignedReport?.assigned_to?.all?.assigned ||
                        showAssignedReport?.assigned_to?.department.list.includes(String(department.id)) ||
                        false
                      }
                      onChange={(e) =>
                        toggleDepartment(
                          String(department.id),
                          e.currentTarget.checked
                        )
                      }
                    />
                    <div>{department.name}</div>
                  </label>
                )}
              </div>
            </div>
            <div>
              <div className='button-w-bl' onClick={() => {setShowAssigned(false)}}>{t("cancel")}</div>
              <div className='button-d-bl' onClick={() => {assignReport(showAssignedReport)}}>{t("assign_report")}</div>
            </div>
          </div>
        </div>
      )}
      


      {loading ? (<Loader></Loader>) :
        (<div>

          <h2 style={{position: 'relative', paddingBottom: '20px'}}>{t("departments_heading")}
            <label className="how-to-use">
              <input type="checkbox" />
              <strong>{t("about_reports")}</strong>
              <div>
                <div>{t("about_1")}</div>
                <div>{t("about_2")}</div>
                <div>{t("about_3")}</div>
                <div>{t("about_4")}</div>
                <div>{t("about_5")}</div>
              </div>
              <div className="x">x</div>
          </label>

          </h2>
          <div style={{ marginBottom: '20px' }}>
          <input
            className="search"
            type="text"
            placeholder={t("search_placeholder")}
            value={reportSearch}
            onChange={(e) => setReportSearch(e.target.value)}
          />
        </div>
          {departments.map((dep: Department) => {
            return (
              <div key={`reports_department_${dep.id}`}>
                <div className="flex">
                  <h3>{dep.name} {user?.department === dep.name && (t("your_department"))}</h3>
                  {reports.filter((r: Report) => !r.archived && (r.assigned_to.department.assigned === true && r.assigned_to.department.list.indexOf(dep.id) !== -1 || r.assigned_to.all.assigned === true)).filter((report: Report) => {
                        return report.name
                          .toLowerCase()
                          .includes(reportSearch.toLowerCase()) || report.source
                          .toLowerCase()
                          .includes(reportSearch.toLowerCase());
                      }).length === 0 ? (
                    <div className="flex j-s-b">
                      <span>{t("no_reports")}</span>
                      <div className="button-d-bl add-report" onClick={() => {
                        if (!user?.permissions.edit_reports){
                          toast.error(t("no_permission"))
                          return;
                        }
                        setReportToAdd({...reportToAdd, id: 0, name: '', source: getReportsTypes()[0], metric: 'No Metric', metric_range_from: 0, metric_range_to: 100, department_id: undefined, schedules: [newSchedule()], assigned_to: {all: {assigned: false, list: [],}, person: {assigned: false, list: [], }, department: { assigned: true, list: [dep.id], }, } })
                        setReportDepartmentId(dep.id);
                        setShowAssignedReport({...reportToAdd, assigned_to: {all: {assigned: false, list: [],}, person: {assigned: false, list: [], }, department: { assigned: true, list: [dep.id], }, } });
                        setShowAddReport(true);
                      }}>{t("add_report")}</div>
                      </div>
                  ) : (
                    <div className="button-d-bl add-report" onClick={() => {
                      if (!user?.permissions.edit_reports){
                        toast.error(t("no_permission"))
                        return;
                      }
                      setReportToAdd({...reportToAdd, id: 0, name: '', source: getReportsTypes()[0], metric: 'No Metric', metric_range_from: 0, metric_range_to: 100, department_id: undefined, schedules: [newSchedule()], assigned_to: {all: {assigned: false, list: [],}, person: {assigned: false, list: [], }, department: { assigned: true, list: [dep.id], }, } })
                      setReportDepartmentId(dep.id);
                      setShowAssignedReport({...reportToAdd, assigned_to: {all: {assigned: false, list: [],}, person: {assigned: false, list: [], }, department: { assigned: true, list: [dep.id], }, } });
                      setShowAddReport(true);
                    }}>{t("add_report")}</div>
                  )}
                </div>
                {reports.filter((r: Report) => !r.archived && (r.assigned_to.department.assigned === true && r.assigned_to.department.list.indexOf(dep.id) !== -1 || r.assigned_to.all.assigned === true)).length > 0 && (<div className="table-wrapper">
                  <div className="table-reports">
                    <div>
                      <div>{t("col_edit")}</div>
                      <div>{t("col_report")}</div>
                      <div>{t("col_source")}</div>
                      <div>{t("col_metric")}</div>
                      <div>{t("col_period")}</div>
                      <div style={{textAlign: 'left'}}>{t("col_day_time")}</div>
                      <div>{t("col_default_holder")}</div>
                      <div>{t("col_delete")}</div>
                    </div>
                    {reports.map((r: Report) => {
                      if (
                        !r.archived &&
                        reportMatchesSearch(r) &&
                        (
                          (r.assigned_to.department.assigned === true &&
                            r.assigned_to.department.list.indexOf(dep.id) !== -1) ||
                          r.assigned_to.all.assigned === true
                        )
                      ) {
                        return (
                          <div className="report" key={`report_${r.id}`} id={`report_${r.id}`} style={{gridTemplateRows: `repeat(${r.schedules?.length ?? 1}, auto)`}} >
                            <div>
                              <span className='button-w-bl' style={{margin: 'auto 0'}} onClick={() => {
                                if (!user?.permissions.edit_reports){
                                  toast.error(t("no_permission"))
                                  return;
                                }
                                setReportToAdd({...r});
                                setReportDepartmentId(dep.id);
                                setShowAddReport(true);
                              }}>{t("edit")}</span>
                            </div>
                            <div>
                              <div className="show">{r.name}</div>
                            </div>
                            <div>
                              <div className="show">{r.source}</div>
                            </div>
                            <div>
                              <div className="show">
                                {r.metric ? (metricLabels[r.metric] ?? r.metric) : ''}
                                {r.metric === 'Metric' && ` ${t("metric_range", { from: r.metric_range_from ?? '', to: r.metric_range_to ?? '' })}`}
                              </div>
                            </div>
                            <div className="schedule-column">
                              {renderScheduleFields(r, 'period', dep.id, false)}
                            </div>
                            <div className="schedule-column">
                              {renderScheduleFields(r, 'time', dep.id, false)}
                            </div>
                            <div className="schedule-column">
                              {renderScheduleFields(r, 'holder', dep.id, false)}
                            </div>
                            <div>
                              <div style={{margin: 'auto auto auto 0', height: 'min-content'}} className="button-r-sm" onClick={() => {
                                if (!user?.permissions.edit_reports){
                                  toast.error(t("no_permission"))
                                  return;
                                }
                                setReportToDelete({...r, archived: true});
                                setShowConfirmDelete(true)
                              }}>{t("delete")}</div>
                            </div>
                          </div>)
                      }
                    })}
                  </div>
                </div>)}
                
              </div>)
          })}

        </div>)
      }
    </div>
  );
}