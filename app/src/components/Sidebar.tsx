"use client";

import { usePathname } from 'next/navigation';
import './css/Sidebar.css'
import Link from "next/link";
import { useState, useEffect } from 'react';
import { User } from '@/lib/types';
import Chat from './Chat';
import LanguageSwitcher from './LanguageSwitch';
import { useTranslations } from 'next-intl';


export default function Sidebar({ user }: { user: User}) {
  const [companyName, setCompanyName] = useState('');

  const [openChat, setOpenChat] = useState(false);
  useEffect(() => {
    const load = async () => {
      const company_res = await fetch('/api/company');
      if (!company_res.ok) {
        console.error('Error while getting company data.')
        return;
      }
      const company_data = await company_res.json();
      console.log('company_data')
      console.log(company_data)
      setCompanyName(company_data[0]?.name)
    }
    load();
  }, [])
  const pages = [
    {href: 'dashboard', text: 'dashboard', permission_name: 'see_dashboard'},
    {href: 'daily-brief', text: 'daily_brief', permission_name: 'see_brief'},
    {href: 'brief-history', text: 'brief_history', permission_name: 'see_briefs_history'},
    {href: 'reports', text: 'reports', permission_name: 'see_reports_page'},
    {href: 'teams-and-roles', text: 'teams_and_roles', permission_name: 'see_team_roles'},
    {href: 'production-dashboard', text: 'production_dashboard', permission_name: 'see_production_dashboard'},
    {href: 'action-tracker', text: 'action_tracker', permission_name: ''},
    {href: 'settings', text: 'settings', permission_name: 'see_profile_settings'},
  ]

  const pathname = usePathname();
  const selected = pathname.split("/")[1];
  const [mobileShow, setMobileShow] = useState(false)
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth <= 500);

    update();
    window.addEventListener("resize", update);
    setLoading(false)
    return () => window.removeEventListener("resize", update);
  }, []);
  const translation = useTranslations('Sidebar');
  return (
    <div className={selected !== "login" ? "sidebar" : "display-none"}>
      <div>
        <div data-img="photo_sidebar"></div>
          <span>{companyName}</span>
          <div data-img="burger" onClick={() => {setMobileShow(prev => !prev)}}></div>
        </div>
        {!loading && (mobileShow || !isMobile) && (
          <div className='flex'>
            {pages.map((page) => {
              if (page.permission_name === '' || user.permissions[page.permission_name] === true) {
                return (<div key={`page_${page.href}`}>
                  <Link onClick={() => {setTimeout(() => {setOpenChat(false)}, 400); setMobileShow(prev => !prev)}} href={`/${page.href}`} className={selected === page.href ? 'selected' : ''} data-img={page.href} data-hover={translation(page.text)}>
                    <h1>{translation(page.text)}</h1>
                  </Link>
                  
                </div>)
                }
            })}
          <Chat openChat={openChat} setOpenChat={setOpenChat}></Chat>
          <LanguageSwitcher></LanguageSwitcher>
          </div>
        )}
    </div>
  );
}