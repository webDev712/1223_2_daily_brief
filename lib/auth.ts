import { auth } from "@/auth";
import sql from "@/lib/db";
import { DBPermissions } from "./types";

export type UserRole = "manager" | "lead";

export interface CurrentUser {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    lead_letter: string | null;
    permissions: DBPermissions;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
    const session = await auth();

    if (!session?.user?.email) {
        return null;
    }
    

    const users = await sql`
        SELECT
            w.id,
            w.email,
            w.name,
            r.name AS role,
            w.lead_letter,
            w.phone,
            d.name AS department,
            r.permissions
        FROM website_user w, department d, role r
        WHERE email = ${session.user.email}
          AND archived = false
          AND d.id = w.department_id
          AND w.role_id = r.id
        LIMIT 1;
    `;

    if (users.length === 0) {
        return null;
    }
    console.log('users[0]')
    console.log(users[0])

    return users[0] as CurrentUser;
}

const roleLevel: Record<UserRole, number> = {
    lead: 1,
    manager: 2,
};

export async function requireRole(role: UserRole) {
    const user = await getCurrentUser();
    
    if (!user) {
        throw new Error("Unauthorized");
    }

    if (roleLevel[user.role] < roleLevel[role]) {
        throw new Error("Forbidden");
    }

    return user;
}