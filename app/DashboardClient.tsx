"use client";

import { useState } from "react";

import Sidebar from "./src/components/Sidebar";
import Header from "./src/components/Header";
import DateProvider from "./src/components/DateProvider";
import { UserProvider } from "./src/components/UserProvider";
import Chat from "./src/components/Chat";

export default function DashboardClient({
  user,
  children,
}: {
  user: any; // Замени на свой тип пользователя
  children: React.ReactNode;
}) {
  const [openChat, setOpenChat] = useState(false);

  return (
    <UserProvider user={user}>
      <DateProvider>
        <Sidebar user={user} />

        <div>
          <Header
            user_name={user.name}
            user_role={user.role}
          />

          <Chat
            class_name="mobile_chat chat"
            openChat={openChat}
            setOpenChat={setOpenChat}
          />

          {children}
        </div>
      </DateProvider>
    </UserProvider>
  );
}