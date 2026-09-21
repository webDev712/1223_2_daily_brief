import { DefaultSession } from "next-auth";
import { DBPermissions } from "@/lib/types";

declare module "next-auth" {
    interface User {
        id: string;
        company_id: string;
        permissions: DBPermissions;
    }

    interface Session {
        user: {
            id: string;
            company_id: string;
            permissions: DBPermissions;
        } & DefaultSession["user"];
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        company_id: string;
        permissions: DBPermissions;
    }
}