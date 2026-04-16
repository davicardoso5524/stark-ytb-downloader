import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, ListVideo, Settings, History, X, ChevronRight } from "lucide-react";

const NAV_ITEMS = [
  { id: "downloader", label: "Downloader", icon: Download },
  { id: "playlist", label: "Playlist", icon: ListVideo },
  { id: "history", label: "Histórico", icon: History },
  { id: "settings", label: "Configurações", icon: Settings },
];

export default function Sidebar({ activePage, setActivePage, mobileOpen, setMobileOpen }) {
  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 h-14 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <Download className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span className="font-inter font-bold text-sidebar-foreground text-sm tracking-tight">TubeGrab</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">PRO</span>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden w-7 h-7 rounded-lg flex items-center justify-center hover:bg-sidebar-accent transition-colors"
        >
          <X className="w-4 h-4 text-sidebar-foreground" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const active = activePage === id;
          return (
            <button
              key={id}
              onClick={() => { setActivePage(id); setMobileOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                active
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </div>
              {!active && (
                <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40 transition-opacity" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">U</div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-sidebar-foreground truncate">Usuário</p>
            <p className="text-[11px] text-muted-foreground truncate">Plano Gratuito</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/60 z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-56 z-50 md:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}