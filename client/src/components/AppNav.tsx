import { Menu } from "lucide-react";
import * as React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { cn } from "../lib/utils";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet";

export default function AppNav() {
  const { logout } = useAuth();
  const [open, setOpen] = React.useState(false);

  const links = [
    { to: "/app/users", label: "Users" },
    { to: "/app/customers", label: "Customers" },
    { to: "/app/rfq", label: "RFQ" },
    { to: "/app/sales-funnel", label: "Sales Funnel" },
    { to: "/app/invoices", label: "Invoices" },
  ];

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "px-3 py-2 rounded-md text-sm font-medium transition-colors",
      isActive
        ? "bg-primary text-primary-foreground"
        : "hover:bg-accent hover:text-accent-foreground"
    );

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4">
        <NavLink
          to="/app/sales-funnel"
          className="font-bold text-lg md:text-xl"
        >
          HRM
        </NavLink>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden md:block">
          <Button variant="secondary" onClick={logout}>
            Log out
          </Button>
        </div>

        {/* Mobile menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 px-4">
            <SheetHeader>
              <SheetTitle>Sales Funnel</SheetTitle>
            </SheetHeader>
            <Separator />
            <nav className="grid gap-1">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  className={({ isActive }) =>
                    cn(
                      "rounded-md px-3 py-2 text-sm font-medium",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent hover:text-accent-foreground"
                    )
                  }
                  onClick={() => setOpen(false)}
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>

            <Separator className="my-4" />

            <Button
              className="w-full"
              variant="secondary"
              onClick={() => {
                setOpen(false);
                logout();
              }}
            >
              Log out
            </Button>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
