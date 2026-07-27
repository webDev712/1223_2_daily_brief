"use client";

import { createContext, useContext } from "react";

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  lead_letter: string | null;
};

const UserContext = createContext<User | null>(null);

export function UserProvider({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  return (
    <UserContext.Provider value={user}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const user = useContext(UserContext);
  if (!user) throw new Error("UserProvider missing");
  return user;
}