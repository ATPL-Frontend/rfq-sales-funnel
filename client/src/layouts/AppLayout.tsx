import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ChevronUp, LogOut, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Outlet } from "react-router-dom";
import AppSidebar from "../components/AppSidebar";
import { useAuth } from "../lib/auth";

// Throttle helper to avoid excessive state updates
const throttle = (fn: () => void, delay: number) => {
  let lastCall = 0;
  return () => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      fn();
    }
  };
};

const ModeToggle = () => {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const AppLayout = () => {
  const { logout } = useAuth();
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = throttle(() => {
      // Use window scrollY (vertical scroll position)
      setShowScrollTop(window.scrollY > 200);
    }, 100); // throttle to 100ms

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // initial check

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleLogout = () => {
    logout();
    toast.success("Logout successful");
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="flex flex-col w-full overflow-hidden">
        <header className="flex justify-between h-[45px] shrink-0 items-center gap-2 border-b px-4 shadow">
          <SidebarTrigger />
          <div className="flex items-center gap-2">
            <ModeToggle />
            <LogOut
              className="size-8 p-2 bg-background hover:bg-accent rounded cursor-pointer transition-colors border"
              onClick={handleLogout}
            />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4">
          <Outlet />
        </main>
      </SidebarInset>

      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-9999 rounded-full bg-primary text-white shadow-lg hover:opacity-90 transition-opacity animate-bounce"
          aria-label="Scroll to top"
          size="icon"
        >
          <ChevronUp className="size-4" />
        </Button>
      )}
    </SidebarProvider>
  );
};

export default AppLayout;