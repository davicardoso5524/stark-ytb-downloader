import React, { useState } from "react";
import { motion } from "framer-motion";
import { ListVideo, Plus, Link2, Search, Loader2, Trash2, Download, Film, Music } from "lucide-react";
import { Button } from "@/components/ui/button";

const MOCK_PLAYLISTS = [
  {
    id: 1,
    name: "Tutoriais de Programação",
    count: 12,
    thumbnail: "https://images.unsplash.com/photo-1555066931-4365d14431b9?w=120&h=80&fit=crop",
  },
  {
    id: 2,
    name: "Músicas para Estudar",
    count: 28,
    thumbnail: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120&h=80&fit=crop",
  },
  {
    id: 3,
    name: "Documentários",
    count: 7,
    thumbnail: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=120&h=80&fit=crop",
  },
];

const MOCK_VIDEOS = [
  { id: 1, title: "React para Iniciantes - Aula 1", duration: "18:42", format: "MP4", status: "pending" },
  { id: 2, title: "React para Iniciantes - Aula 2", duration: "22:10", format: "MP4", status: "done" },
  { id: 3, title: "React para Iniciantes - Aula 3", duration: "31:05", format: "MP4", status: "pending" },
];

export default function PlaylistPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [playlists, setPlaylists] = useState(MOCK_PLAYLISTS);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);

  const handleLoad = () => {
    if (!url.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSelectedPlaylist({ name: "Playlist Carregada", videos: MOCK_VIDEOS });
      setUrl("");
    }, 1800);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Input */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h3 className="font-inter font-bold text-foreground text-sm mb-3 flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary" /> Carregar Playlist do YouTube
        </h3>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-card border border-border rounded-xl px-3">
            <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Cole o link da playlist..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none py-2.5 font-inter"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLoad()}
            />
          </div>
          <Button onClick={handleLoad} disabled={loading} className="rounded-xl h-10 px-4 bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 font-semibold text-sm">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>
      </motion.div>

      {/* Loaded playlist */}
      {selectedPlaylist && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-inter font-bold text-sm text-foreground">{selectedPlaylist.name}</span>
            <Button size="sm" className="h-8 rounded-lg text-xs bg-primary hover:bg-primary/90 font-semibold shadow shadow-primary/20">
              <Download className="w-3 h-3 mr-1.5" /> Baixar Tudo
            </Button>
          </div>
          <div className="divide-y divide-border">
            {selectedPlaylist.videos.map((v, i) => (
              <div key={v.id} className="flex items-center gap-3 px-4 py-3 group hover:bg-secondary/30 transition-colors">
                <span className="text-xs text-muted-foreground w-5 text-center">{i + 1}</span>
                <Film className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{v.title}</p>
                  <p className="text-xs text-muted-foreground">{v.duration} • {v.format}</p>
                </div>
                <div className="flex items-center gap-2">
                  {v.status === "done" ? (
                    <span className="text-[11px] font-semibold text-green-500 px-2 py-0.5 rounded-md bg-green-500/10">Baixado</span>
                  ) : (
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center hover:bg-primary/20">
                      <Download className="w-3.5 h-3.5 text-primary" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Saved playlists */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-inter font-bold text-foreground text-sm flex items-center gap-2">
            <ListVideo className="w-4 h-4 text-primary" /> Playlists Salvas
          </h3>
          <button className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:opacity-80 transition-opacity">
            <Plus className="w-3.5 h-3.5" /> Nova
          </button>
        </div>
        <div className="space-y-2">
          {playlists.map((pl, i) => (
            <motion.div
              key={pl.id}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.07 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/20 transition-all group cursor-pointer"
            >
              <img src={pl.thumbnail} alt={pl.name} className="w-14 h-10 rounded-lg object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{pl.name}</p>
                <p className="text-xs text-muted-foreground">{pl.count} vídeos</p>
              </div>
              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center hover:bg-primary/20">
                  <Download className="w-3.5 h-3.5 text-primary" />
                </button>
                <button
                  onClick={() => setPlaylists(p => p.filter(x => x.id !== pl.id))}
                  className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center hover:bg-destructive/20"
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}