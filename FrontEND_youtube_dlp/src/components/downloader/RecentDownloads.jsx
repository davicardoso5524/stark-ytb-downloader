import React from "react";
import { motion } from "framer-motion";
import { Film, Music, Download, MoreHorizontal } from "lucide-react";

const RECENT = [
  {
    id: 1,
    title: "Aprendendo React em 1 Hora - Tutorial Completo",
    format: "MP4",
    quality: "1080p",
    size: "342 MB",
    type: "video",
    time: "Agora mesmo",
  },
  {
    id: 2,
    title: "Lo-Fi Hip Hop Radio - Beats to Relax/Study To",
    format: "MP3",
    quality: "320kbps",
    size: "8.4 MB",
    type: "audio",
    time: "5 min atrás",
  },
  {
    id: 3,
    title: "Os 10 Melhores Destinos para Viajar em 2026",
    format: "MP4",
    quality: "4K",
    size: "1.2 GB",
    type: "video",
    time: "12 min atrás",
  },
];

export default function RecentDownloads() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="max-w-2xl mx-auto mt-12 px-4 pb-16"
    >
      <h3 className="font-inter font-bold text-foreground text-sm mb-4 flex items-center gap-2">
        <Download className="w-4 h-4 text-primary" />
        Downloads Recentes
      </h3>

      <div className="space-y-2">
        {RECENT.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.5 + i * 0.1 }}
            className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border hover:border-primary/20 transition-all group cursor-pointer"
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              item.type === "video" ? "bg-primary/10" : "bg-blue-500/10"
            }`}>
              {item.type === "video" ? (
                <Film className="w-4 h-4 text-primary" />
              ) : (
                <Music className="w-4 h-4 text-blue-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-muted-foreground">{item.format} • {item.quality}</span>
                <span className="text-[11px] text-muted-foreground">•</span>
                <span className="text-[11px] text-muted-foreground">{item.size}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-muted-foreground hidden sm:block">{item.time}</span>
              <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}