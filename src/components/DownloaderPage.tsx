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
  Plus,
  Search,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { useMemo, useState } from "react";

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
  destinationFolder: string;
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

type BulkLinkItem = {
  id: string;
  url: string;
  title: string;
  thumbnail?: string;
  channel?: string;
  status: "validating" | "ready" | "queued" | "downloading" | "completed" | "failed";
  lastError?: string;
};

type DownloaderPageProps = {
  url: string;
  destinationFolder: string;
  bulkLinkInput: string;
  bulkLinks: BulkLinkItem[];
  bulkNotice: string;
  bulkLinkLimit: number;
  bulkReadyCount: number;
  isValidating: boolean;
  isDownloading: boolean;
  canStartDownload: boolean;
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
  showRecentDownloads: boolean;
  statusLabel: (status: DownloadHistoryStatus) => string;
  onUrlChange: (value: string) => void;
  onValidateUrl: () => void;
  onDestinationChange: (value: string) => void;
  onPickFolder: () => void;
  onBulkLinkInputChange: (value: string) => void;
  onAddBulkLink: () => void;
  onStartBulkDownload: () => void;
  onRemoveBulkLink: (itemId: string) => void;
  onClearBulkLinks: () => void;
  onSetFormatTab: (value: MediaType) => void;
  onSelectQuality: (qualityId: string) => void;
  onStartDownload: () => void;
  onOpenHistory: () => void;
  onOpenFolder: (entryId: string) => void;
  onToggleRecentDownloads: () => void;
};

