'use client';

import { Department, Report, SavedBrief, User } from "@/lib/types";
import scrollToElement from "@/lib/html_document";
import Loader from "@/app/src/components/Loader";
import { useEffect, useState } from "react";
import getReportsTypes, { getWeekDays } from "@/lib/config";
import { format } from "date-fns";
import { toast } from "sonner";
import './page.css'
import capitalize from "@/lib/text";
import { useDate } from "@/app/src/components/DateContext";

export default function Reports() {
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<Report[]>([]);
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
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);
  const weekDays = getWeekDays()
  const [reload, setReload] = useState(0);
  const [deparmentsWithNoReports, setDeparmentsWithNoReports] = useState<Department[]>([]);
  
  const [scrollToIdAfterReload, setScrollToIdAfterReload] = useState<string | null>()
  
  const [reportToAddNameAndSource, setReportToAddNameAndSource] = useState({name: '', source: ''});
  const [reportToAdd, setReportToAdd] = useState<Report>({
      id: 0,
      name: 'Report Name',
      text: '',
      checked: false,
      saved_brief_id: 0,
      source: 'Report Source',
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
      day_time: 'ongoing'
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

  const deleteReport = (reportToDelete: Report | null) => {
    if (reportToDelete === null) return;
    changeReports(reportToDelete);
    saveReport(reportToDelete);
    setShowConfirmDelete(false);
    toast.success("The report is deleted.");
  }

  const saveReport = (r: Report) => {
    fetch("/api/report", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(r),
    }).then(res => {
      if (res.status === 200) {
        setReports(prev =>
          prev.map(report =>
            report.id === r.id
              ? { ...report, edit: false }
              : report
          )
        )
        if (r.archived !== true) toast.success('Report Updated!');
      }
      else{
        toast.error("Error while saving report")
      }
    });
  }

  const addReport = async (new_report: Report) => {
    const res = await fetch("/api/report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({...new_report, archived: false, name: (document.getElementById('new_report_name') as HTMLInputElement).value ?? 'New Report Name', source: (document.getElementById('new_report_source') as HTMLInputElement).value ?? 'New Report Name'}),
    })
    
    if (res.status === 200) {
      toast.success('Added new Report!');
      const json = await res.json();
      const id = json.id;
      setScrollToIdAfterReload(`report_${id}`);
      setReload(prev => prev + 1);
    }
    else toast.error('Error while adding new Report.')
    setShowAddReport(false)
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
      leads_data = leads_data.filter((a: User) => a.user_role !== 'manager' && a.archived !== true);
      console.log('leads_data')
      console.log(leads_data)
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

// const total_reports = activeReports.reduce((total, report) => {
//   const assignedLeadIds = getAssignedLeadIds(report);

//   return total + assignedLeadIds.length;
// }, 0);
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
            <h1>Confirm Deleting this Brief?</h1>
            <p>After deleting <strong>you will not be able to restore it.</strong></p>
            <p>It won't display in leads' Daily Briefs.</p>
            <div>
              <div className='button-w-bl' onClick={() => {setShowConfirmDelete(false)}}>Cancel</div>
              <div className='button-d-bl' onClick={() => {deleteReport(reportToDelete)}}>Delete Report</div>
            </div>
          </div>
        </div>
      )}
      {showAddReport && (
        <div className='confirm add-report'>
          <div>
            <h1>Enter new report data:</h1>
            <div>
              <div>
                <div>Name</div>
                <div>
                  <input type="text" id="new_report_name" placeholder="Report Name"/>
                </div>
              </div>
              <div>
                <div>Source</div>
                <div>
                  <select id="new_report_source" className="input">
                      {getReportsTypes().map((report_type: string) => (
                        <option key={`report_type_option_${report_type}`} value={report_type}>{report_type}</option>
                      ))}
                    </select>
                </div>
              </div>
              <div>
                <div>Period</div>
                <div style={{paddingLeft: 0}}>
                  <select value={reportToAdd.once_per ?? 'day'} onChange={(e) => {setReportToAdd({...reportToAdd, once_per: e.target.value})}} className="input" >
                    <option value="day">Day</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                  </select>
                  {reportToAdd.once_per === 'week' && "at"}
                  {reportToAdd.once_per === 'week' && (
                    <select onChange={(e) => {setReportToAdd({...reportToAdd, start_at_day: e.target.value})}} defaultValue={parseInt(reportToAdd.start_at_day || '1')} className="input">
                      {weekDays.map((day: {full: string, small: string}, i: number) => {
                        return (
                          <option key={`report_${reportToAdd.id}_weekday_option_${i + 1}`} value={i + 1}>{day.full}</option>
                        )
                      })}
                    </select>
                  )}
                  {reportToAdd.once_per === 'month' && "at"}
                  {reportToAdd.once_per === 'month' && (
                    <select onChange={(e) => {setReportToAdd({...reportToAdd, start_at_day: e.target.value})}} value={reportToAdd.start_at_day || '1'}>
                      {Array.from({ length: 30 }, (_, i) => (<option key={crypto.randomUUID()} value={i + 1}>{i + 1}</option>))}
                    </select>
                  )}
                  <select value={reportToAdd.day_time ?? 'ongoing'} onChange={(e) => {setReportToAdd({...reportToAdd, day_time: e.target.value})}} className="input" style={{width: 'max-content'}}>
                    <option value="opening">Opening</option>
                    <option value="midday">Midday</option>
                    <option value="closing">Closing</option>
                    <option value="ongoing">Ongoing</option>
                  </select>
                </div>
              </div>
              {/* <div>
                <div>Assinged To</div>
                <div className="button-d-bl-sm" onClick={() => {
                  setShowAssignedReport(reportToAdd);
                  setShowAssigned(true);
                }}>SET</div>
              </div> */}
            </div>
            <div>
              <div className='button-w-bl' onClick={() => {setShowAddReport(false)}}>Cancel</div>
              <div className='button-d-bl' onClick={() => {addReport(reportToAdd)}}>Add Report</div>
            </div>
          </div>
        </div>
      )}
      {showAssigned && (
        <div className='confirm assign'>
          <div>
            <h1>Assign {showAssignedReport?.name ?? ''} Report to</h1>
            <div className="select all">
              <div>
                <label>
                    <input checked={isAllAssigned(showAssignedReport)} onChange={(e) => { toggleAll(e.currentTarget.checked);}} type="checkbox" />
                    <div>All leads</div>
                  </label>
              </div>
            </div>
            <div className="select">
              <div className="select-leads">
                <h6>Leads</h6>
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
                <h6>Departments</h6>
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
              <div className='button-w-bl' onClick={() => {setShowAssigned(false)}}>Cancel</div>
              <div className='button-d-bl' onClick={() => {assignReport(showAssignedReport)}}>Assign Report</div>
            </div>
          </div>
        </div>
      )}
      


      {loading ? (<Loader></Loader>) :
        (<div>

          <div className="four-block three-block">
            <div img-id="document-yellow">
              <h1>{total_reports}</h1>
              <div>Total Reports</div>
              <span>All reports Scheduled for Today</span>
            </div>
            <div img-id="tasks-red">
              <h1>{total_reports - done_by_all}</h1>
              <div>Reports</div>
              <span>Still Pending Today</span>
            </div>
            <div img-id="document">
              <h1>{deparmentsWithNoReports.length}</h1>
              <div>Departments</div>
              <span>With no reports</span>
            </div>
          </div>
          <h2 style={{position: 'relative', lineHeight: '50px'}}>Departments:
            <label className="how-to-use">
              <input type="checkbox" />
              <strong>About Reports</strong>
              <div>
                <div>Configure which reports appear on each department's daily board.</div>
                <div>Assign reports to specific departments or make them available to everyone.</div>
                <div>Set when reports should appear and who is responsible for reviewing them.</div>
                <div>Reports are automatically included in the Daily Brief based on their configuration.</div>
                <div>Use reports to make sure each department knows what work needs to be reviewed each day.</div>
              </div>
              <div className="x">x</div>
          </label>

          </h2>
          <div style={{ marginBottom: '20px' }}>
          <input
            className="search"
            type="text"
            placeholder="Search reports by name or by source..."
            value={reportSearch}
            onChange={(e) => setReportSearch(e.target.value)}
          />
        </div>
          {departments.map((dep: Department) => {
            return (
              <div key={`reports_department_${dep.id}`}>
                <div className="flex">
                  <h3>{dep.name}</h3>
                  {reports.filter((r: Report) => !r.archived && (r.assigned_to.department.assigned === true && r.assigned_to.department.list.indexOf(dep.id) !== -1 || r.assigned_to.all.assigned === true)).filter((report: Report) => {
  return report.name
    .toLowerCase()
    .includes(reportSearch.toLowerCase()) || report.source
    .toLowerCase()
    .includes(reportSearch.toLowerCase());
}).length === 0 ? (
                    <div className="flex j-s-b">
                      <span>- no reports</span>
                      <div className="button-d-bl-sm add-report" onClick={() => {
                        if (!user?.permissions.edit_reports){
                          toast.error("You don't have permissions for this action.")
                          return;
                        }
                        setReportToAdd({...reportToAdd, assigned_to: {all: {assigned: false, list: [],}, person: {assigned: false, list: [], }, department: { assigned: true, list: [dep.id], }, } })
                        setShowAssignedReport({...reportToAdd, assigned_to: {all: {assigned: false, list: [],}, person: {assigned: false, list: [], }, department: { assigned: true, list: [dep.id], }, } });
                        setShowAddReport(true);
                      }}>Add Report</div>
                      </div>
                  ) : (
                    <div className="button-d-bl add-report" onClick={() => {
                      if (!user?.permissions.edit_reports){
                        toast.error("You don't have permissions for this action.")
                        return;
                      }
                      setReportToAdd({...reportToAdd, assigned_to: {all: {assigned: false, list: [],}, person: {assigned: false, list: [], }, department: { assigned: true, list: [dep.id], }, } })
                      setShowAssignedReport({...reportToAdd, assigned_to: {all: {assigned: false, list: [],}, person: {assigned: false, list: [], }, department: { assigned: true, list: [dep.id], }, } });
                      setShowAddReport(true);
                    }}>Add Report</div>
                  )}
                </div>
                {reports.filter((r: Report) => !r.archived && (r.assigned_to.department.assigned === true && r.assigned_to.department.list.indexOf(dep.id) !== -1 || r.assigned_to.all.assigned === true)).length > 0 && (<div className="table-wrapper">
                  <div className="table-reports">
                    <div>
                      <div>EDIT</div>
                      {/* <div>SAVE</div> */}
                      <div>REPORTS</div>
                      <div>SOURCE</div>
                      <div>PERIOD</div>
                      <div>DAY TIME</div>
                      <div>METRIC</div>
                      <div>DEFAULT HOLDER</div>
                      {/* <div>ASSIGNED TO</div> */}
                      <div>DELETE</div>
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
) {                        return (
                          <div className="report" key={`report_${r.id}`} id={`report_${r.id}`} >
                            <div>
                              {r.edit}
                               {r.edit === true ? (
                                  <label>
                                    <input type="checkbox" checked={true} onChange={() => {}} />
                                    <span
                                      className={r.edit !== true ? "button-d-bl" : "button-d-bl"}
                                      onClick={() => { if (r.edit === true) saveReport(r);}}> Save
                                    </span>
                                  </label>
                                ) : (
                                  <label>
                                    <span className={'button-w-bl'}>Edit</span>
                                <input
                                  type="checkbox"
                                  checked={r.edit ?? false}
                                  onChange={(e) => {
                                    if (!user?.permissions.edit_reports){
                                      toast.error("You don't have permissions for this action.")
                                      return;
                                    }
                                    if (r.edit !== true)
                                      setReports(prev =>
                                        prev.map(report =>
                                          report.id === r.id
                                            ? { ...report, edit: e.target.checked }
                                            : report
                                        )
                                      )
                                    }
                                  }
                                />
                              </label>
                                )}
                              
                            </div>
                            {/* <div>
                              <label>
                                <span
                                  className={r.edit !== true ? "button-d-bl-sm d" : "button-d-bl-sm"}
                                  onClick={() =>
                                    {
                                      if (r.edit === true){
                                        saveReport(r);
                                      }
                                    }
                                  }
                                >
                                  Save
                                </span>
                              </label>
                            </div> */}
                            <div>
                              <div className="show">{r.name}</div>
                              <div className="edit">
                                <textarea value={r.name} className="input" onChange={(e: any) => {changeReports({...r, name: e.target.value})}} />
                              </div>
                            </div>
                            <div>
                              <div className="show">{r.source}</div>
                              <div className="edit">
                                <select value={r.source} onChange={(e: any) => {changeReports({...r, source: e.target.value})}}>
                                  {getReportsTypes().map((report_type: string) => (
                                    <option key={`report_type_option_${report_type}`} value={report_type}>{report_type}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div>
                              <div>
                                <div className="show" style={{gap: '8px', display: 'flex'}}>
                                  <div>{r.once_per}</div>
                                  {r.once_per !== 'day' && 
                                    (<div style={{display: 'flex', gap: "6px"}}><div>at</div> {r.once_per === 'week' ? weekDays
          .filter((_, i) => Number(r.start_at_day || 0) & (1 << i))
          .map(day => day.small)
          .join(', ') : r.start_at_day}
                                      {r.once_per === 'month' && ''}
                                    </div>)}
                                  {r.once_per === 'month' && 'day'}
                                </div>
                                <div className="edit" style={{gap: '8px', display: 'flex'}}>
                                  <select name={`once_per_${r.id}`} value={r.once_per || 1} onChange={(e: any) => {
                                    if (e.target.value === 'week') {
                                      changeReports({...r, once_per: e.target.value, start_at_day: '1'})
                                    }
                                    else {
                                      changeReports({...r, once_per: e.target.value})
                                    }
                                  }} style={{paddingLeft: 7, height: 'max-content'}}>
                                    <option value="day">Day</option>
                                    <option value="week">Week</option>
                                    <option value="month">Month</option>
                                  </select>
                                  {r.once_per !== 'day' && (<div style={{height: 'min-content'}}>At</div>)}
                                  {r.once_per === 'week' && (
                                    <div>
                                      {weekDays.map((day: { full: string; small: string }, i: number) => {
                                        const dayNumber = i + 1;
                                        const dayBit = 1 << (dayNumber - 1);

                                        return (
                                          <label
                                            key={`select_weekDay_${i}`}
                                            className="week_day_select"
                                          >
                                            <span>{day.small}</span>

                                            <input
                                              type="checkbox"
                                              name="select_weekDay"
                                              checked={(Number(r.start_at_day || 0) & dayBit) !== 0}
                                              onChange={(e) => {
                                                const currentMask = Number(r.start_at_day || 0);

                                                const newMask = e.target.checked
                                                  ? currentMask | dayBit
                                                  : currentMask & ~dayBit;

                                                changeReports({
                                                  ...r,
                                                  start_at_day: newMask.toString(),
                                                });
                                              }}
                                            />
                                          </label>
                                        );
                                      })}
                                    </div>
                                  )}
                                  {r.once_per === 'month' && (
                                    <select onChange={(e) => {changeReports({...r, start_at_day: e.target.value})}} value={r.start_at_day || '1'}>
                                      {Array.from({ length: 30 }, (_, i) => (<option key={crypto.randomUUID()} value={i + 1}>{i + 1}</option>))}
                                    </select>
                                  )}
                                  {r.once_per === 'month' && 'day'}
                                </div>
                              </div>
                            </div>
                            <div>
                              <div className="show">{capitalize(r.day_time)}</div>
                              <div className="edit">
                                <select value={r.day_time} onChange={(e) => {changeReports({...r, day_time: e.target.value})}}>
                                  <option value="opening">Opening</option>
                                  <option value="midday">Midday</option>
                                  <option value="closing">Closing</option>
                                  <option value="ongoing">Ongoing</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <div className="show">{r.metric}{r.metric === 'Metric' && ` (from ${r.metric_range_from} to ${r.metric_range_to})`}</div>
                              <div className="edit" style={{gap: '8px', display: 'flex', flexDirection: "column"}}>
                                <select value={r.metric ?? 'No Metric'} onChange={(e) => {changeReports({...r, metric: e.target.value})}} style={{height: 'max-content', margin: 'auto 0'}}>
                                  <option value="No Metric">No Metric</option>
                                  <option value="Count">Count</option>
                                  <option value="Metric">Metric</option>
                                </select>
                                {r.metric === 'Metric' && (
                                <div className="metric_range">
                                  <label style={{display: 'flex', flexDirection: 'column', minWidth: 100}}>
                                    <span>From</span>
                                    <input type='number' value={r.metric_range_from ?? 0} onChange={(e) => {changeReports({...r, metric_range_from: Number(e.target.value)})}} />
                                  </label>
                                  <label style={{display: 'flex', flexDirection: 'column', minWidth: 100}}>
                                    <span>To</span>
                                    <input type='number' value={r.metric_range_to ?? 100} onChange={(e) => {changeReports({...r, metric_range_to: Number(e.target.value)})}} />
                                  </label>

                                </div>
                              )}
                              </div>
                              
                            </div>
                            <div>
                              <div className="show">
                                {leads.find(
                                  (lead: User) => lead.id === r.default_holder_id
                                )?.name || '-'}
                              </div>

                              <div className="edit">
                                <select
                                  value={r.default_holder_id ?? ''}
                                  onChange={(e) => {
                                    changeReports({
                                      ...r,
                                      default_holder_id: e.target.value,
                                    });
                                  }}
                                >
                                  <option value="">-</option>

                                  {leads
                                    .filter((lead: User) => lead.department === dep.name)
                                    .map((lead: User) => (
                                      <option key={lead.id} value={lead.id}>
                                        {lead.name}
                                      </option>
                                    ))}
                                </select>
                              </div>
                            </div>
                            {/* <div>
                              <div className="button-d-bl-sm" onClick={() => {
                                if (!user?.permissions.edit_reports){
                                  toast.error("You don't have permissions for this action.")
                                  return;
                                }
                                setShowAssignedReport(r);
                                setShowAssigned(true);
                              }}>Set</div>
                            </div> */}
                            <div>
                              <div style={{margin: '0 auto'}} className="button-r-sm" onClick={() => {
                                if (!user?.permissions.edit_reports){
                                  toast.error("You don't have permissions for this action.")
                                  return;
                                }
                                setReportToDelete({...r, archived: true});
                                setShowConfirmDelete(true)
                              }}>Delete</div>
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
