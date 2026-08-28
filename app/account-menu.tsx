"use client";

import { authClient } from "../lib/auth-client";
import { ChevronsUpDown, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "ME";
}

export function AccountMenu() {
  const { data } = authClient.useSession();
  const user = data?.user;
  const name = user?.name ?? "My workspace";
  const email = user?.email ?? "Personal workspace";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<button className="workspace-account-trigger" type="button" />}>
        <Avatar size="sm"><AvatarImage src={user?.image ?? undefined} alt="" /><AvatarFallback>{initials(name)}</AvatarFallback></Avatar>
        <span><strong>{name}</strong><small>{email}</small></span>
        <ChevronsUpDown />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" sideOffset={8} className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="grid gap-0.5"><span>{name}</span><span className="font-normal text-muted-foreground">{email}</span></DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/sign-in"; } } })}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
