"use client";

import { useDate } from "@/app/src/components/DateContext";
import Loader from "@/app/src/components/Loader";
import { Department, ProductionRow } from "@/lib/types";
import { useEffect, useState } from "react";
import { format, toDate } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { useLocale, useTranslations } from "next-intl";
import './page.css'
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
import { getTestEmployees } from "@/lib/config";
import getColorsFromName from "@/lib/color";
import { toast } from "sonner";

export default function ProductionDashboard() {
    const t = useTranslations('ProductionDashboard');
    const locale = useLocale();
    const dateLocale = locale.startsWith('es') ? es : enUS;

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
    const [showDateRange, setShowDateRange] = useState(false);

const [draftRange, setDraftRange] = useState<Range>({
    startDate: dateFrom,
    endDate: dateTo,
    key: "selection",
});

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
    const [employee, setEmployee] = useState('')
    const [department, setDeparment] = useState('')
    const [showOnlyWithNotes, setShowOnlyWithNotes] = useState(false);


    const [resultsCount, setResultsCount] = useState(0);

    const [reload, setReload] = useState(0)

    const sendNotes = (id: string, newNotes: string) => {
        fetch('/api/ppohMaster', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id: id, notes: newNotes})}).then(res => {if (res.status === 200) toast.success(t('toasts.notesUpdated'))})
    }

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const ppoh_master_res = await fetch(`/api/ppohMaster?page=${page}&page_size=${pageSize}&from_date=${format(dateFrom, 'yyyy-MM-dd')}&to_date=${format(dateTo, 'yyyy-MM-dd')}&page=${page}${employee ? `&employee=${employee}` : ''}${department ? `&department=${department}` : ''}${showOnlyWithNotes ? '&only_with_notes=true' : ''}`);
            setShowOnlyWithNotes(false);
            if (!ppoh_master_res.ok){
                console.log('Failed to load ppoh_master');
                setLoading(false);
                return;
            }
            const ppoh_master_data = await ppoh_master_res.json();
            setTableData(ppoh_master_data.rows)
            setResultsCount(ppoh_master_data.count)

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
                        <div className="production-date-range">
    <label>
        <span>{t('filters.timeframe')}</span>

        <button
            type="button"
            className="production-date-range-trigger input"
            onClick={() => {
                setDraftRange({
                    startDate: dateFrom,
                    endDate: dateTo,
                    key: "selection",
                });
                setShowDateRange(prev => !prev);
            }}
        >
            📅 {format(dateFrom, t('dateFormat'), { locale: dateLocale })}
            {" - "}
            {format(dateTo, t('dateFormat'), { locale: dateLocale })}
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
                        {t('filters.cancel')}
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            const from = draftRange.startDate;
                            const to = draftRange.endDate;

                            if (!from || !to) return;

                            if (from > to) {
                                toast.error(t('toasts.invalidRange'));
                                return;
                            }

                            setDateFrom(from);
                            setDateTo(to);
                            setShowDateRange(false);
                        }}
                    >
                        {t('filters.select')}
                    </button>
                </div>
            </div>
        </>
    )}
</div>
                        <label>
                            <span>{t('filters.employee')}</span>
                            <select defaultValue={employee} onChange={(e) => setEmployee(e.target.value)}>
                                <option value="">{t('filters.all')}</option>
                                {getTestEmployees().map((e: any) => (
                                    <option key={e.id} value={e.id}>{e.name}</option>
                                ))}

                            </select>
                        </label>
                        <label>
                            <span>{t('filters.department')}</span>
                            <select defaultValue={department} onChange={(e) => setDeparment(e.target.value)}>
                                <option value="">{t('filters.all')}</option>
                                {departments.map((dep_name: string) => {if (dep_name !== '') return (
                                    <option key={dep_name} value={dep_name}>{dep_name}</option>
                                )})}
                            </select>
                        </label>
                        <div className="button-d-bl-sm" onClick={() => {
                            if (dateFrom > dateTo) {
                                toast.error(t('toasts.invalidRange')); 
                                return 0;
                            };
                            if (dateFrom < new Date("2026-02-11")) {
                                // toast.error("Historical data in the Production Dashboard is available from February 11, 2026. Please select a date range starting from this date.");
                                // return 0;
                            }
                            setPage(1);
                            setReload(prev => prev + 1);
                        }}>{t('filters.filter')}</div>
                        <div className="button-w-bl"
                            onClick={() => {
                                setShowOnlyWithNotes(true);
                                setDateFrom(new Date(2024, 0, 1));
                                setDateTo(yesterday);
                                setReload(prev => prev + 1);
                            }}
                        >{t('filters.showAllNotes')}</div>
                    </div>
                    <div className="table-wrapper">
                            <div className="table-header">
                                <div>{t('table.date')}</div>
                                <div>{t('table.employee')}</div>
                                <div>{t('table.department')}</div>
                                <div>{t('table.pieces')}</div>
                                <div>{t('table.value')}</div>
                                <div>{t('table.hours')}</div>
                                <div>{t('table.ppoh')}</div>
                                <div>{t('table.targetPpoh')}</div>
                                <div>{t('table.deltaVsTarget')}</div>
                                <div>{t('table.efficiency')}</div>
                                <div>{t('table.notes')}</div>
                            </div>
                            
                            <div className="table">
                                {tableData.map((row: ProductionRow, i) => {
                                    return (
                                    <div key={row.id}>
                                        <div>{String(row.date)}</div>
                                        {/* <div>{format(row.date, 'MM-dd-yyyy')}</div> */}
                                        <div>{row.employee_name}</div>
                                        <div style={{color: getColorsFromName(row.department).dark}}>{row.department}</div>
                                        <div before-text={t('mobileLabels.pieces')}>{row.pieces}</div>
                                        <div before-text={t('mobileLabels.value')}>{row.value}</div>
                                        <div before-text={t('mobileLabels.hours')}>{row.hours}</div>
                                        <div before-text={t('mobileLabels.ppoh')}>{row.ppoh}</div>
                                        <div before-text={t('mobileLabels.targetPpoh')}>{row.target_ppoh}</div>
                                        <div before-text={t('mobileLabels.efficiency')} className={row.delta_ppoh < 0 ? 'red-b' : row.delta_ppoh === 0 ? 'orange-b' : 'green-b'}>{row.delta_ppoh}</div>
                                        <div className={row.efficiency < 100 ? 'red-b' : row.efficiency === 100 ? 'orange-b' : 'green-b'}>{row.efficiency}</div>
                                        <div><textarea onBlur={(e) => {sendNotes(row.id, e.target.value)}} placeholder={t('table.notesPlaceholder')} defaultValue={row.notes || ""}></textarea></div>
                                    </div>)
                                })}
                            </div>
                            <div className="table-footer">
                                <div>{t('footer.displayed', { shown: tableData.length, total: resultsCount })}</div>
                                <div>
                                    <div className={page > 1 ? '' : 'd'} onClick={() => {if (page > 1) setPage(page - 1)}}>{t('footer.back')}</div>
                                    <div>{t('footer.page', { page })}</div>
                                    <div className={page * pageSize > resultsCount ? 'd' : ''} onClick={() => {if (page * pageSize < resultsCount) setPage(page + 1)}}>{t('footer.forward')}</div>
                                </div>
                            </div>

                    </div>
                </div>)
            }
        </div>
    )
}