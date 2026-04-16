import React from "react";
import { motion } from "framer-motion";
import { Link2, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UrlInput({ url, setUrl, onSearch, isLoading }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="max-w-2xl mx-auto px-4"
    >
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 via-primary/20 to-primary/50 rounded-2xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative flex items-center gap-3 bg-card border border-border rounded-2xl p-2 shadow-2xl shadow-black/30">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-secondary ml-1">
            <Link2 className="w-4 h-4 text-muted-foreground" />
          </div>
          <input
            type="text"
            placeholder="Cole o link do YouTube aqui..."
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm md:text-base outline-none font-inter"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
          />
          <Button
            onClick={onSearch}
            disabled={isLoading}
            className="rounded-xl px-5 h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Buscar
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
        <span>Suporta:</span>
        <span className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground font-medium">youtube.com</span>
        <span className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground font-medium">youtu.be</span>
        <span className="px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground font-medium">Shorts</span>
      </div>
    </motion.div>
  );
}