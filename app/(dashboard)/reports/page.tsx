'use client';

import Loader from "@/app/src/components/Loader";
import { Department, Report, SavedBrief, User } from "@/lib/types";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import './page.css'
import getReportsTypes, { getWeekDays } from "@/lib/config";
import { toast } from "sonner";
import jsPDF from "jspdf";

export default function Reports() {
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<Report[]>([]);
  const [briefs, setBriefs] = useState([]);
  const [user, setUser] = useState<User | null>(null);
  const [leads, setLeads] = useState<User[]>([])
  const [departments, setDeparments] = useState<Department[]>([]);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showAssigned, setShowAssigned] = useState(false);
  const [showAssignedReport, setShowAssignedReport] = useState<Report | null>(null)
  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);
  const weekDays = getWeekDays()
  const [reload, setReload] = useState(0);

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
    console.log('saveReport Report')
    console.log(r)
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
        toast.error("You don't have permissions for this action.")
      }
      console.log(r)
    });
  }

  const addReport = () => {
    const new_report = {
      name: `Report #${reports.length + 1}`,
      source: '-',
      once_per: 'day',
      archived: false,
    }
    const res = fetch("/api/report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(new_report),
    }).then(res => {
      if (res.status === 200) {
        toast.success('Added new Report!');
        setReload(prev => prev + 1);
      }
      else toast.error('Error while adding new Report.')
    })
  }
  useEffect(() => {
    async function load() {
      setLoading(true)
      const me_res = await fetch("/api/me");
      const me_user = await me_res.json();
      console.log('me_user')
      console.log(me_user)
      setUser(me_user)

      const reports_res = await fetch(`/api/reports`);

      if (!reports_res.ok) {
        console.error("Failed to load brief history");
        setLoading(false)
        return;
      }
      let reports_data = await reports_res.json();
      setReports(reports_data)
      console.log('reports_data')
      console.log(reports_data)
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
      leads_data = leads_data.filter((a: User) => a.user_role === 'lead' && a.archived !== true);
      console.log('leads_data')
      console.log(leads_data)
      setLeads(leads_data);
      let departments_res = await fetch("/api/departments");
      if (!departments_res.ok){
          console.error("Failed to load departments");
          setLoading(false)
          return;
      }
      let departments_data = await departments_res.json();
      console.log('departments_data')
      console.log(departments_data)
      setDeparments(departments_data)
      


      setLoading(false)


    }
    load();
  }, [reload]);

  const assignReport = (report: Report | null) => {
    if (!report) return;
    setReports(prev =>
      prev.map(r =>
        r.id === report.id
          ? report
          : r
      )
    );
    saveReport(report)
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
  if (assigned.all?.assigned === true) {
    return leads.map((lead) => String(lead.id));
  }

  const assignedLeadIds = new Set<string>();

  // Directly assigned leads
  if (assigned.person?.assigned) {
    assigned.person.list.forEach((leadId) => {
      assignedLeadIds.add(String(leadId));
    });
  }

  // Assigned departments
  if (assigned.department?.assigned) {
    leads.forEach((lead) => {
      if (
        assigned.department.list.includes(
          String(lead.department)
        )
      ) {
        assignedLeadIds.add(String(lead.id));
      }
    });
  }

  return Array.from(assignedLeadIds);
};

