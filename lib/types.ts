export interface SavedBrief {
  id: number;
  date: string;
  updated_at: string | null;
  driving: boolean;
  shift: string | null;
  lead_name: string;
  letter: string;
  reports_reviewed: number | null;
  reports_all_count: number | null;
  notes: string | null;
  lead_id: string;
  original_lead_id: string;
  freezed: boolean;
  findings: Finding[] | null;
  projects: Project[];
  reports: Report[];
  tasks: Task[];
  covered: Covered[];
}

export interface Report {
  id: number;
  text: string;
  name: string;
  source: string;
  checked: boolean;
  saved_brief_id: number;
  timestamp: string | null;
  archived: boolean;
  once_per: string | null;
  start_at_day: string | null;
  edit: boolean;
}

export interface Finding {
  id: string;
  text: string;
  created_at: string;
  type: string;
  description: string;
}

export interface Project {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: string;
  text: string;
  task_type: string;
  checked: boolean;
}

export interface User {
  id: string,
  email: string,
  name: string,
  role: string,
  user_role: string,
  lead_letter: string,
  phone: string,
  archived: boolean,
}

export interface Shift {
  id: string,
  name: string
}

export interface Covered {
  id: string,
  covering_for: string,
  route_zone: string,
  van: string,
  stops: number,
  windows: string,
}