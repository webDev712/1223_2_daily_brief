import { parse } from "date-fns";

export default function formatDateWithoutTimezone(date: string) {
    const [year, month, day] = date.slice(0, 10).split('-');
    return `${month}-${day}-${year}`;
}