export default function DownloaderPage(props: DownloaderPageProps) {
  const {
    url,
    destinationFolder,
    bulkLinkInput,
    bulkLinks,
    bulkNotice,
    bulkLinkLimit,
    bulkReadyCount,
    isValidating,
    isDownloading,
    canStartDownload,
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
    showRecentDownloads,
    statusLabel,
    onUrlChange,
    onValidateUrl,
    onDestinationChange,
    onPickFolder,
    onBulkLinkInputChange,
    onAddBulkLink,
    onStartBulkDownload,
    onRemoveBulkLink,
    onClearBulkLinks,
    onSetFormatTab,
    onSelectQuality,
    onStartDownload,
    onOpenHistory,
    onOpenFolder,
    onToggleRecentDownloads,
  } = props;

  const [inputMode, setInputMode] = useState<"single" | "multi">("single");
  const isMultiMode = inputMode === "multi";
  const showFormatSelector = hasMetadata || isMultiMode;

  const bulkCounts = useMemo(() => {
    const validating = bulkLinks.filter((item) => item.status === "validating").length;
    const queued = bulkLinks.filter((item) => item.status === "queued").length;
    const downloading = bulkLinks.filter((item) => item.status === "downloading").length;
    const completed = bulkLinks.filter((item) => item.status === "completed").length;
    const failed = bulkLinks.filter((item) => item.status === "failed").length;
    return { validating, queued, downloading, completed, failed };
  }, [bulkLinks]);

  function bulkStatusLabel(status: BulkLinkItem["status"]) {
    if (status === "validating") {
      return "Validando";
    }
    if (status === "queued") {
      return "Na fila";
    }
    if (status === "downloading") {
      return "Baixando";
    }
    if (status === "completed") {
      return "Concluido";
    }
    if (status === "failed") {
      return "Falhou";
    }
    return "Pronto";
  }

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
        <div className="mb-3 rounded-xl bg-card border border-border p-1 inline-flex gap-1">
          <button
            onClick={() => setInputMode("single")}
            className={`h-8 px-3 rounded-lg text-xs font-semibold ${
              !isMultiMode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            Link unico
          </button>
          <button
            onClick={() => setInputMode("multi")}
            className={`h-8 px-3 rounded-lg text-xs font-semibold ${
              isMultiMode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            Multi link
          </button>
        </div>

        {!isMultiMode ? (
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
        ) : (
          <div className="space-y-3">
            <div className="relative flex items-center gap-3 bg-card border border-border rounded-2xl p-2 shadow-2xl shadow-black/30">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-secondary ml-1">
                <Link2 className="w-4 h-4 text-muted-foreground" />
              </div>
              <input
                type="text"
                placeholder="Adicione um link no multi link e clique no +"
                className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm md:text-base outline-none"
                value={bulkLinkInput}
                onChange={(e) => onBulkLinkInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onAddBulkLink();
                  }
                }}
              />
              <button
                onClick={onAddBulkLink}
                disabled={bulkLinks.length >= bulkLinkLimit}
                className="rounded-xl px-3 h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/25 disabled:opacity-60"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
              <span>Links: {bulkLinks.length}/{bulkLinkLimit}</span>
              <span>Prontos: {bulkReadyCount}</span>
              <span>Fila: {bulkCounts.queued}</span>
              <span>Baixando: {bulkCounts.downloading}</span>
              <span>Validando: {bulkCounts.validating}</span>
            </div>

            {bulkNotice ? <p className="text-xs text-muted-foreground">{bulkNotice}</p> : null}

            {bulkCounts.validating > 0 || bulkCounts.queued > 0 || bulkCounts.downloading > 0 ? (
              <div className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5 text-xs text-foreground inline-flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                {bulkCounts.downloading > 0
                  ? `Multi link baixando ${bulkCounts.downloading} item(ns) agora.`
                  : bulkCounts.queued > 0
                    ? `Multi link em fila com ${bulkCounts.queued} item(ns).`
                    : `Multi link validando ${bulkCounts.validating} link(s).`}
              </div>
            ) : null}

            {bulkLinks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {bulkLinks.map((item) => (
                  <article key={item.id} className="rounded-xl bg-card border border-border p-2.5 flex gap-2.5">
                    <div className="w-24 h-14 rounded-md overflow-hidden bg-secondary shrink-0">
                      {item.thumbnail ? (
                        <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">Sem thumb</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground truncate">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{item.channel || item.url}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                        {item.status === "validating" || item.status === "queued" || item.status === "downloading" ? (
                          <Loader2 className="w-3 h-3 animate-spin text-primary" />
                        ) : null}
                        {bulkStatusLabel(item.status)}
                      </p>
                      {item.lastError ? <p className="text-[11px] text-destructive truncate">{item.lastError}</p> : null}
                    </div>
                    <button
                      onClick={() => onRemoveBulkLink(item.id)}
                      disabled={item.status === "downloading"}
                      className="h-7 w-7 rounded-md bg-secondary hover:bg-secondary/80 disabled:opacity-60"
                    >
                      <Trash2 className="w-3.5 h-3.5 mx-auto" />
                    </button>
                  </article>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                onClick={onStartBulkDownload}
                disabled={bulkReadyCount === 0}
                className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm disabled:opacity-60"
              >
                <Download className="w-4 h-4 mr-1.5 inline" />
                Baixar multi link
              </button>
              <button
                onClick={onClearBulkLinks}
                disabled={bulkLinks.length === 0}
                className="h-10 px-4 rounded-xl bg-secondary hover:bg-secondary/80 text-sm font-semibold disabled:opacity-60"
              >
                Limpar multi link
              </button>
            </div>
          </div>
        )}

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

      {showFormatSelector ? (
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

            {!isMultiMode ? (
              <button
                onClick={onStartDownload}
                disabled={!canStartDownload}
                className="w-full mt-4 h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-lg shadow-primary/25 disabled:opacity-60"
              >
                {!canStartDownload ? <Loader2 className="w-4 h-4 animate-spin mr-2 inline" /> : <Download className="w-4 h-4 mr-2 inline" />}
                {!canStartDownload ? "Limite atingido" : "Baixar Agora"}
              </button>
            ) : null}
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
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
            <Download className="w-4 h-4 text-primary" />
            Downloads Recentes
          </h3>
          <button
            onClick={onToggleRecentDownloads}
            className="h-7 px-2 rounded-md bg-secondary text-xs hover:bg-secondary/80"
          >
            {showRecentDownloads ? "Ocultar" : "Mostrar"}
          </button>
        </div>

        {showRecentDownloads ? (
          <div className="space-y-2">
            {topDownloadEntries.length === 0 ? (
              <div className="p-4 rounded-xl bg-card border border-border text-sm text-muted-foreground">Nenhum download padrao salvo ainda.</div>
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
                  <button
                    onClick={() => onOpenFolder(item.id)}
                    className="h-7 px-2 rounded-md bg-secondary text-xs hover:bg-secondary/80"
                  >
                    Pasta
                  </button>
                </div>
              ))
            )}
          </div>
        ) : null}
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
