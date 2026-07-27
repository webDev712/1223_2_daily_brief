"use client";

import "react-datepicker/dist/react-datepicker.css";
import { addDays, subDays, format } from "date-fns";
import { usePathname } from 'next/navigation';
import { useState, forwardRef } from "react";
import getColorsFromName from "@/lib/color";
import DatePicker from "react-datepicker";
import { useDate } from './DateContext';
import './css/Header.css'
import UserCircle from "./UserCircle";
import { signOut } from "next-auth/react";

const DateButton = forwardRef<
  HTMLDivElement,
  { value?: string; onClick?: () => void }
>(({ value, onClick }, ref) => (
  <div
    ref={ref}
    onClick={onClick}
    style={{
      
    }}
  >
    {value}
  </div>
));

DateButton.displayName = "DateButton";

type HeaderProps = {
  user_name: string;
  user_role: string;
};

export default function Header({user_name, user_role}: HeaderProps) {
  const show_date_picker = ['dashboard', 'daily-brief']
  const dont_show_date_picker = ['brief-history', 'reports', 'reports-scheduling', 'teams-and-roles', 'settings']
  const pathname = usePathname();
  const selected = pathname.split("/")[1];
  
  const { date, setDate } = useDate()

  let header_text = '';
  let header_description = '';
  switch (selected){
    case 'brief-history':
      header_text = 'Brief History';
      header_description = 'All Route Department daily briefs';
      break;
    case 'reports':
      header_text = 'Reports';
      header_description = 'Daily operational reports reviewed by each Route Lead';
      break;
    case 'reports-scheduling':
      header_text = 'Report Scheduling';
      header_description = 'Configure which reports each Route Lead is required to review';
      break;
    case 'teams-and-roles':
      header_text = 'Team & Roles';
      header_description = 'Route Department members and access permissions';
      break;
    case 'settings':
      header_text = 'Settings';
      header_description = 'Route Department configuration';
      break;
  }
  return (
    <div className={selected !== "login" ? "header" : "display-none"}>
        <div id='date_picker' className={show_date_picker.indexOf(selected) !== -1 ? "" : 'display-none'}>
            <div id='back' onClick={() => setDate(subDays(date, 1))}></div>
            <div onClick={() => setDate(new Date())}>
                <div id='today'>
                  Today
                </div>
            </div>
            <div id='forward' onClick={() => setDate(addDays(date, 1))}></div>
        </div>
        <DatePicker
            selected={date}
            onChange={(d: any) => d && setDate(d)}
            dateFormat="EEEE, MMMM d, yyyy"
            customInput={<DateButton />}
        />
        <div>
          <h1>{header_text}</h1>
          <p>{header_description}</p>
        </div>
        <div id="notifications"></div>
        <div id='user_name'>
          <div>
            <div>{user_name}</div>
            <div>{user_role}</div>
          </div>
          <UserCircle onClick={() => {signOut()}} user_name={user_name} size={40} />
        </div>
    </div>
  );
}
