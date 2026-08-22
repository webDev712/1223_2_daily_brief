"use client";

import { useDate } from "@/app/src/components/DateContext";
import Loader from "@/app/src/components/Loader";
import { Department, ProductionRow } from "@/lib/types";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import './page.css'
import { randomUUID } from "crypto";
import DatePicker from "react-datepicker";
import { getTestEmployees } from "@/lib/config";
import getColorsFromName from "@/lib/color";
import { toast } from "sonner";

export default function ProductionDashboard() {
    const [loading, setLoading] = useState(true);
    const [tableData, setTableData] = useState([])
    const [departments, setDeparments] = useState<Department[]>([])

    const [page, setPage] = useState(1);
    const pageSize = 20;

    const today = new Date()
    const seven_days_ago = new Date()
    seven_days_ago.setDate(today.getDate() - 7)
    const [dateFrom, setDateFrom] = useState(seven_days_ago)
    const [dateTo, setDateTo] = useState(today)
    const [employee, setEmployee] = useState('')
    const [department, setDeparment] = useState('')

    const [resultsCount, setResultsCount] = useState(0);

    const [reload, setReload] = useState(0)

    const sendNotes = (id: string, newNotes: string) => {
        fetch('/api/ppohMaster', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id: id, notes: newNotes})}).then(res => {if (res.status === 200) toast.success('Notes Updated!')})
    }

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const ppoh_master_res = await fetch(`/api/ppohMaster?page=${page}&page_size=${pageSize}&from_date=${dateFrom}&to_date=${dateTo}&page=${page}${employee ? `&employee=${employee}` : ''}${department ? `&department=${department}` : ''}`);
            if (!ppoh_master_res.ok){
                console.log('Failed to load ppoh_master');
                setLoading(false);
                return;
            }
            const ppoh_master_data = await ppoh_master_res.json();
            console.log('ppoh_master_data')
            console.log(ppoh_master_data)
            setTableData(ppoh_master_data.rows)
            setResultsCount(ppoh_master_data.count)

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

            setLoading(false);
        }

        load();
    }, [reload, page])

    return (
        <div>
            {loading ? (<Loader></Loader>) : 
                (<div className="production-dashboard">
                    <div>
                        <label>
                            <span>From Date</span>
                            <DatePicker className="picker" value={format(dateFrom, 'MM-dd-yyyy')} onChange={(d: any) => d && setDateFrom(d)}></DatePicker>
                        </label>
                        <label>
                            <span>To Date</span>
                            <DatePicker className="picker" value={format(dateTo, 'MM-dd-yyyy')} onChange={(d: any) => d && setDateTo(d)}></DatePicker>
                        </label>
                        <label>
                            <span>Employee</span>
                            <select defaultValue={employee} onChange={(e) => setEmployee(e.target.value)}>
                                <option value="">All</option>
                                {getTestEmployees().map((e: any) => (
                                    <option key={e.id} value={e.id}>{e.name}</option>
                                ))}

                            </select>
                        </label>
                        <label>
                            <span>Department</span>
                            <select defaultValue={department} onChange={(e) => setDeparment(e.target.value)}>
                                <option value="">All</option>
                                {departments.map((dep: Department) => (
                                    <option key={dep.id} value={dep.name}>{dep.name}</option>
                                ))}
                            </select>
                        </label>
                        <div className="button-d-bl-sm" onClick={() => {setPage(1); setReload(prev => prev + 1)}}>Filter</div>
                    </div>
                    <div className="table-wrapper">
                            <div className="table">
                                <div className="table-header">
                                    <div>DATE</div>
                                    <div>EMPLOYEE</div>
                                    <div>DEPARTMENT</div>
                                    <div>PIECES</div>
                                    <div>VALUE</div>
                                    <div>HOURS</div>
                                    <div>PPOH</div>
                                    <div>TARGET PPOH</div>
                                    <div>Δ VS TARGET</div>
                                    <div>EFFICIENCY</div>
                                    <div>NOTES</div>
                                </div>
                                {tableData.map((row: ProductionRow, i) => {
                                    return (
                                    <div key={crypto.randomUUID()}>
                                        <div>{format(row.date, 'MM-dd-yyyy')}</div>
                                        <div>{row.employee_name}</div>
                                        <div style={{color: getColorsFromName(row.department).dark}}>{row.department}</div>
                                        <div>{row.pieces}</div>
                                        <div>{row.value}</div>
                                        <div>{row.hours}</div>
                                        <div>{row.ppoh}</div>
                                        <div>{row.target_ppoh}</div>
                                        <div className={row.delta_ppoh < 0 ? 'red-b' : row.delta_ppoh === 0 ? 'orange-b' : 'green-b'}>{row.delta_ppoh}</div>
                                        <div className={row.efficiency < 100 ? 'red-b' : row.efficiency === 100 ? 'orange-b' : 'green-b'}>{row.efficiency}</div>
                                        <div><textarea onBlur={(e) => {sendNotes(row.id, e.target.value)}} placeholder="Write your notes here..." defaultValue={row.notes || ""}></textarea></div>
                                    </div>)
                                })}
                                <div>
                                    <div>Displayed {tableData.length} rows from {resultsCount} rows</div>
                                    <div>
                                        <div className={page > 1 ? '' : 'd'} onClick={() => {if (page > 1) setPage(page - 1)}}>{`< Back`}</div>
                                        <div>- Page {page} -</div>
                                        <div className={page * pageSize > resultsCount ? 'd' : ''} onClick={() => {if (page * pageSize < resultsCount) setPage(page + 1)}}>{`Forward >`}</div>
                                    </div>
                                </div>
                            </div>
                    </div>
                </div>)
            }
        </div>
    )
}