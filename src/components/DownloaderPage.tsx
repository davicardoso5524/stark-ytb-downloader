import { motion } from "framer-motion";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Film,
  Folder,
  Link2,
  Loader2,
  Music,
  Search,
  Sparkles,
  User,
} from "lucide-react";

type MediaType = "video" | "audio";
type DownloadHistoryStatus = "started" | "completed" | "failed";

type FormatOption = {
  id: string;
  label: string;
  qualityLabel: string;
  ext: string;
  recommended?: boolean;
};

type RecentHistoryItem = {
  id: string;
  title: string;
  mediaType: MediaType;
  format: string;
  quality: string;
  status: DownloadHistoryStatus;
};

type CurrentVideo = {
  title: string;
  channel: string;
  thumbnail?: string;
  duration: string;
};

type DownloaderPageProps = {
  url: string;
  destinationFolder: string;
  isValidating: boolean;
  isDownloading: boolean;
  downloadPercent: number;
  downloadTitle: string;
  status: string;
  error: string;
  hasMetadata: boolean;
  currentVideo: CurrentVideo | null;
  formatTab: MediaType;
  selectedOptions: FormatOption[];
  selectedQuality: string;
  topDownloadEntries: RecentHistoryItem[];
  statusLabel: (status: DownloadHistoryStatus) => string;
  onUrlChange: (value: string) => void;
  onValidateUrl: () => void;
  onDestinationChange: (value: string) => void;
  onPickFolder: () => void;
  onSetFormatTab: (value: MediaType) => void;
  onSelectQuality: (qualityId: string) => void;
  onStartDownload: () => void;
  onOpenHistory: () => void;
};

