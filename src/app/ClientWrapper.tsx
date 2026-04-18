"use client";

import { ReactNode } from "react";
import TopNavbar from "./TopNavbar";
import { ThemeProvider } from "@/lib/useTheme";

export default function ClientWrapper({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <div className="site-frame">
        <TopNavbar />
        {children}
      </div>
    </ThemeProvider>
  );
}
