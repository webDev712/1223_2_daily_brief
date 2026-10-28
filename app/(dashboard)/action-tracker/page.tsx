'use client';

import { act, useEffect, useState } from 'react';
import './page.css'
import DatePicker, { registerLocale } from 'react-datepicker';
import { Action, DailyLogRow, Department, FiltersData, IdName, User } from '@/lib/types';
import { differenceInCalendarDays, format, parse } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { useLocale, useTranslations } from "next-intl";
import capitalize from '@/lib/text';
import Loader from '@/app/src/components/Loader';
import getColorsFromName from '@/lib/color';
import { useUser } from '@/app/src/components/UserProvider';
import { getActionLogCategories } from '@/lib/config';
import UserCircle from '@/app/src/components/UserCircle';
import formatDateWithoutTimezone from '@/lib/date';
import { toast } from 'sonner';
import { sendMessageGlobal } from '@/app/src/components/Chat';
import {
    DateRangePicker,
    createStaticRanges,
    type Range,
    type RangeKeyDict,
} from "react-date-range";
import {
    startOfDay,
    endOfDay,
    subDays,
    subWeeks,
    subMonths,
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
} from "date-fns";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

registerLocale('es', es);

export default function ActionTracker () {
    const t = useTranslations('actionTracker');
    const locale = useLocale();

    const isEs = locale.startsWith('es');
    const dateLocale = isEs ? es : enUS;

    // The DB / API values ("Unset", "In progress", "Resolved", "Low", "Med", "High")
    // stay in English. Only the displayed labels are translated.
    const statusLabel = (status: string) => {
        switch (status.toLowerCase()) {
            case 'unset': return t('status.unset');
            case 'in progress': return t('status.inProgress');
            case 'resolved': return t('status.resolved');
            default: return capitalize(status);
        }
    };
    const severityLabel = (severity: string) => {
        switch (severity.toLowerCase()) {
            case 'low': return t('severity.low');
            case 'med': return t('severity.med');
            case 'high': return t('severity.high');
            default: return capitalize(severity);
        }
    };

    const [reload, setReload] = useState(0);
    const [loading, setLoading] = useState(true);
    const user = useUser();
    
    const defaultFilters = {
        fromDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        toDate: new Date(),
        status: '',
        employee: '',
        department: '',
        severity: '',
        category: '',
    }
    const [filters, setFilters] = useState(defaultFilters);
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
    const [showResolve, setShowResolve] = useState(false);
    const [rowToResolve, setRowToResolve] = useState<DailyLogRow | null>(null);

    const datePresets = createStaticRanges([
    {
        label: t('presets.today'),
        range: () => ({
            startDate: startOfDay(new Date()),
            endDate: endOfDay(new Date()),
        }),
    },
    {
        label: t('presets.yesterday'),
        range: () => ({
            startDate: startOfDay(subDays(new Date(), 1)),
            endDate: endOfDay(subDays(new Date(), 1)),
        }),
    },
    {
        label: t('presets.last7Days'),
        range: () => ({
            startDate: startOfDay(subDays(new Date(), 6)),
            endDate: endOfDay(new Date()),
        }),
    },
    {
        label: t('presets.lastWeek'),
        range: () => ({
            startDate: startOfWeek(subWeeks(new Date(), 1), {
                weekStartsOn: 1,
            }),
            endDate: endOfWeek(subWeeks(new Date(), 1), {
                weekStartsOn: 1,
            }),
        }),
    },
    {
        label: t('presets.last30Days'),
        range: () => ({
            startDate: startOfDay(subDays(new Date(), 29)),
            endDate: endOfDay(new Date()),
        }),
    },
    {
        label: t('presets.lastMonth'),
        range: () => ({
            startDate: startOfMonth(subMonths(new Date(), 1)),
            endDate: endOfMonth(subMonths(new Date(), 1)),
        }),
    },
]);
    const [draftRange, setDraftRange] = useState<Range>({
        startDate: filters.fromDate,
        endDate: filters.toDate,
        key: "selection",
    });
    
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


    const sendActionTrackerRow = async (newActionTrackerRow: DailyLogRow | null) => {
        if (!newActionTrackerRow) {
            console.log('sendActionTrackerRow error - newActionTrackerRow is null or undefined');
            return false;
        }
        setLoading(true);
        newActionTrackerRow = {
            ...newActionTrackerRow,
            date_resolved: newActionTrackerRow.status === 'Resolved' ? (newActionTrackerRow.date_resolved ?? new Date().toISOString()) : null,
            date: newActionTrackerRow.date.length > 10 ? formatDateWithoutTimezone(newActionTrackerRow.date) : newActionTrackerRow.date
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
        if (rowShowActions){
            setRowShowActions(newActionTrackerRow);
            setActionToAdd('');
        }
        setLoading(false);
        setShowAdd(false);
        setReload(reload + 1);
        setShowResolve(false);
        toast.success(t('toast.updated'));
        return true;
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
        toast.success(t('toast.deleted'))
    }
    const [showDateRange, setShowDateRange] = useState(false);

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


            const users_res = await fetch(`/api/users`);
            
            if (!users_res.ok) {
                console.error("Failed to load users");
                setLoading(false)
                return;
            }  
            let users_data = await users_res.json();
            if (users_data.length > 0) {
                setAuditLogRowToAdd({...auditLogRowToAdd, user_id: users_data[0].id})
            }

            setUsers(users_data);

            setLoading(false);
        }
        load();
    }, [reload, page])
    return (
        <div>
            {loading ? (<Loader></Loader>) : (
                <div className="action-tracker">
                    <div className='four-block'>
                        <div img-id="tasks-red" onClick={() => {
                            setFilters(prev => {return {...defaultFilters, status: 'Unset'}});
                            setReload(reload + 1);
                            }}>
                            <h1>{auditLogData.filter((row: DailyLogRow) => row.status === "Unset").length}</h1>
                            <div>{t('stats.issuesObservations')}</div>
                            <span>{t('stats.withStatus', { status: t('status.unset') })}</span>
                        </div>
                        <div img-id="document-yellow" onClick={() => {
                            setFilters(prev => {return {...defaultFilters, status: 'In progress'}});
                            setReload(reload + 1);
                            }}>
                            <h1>{auditLogData.filter((row: DailyLogRow) => row.status === "In progress").length}</h1>
                            <div>{t('stats.issuesObservations')}</div>
                            <span>{t('stats.withStatus', { status: t('status.inProgress') })}</span>
                        </div>
                        <div img-id="document-green" onClick={() => {
                            setFilters(prev => {return {...defaultFilters, status: 'Resolved'}});
                            setReload(reload + 1);
                            }}>
                            <h1>{auditLogData.filter((row: DailyLogRow) => row.status === "Resolved").length}</h1>
                            <div>{t('stats.issuesObservations')}</div>
                            <span>{t('stats.withStatus', { status: t('status.resolved') })}</span>
                        </div>
                        <div img-id="error-yellow" onClick={() => {
                            setFilters(prev => {return {...defaultFilters, severity: 'High'}});
                            setReload(reload + 1);
                            }}>
                            <h1>{auditLogData.filter((row: DailyLogRow) => row.severity === "High").length}</h1>
                            <div>{t('stats.issuesObservations')}</div>
                            <span>{t('stats.withSeverity', { severity: t('severity.high') })}</span>
                        </div>
                    </div>
                    <div>
                        <div>
                            <label>
                                <span>{t('filters.timeframe')}</span>

                                <button
                                    type="button"
                                    className="production-date-range-trigger input"
                                    onClick={() => {
                                        setDraftRange({
                                            startDate: filters.fromDate,
                                            endDate: filters.toDate,
                                            key: "selection",
                                        });
                                        setShowDateRange(prev => !prev);
                                    }}
                                >
                                    📅 {format(filters.fromDate, "MMMM d, yyyy", { locale: dateLocale })}
                                    {" - "}
                                    {format(filters.toDate, "MMMM d, yyyy", { locale: dateLocale })}
                                </button>
                            </label>

                            {showDateRange && (
                                <>
                                    <div
                                        className="production-date-range-backdrop"
                                        onClick={() => setShowDateRange(false)}
                                    />

                                    <div className="production-date-range-popup">
                                        <DateRangePicker
                                            ranges={[draftRange]}
                                            onChange={(ranges: RangeKeyDict) => {
                                                setDraftRange(ranges.selection);
                                            }}
                                            locale={dateLocale}
                                            months={2}
                                            direction="horizontal"
                                            moveRangeOnFirstSelection={false}
                                            dragSelectionEnabled={true}
                                            showDateDisplay={false}
                                            showMonthAndYearPickers={true}
                                            rangeColors={["#204d70"]}
                                            staticRanges={datePresets}
                                            inputRanges={[]}
                                            weekdayDisplayFormat="EEE"
                                            monthDisplayFormat="MMMM yyyy"
                                        />

                                        <div className="production-date-range-footer">
                                            <button
                                                type="button"
                                                onClick={() => setShowDateRange(false)}
                                            >
                                                {t('dateRange.cancel')}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const from = draftRange.startDate;
                                                    const to = draftRange.endDate;

                                                    if (!from || !to) return;

                                                    if (from > to) {
                                                        toast.error(
                                                            t('dateRange.invalidRange')
                                                        );
                                                        return;
                                                    }

                                                    setFilters(prev => {return {...prev, fromDate: from}});
                                                    setFilters(prev => {return {...prev, toDate: to}});
                                                    setShowDateRange(false);
                                                }}
                                            >
                                                {t('dateRange.select')}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                            <label>
                                <span>{t('filters.status')}</span>
                                <select value={filters.status} onChange={(e) => {setFilters({...filters, status: e.target.value})}}>
                                    <option value=''>{t('filters.all')}</option>
                                    <option value="Unset" key="status_Unset">{t('status.unset')}</option>
                                    <option value="In Progress" key="status_In_Progress">{t('status.inProgress')}</option>
                                    <option value="Resolved" key="status_Resolved">{t('status.resolved')}</option>
                                </select>
                            </label>
                            <label>
                                <span>{t('filters.employee')}</span>
                                <select value={filters.employee} onChange={(e) => {setFilters({...filters, employee: e.target.value})}}>
                                    <option value=''>{t('filters.all')}</option>
                                    {filtersData?.employees.map((employee: IdName) => (
                                        <option value={employee.id} key={`employee_${employee.id}`}>{capitalize(employee.name)}</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                <span>{t('filters.department')}</span>
                                <select value={filters.department} onChange={(e) => {setFilters({...filters, department: e.target.value})}}>
                                    <option value=''>{t('filters.all')}</option>
                                    {filtersData?.departments.map((department: IdName) => (
                                        <option value={department.id} key={`department_${department.id}`}>{capitalize(department.name)}</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                <span>{t('filters.severity')}</span>
                                <select value={filters.severity} onChange={(e) => {setFilters({...filters, severity: e.target.value})}}>
                                    <option value=''>{t('filters.all')}</option>
                                    {filtersData?.severities.map((severity: string) => (
                                        <option value={severity} key={`severity_${severity}`}>{severityLabel(severity)}</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                <span>{t('filters.category')}</span>
                                <select value={filters.category} onChange={(e) => {setFilters({...filters, category: e.target.value})}}>
                                    <option value=''>{t('filters.all')}</option>
                                    {filtersData?.categories.map((category: string) => (
                                        <option value={category} key={`category_${category}`}>{capitalize(category)}</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                            </label>
                        </div>

                        <div className='button-d-bl-sm' onClick={() => {setReload(reload + 1)}}>{t('filters.filter')}</div>
                    </div>
                    <div>
                        <div className="button-d-bl" style={{display: user.permissions.edit_action_tracker === true ? 'block' : 'none'}} onClick={() => {if (user.permissions.edit_action_tracker !== true) return; setAuditLogRowToAdd({...defaultNewAuditLogRow, department_id: departments[0].id}); setShowAdd(true);}}>{t('form.add')}</div>
                    </div>
                    <div className="a-table-wrapper">
                        <div className="a-table-header">
                            <div>{t('table.date')}</div>
                            <div>{t('table.employee')}</div>
                            <div>{t('table.departmentImpacted')}</div>
                            <div>{t('table.shift')}</div>
                            <div>{t('table.category')}</div>
                            <div>{t('table.severity')}</div>
                            <div>{t('table.issueObservation')}</div>
                            <div>{t('table.actions')}</div>
                            <div>{t('table.daysOpen')}</div>
                            <div>{t('table.status')}</div>
                            {user.permissions.edit_action_tracker === true && (<div></div>)}
                        </div>
                        
                        <div className="a-table">
                            {auditLogData.map((row: DailyLogRow, i) => {
                                return (
                                <div key={row.id}>
                                    <div>{formatDateWithoutTimezone(row.date)}</div>
                                    <div>{row.u_name}</div>
                                    <div style={{color: getColorsFromName(row.d_name ?? '').dark}} before-text={t('table.beforeDepartment')}>{row.d_name}</div>
                                    <div before-text={t('table.beforeShift')}>{row.shift}</div>
                                    <div before-text={t('table.beforeCategory')} style={{color: getColorsFromName(row.category ?? '').dark}} className='b'>{row.category}</div>
                                    <div before-text={t('table.beforeSeverity')} className={row.severity === 'Low' ? 'b' : (row.severity === 'Med' ? 'orange b' : 'red b')}>{severityLabel(row.severity)}</div>
                                    <div before-text=''>{row.text}</div>
                                    <div before-text=''>
                                        <div className='button-w-bl' onClick={() => { setRowShowActions(row) }}>{t('table.showList')} {row.actions && `(${row.actions.length})`}</div>
                                    </div>
                                     {(() => {
        const startDate = new Date(row.date);
        const endDate = row.date_resolved
            ? new Date(row.date_resolved)
            : new Date();

        const daysOpen = differenceInCalendarDays(endDate, startDate);

        return (
            <div
                className={
                    daysOpen < 3
                        ? 'green b'
                        : daysOpen < 10
                            ? 'orange b'
                            : 'red b'
                }
            >
                {daysOpen}
            </div>
        );
    })()}
                                    <div before-text={t('table.beforeStatus')}>
                                        <div className={row.status === 'Resolved' ? 'green b' : (row.status === 'In progress' ? 'orange b resolve-button' : 'red b resolve-button')}>
                                            {row.status.toLowerCase() === 'resolved' ? (
                                                <div>{t('status.resolved')}</div>
                                            ) : (
                                                <select className={user.permissions.edit_action_tracker === true ? '' : 'd'} defaultValue={row.status} onChange={(e) => { if (user.permissions.edit_action_tracker === true) {setRowToResolve({...row, status: e.target.value}); setShowResolve(true); e.target.value = row.status} } }>
                                                    <option className='red' value="Unset">{t('status.unset')}</option>
                                                    <option className='orange' value="In progress">{t('status.inProgress')}</option>
                                                    <option className='green' value="Resolved">{t('status.resolved')}</option>
                                                </select>
                                            )}
                                    </div>
                                    </div>
                                    {user.permissions.edit_action_tracker === true && (<div>
                                        <div className="button-w-bl" onClick={() => { setAuditLogRowToAdd({...row, date: format(new Date(row.date), 'MM-dd-yyyy')}); setShowAdd(true); }}>{t('table.edit')}</div>
                                    </div>)}
                                </div>)
                            })}
                        </div>
                        <div className="a-table-footer">
                            <div>{t('table.displayedRows', { shown: auditLogData.length, total: resultsCount })}</div>
                            <div>
                                <div className={page > 1 ? '' : 'd'} onClick={() => {if (page > 1) setPage(page - 1)}}>{t('table.back')}</div>
                                <div>{t('table.page', { page })}</div>
                                <div className={page * pageSize > resultsCount ? 'd' : ''} onClick={() => {if (page * pageSize < resultsCount) setPage(page + 1)}}>{t('table.forward')}</div>
                            </div>
                        </div>

                    </div>
                    {showAdd && (
                        <div className='confirm add-issue-or-observation'>
                            <div>
                                {!auditLogRowToAdd.id ? (
                                    <h1>{t('form.addTitle')}</h1>
                                ) : (
                                    <h1>{t('form.editTitle')}</h1>
                                )}
                                <div>
                                    <form id='add-action-tracker-row' onSubmit={() => {
                                        sendActionTrackerRow(auditLogRowToAdd);
                                    }}>
                                        <label>
                                            <div>{t('form.employee')}</div>
                                            <select value={auditLogRowToAdd.user_id} onChange={(e) => {setAuditLogRowToAdd({...auditLogRowToAdd, user_id: e.target.value})}}>
                                                {users.map((user: User) => (
                                                    <option value={user.id} key={`add_io_user_${user.id}`}>{user.name}</option>
                                                ))}
                                            </select>
                                        </label>
                                        <label>
                                            <div>{t('form.department')}</div>
                                            <select value={auditLogRowToAdd.department_id} onChange={(e) => {setAuditLogRowToAdd({...auditLogRowToAdd, department_id: e.target.value})}}>
                                                {departments.map((department: Department) => (
                                                    <option value={department.id} key={`add_io_dep_${department.id}`}>{department.name}</option>
                                                ))}
                                            </select>
                                        </label>
                                        <label>
                                            <div>{t('form.date')}</div>
                                            <div>
                                                <DatePicker className="picker" locale={isEs ? 'es' : undefined} selected={new Date(auditLogRowToAdd.date)} onChange={(d: Date | null) => d && setAuditLogRowToAdd({...auditLogRowToAdd, date: format(d, 'MM-dd-yyyy')})} dateFormat={'MM-dd-yyyy'}></DatePicker>
                                            </div>
                                        </label>
                                        <label>
                                            <div>{t('form.shift')}</div>
                                            <select value={auditLogRowToAdd.shift ?? '-'} onChange={(e) => {setAuditLogRowToAdd({...auditLogRowToAdd, shift: e.target.value})}}>
                                                <option value="10 AM - 6 PM">10 AM - 6 PM</option>
                                                <option value="4 PM - 10 PM">4 PM - 10 PM</option>
                                                <option value="-">-</option>
                                            </select>
                                        </label>
                                        <label>
                                            <div>{t('form.category')}</div>
                                            <select value={auditLogRowToAdd.category} onChange={(e) => {setAuditLogRowToAdd({...auditLogRowToAdd, category: e.target.value})}}>
                                                {categories.map((category: IdName) => (<option value={category.name} key={`add_io_category_${category.id}`}>{category.name}</option>))}
                                            </select>
                                        </label>
                                    
                                        <label>
                                            <div>{t('form.status')}</div>
                                            <select value={auditLogRowToAdd.status} onChange={(e) => {setAuditLogRowToAdd({...auditLogRowToAdd, status: e.target.value})}}>
                                                <option value="Unset">{t('status.unset')}</option>
                                                <option value="In progress">{t('status.inProgress')}</option>
                                                <option value="Resolved">{t('status.resolved')}</option>
                                            </select>
                                        </label>
                                        <label>
                                            <div>{t('form.severity')}</div>
                                            <select value={auditLogRowToAdd.severity} onChange={(e) => {setAuditLogRowToAdd({...auditLogRowToAdd, severity: e.target.value})}}>
                                                <option value="Low">{t('severity.low')}</option>
                                                <option value="Med">{t('severity.med')}</option>
                                                <option value="High">{t('severity.high')}</option>
                                            </select>
                                        </label>
                                    </form>
                                    </div>
                                    <label>
                                        <div>{t('form.description')}</div>
                                        <textarea placeholder={t('form.descriptionPlaceholder')} value={auditLogRowToAdd.text} onChange={(e) => {setAuditLogRowToAdd({...auditLogRowToAdd, text: e.target.value})}}></textarea>
                                    </label>
                                <div>
                                    {auditLogRowToAdd.id && (<span className='button-w-r-sm delete' onClick={() => {setShowDelete(true)}}>{t('form.delete')}</span>)}
                                    <div className='button-w-bl' onClick={() => {setShowAdd(false)}}>{t('form.cancel')}</div>
                                    <button className='button-d-bl' type='submit' form='add-action-tracker-row'>{!auditLogRowToAdd.id ? t('form.add') : t('form.save')}</button>
                                </div>
                            </div>
                        </div>
                    )}
                    {rowShowActions !== null && (
                        <div className='confirm actions-list'>
                            <div>
                                <h1><strong>{t('actionsList.title')}</strong></h1>
                                <div>
                                    {rowShowActions.actions && rowShowActions.actions?.length > 0 ? rowShowActions.actions?.map((action: Action) => (
                                        <div key={action.id} className={action.user_id === user.id ? 'my-action' : ''}>
                                            <div>
                                                <UserCircle user_name={users.find((user: User) => user.id === action.user_id)?.name ?? t('actionsList.defaultUser')} size={25}></UserCircle>
                                                <div>{users.find((user: User) => user.id === action.user_id)?.name ?? t('actionsList.defaultUser')}</div>
                                            </div>
                                            <div>{format(new Date(action.date), 'MM-dd-yyyy hh:mm aa')}</div>
                                            <div>{action.text}</div>
                                        </div>
                                    )) : (
                                        <h4>{t('actionsList.empty')}</h4>
                                    )}
                                </div>
                                <span onClick={() => {setRowShowActions(null)}} className='x'>x</span>
                                {auditLogData.find((row: DailyLogRow) => row.id === rowShowActions.id)?.date_resolved !== null && (<b>{t('actionsList.resolvedSuccessfully')}</b>)}
                                <div className={auditLogData.find((row: DailyLogRow) => row.id === rowShowActions.id)?.date_resolved === null && user.permissions.add_actions_to_io === true ? '' : 'resolved'}>
                                    <div className={user.permissions.add_actions_to_io === true ? "button-d-bl-sm" : "button-d-bl-sm d"} onClick={async () => {
                                        const result = await sendActionTrackerRow({
                                            ...rowShowActions,
                                                actions: [
                                                ...(rowShowActions.actions ?? []),
                                                {
                                                    id: crypto.randomUUID(),
                                                    text: actionToAdd || 'No description',
                                                    date: new Date().toISOString(),
                                                    user_id: user.id
                                                }
                                            ],})
                                        if (result === true && user.id !== rowShowActions.user_id) {
                                            sendMessageGlobal({
                                                text: t('actionsList.notification', {
                                                    issue: rowShowActions.text.slice(0, 10),
                                                    action: actionToAdd || 'No description',
                                                }),
                                                from_user: user.id,
                                                to_user: rowShowActions.user_id,
                                                timestamp: new Date()
                                            })
                                        }
                                        }}>{t('actionsList.addAction')}</div>
                                    <label className={user.permissions.add_actions_to_io === true ? "is-resolved" : "is-resolved d"} >
                                        <div>{t('actionsList.issueResolved')}</div>
                                        <input type="checkbox" checked={rowShowActions?.date_resolved !== null || false} onChange={(e) => {
                                            if (user.permissions.add_actions_to_io !== true) return;
                                            setRowShowActions({
                                                ...rowShowActions,
                                                date_resolved: e.target.checked ? format(new Date(), 'MM-dd-yyyy hh:mm aa') : null,
                                                status: 'Resolved'
                                            })
                                        }} />
                                    </label>
                                    <textarea name="" id="" placeholder={t('actionsList.newActionPlaceholder')} value={actionToAdd} onChange={(e) => {if (user.permissions.add_actions_to_io !== true) return; setActionToAdd(e.target.value)}
                                    } className={user.permissions.add_actions_to_io === true ? "" : " d"}></textarea>
                                </div>
                            </div>
                        </div>)
                    } 
                    {showDelete && (
                        <div className='confirm'>
                            <div>
                                <h1>{t('confirm.deleteTitle')}</h1>
                                <div>
                                    <div className='button-w-bl' onClick={() => {setShowDelete(false)}}>{t('confirm.cancel')}</div>
                                    <button className='button-w-r' onClick={() => { 
                                        deleteActionTrackerRow(auditLogRowToAdd ? auditLogRowToAdd.id ?? null : null)
                                    }}>{t('confirm.delete')}</button>
                                </div>
                            </div>
                        </div>
                    )}
                    {showResolve && (
                        <div className='confirm'>
                            <div>
                                <h1>{t('confirm.statusTitle')}</h1>
                                <div>
                                    <div className='button-w-bl' onClick={() => {setShowResolve(false)}}>{t('confirm.cancel')}</div>
                                    <button className='button-d-bl' onClick={() => { 
                                        sendActionTrackerRow(rowToResolve)
                                    }}>{t('confirm.confirm')}</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}