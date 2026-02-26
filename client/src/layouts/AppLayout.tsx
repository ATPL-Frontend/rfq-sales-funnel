import { Outlet } from "react-router-dom";
import AppSidebar from "../components/AppSidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { LogOut } from "lucide-react";
import { useAuth } from "../lib/auth";
import toast from "react-hot-toast";

const AppLayout = () => {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    toast.success("Logout successful");
  };

  return (
    <SidebarProvider>
      <AppSidebar/>

      <SidebarInset className="flex flex-col w-full overflow-hidden">
        <header className="flex justify-between h-[45px] shrink-0 items-center gap-2 border-b px-4 shadow">
          <SidebarTrigger />

          <LogOut
            className="size-8 p-2 bg-gray-100 rounded cursor-pointer"
            onClick={handleLogout}
          />
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AppLayout;
