import React from "react";
import { Menu } from "lucide-react";

const PAGE_TITLES = {
  downloader: "Downloader",
  playlist: "Playlist",
  history: "Histórico",
  settings: "Configurações",
};

export default function TopBar({ activePage, onMenuClick }) {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/80 border-b border-border h-14 flex items-center px-4 gap-3">
      <button
        onClick={onMenuClick}
        className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors"
      >
        <Menu className="w-4 h-4 text-foreground" />
      </button>
      <h2 className="font-inter font-bold text-foreground text-base">{PAGE_TITLES[activePage]}</h2>
    </header>
  );
}