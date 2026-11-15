"use client";

import { useEffect, useState } from "react";
import DateContext from "./DateContext";
import { useUser } from "./UserProvider";
import { companyDate } from "@/lib/date";
import { format } from "date-fns";

export default function DateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useUser();
  const [today, setToday] = useState(() => companyDate(user.timezone));
  const [now, setNow] = useState(() => new Date());
  const [date, setDate] = useState(() => new Date(today + 'T12:00:00'));

  useEffect(() => {
    const refresh = () => {
      const current = new Date();
      setNow(previous => Math.floor(previous.getTime() / 60000) === Math.floor(current.getTime() / 60000) ? previous : current);
      const next = companyDate(user.timezone);
      if (next !== today) {
        setDate(previous => format(previous, 'yyyy-MM-dd') === today ? new Date(next + 'T12:00:00') : previous);
        setToday(next);
      }
    };
    const timer = setInterval(refresh, 1000);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [today, user.timezone]);

  return (
    <DateContext.Provider value={{ date, setDate, today, timezone: user.timezone, now }}>
      {children}
    </DateContext.Provider>
  );
}