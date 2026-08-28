"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { FileImage, Files, GalleryHorizontalEnd, Home, LayoutTemplate, Palette, PlugZap, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AccountMenu } from "./account-menu";
import { ThemeToggle } from "./theme-toggle";

const workItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/drafts", label: "Drafts", icon: Files },
  { href: "/carousels", label: "Carousels", icon: GalleryHorizontalEnd },
  { href: "/renders", label: "Exports", icon: FileImage },
];

const libraryItems = [
  { href: "/brands", label: "Brand kits", icon: Palette },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
];

const pageTitles: Array<[string, string, string]> = [
  ["/create", "Create", "Compose a new post"],
  ["/carousel-renders", "Carousel export", "Immutable approved slides"],
  ["/carousels", "Carousels", "Multi-slide stories"],
  ["/drafts", "Drafts", "Shared work in progress"],
  ["/renders", "Exports", "Approved immutable media"],
  ["/brands", "Brand kits", "Rules your agent cannot drift from"],
  ["/templates", "Templates", "Reusable visual systems"],
  ["/connections", "Agent setup", "Connect tools to this workspace"],
  ["/", "Home", "Your media workspace"],
];

function pathIsActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [, title, description] = pageTitles.find(([prefix]) => pathIsActive(pathname, prefix)) ?? pageTitles.at(-1)!;

  return (
    <SidebarProvider defaultOpen className="app-shell" style={{ "--sidebar-width": "15.5rem", "--sidebar-width-icon": "3.5rem" } as CSSProperties}>
      <Sidebar collapsible="icon" variant="sidebar" className="border-sidebar-border/80">
        <SidebarHeader className="gap-3 px-3 pb-2 pt-4">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" render={<Link href="/" aria-label="NoCanva home" />} className="h-10 hover:bg-transparent data-[active=true]:bg-transparent">
                <span className="app-mark">N</span>
                <span className="grid min-w-0 flex-1 text-left leading-tight"><strong className="truncate text-[15px] tracking-[-.035em]">NoCanva</strong><small className="truncate text-[10px] font-normal text-sidebar-foreground/55">Personal workspace</small></span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <Button nativeButton={false} render={<Link href="/create" />} className="new-design-button group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:px-0" size="lg">
            <Plus /><span className="group-data-[collapsible=icon]:hidden">New design</span>
          </Button>
        </SidebarHeader>

        <SidebarContent className="px-1">
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent><SidebarMenu>{workItems.map((item) => <SidebarMenuItem key={item.href}><SidebarMenuButton tooltip={item.label} isActive={pathIsActive(pathname, item.href)} render={<Link href={item.href} />}><item.icon /><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Library</SidebarGroupLabel>
            <SidebarGroupContent><SidebarMenu>{libraryItems.map((item) => <SidebarMenuItem key={item.href}><SidebarMenuButton tooltip={item.label} isActive={pathIsActive(pathname, item.href)} render={<Link href={item.href} />}><item.icon /><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu></SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="gap-1 border-t border-sidebar-border/70 p-3">
          <SidebarMenu><SidebarMenuItem><SidebarMenuButton tooltip="Agent setup" isActive={pathIsActive(pathname, "/connections")} render={<Link href="/connections" />}><PlugZap /><span>Agent setup</span></SidebarMenuButton></SidebarMenuItem></SidebarMenu>
          <div className="workspace-account"><AccountMenu /></div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0">
        <header className="app-topbar">
          <div className="app-topbar-context"><SidebarTrigger /><Separator orientation="vertical" className="h-4" /><div><strong>{title}</strong><span>{description}</span></div></div>
          <div className="app-topbar-actions"><span className="workspace-presence"><i /> Synced</span><ThemeToggle /></div>
        </header>
        <div className="app-content">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
