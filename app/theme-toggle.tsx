"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
  window.localStorage.setItem("nocanva-theme", theme);
  window.dispatchEvent(new Event("nocanva-theme-change"));
}

function subscribe(onChange: () => void) {
  window.addEventListener("nocanva-theme-change", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("nocanva-theme-change", onChange);
    window.removeEventListener("storage", onChange);
  };
}

function getTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme, () => "light");

  return (
    <Tooltip>
      <TooltipTrigger render={<Button aria-label={`Use ${theme === "dark" ? "light" : "dark"} mode`} size="icon-sm" variant="ghost" onClick={() => applyTheme(theme === "dark" ? "light" : "dark")} />}>
        {theme === "dark" ? <Sun /> : <Moon />}
      </TooltipTrigger>
      <TooltipContent>{theme === "dark" ? "Light mode" : "Dark mode"}</TooltipContent>
    </Tooltip>
  );
}
