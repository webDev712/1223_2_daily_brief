import { parse } from "date-fns";

export function companyDate(timezone: string, now = new Date()) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(now);
}

export function beforeCheckTime(time: string | undefined | null, timezone: string, now = new Date()) {
    if (!time) return true;
    const [hour, period] = time.split(' ');
    const deadline = (Number(hour) % 12 + (period === 'PM' ? 12 : 0)) * 60;
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(now);
    const minutes = Number(parts.find(p => p.type === 'hour')?.value) * 60
        + Number(parts.find(p => p.type === 'minute')?.value);
    return minutes < deadline;
}

export default function formatDateWithoutTimezone(date: string) {
    const [year, month, day] = date.slice(0, 10).split('-');
    return `${month}-${day}-${year}`;
}