const total_reports = activeReports.reduce((total, report) => {
  const assignedLeadIds = getAssignedLeadIds(report);

  return total + assignedLeadIds.length;
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
      {showAssigned && (
        <div className='confirm'>
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
            <div img-id="document-yellow">
              <h1>{done_by_all}</h1>
              <div>Reviewed By All Leads</div>
              <span>{done_by_all_percent}% fully covered Today</span>
            </div>
            <div img-id="document-yellow">
              <h1>{total_reports - done_by_all}</h1>
              <div>Still Pending</div>
              <span>Not reviewed by all leads</span>
            </div>
          </div>
          <div className="how-to-use">
            <strong>About Reports</strong>
            <div>
              Reports configured in this section automatically appear in each Route Lead's Daily Brief when it is started.
              <ul>
                <li>• Day reports appear every day.</li>
                <li>• Week reports appear only on the selected day of the week.</li>
                <li>• Month reports appear only on the selected day of the month.</li>
              </ul>
              <strong>Changes made to reports will be applied starting with the next day's Daily Brief and will not affect briefs that have already been created.</strong>
            </div>
          </div>
          <div className="button-d-bl add-report" onClick={() => {
            if (user?.role !== 'manager'){
              toast.error("You don't have permissions for this action.")
              return;
            }
            addReport();
          }}>Add Report</div>
          <div className="table-wrapper">
            <div className="table-reports">
              <div>
                <div>EDIT</div>
                <div>SAVE</div>
                <div>REPORTS</div>
                <div>SOURCE</div>
                <div>PERIOD</div>
                <div>ASSIGNED TO</div>
                <div>DELETE</div>
              </div>
              {reports.filter((r: Report) => r.archived !== true).length > 0 ? reports.map((r: Report) => {
                if (r.archived !== true) return (
                  <div className="report" key={`report_${r.id}`}>
                    <div>
                      {/* {r.archived ? 'true' : 'false'} */}
                      <label>
                        <span className={r.edit === true ? "button-d-bl-sm d" : "button-d-bl-sm"}>Edit</span>
                        <input
                          type="checkbox"
                          checked={r.edit ?? false}
                          onChange={(e) => {
                            if (user?.role !== 'manager'){
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
                          disabled={r.edit === true}
                        />
                      </label>
                    </div>
                    <div>
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
                    </div>
                    <div>
                      <div className="show">{r.name}</div>
                      <div className="edit">
                        <input type="text" value={r.name} onChange={(e: any) => {changeReports({...r, name: e.target.value})}} />
                      </div>
                    </div>
                    <div>
                      <div className="show">{r.source}</div>
                      <div className="edit">
                        <input type="text" value={r.source} onChange={(e: any) => {changeReports({...r, source: e.target.value})}} />
                      </div>
                    </div>
                    <div>
                      <div>
                        <div className="show">
                          <div>{r.once_per}</div>
                          {r.once_per !== 'day' && (<div style={{display: 'flex'}}>at {r.once_per === 'week' ? weekDays[Number(r.start_at_day) - 1]?.full : r.start_at_day}
                            {r.once_per === 'month' && ''}
                          </div>)}
                          {r.once_per === 'month' && 'day'}
                        </div>
                        <div className="edit">
                          <select name={`once_per_${r.id}`} value={r.once_per || 1} onChange={(e: any) => {
                            if (e.target.value === 'week') {
                              changeReports({...r, once_per: e.target.value, start_at_day: '1'})
                            }
                            else {
                              changeReports({...r, once_per: e.target.value})
                            }
                          }} style={{paddingLeft: 7}}>
                            <option value="day">Day</option>
                            <option value="week">Week</option>
                            <option value="month">Month</option>
                          </select>
                          {r.once_per !== 'day' && 'At'}
                          {r.once_per !== 'day' && (
                            <input type="number" min={1} max={31} value={r.start_at_day || 1} onChange={(e: any) => { 
                              if ((r.once_per === 'week' && e.target.value <= 7) || (r.once_per === 'month' && e.target.value <= 31))
                              changeReports({...r, start_at_day: e.target.value})}} />
                          )}
                          {r.once_per === 'month' && 'day'}
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="button-d-bl-sm" onClick={() => {
                        if (user?.role !== 'manager'){
                          toast.error("You don't have permissions for this action.")
                          return;
                        }
                        setShowAssignedReport(r);
                        setShowAssigned(true);
                      }}>Set</div>
                    </div>
                    <div>
                      <div style={{margin: '0 auto'}} className="button-r-sm" onClick={() => {
                        if (user?.role !== 'manager'){
                          toast.error("You don't have permissions for this action.")
                          return;
                        }
                        setReportToDelete({...r, archived: true});
                        setShowConfirmDelete(true)
                      }}>Delete</div>
                    </div>
                  </div>
                )}) : (
                  <h3>
                    No reports active
                  </h3>
                )}
            </div>
          </div>
        </div>)
      }
    </div>
  );
}
