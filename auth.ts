import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import sql from "@/lib/db";
import { DBPermissions } from "./lib/types";

interface AuthUser {
    id: string;
    company_id: string;
    permissions: DBPermissions;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],

    callbacks: {
        async signIn({ user }) {
            if (!user.email) return false;

            try {
                const users = await sql`
                    SELECT
                        w.id,
                        w.company_id,
                        r.permissions
                    FROM website_user w
                    JOIN role r
                        ON r.id = w.role_id
                    WHERE w.email = ${user.email}
                      AND w.archived = false
                    LIMIT 1;
                `;

                if (users.length === 0) {
                    return false;
                }

                const dbUser = users[0] as AuthUser;

                user.id = dbUser.id as string;
                user.company_id = dbUser.company_id as string;
                user.permissions = dbUser.permissions as DBPermissions;

                return true;
            } catch (e) {
                console.error("DB ERROR:", e);
                throw e;
            }
        },

        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.company_id = user.company_id;
                token.permissions = user.permissions;
            }

            return token;
        },

        async session({ session, token }) {
            session.user.id = token.id as string;
            session.user.company_id = token.company_id as string;
            session.user.permissions = token.permissions as DBPermissions;

            return session;
        },
    },
});