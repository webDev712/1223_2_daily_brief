"use client";

import { createContext, useContext } from "react";

type DateContextType = {
  date: Date;
  setDate: React.Dispatch<React.SetStateAction<Date>>;
};

export const DateContext = createContext<DateContextType | undefined>(undefined);

export function useDate() {
  const context = useContext(DateContext);

  if (!context) {
    throw new Error("useDate must be used inside DateProvider");
  }

  return context;
}

export default DateContext;