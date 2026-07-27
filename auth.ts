import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import sql from "@/lib/db";

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
                    SELECT id
                    FROM website_user
                    WHERE email = ${user.email}
                    AND archived = false
                    LIMIT 1;
                `;

                console.log("DB result:", users);

                return users.length > 0;
                } catch (e) {
                console.error("DB ERROR:", e);
                throw e;
                }
        }
    }
});