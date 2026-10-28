"use client";

import "react-datepicker/dist/react-datepicker.css";
import { addDays, subDays, format } from "date-fns";
import { usePathname } from 'next/navigation';
import { useState, forwardRef, useEffect } from "react";
import getColorsFromName from "@/lib/color";
import DatePicker from "react-datepicker";
import { useDate } from './DateContext';
import './css/Header.css'
import UserCircle from "./UserCircle";
import { signOut } from "next-auth/react";
import { Company } from "@/lib/types";
import LanguageSwitcher from "./LanguageSwitch";
import { enUS, es } from "date-fns/locale";
import { useLocale, useTranslations } from "next-intl";

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
    <div
      ref={ref}
      onClick={onClick}
      >
      <span>{value}</span>
      </div>
  </div>
));

DateButton.displayName = "DateButton";

type HeaderProps = {
  user_name: string;
  user_role: string;
  user_id: string;
};

export default function Header({user_name, user_role, user_id}: HeaderProps) {
  const show_date_picker = ['dashboard', 'daily-brief']
  const dont_show_date_picker = ['brief-history', 'reports', 'reports-scheduling', 'teams-and-roles', 'settings']
  const pathname = usePathname();
  const selected = pathname.split("/")[1];
  const [company, setCompany] = useState<Company>();

  const locale = useLocale();
  const translation = useTranslations("Header");

  const dateLocale = locale.startsWith("es") ? es : enUS;

  const dateFormat =
    locale.startsWith("es")
      ? "EEEE, d 'de' MMMM 'de' yyyy"
      : "EEEE, MMMM d, yyyy";

  useEffect(() => {
    const load = async () => {
      const company_res = await fetch('/api/company');
      const company_data = await company_res.json();
      console.log('company_data')
      console.log(company_data)
      setCompany(company_data[0]);
    }
    load();
  }, [])
  
  const { date, setDate } = useDate()

  let header_text = '';
  let header_description = '';
  switch (selected){
    case 'brief-history':
      header_text = translation('brief_history');
      header_description = translation('all_route');
      break;
    case 'reports':
      header_text = translation('reports');
      header_description = translation('configure_what');
      break;
    case 'reports-scheduling':
      header_text = translation('report_scheduling');
      header_description = translation('configure_which');
      break;
    case 'teams-and-roles':
      header_text = translation('teams_and_roles');
      header_description = translation('route_department');
      break;
    case 'settings':
      header_text = translation('settings');
      header_description = translation('configure_your');
      break;
    case 'production-dashboard':
      header_text = translation('production_dashboard');
      header_description = translation('see_historical');
      break;
    case 'action-tracker':
      header_text = translation('action_tracker');
      header_description = translation('see_and_edit');
      break;
  }
  return (
    <div className={selected !== "login" ? "header" : "display-none"}>
        <div id='date_picker' className={show_date_picker.indexOf(selected) !== -1 ? "" : 'display-none'}>
            <div id='back' onClick={() => setDate(subDays(date, 1))}></div>
            <div onClick={() => setDate(new Date())}>
                <div id='today'>
                  {translation('today')}
                </div>
            </div>
            <div id='forward' onClick={() => setDate(addDays(date, 1))}></div>
        </div>
        <DatePicker
            selected={date}
            onChange={(d: any) => d && setDate(d)}
            dateFormat={dateFormat}
            locale={dateLocale}
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
            <div>{user_id === company?.main_admin_id ? translation('company_owner') : user_role}</div>
          </div>
          <UserCircle onClick={() => {signOut()}} user_name={user_name} size={40} />
        </div>
    </div>
  );
}
