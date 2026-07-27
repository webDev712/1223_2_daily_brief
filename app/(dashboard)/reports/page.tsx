'use client';

import Loader from "@/app/src/components/Loader";
import { Report, SavedBrief } from "@/lib/types";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import './page.css'
import getReportsTypes from "@/lib/config";

export default function Reports() {
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<Report[]>([]);
  const [briefs, setBriefs] = useState([]);

  const changeReports = () => {}
  useEffect(() => {
    async function load() {
      setLoading(true)
      const reports_res = await fetch(`/api/reports`);

      if (!reports_res.ok) {
        console.error("Failed to load brief history");
        setLoading(false)
        return;
      }
      let reports_data = await reports_res.json();
      setReports(reports_data)

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
  }, []);
  
  const active_reports_count = reports.filter((r: Report) => r.archived === false).length
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
  const total_reports = reports.length;
  const reportsTypes = getReportsTypes()
// TODO: ADD VIEW BRIEF HERE AND THERE
  return (
    <div className="reports">
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
            <strong>How to use</strong>
            <div>Change that</div>
          </div>
          {reports.map((r: Report) => (
            <div>
              <div>{JSON.stringify(r)}</div>
              <h2>{r.name}</h2>
            </div>
          ))}
        </div>)
      }
    </div>
  );
}
