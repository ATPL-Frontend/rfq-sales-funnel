import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  ChevronRight,
  Cone,
  FileText,
  FileUser,
  MessageSquareQuote,
  Receipt,
  Users,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
// import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const menu = [
  {
    title: "Users",
    url: "/app/users",
    icon: Users,
  },
  {
    title: "Customers",
    url: "/app/customers",
    icon: FileUser,
  },
  {
    title: "RFQ",
    url: "/app/rfq",
    icon: MessageSquareQuote,
  },
  {
    title: "Sales Funnel",
    url: "/app/sales-funnel",
    icon: Cone,
  },
  {
    title: "Invoices",
    icon: FileText,
    subMenus: [
      {
        title: "Invoice List",
        url: "/app/invoices",
      },
      {
        title: "Invoice Summary",
        url: "/app/summary",
      },
      {
        title: "Invoice Frequency",
        url: "/app/invoice-frequency",
      },
    ],
  },
  {
    title: "Buy & Sale",
    url: "/app/buy-sale",
    icon: Receipt,
  },
];

const AppSidebar = () => {
  const { pathname } = useLocation();
  //   const isMobile = useIsMobile();

  //   const handleClick = () => {
  //     if (isMobile) {
  //       setSidebarOpen(false);
  //     }
  //   };

  return (
    <Sidebar>
      {/* HEADER */}
      <SidebarHeader className="px-4 py-2 border-b">
        <Link to="/app" className="text-lg font-semibold">
          HRM System
        </Link>
      </SidebarHeader>

      {/* CONTENT */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menu.map((item) =>
                item.subMenus ? (
                  <Collapsible
                    key={item.title}
                    defaultOpen={item.subMenus.some(
                      (sub) => pathname === sub.url,
                    )}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          className={cn(
                            item.subMenus.some((sub) => pathname === sub.url) &&
                              "bg-accent text-accent-foreground font-semibold",
                            "flex items-center gap-2",
                          )}
                        >
                          {item.icon && <item.icon className="h-4 w-4" />}
                          <span>{item.title}</span>
                          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.subMenus.map((sub) => (
                            <SidebarMenuSubItem
                              key={sub.title}
                              //   onClick={handleClick}
                            >
                              <SidebarMenuSubButton asChild>
                                <Link
                                  to={sub.url}
                                  className={cn(
                                    "w-full",
                                    pathname === sub.url
                                      ? "bg-accent text-accent-foreground font-semibold"
                                      : "hover:bg-accent hover:text-accent-foreground",
                                  )}
                                >
                                  {sub.title}
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem
                    key={item.title}
                    // onClick={handleClick}
                  >
                    <SidebarMenuButton
                      asChild
                      className={cn(
                        pathname === item.url &&
                          "bg-accent text-accent-foreground font-semibold",
                      )}
                    >
                      <Link to={item.url} className="flex items-center gap-2">
                        {item.icon && <item.icon className="h-4 w-4" />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ),
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
