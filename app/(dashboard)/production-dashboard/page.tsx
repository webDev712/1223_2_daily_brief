"use client";

import { useDate } from "@/app/src/components/DateContext";
import Loader from "@/app/src/components/Loader";
import { Department, ProductionRow } from "@/lib/types";
import { useEffect, useState } from "react";
import { format, toDate } from "date-fns";
import './page.css'
import DatePicker from "react-datepicker";
import { getTestEmployees } from "@/lib/config";
import getColorsFromName from "@/lib/color";
import { toast } from "sonner";

export default function ProductionDashboard() {
    const [loading, setLoading] = useState(true);
    const [tableData, setTableData] = useState([])
    const [departments, setDeparments] = useState([])

    const [page, setPage] = useState(1);
    const pageSize = 20;

    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)
    const seven_days_ago = new Date()
    seven_days_ago.setDate(yesterday.getDate() - 7)
    const [dateFrom, setDateFrom] = useState(seven_days_ago)
    const [dateTo, setDateTo] = useState(yesterday)
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
            console.log('dateFrom')
            console.log(format(dateFrom, 'yyyy-MM-dd'))
            console.log('toDate')
            console.log(format(dateTo, 'yyyy-MM-dd'))
            console.log('department')
            console.log(department)
            console.log(`/api/ppohMaster?page=${page}&page_size=${pageSize}&from_date=${format(dateFrom, 'yyyy-MM-dd')}&to_date=${format(dateTo, 'yyyy-MM-dd')}&page=${page}${employee ? `&employee=${employee}` : ''}${department ? `&department=${department}` : ''}`)
            const ppoh_master_res = await fetch(`/api/ppohMaster?page=${page}&page_size=${pageSize}&from_date=${format(dateFrom, 'yyyy-MM-dd')}&to_date=${format(dateTo, 'yyyy-MM-dd')}&page=${page}${employee ? `&employee=${employee}` : ''}${department ? `&department=${department}` : ''}`);
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

            console.log('ppoh_master_data.departments')
            console.log(ppoh_master_data.departments)
            setDeparments(ppoh_master_data.departments)

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
                            <DatePicker className="picker" selected={dateFrom} onChange={(d: Date | null) => d && setDateFrom(d)} dateFormat={'MM-dd-yyyy'}></DatePicker>
                        </label>
                        <label>
                            <span>To Date</span>
                            <DatePicker className="picker" selected={dateTo} onChange={(d: Date | null) => d && setDateTo(d)} dateFormat={'MM-dd-yyyy'}></DatePicker>
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
                                {departments.map((dep_name: string) => {if (dep_name !== '') return (
                                    <option key={dep_name} value={dep_name}>{dep_name}</option>
                                )})}
                            </select>
                        </label>
                        <div className="button-d-bl-sm" onClick={() => {
                            console.log(dateFrom)
                            console.log(dateTo)
                            if (dateFrom > dateTo) {
                                toast.error("Please select a start date before the end date"); 
                                return 0;
                            };
                            if (dateFrom < new Date("2026-02-11")) {
                                toast.error("Historical data in the Production Dashboard is available from February 11, 2026. Please select a date range starting from this date.");
                                return 0;
                            }
                            setPage(1);
                            setReload(prev => prev + 1);
                        }}>Filter</div>
                    </div>
                    <div className="table-wrapper">
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
                            
                            <div className="table">
                                {tableData.map((row: ProductionRow, i) => {
                                    return (
                                    <div key={row.id}>
                                        <div>{String(row.date)}</div>
                                        {/* <div>{format(row.date, 'MM-dd-yyyy')}</div> */}
                                        <div>{row.employee_name}</div>
                                        <div style={{color: getColorsFromName(row.department).dark}}>{row.department}</div>
                                        <div before-text='Pieces'>{row.pieces}</div>
                                        <div before-text='Value'>{row.value}</div>
                                        <div before-text='Hours'>{row.hours}</div>
                                        <div before-text='PPOH'>{row.ppoh}</div>
                                        <div before-text='Target PPOH'>{row.target_ppoh}</div>
                                        <div before-text='Efficiency' className={row.delta_ppoh < 0 ? 'red-b' : row.delta_ppoh === 0 ? 'orange-b' : 'green-b'}>{row.delta_ppoh}</div>
                                        <div className={row.efficiency < 100 ? 'red-b' : row.efficiency === 100 ? 'orange-b' : 'green-b'}>{row.efficiency}</div>
                                        <div><textarea onBlur={(e) => {sendNotes(row.id, e.target.value)}} placeholder="Write your notes here..." defaultValue={row.notes || ""}></textarea></div>
                                    </div>)
                                })}
                            </div>
                            <div className="table-footer">
                                <div>Displayed {tableData.length} rows from {resultsCount} rows</div>
                                <div>
                                    <div className={page > 1 ? '' : 'd'} onClick={() => {if (page > 1) setPage(page - 1)}}>{`< Back`}</div>
                                    <div>- Page {page} -</div>
                                    <div className={page * pageSize > resultsCount ? 'd' : ''} onClick={() => {if (page * pageSize < resultsCount) setPage(page + 1)}}>{`Forward >`}</div>
                                </div>
                            </div>

                    </div>
                </div>)
            }
        </div>
    )
}