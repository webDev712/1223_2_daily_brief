"use client";

import { useState } from "react";
import DateContext from "./DateContext";

export default function DateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [date, setDate] = useState(new Date());

  return (
    <DateContext.Provider value={{ date, setDate }}>
      {children}
    </DateContext.Provider>
  );
}