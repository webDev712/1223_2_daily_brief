"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useUser } from "./UserProvider";

type WidgetUser = {
  email: string;
  name: string;
};

type ApiUserRow = {
  email?: string | null;
  name?: string | null;
  archived?: boolean;
};

const ALL_SECTIONS = [
  "ideas",
  "questions",
  "bugs",
  "in_progress",
  "current_update",
  "completed",
];

declare global {
  interface Window {
    FeedbackBoard?: {
      init: (options: {
        email: string;
        name: string;
        scopes?: string[] | { view?: string[]; write?: string[] };
        users?: WidgetUser[];
      }) => void;
    };
  }
}

export default function FeedbackWidget() {
  const user = useUser();
  const [scriptReady, setScriptReady] = useState(
    () => typeof window !== "undefined" && Boolean(window.FeedbackBoard)
  );
  const [users, setUsers] = useState<WidgetUser[] | null>(null);

  const isOwner = user.id === user.main_admin_id;
  const isManager =
    user.role?.trim().toLowerCase() === "manager" ||
    user.permissions?.reasign_reports === true;
  const isDeveloper =
    Boolean(user.email) && user.email.trim().toLowerCase().startsWith("gasdev");
  const hasWidgetAccess = Boolean(user?.email) && (isOwner || isManager || isDeveloper);

  useEffect(() => {
    if (!hasWidgetAccess) return;
    let cancelled = false;

    async function loadUsers() {
      try {
        const res = await fetch("/api/users", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setUsers([]);
          return;
        }
        const data: ApiUserRow[] = await res.json();
        if (!Array.isArray(data)) {
          if (!cancelled) setUsers([]);
          return;
        }
        const list = data
          .filter((u) => !u.archived && typeof u.email === "string" && u.email.trim() !== "")
          .map((u) => ({
            email: u.email!.trim(),
            name: (u.name || u.email || "").trim(),
          }));
        if (!cancelled) setUsers(list);
      } catch {
        if (!cancelled) setUsers([]);
      }
    }

    loadUsers();
    return () => {
      cancelled = true;
    };
  }, [hasWidgetAccess, user?.company_id]);

  useEffect(() => {
    if (!hasWidgetAccess || !scriptReady || users === null || !user?.email) return;
    window.FeedbackBoard?.init({
      email: user.email,
      name: user.name || "",
      scopes: ALL_SECTIONS,
      users,
    });
  }, [hasWidgetAccess, scriptReady, users, user?.email, user?.name]);

  if (!hasWidgetAccess) return null;

  return (
    <Script
      id="feedback-board-widget"
      src="https://dev.dytabrief.com/widget.js"
      strategy="afterInteractive"
      onReady={() => setScriptReady(true)}
    />
  );
}
