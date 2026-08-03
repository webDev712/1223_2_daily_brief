'use client';

import Loader from "@/app/src/components/Loader";
import { Report, SavedBrief, User } from "@/lib/types";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import './page.css'
import getReportsTypes, { getWeekDays } from "@/lib/config";
import { toast } from "sonner";

export default function Reports() {
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<Report[]>([]);
  const [briefs, setBriefs] = useState([]);
  const [user, setUser] = useState<User | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
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


      setLoading(false)


    }
    load();
  }, [reload]);
  
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
  console.log('reports_map')
  console.log(reports_map)

  const done_by_all = [...reports_map.values()].filter(
    count => count === briefs.length
  ).length;

  const done_by_all_percent =
    active_reports_count === 0
      ? 100
      : Math.round((done_by_all / active_reports_count) * 100);
  const total_reports = reports.filter(shouldShowReportToday).filter((report: Report) => report.archived !== true).length;
// TODO: ADD VIEW BRIEF HERE AND THERE
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
              <span>Not reviewed by both leads</span>
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
