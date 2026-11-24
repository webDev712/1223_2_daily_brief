"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useUser } from "./UserProvider";

type WidgetUser = {
  email: string;
  name: string;
};

type ApiUserRow = {
  id?: string | null;
  email?: string | null;
  name?: string | null;
  archived?: boolean;
  user_role?: string | null;
  permissions?: Record<string, boolean> | null;
};

function getWidgetAccess(
  candidate: {
    id?: string | null;
    email?: string | null;
    role?: string | null;
    user_role?: string | null;
    permissions?: Record<string, boolean> | null;
  },
  mainAdminId?: string | null
): "full" | "bugs" | null {
  if (!candidate?.email || !candidate.email.trim()) return null;
  const isOwner = Boolean(mainAdminId) && candidate.id === mainAdminId;
  const roleName = (candidate.role ?? candidate.user_role)?.trim().toLowerCase();
  const isManager =
    roleName === "manager" || candidate.permissions?.reasign_reports === true;
  const isDeveloper = candidate.email.trim().toLowerCase().startsWith("gasdev");
  if (isOwner || isManager || isDeveloper) return "full";
  if (roleName === "department lead") return "bugs";
  return null;
}

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

  const widgetAccess = getWidgetAccess(user, user.main_admin_id);
  const hasWidgetAccess = widgetAccess !== null;
  const hasFullAccess = widgetAccess === "full";

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
          .filter((u) => !u.archived && getWidgetAccess(u, user.main_admin_id) !== null)
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
  }, [hasWidgetAccess, user?.company_id, user?.main_admin_id]);

  useEffect(() => {
    if (!hasWidgetAccess || !scriptReady || users === null || !user?.email) return;
    window.FeedbackBoard?.init({
      email: user.email,
      name: user.name || "",
      scopes: hasFullAccess ? ALL_SECTIONS : ["bugs"],
      users,
    });
  }, [hasWidgetAccess, hasFullAccess, scriptReady, users, user?.email, user?.name]);

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
