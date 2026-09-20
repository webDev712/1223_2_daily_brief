'use client';

import { act, useEffect, useState } from 'react';
import './page.css'
import DatePicker from 'react-datepicker';
import { Action, DailyLogRow, Department, FiltersData, IdName, User } from '@/lib/types';
import { differenceInCalendarDays, format, parse } from 'date-fns';
import capitalize from '@/lib/text';
import Loader from '@/app/src/components/Loader';
import getColorsFromName from '@/lib/color';
import { useUser } from '@/app/src/components/UserProvider';
import { getActionLogCategories } from '@/lib/config';
import UserCircle from '@/app/src/components/UserCircle';
import formatDateWithoutTimezone from '@/lib/date';
import { toast } from 'sonner';


export default function ActionTracker () {
    const [reload, setReload] = useState(0);
    const [loading, setLoading] = useState(true);
    const user = useUser();
    
    const [filters, setFilters] = useState({
        fromDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        toDate: new Date(),
        status: '',
        employee: '',
        department: '',
        severity: '',
        category: '',
    });
    const [filtersData, setFiltersData] = useState<FiltersData>();
    const [page, setPage] = useState(1);
    const pageSize = 20;

    const [auditLogData, setAuditLogData] = useState<DailyLogRow[]>([]);
    const [resultsCount, setResultsCount] = useState(0);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [users, setUsers] = useState<User[]>([])
    const categories = getActionLogCategories().sort((a: IdName, b: IdName) => a.name.localeCompare(b.name));
    const [showAdd, setShowAdd] = useState(false);
    const [showDelete, setShowDelete] = useState(false);

    const defaultNewAuditLogRow = {
        date: new Date().toISOString(),
        user_id: user.id,
        department_id: '',
        shift: '10 AM - 6 PM',
        category: categories[0]?.name ?? '',
        severity: 'Low',
        date_resolved: null,
        text: '',
        status: 'Unset',
        actions: null,
    }
    const [auditLogRowToAdd, setAuditLogRowToAdd] = useState<DailyLogRow>(defaultNewAuditLogRow);
    const [rowShowActions, setRowShowActions] = useState<DailyLogRow | null>(null);

    const [actionToAdd, setActionToAdd] = useState('');


    const sendActionTrackerRow = async (newActionTrackerRow: DailyLogRow) => {
        console.log('newActionTrackerRow before')
        console.log(newActionTrackerRow)
        setLoading(true);
        newActionTrackerRow = {
            ...newActionTrackerRow,
            date_resolved: newActionTrackerRow.status === 'Resolved' ? (newActionTrackerRow.date_resolved ?? new Date().toISOString()) : null,
            date: newActionTrackerRow.date.length > 10 ? formatDateWithoutTimezone(newActionTrackerRow.date) : newActionTrackerRow.date
        }
        console.log('newActionTrackerRow after')
        console.log(newActionTrackerRow)


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
            return 0;
        }
        if (rowShowActions){
            setRowShowActions(newActionTrackerRow);
            setActionToAdd('');
        }
        setLoading(false);
        setShowAdd(false);
        setReload(reload + 1);
        toast.success('Successfully sent Action Tracker row to the server.')
    }


    const deleteActionTrackerRow = async (id: string | null) => {
        if (id === null) return;
        setLoading(true);
        const action_tracker_res = await fetch('/api/daily_log', {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({id: id})
        });
        if (!action_tracker_res.ok){
            console.error('Error while deleting Action Tracker Row.');
            setLoading(false);
            return 0;
        }
        setLoading(false);
        setShowAdd(false);
        setShowDelete(false);
        setReload(reload + 1);
        toast.success('Deleted Action Tracker row.')
    }

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const action_log_res = await fetch(`/api/daily_log?fromDate=${format(filters.fromDate, 'yyyy-MM-dd')}&toDate=${format(filters.toDate, 'yyyy-MM-dd')}&status=${filters.status}&employee=${filters.employee}&department=${filters.department}&severity=${filters.severity}&category=${filters.category}&page=${page}&pageSize=${pageSize}`);
            if (!action_log_res.ok) {
                console.error("Failed to load action_log data");
                setLoading(false);
                return;
            }
            const action_log_data = await action_log_res.json();
            setFiltersData(action_log_data.filterArrays)
            setAuditLogData(action_log_data.rows)
            console.log('action_log_data.rows')
            console.log(action_log_data.rows)
            setResultsCount(action_log_data.count)
            
            const departments_res = await fetch(`/api/departments`);
            if (!departments_res.ok) {
                console.error("Failed to load departments");
                setLoading(false);
                return;
            }
            let departments_data = await departments_res.json();
            departments_data = departments_data.sort((a: Department, b: Department) => a.name.localeCompare(b.name))
            setDepartments(departments_data);
            if (departments_data.length > 0) {
                setAuditLogRowToAdd({...auditLogRowToAdd, department_id: departments_data[0].id})
            }
            console.log('departments_data');
            console.log(departments_data);


            const users_res = await fetch(`/api/users`);
            
            if (!users_res.ok) {
                console.error("Failed to load users");
                setLoading(false)
                return;
            }  
            let users_data = await users_res.json();
            console.log('users_data')
            console.log(users_data)
            setUsers(users_data);

            setLoading(false);
        }
        load();
    }, [reload, page])
    return (
        <div>
            {loading ? (<Loader></Loader>) : (
                <div className="action-tracker">
                    <div>
                        <div>
                            <label>
                                <span>From Date</span>
                                <DatePicker className="picker" selected={filters.fromDate} onChange={(d: Date | null) => d && setFilters({...filters, fromDate: d})} dateFormat={'MM-dd-yyyy'}></DatePicker>
                            </label>
                            <label>
                                <span>To Date</span>
                                <DatePicker className="picker" selected={filters.toDate} onChange={(d: Date | null) => d && setFilters({...filters, toDate: d})} dateFormat={'MM-dd-yyyy'}></DatePicker>

                            </label>
                            <label>
                                <span>Status</span>
                                <select value={filters.status} onChange={(e) => {setFilters({...filters, status: e.target.value})}}>
                                    <option value=''>All</option>
                                    {filtersData?.statuses.map((status: string) => (
                                        <option value={status} key={`status_${status}`}>{capitalize(status)}</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                <span>Employee</span>
                                <select value={filters.employee} onChange={(e) => {setFilters({...filters, employee: e.target.value})}}>
                                    <option value=''>All</option>
                                    {filtersData?.employees.map((employee: IdName) => (
                                        <option value={employee.id} key={`employee_${employee.id}`}>{capitalize(employee.name)}</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                <span>Department</span>
                                <select value={filters.department} onChange={(e) => {setFilters({...filters, department: e.target.value})}}>
                                    <option value=''>All</option>
                                    {filtersData?.departments.map((department: IdName) => (
                                        <option value={department.id} key={`department_${department.id}`}>{capitalize(department.name)}</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                <span>Severity</span>
                                <select value={filters.severity} onChange={(e) => {setFilters({...filters, severity: e.target.value})}}>
                                    <option value=''>All</option>
                                    {filtersData?.severities.map((severity: string) => (
                                        <option value={severity} key={`severity_${severity}`}>{capitalize(severity)}</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                <span>Category</span>
                                <select value={filters.category} onChange={(e) => {setFilters({...filters, category: e.target.value})}}>
                                    <option value=''>All</option>
                                    {filtersData?.categories.map((category: string) => (
                                        <option value={category} key={`category_${category}`}>{capitalize(category)}</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                            </label>
                        </div>

                        <div className='button-d-bl-sm' onClick={() => {setReload(reload + 1)}}>Filter</div>
                    </div>
                    <div>
                        <div className="button-d-bl" style={{display: user.permissions.edit_action_tracker === true ? 'block' : 'none'}} onClick={() => {if (user.permissions.edit_action_tracker !== true) return; setAuditLogRowToAdd({...defaultNewAuditLogRow, department_id: departments[0].id}); setShowAdd(true);}}>Add Issue / Observation</div>
                    </div>
                    <div className="a-table-wrapper">
                        <div className="a-table-header">
                            <div>DATE</div>
                            <div>EMPLOYEE</div>
                            <div>DEPARTMENT IMPACTED</div>
                            <div>SHIFT</div>
                            <div>CATEGORY</div>
                            <div>SEVERITY</div>
                            <div>ISSUE / OBSERVATION</div>
                            <div>ACTIONS</div>
                            <div>DAYS OPEN</div>
                            <div>STATUS</div>
                            {user.permissions.edit_action_tracker === true && (<div></div>)}
                        </div>
                        
                        <div className="a-table">
                            {auditLogData.map((row: DailyLogRow, i) => {
                                return (
                                <div key={row.id}>
                                    <div>{formatDateWithoutTimezone(row.date)}</div>
                                    <div>{row.u_name}</div>
                                    <div style={{color: getColorsFromName(row.d_name ?? '').dark}} before-text='Department'>{row.d_name}</div>
                                    <div before-text='Shift'>{row.shift}</div>
                                    <div before-text='Category' style={{color: getColorsFromName(row.category ?? '').dark}} className='b'>{row.category}</div>
                                    <div before-text='Severity' className={row.severity === 'Low' ? 'b' : (row.severity === 'Med' ? 'orange b' : 'red b')}>{row.severity}</div>
                                    <div before-text=''>{row.text}</div>
                                    <div before-text=''>
                                        <div className='button-w-bl' onClick={() => { setRowShowActions(row) }}>Show List {row.actions && `(${row.actions.length})`}</div>
                                    </div>
                                    <div before-text='Days Open'>{row.date_resolved ? (
                                        <div className={differenceInCalendarDays(row.date_resolved, row.date) < 3 ? 'green b' : (differenceInCalendarDays(row.date_resolved, row.date) < 10 ? 'orange b' : 'red b')}>
                                            {differenceInCalendarDays(row.date_resolved, row.date)}
                                        </div>
                                    ) : (
                                        <div className={differenceInCalendarDays(new Date(), row.date) < 3 ? 'green b' : (differenceInCalendarDays(new Date(), row.date) < 10 ? 'orange b' : 'red b')}>{differenceInCalendarDays(new Date(), row.date)}</div>
                                    )}</div>
                                    <div before-text='Status' className={row.status === 'Resolved' ? 'green b' : (row.status === 'In progress' ? 'orange b' : 'red b')}>{row.status}</div>
                                    {user.permissions.edit_action_tracker === true && (<div>
                                        <div className="button-w-bl" onClick={() => { setAuditLogRowToAdd({...row, date: format(row.date, 'MM-dd-yyyy')}); setShowAdd(true); }}>Edit</div>
                                    </div>)}
                                </div>)
                            })}
                        </div>
                        <div className="a-table-footer">
                            <div>Displayed {auditLogData.length} rows from {resultsCount} rows</div>
                            <div>
                                <div className={page > 1 ? '' : 'd'} onClick={() => {if (page > 1) setPage(page - 1)}}>{`< Back`}</div>
                                <div>- Page {page} -</div>
                                <div className={page * pageSize > resultsCount ? 'd' : ''} onClick={() => {if (page * pageSize < resultsCount) setPage(page + 1)}}>{`Forward >`}</div>
                            </div>
                        </div>

                    </div>
                    {showAdd && (
                        <div className='confirm add-issue-or-observation'>
                            <div>
                                {!auditLogRowToAdd.id ? (
                                    <h1>Enter new Issue / Observation data:</h1>
                                ) : (
                                    <h1>Change Issue / Observation data:</h1>
                                )}
                                <div>
                                    <form id='add-action-tracker-row' onSubmit={() => {
                                        sendActionTrackerRow(auditLogRowToAdd);
                                    }}>
                                        <label>
                                            <div>Department</div>
                                            <select value={auditLogRowToAdd.department_id} onChange={(e) => {setAuditLogRowToAdd({...auditLogRowToAdd, department_id: e.target.value})}}>
                                                {departments.map((department: Department) => (
                                                    <option value={department.id} key={`add_io_dep_${department.id}`}>{department.name}</option>
                                                ))}
                                            </select>
                                        </label>
                                        <label>
                                            <div>Date</div>
                                            <div>
                                                <DatePicker className="picker" selected={new Date(auditLogRowToAdd.date)} onChange={(d: Date | null) => d && setAuditLogRowToAdd({...auditLogRowToAdd, date: format(d, 'MM-dd-yyyy')})} dateFormat={'MM-dd-yyyy'}></DatePicker>
                                            </div>
                                        </label>
                                        <label>
                                            <div>Shift</div>
                                            <select value={auditLogRowToAdd.shift} onChange={(e) => {setAuditLogRowToAdd({...auditLogRowToAdd, shift: e.target.value})}}>
                                                <option value="10 AM - 6 PM">10 AM - 6 PM</option>
                                                <option value="4 PM - 10 PM">4 PM - 10 PM</option>
                                                <option value="-">-</option>
                                            </select>
                                        </label>
                                        <label>
                                            <div>Category</div>
                                            <select value={auditLogRowToAdd.category} onChange={(e) => {setAuditLogRowToAdd({...auditLogRowToAdd, category: e.target.value})}}>
                                                {categories.map((category: IdName) => (<option value={category.name} key={`add_io_category_${category.id}`}>{category.name}</option>))}
                                            </select>
                                        </label>
                                    
                                        <label>
                                            <div>Status</div>
                                            <select value={auditLogRowToAdd.status} onChange={(e) => {setAuditLogRowToAdd({...auditLogRowToAdd, status: e.target.value})}}>
                                                <option value="Unset">Unset</option>
                                                <option value="In progress">In progress</option>
                                                <option value="Resolved">Resolved</option>
                                            </select>
                                        </label>
                                        <label>
                                            <div>Severity</div>
                                            <select value={auditLogRowToAdd.severity} onChange={(e) => {setAuditLogRowToAdd({...auditLogRowToAdd, severity: e.target.value})}}>
                                                <option value="Low">Low</option>
                                                <option value="Mid">Mid</option>
                                                <option value="High">High</option>
                                            </select>
                                        </label>
                                    </form>
                                    </div>
                                    <label>
                                        <div>Description</div>
                                        <textarea placeholder='The issue is about...' value={auditLogRowToAdd.text} onChange={(e) => {setAuditLogRowToAdd({...auditLogRowToAdd, text: e.target.value})}}></textarea>
                                    </label>
                                <div>
                                    {auditLogRowToAdd.id && (<span className='button-w-r-sm delete' onClick={() => {setShowDelete(true)}}>Delete</span>)}
                                    <div className='button-w-bl' onClick={() => {setShowAdd(false)}}>Cancel</div>
                                    <button className='button-d-bl' type='submit' form='add-action-tracker-row'>{!auditLogRowToAdd.id ? 'Add Issue / Observation' : 'Save Changes'}</button>
                                </div>
                            </div>
                        </div>
                    )}
                    {rowShowActions !== null && (
                        <div className='confirm actions-list'>
                            <div>
                                <h1><strong>Actions List</strong></h1>
                                <div>
                                    {rowShowActions.actions && rowShowActions.actions?.length > 0 ? rowShowActions.actions?.map((action: Action) => (
                                        <div key={action.id} className={action.user_id === user.id ? 'my-action' : ''}>
                                            <div>
                                                <UserCircle user_name={users.find((user: User) => user.id === action.user_id)?.name ?? 'User'} size={25}></UserCircle>
                                                <div>{users.find((user: User) => user.id === action.user_id)?.name ?? 'User'}</div>
                                            </div>
                                            <div>{format(new Date(action.date), 'MM-dd-yyyy hh:mm aa')}</div>
                                            <div>{action.text}</div>
                                        </div>
                                    )) : (
                                        <h4>No actions added.</h4>
                                    )}
                                </div>
                                <span onClick={() => {setRowShowActions(null)}} className='x'>x</span>
                                {auditLogData.find((row: DailyLogRow) => row.id === rowShowActions.id)?.date_resolved !== null && (<b>-- RESOLVED SUCCESSFULLY --</b>)}
                                <div className={auditLogData.find((row: DailyLogRow) => row.id === rowShowActions.id)?.date_resolved === null && user.permissions.add_actions_to_io === true ? '' : 'resolved'}>
                                    <div className={user.permissions.add_actions_to_io === true ? "button-d-bl-sm" : "button-d-bl-sm d"} onClick={() => {sendActionTrackerRow({
                                        ...rowShowActions,
                                            actions: [
                                            ...(rowShowActions.actions ?? []), 
                                            {
                                                id: crypto.randomUUID(), 
                                                text: actionToAdd || 'No description', 
                                                date: new Date().toISOString(), 
                                                user_id: user.id
                                            }
                                    ],})}}>Add Action</div>
                                    {/* rowShowActions.date_resolved: 
                                    {typeof rowShowActions.date_resolved}
                                    {rowShowActions.date_resolved} -
                                    {' '}{JSON.stringify(rowShowActions.date_resolved)} */}
                                    <label className={user.permissions.add_actions_to_io === true ? "is-resolved" : "is-resolved d"} >
                                        <div>Issue Resolved?</div>
                                        <input type="checkbox" checked={rowShowActions?.date_resolved !== null || false} onChange={(e) => {
                                            if (user.permissions.add_actions_to_io !== true) return;
                                            setRowShowActions({
                                                ...rowShowActions,
                                                date_resolved: e.target.checked ? format(new Date(), 'MM-dd-yyyy hh:mm aa') : null,
                                                status: 'Resolved'
                                            })
                                        }} />
                                    </label>
                                    <textarea name="" id="" placeholder='New action...' value={actionToAdd} onChange={(e) => {if (user.permissions.add_actions_to_io !== true) return; setActionToAdd(e.target.value)}
                                    } className={user.permissions.add_actions_to_io === true ? "" : " d"}></textarea>
                                </div>
                            </div>
                        </div>)
                    } 
                    {showDelete && (
                        <div className='confirm'>
                            <div>
                                <h1>Confirm Deleting this Issue / Observation?</h1>
                                <div>
                                    <div className='button-w-bl' onClick={() => {setShowDelete(false)}}>Cancel</div>
                                    <button className='button-w-r' onClick={() => { 
                                        deleteActionTrackerRow(auditLogRowToAdd ? auditLogRowToAdd.id ?? null : null)
                                    }}>Delete</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}