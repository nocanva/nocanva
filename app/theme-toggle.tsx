"use client";

import { useSyncExternalStore } from "react";
import { Switch } from "./ui/switch";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
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

  function changeTheme(checked: boolean) {
    applyTheme(checked ? "dark" : "light");
  }

  return (
    <label className="theme-control">
      <span className="theme-control-label">{theme === "dark" ? "Night" : "Day"}</span>
      <Switch aria-label="Use dark mode" checked={theme === "dark"} onCheckedChange={changeTheme} />
    </label>
  );
}
