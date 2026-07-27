"use client";

import { usePathname } from 'next/navigation';
import './css/Sidebar.css'
import Link from "next/link";

export default function Sidebar({}) {
  const pathname = usePathname();
  const selected = pathname.split("/")[1];
  return (
    <div className={selected !== "login" ? "sidebar" : "display-none"}>
        <div data-img="photo_sidebar"></div>
        <Link href="/dashboard" className={selected === 'dashboard' ? 'selected' : ''} data-img="dashboard" data-hover="Dashboard"></Link>
        <Link href="/daily-brief" className={selected === 'daily-brief' ? 'selected' : ''} data-img="daily-brief" data-hover="Daily Brief"></Link>
        <Link href="/brief-history" className={selected === 'brief-history' ? 'selected' : ''} data-img="brief-history" data-hover="Briefs History"></Link>
        {/* <Link href="/reports" className={selected === 'reports' ? 'selected' : ''} data-img="reports" data-hover="Reports"></Link> */}
        {/* <Link href="/teams-and-roles" className={selected === 'teams-and-roles' ? 'selected' : ''} data-img="teams-and-roles" data-hover="Teams and roles"></Link> */}
        
        {/* <Link href="/settings" className={selected === 'settings' ? 'selected' : ''} data-img="settings" data-hover="Settings"></Link> */}




        {/* <Link href="/reports-scheduling" className={selected === 'reports-scheduling' ? 'selected' : ''} data-img="reports-scheduling" data-hover="Reports Scheduling"></Link> */}
    </div>
  );
}