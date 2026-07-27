"use client";

import { usePathname } from 'next/navigation';
import './css/Sidebar.css'
import Link from "next/link";
import { useState, useEffect } from 'react';

export default function Sidebar({}) {
  const pathname = usePathname();
  const selected = pathname.split("/")[1];
  const [mobileShow, setMobileShow] = useState(false)
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const update = () => {
      setIsMobile(window.innerWidth <= 500);
    };

    update(); // при первом рендере
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
            <div>
              <Link onClick={() => {setMobileShow(prev => !prev)}} href="/dashboard" className={selected === 'dashboard' ? 'selected' : ''} data-img="dashboard" data-hover="Dashboard"></Link>
              <h1>Dashboard</h1>
            </div>
            <div>
              <Link onClick={() => {setMobileShow(prev => !prev)}} href="/daily-brief" className={selected === 'daily-brief' ? 'selected' : ''} data-img="daily-brief" data-hover="Daily Brief"></Link>
              <h1>Daily Brief</h1>
            </div>
            <div>
              <Link onClick={() => {setMobileShow(prev => !prev)}} href="/brief-history" className={selected === 'brief-history' ? 'selected' : ''} data-img="brief-history" data-hover="Briefs History"></Link>
              <h1>Brief History</h1>
            </div>
            {/* <Link href="/reports" className={selected === 'reports' ? 'selected' : ''} data-img="reports" data-hover="Reports"></Link> */}
            {/* <Link href="/teams-and-roles" className={selected === 'teams-and-roles' ? 'selected' : ''} data-img="teams-and-roles" data-hover="Teams and roles"></Link> */}
            
            {/* <Link href="/settings" className={selected === 'settings' ? 'selected' : ''} data-img="settings" data-hover="Settings"></Link> */}
          </div>
          
        )}




        {/* <Link href="/reports-scheduling" className={selected === 'reports-scheduling' ? 'selected' : ''} data-img="reports-scheduling" data-hover="Reports Scheduling"></Link> */}
    </div>
  );
}