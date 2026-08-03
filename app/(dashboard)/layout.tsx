import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

import Sidebar from "../src/components/Sidebar";
import Header from "../src/components/Header";
import DateProvider from "../src/components/DateProvider";
import { UserProvider } from "../src/components/UserProvider";


export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const user = await getCurrentUser();
  console.log('(dashboard) user')
  console.log(user)

  if (!user) {
    redirect("/login");
  }


  return (
    <UserProvider user={user}>
      <DateProvider>

        <Sidebar user_role={user.role} />

        <div>
          <Header
            user_name={user.name}
            user_role={user.role}
          />

          {children}

        </div>

      </DateProvider>
    </UserProvider>
  );
}