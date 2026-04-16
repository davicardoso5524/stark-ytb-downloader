import React, { useState } from "react";
import { motion } from "framer-motion";
import { Folder, Wifi, Film, Music, Bell, Trash2, Info, ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const Section = ({ title, icon: Icon, children }) => (
  <div className="bg-card border border-border rounded-2xl overflow-hidden">
    <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border">
      <Icon className="w-4 h-4 text-primary" />
      <span className="font-inter font-bold text-sm text-foreground">{title}</span>
    </div>
    <div className="divide-y divide-border">{children}</div>
  </div>
);

const Row = ({ label, description, children }) => (
  <div className="flex items-center justify-between px-5 py-3.5 gap-4">
    <div className="min-w-0">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    autoDownload: false,
    notifications: true,
    preferMp4: true,
    defaultQuality: "1080",
    defaultAudio: "mp3_320",
    limitSpeed: false,
    subtitles: false,
    metadata: true,
  });

  const toggle = (key) => setSettings(s => ({ ...s, [key]: !s[key] }));

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-5">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Section title="Pasta de Download" icon={Folder}>
          <Row label="Local padrão" description="/Downloads/TubeGrab">
            <button className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:opacity-80 transition-opacity">
              Alterar <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </Row>
          <Row label="Organizar por canal" description="Cria subpastas por canal automaticamente">
            <Switch checked={settings.autoDownload} onCheckedChange={() => toggle("autoDownload")} />
          </Row>
        </Section>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}>
        <Section title="Qualidade Padrão" icon={Film}>
          <Row label="Formato de vídeo preferido" description="Usado ao iniciar um download">
            <select
              value={settings.defaultQuality}
              onChange={(e) => setSettings(s => ({ ...s, defaultQuality: e.target.value }))}
              className="bg-secondary border border-border text-foreground text-xs rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
            >
              <option value="4k">4K (2160p)</option>
              <option value="1080">Full HD (1080p)</option>
              <option value="720">HD (720p)</option>
              <option value="480">SD (480p)</option>
            </select>
          </Row>
          <Row label="Preferir MP4" description="Sempre converte para MP4 quando possível">
            <Switch checked={settings.preferMp4} onCheckedChange={() => toggle("preferMp4")} />
          </Row>
          <Row label="Baixar legendas" description="Inclui arquivo de legenda (.srt) automaticamente">
            <Switch checked={settings.subtitles} onCheckedChange={() => toggle("subtitles")} />
          </Row>
        </Section>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
        <Section title="Áudio" icon={Music}>
          <Row label="Qualidade de áudio padrão">
            <select
              value={settings.defaultAudio}
              onChange={(e) => setSettings(s => ({ ...s, defaultAudio: e.target.value }))}
              className="bg-secondary border border-border text-foreground text-xs rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
            >
              <option value="mp3_320">MP3 320kbps</option>
              <option value="mp3_128">MP3 128kbps</option>
              <option value="aac">AAC 256kbps</option>
            </select>
          </Row>
          <Row label="Incluir metadados" description="Título, artista e capa no arquivo de áudio">
            <Switch checked={settings.metadata} onCheckedChange={() => toggle("metadata")} />
          </Row>
        </Section>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.21 }}>
        <Section title="Rede" icon={Wifi}>
          <Row label="Limitar velocidade de download" description="Máximo de 5 MB/s">
            <Switch checked={settings.limitSpeed} onCheckedChange={() => toggle("limitSpeed")} />
          </Row>
        </Section>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
        <Section title="Notificações" icon={Bell}>
          <Row label="Notificações de conclusão" description="Avisa quando um download terminar">
            <Switch checked={settings.notifications} onCheckedChange={() => toggle("notifications")} />
          </Row>
        </Section>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <Section title="Dados" icon={Trash2}>
          <Row label="Limpar histórico de downloads">
            <Button variant="destructive" size="sm" className="h-8 rounded-lg text-xs font-semibold">
              Limpar
            </Button>
          </Row>
          <Row label="Limpar cache">
            <Button variant="outline" size="sm" className="h-8 rounded-lg text-xs font-semibold border-border">
              Limpar Cache
            </Button>
          </Row>
        </Section>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}>
        <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5" />
          TubeGrab v2.1.0 — Apenas para uso pessoal.
        </div>
      </motion.div>
    </div>
  );
}