"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  LayoutDashboard,
  Menu,
  Moon,
  Sun,
  LogOut,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { useTheme } from "next-themes";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { theme, setTheme } = useTheme();

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "U";

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={cn(
          "flex flex-col border-r bg-card transition-all duration-300",
          sidebarOpen ? "w-64" : "w-0 overflow-hidden",
          "hidden md:flex",
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <FileText className="h-5 w-5" />
          <span className="font-bold text-lg">CollabDocs</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t p-3 space-y-2">
          <div className="flex items-center gap-3 px-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {session?.user?.name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {session?.user?.email}
              </p>
            </div>
          </div>
          <Separator />
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center gap-4 border-b px-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleSidebar}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeft className="h-4 w-4" />
            )}
          </Button>
          <div className="flex items-center gap-2 md:hidden">
            <FileText className="h-5 w-5" />
            <span className="font-bold">CollabDocs</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
