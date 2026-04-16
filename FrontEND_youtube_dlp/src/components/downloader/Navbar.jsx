import React from "react";
import { Download, Settings, History } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <Download className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-inter font-bold text-foreground text-base tracking-tight">
            TubeGrab
          </span>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
            PRO
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors">
            <History className="w-4 h-4 text-muted-foreground" />
          </button>
          <button className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors">
            <Settings className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </nav>
  );
}