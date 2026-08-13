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

type Assignment = {
  all: {
    assigned: boolean;
    list: string[];
  };
  person: {
    assigned: boolean;
    list: string[];
  };
  department: {
    assigned: boolean;
    list: string[];
  };
};

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
  assigned_to: Assignment;
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
  department: string,
  permissions: DBPermissions,
  selectedAnotherRole: boolean,
  role_id: string
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

export interface Department {
  id: string,
  name: string,
}

export interface Permission {
  id: number,
  name: string,
  js_name: keyof DBPermissions,
}

export interface SelectedPermission extends Permission {
  selected: boolean
}

export interface DBPermissions {
  [key: string]: boolean;
  
  add_users: boolean;
  add_roles: boolean,
  see_brief: boolean;
  edit_reports: boolean;
  update_brief: boolean;
  handoff_brief: boolean;
  see_dashboard: boolean;
  see_all_briefs: boolean;
  see_team_roles: boolean;
  see_app_settings: boolean;
  see_reports_page: boolean;
  edit_app_settings: boolean;
  see_briefs_history: boolean;
  see_profile_settings: boolean;
  edit_profile_settings: boolean;
  archive_give_access_users: boolean;
}

export interface Role {
  id: string,
  name: string,
  permissions: DBPermissions
}