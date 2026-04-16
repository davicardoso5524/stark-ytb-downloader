import React, { useState } from "react";
import { motion } from "framer-motion";
import { Film, Music, Download, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const VIDEO_FORMATS = [
  { id: "4k", label: "4K", quality: "2160p", size: "~850 MB", ext: "MP4", recommended: true },
  { id: "1080", label: "Full HD", quality: "1080p", size: "~350 MB", ext: "MP4", recommended: false },
  { id: "720", label: "HD", quality: "720p", size: "~180 MB", ext: "MP4", recommended: false },
  { id: "480", label: "SD", quality: "480p", size: "~90 MB", ext: "MP4", recommended: false },
];

const AUDIO_FORMATS = [
  { id: "mp3_320", label: "MP3", quality: "320kbps", size: "~12 MB", ext: "MP3", recommended: true },
  { id: "mp3_128", label: "MP3", quality: "128kbps", size: "~5 MB", ext: "MP3", recommended: false },
  { id: "aac", label: "AAC", quality: "256kbps", size: "~9 MB", ext: "AAC", recommended: false },
];

export default function FormatSelector({ visible, onDownload, downloading }) {
  const [tab, setTab] = useState("video");
  const [selected, setSelected] = useState("1080");

  if (!visible) return null;

  const formats = tab === "video" ? VIDEO_FORMATS : AUDIO_FORMATS;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto mt-6 px-4"
    >
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xl shadow-black/10">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-inter font-bold text-foreground text-sm">Escolha o formato</h4>
          <div className="flex gap-1 bg-secondary rounded-xl p-1">
            <button
              onClick={() => { setTab("video"); setSelected("1080"); }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tab === "video" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              Vídeo
            </button>
            <button
              onClick={() => { setTab("audio"); setSelected("mp3_320"); }}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tab === "audio" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              Áudio
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {formats.map((format) => (
            <button
              key={format.id}
              onClick={() => setSelected(format.id)}
              className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                selected === format.id
                  ? "border-primary/50 bg-primary/5"
                  : "border-border hover:border-border hover:bg-secondary/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  selected === format.id ? "border-primary bg-primary" : "border-muted-foreground/30"
                }`}>
                  {selected === format.id && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{format.label}</span>
                    <span className="text-xs text-muted-foreground">{format.quality}</span>
                    {format.recommended && (
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5 py-0">
                        Recomendado
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{format.size}</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">
                  {format.ext}
                </span>
              </div>
            </button>
          ))}
        </div>

        <Button
          onClick={() => onDownload(selected)}
          disabled={downloading}
          className="w-full mt-4 h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-lg shadow-primary/25"
        >
          {downloading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          {downloading ? "Baixando..." : "Baixar Agora"}
        </Button>
      </div>
    </motion.div>
  );
}