export default function DownloaderPage(props: DownloaderPageProps) {
  const {
    url,
    destinationFolder,
    isValidating,
    isDownloading,
    downloadPercent,
    downloadTitle,
    status,
    error,
    hasMetadata,
    currentVideo,
    formatTab,
    selectedOptions,
    selectedQuality,
    topDownloadEntries,
    statusLabel,
    onUrlChange,
    onValidateUrl,
    onDestinationChange,
    onPickFolder,
    onSetFormatTab,
    onSelectQuality,
    onStartDownload,
    onOpenHistory,
  } = props;

  return (
    <div className="overflow-y-auto pb-12">
      <div className="relative text-center pt-16 pb-10 px-4">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Rapido, Gratuito e Sem Limites
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground leading-tight">
            Baixe Videos do
            <br />
            <span className="text-primary">YouTube</span> Facilmente
          </h1>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto px-4">
        <div className="relative flex items-center gap-3 bg-card border border-border rounded-2xl p-2 shadow-2xl shadow-black/30">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-secondary ml-1">
            <Link2 className="w-4 h-4 text-muted-foreground" />
          </div>
          <input
            type="text"
            placeholder="Cole o link do YouTube aqui..."
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm md:text-base outline-none"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onValidateUrl();
              }
            }}
          />
          <button
            onClick={onValidateUrl}
            disabled={isValidating}
            className="rounded-xl px-5 h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 disabled:opacity-60"
          >
            {isValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Search className="w-4 h-4 mr-2 inline" />Buscar</>}
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2 rounded-xl bg-card border border-border px-3 py-2">
          <Folder className="w-4 h-4 text-muted-foreground" />
          <input
            value={destinationFolder}
            onChange={(e) => onDestinationChange(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            placeholder="Pasta de destino para o download"
          />
          <button onClick={onPickFolder} className="h-8 px-3 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/80">
            Selecionar
          </button>
        </div>
      </motion.div>

      {currentVideo ? (
        <motion.div
          initial={{ opacity: 0, y: 25, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="max-w-2xl mx-auto mt-8 px-4"
        >
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xl shadow-black/20">
            <div className="relative">
              {currentVideo.thumbnail ? (
                <img src={currentVideo.thumbnail} alt={currentVideo.title} className="w-full aspect-video object-cover" />
              ) : (
                <div className="w-full aspect-video bg-secondary flex items-center justify-center text-muted-foreground">Sem thumbnail</div>
              )}
              <span className="absolute top-3 right-3 bg-black/70 text-white border-0 text-xs px-2 py-1 rounded-md inline-flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {currentVideo.duration}
              </span>
            </div>
            <div className="p-5">
              <h3 className="font-bold text-foreground text-base md:text-lg leading-snug">{currentVideo.title}</h3>
              <div className="flex items-center gap-1.5 mt-2.5">
                <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
                  <User className="w-3 h-3 text-muted-foreground" />
                </div>
                <span className="text-sm text-muted-foreground font-medium">{currentVideo.channel}</span>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}

      {hasMetadata ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto mt-6 px-4">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xl shadow-black/10">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-foreground text-sm">Escolha o formato</h4>
              <div className="flex gap-1 bg-secondary rounded-xl p-1">
                <button
                  onClick={() => onSetFormatTab("video")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    formatTab === "video" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  <Film className="w-3.5 h-3.5" />
                  Video
                </button>
                <button
                  onClick={() => onSetFormatTab("audio")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    formatTab === "audio" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  <Music className="w-3.5 h-3.5" />
                  Audio
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {selectedOptions.map((option) => {
                const isSelected = selectedQuality === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => onSelectQuality(option.id)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                      isSelected ? "border-primary/50 bg-primary/5" : "border-border hover:bg-secondary/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                        }`}
                      >
                        {isSelected ? <Check className="w-3 h-3 text-primary-foreground" /> : null}
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">{option.label}</span>
                          <span className="text-xs text-muted-foreground">{option.qualityLabel}</span>
                          {option.recommended ? (
                            <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] px-1.5 py-0 rounded-md">
                              Recomendado
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground">
                      {option.ext}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={onStartDownload}
              disabled={isDownloading}
              className="w-full mt-4 h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-lg shadow-primary/25 disabled:opacity-60"
            >
              {isDownloading ? <Loader2 className="w-4 h-4 animate-spin mr-2 inline" /> : <Download className="w-4 h-4 mr-2 inline" />}
              {isDownloading ? "Baixando..." : "Baixar Agora"}
            </button>
          </div>
        </motion.div>
      ) : null}

      {isDownloading || downloadPercent > 0 ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto mt-6 px-4">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-xl shadow-black/10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {downloadPercent >= 100 ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <Download className="w-5 h-5 text-primary" />
                )}
                <span className="font-bold text-sm text-foreground">{downloadPercent >= 100 ? "Download Concluido" : "Baixando"}</span>
              </div>
              <span className="text-sm font-bold text-foreground">{Math.round(downloadPercent)}%</span>
            </div>
            <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${downloadPercent}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-2.5">{downloadTitle || status}</p>
          </div>
        </motion.div>
      ) : null}

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto mt-12 px-4">
        <h3 className="font-bold text-foreground text-sm mb-4 flex items-center gap-2">
          <Download className="w-4 h-4 text-primary" />
          Downloads Recentes
        </h3>
        <div className="space-y-2">
          {topDownloadEntries.length === 0 ? (
            <div className="p-4 rounded-xl bg-card border border-border text-sm text-muted-foreground">Nenhum download salvo ainda.</div>
          ) : (
            topDownloadEntries.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${item.mediaType === "video" ? "bg-primary/10" : "bg-blue-500/10"}`}>
                  {item.mediaType === "video" ? <Film className="w-4 h-4 text-primary" /> : <Music className="w-4 h-4 text-blue-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                  <div className="text-[11px] text-muted-foreground">
                    {item.format.toUpperCase()} • {item.mediaType === "video" ? `${item.quality}p` : `${item.quality} kbps`} • {statusLabel(item.status)}
                  </div>
                </div>
                <button onClick={onOpenHistory} className="h-7 px-2 rounded-md bg-secondary text-xs hover:bg-secondary/80">
                  Ver
                </button>
              </div>
            ))
          )}
        </div>
      </motion.div>

      {error ? (
        <div className="max-w-2xl mx-auto mt-5 px-4">
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
            <p className="text-xs text-destructive font-medium">{error}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
