import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

import DashboardClient from "../DashboardClient";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/landing");
  }

  return (
    <DashboardClient user={user}>
      {children}
    </DashboardClient>
  );
}

// import { redirect } from "next/navigation";
// import { getCurrentUser } from "@/lib/auth";

// import Sidebar from "../src/components/Sidebar";
// import Header from "../src/components/Header";
// import DateProvider from "../src/components/DateProvider";
// import { UserProvider } from "../src/components/UserProvider";
// import Chat from "../src/components/Chat";
// import { useState } from "react";


// export default async function DashboardLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   const [openChat, setOpenChat] = useState(false);

//   const user = await getCurrentUser();
//   console.log('(dashboard) user')
//   console.log(user)
  

//   if (!user) {
//     redirect("/landing");
//   }


//   return (
//     <UserProvider user={user}>
//       <DateProvider>

//         <Sidebar user={user} />

//         <div>
//           <Header
//             user_name={user.name}
//             user_role={user.role}
//             />

//           <Chat openChat={openChat} setOpenChat={setOpenChat}></Chat>
//           {children}

//         </div>

//       </DateProvider>
//     </UserProvider>
//   );
// }