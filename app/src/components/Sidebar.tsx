"use client";

import { usePathname } from 'next/navigation';
import './css/Sidebar.css'
import Link from "next/link";
import { useState, useEffect } from 'react';
import { User } from '@/lib/types';
import { CurrentUser } from '@/lib/auth';


export default function Sidebar({ user }: { user: CurrentUser}) {
  const pages = [
    {href: 'dashboard', text: 'Dashboard', permission_name: 'see_dashboard'},
    {href: 'daily-brief', text: 'Daily Brief', permission_name: 'see_brief'},
    {href: 'brief-history', text: 'Brief History', permission_name: 'see_briefs_history'},
    {href: 'reports', text: 'Reports', permission_name: 'see_reports_page'},
    {href: 'teams-and-roles', text: 'Teams & Roles', permission_name: 'see_team_roles'},
    {href: 'settings', text: 'Settings', permission_name: 'see_profile_settings'},
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
  return (
    <div className={selected !== "login" ? "sidebar" : "display-none"}>
      <div>
        <div data-img="photo_sidebar"></div>
          <span>Helena's Cleaners</span>
          <div data-img="burger" onClick={() => {setMobileShow(prev => !prev)}}></div>
        </div>
        {!loading && (mobileShow || !isMobile) && (
          <div className='flex'>
            {pages.map((page) => {
              if (user.permissions[page.permission_name] === true) {
                return (<div key={`page_${page.href}`}>
                  <Link onClick={() => {setMobileShow(prev => !prev)}} href={`/${page.href}`} className={selected === page.href ? 'selected' : ''} data-img={page.href} data-hover={page.text}></Link>
                  <h1>{page.text}</h1>
                </div>)
                }
            })}
          </div>
        )}
    </div>
  );
}