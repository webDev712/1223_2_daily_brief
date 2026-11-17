import { parse } from "date-fns";

export const WORKDAY_CUTOFF_HOUR = 3;

function zonedWallClock(timezone: string, now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
    }).formatToParts(now);
    const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(p => p.type === type)?.value);
    return {
        year: get('year'),
        month: get('month'),
        day: get('day'),
        hour: get('hour') % 24,
        minute: get('minute'),
    };
}

export function companyDate(timezone: string, now = new Date()) {
    const { year, month, day, hour } = zonedWallClock(timezone, now);
    const d = new Date(Date.UTC(year, month - 1, day));
    if (hour < WORKDAY_CUTOFF_HOUR) d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
}

export function beforeCheckTime(time: string | undefined | null, timezone: string, now = new Date()) {
    if (!time) return true;
    const [hour, period] = time.split(' ');
    const deadline = (Number(hour) % 12 + (period === 'PM' ? 12 : 0)) * 60;
    const { hour: currentHour, minute } = zonedWallClock(timezone, now);
    const minutes = currentHour * 60 + minute;
    const cutoff = WORKDAY_CUTOFF_HOUR * 60;
    return ((minutes - cutoff + 1440) % 1440) < ((deadline - cutoff + 1440) % 1440);
}

export default function formatDateWithoutTimezone(date: string) {
    const [year, month, day] = date.slice(0, 10).split('-');
    return `${month}-${day}-${year}`;
}