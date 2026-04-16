import { AlertCircle, Download, Link2, Loader2, Music2, RefreshCcw, Search, SkipForward, UserRound, Video } from "lucide-react";

export type PlaylistItem = {
  id: string;
  title: string;
  url: string;
  channel?: string;
  durationSeconds?: number;
};

type PlaylistData = {
  id?: string;
  title: string;
  entries: PlaylistItem[];
};

type PlaylistPageProps = {
  playlistUrl: string;
  setPlaylistUrl: (value: string) => void;
  isLoadingPlaylist: boolean;
  playlistNotice: string;
  playlistData: PlaylistData | null;
  isDownloading: boolean;
  isQueueRunning: boolean;
  queueItems: Array<
    PlaylistItem & {
      status: "pending" | "downloading" | "completed" | "failed" | "skipped";
      attempts: number;
      lastError?: string;
    }
  >;
  queueSummary: {
    total: number;
    completed: number;
    failed: number;
    skipped: number;
    pending: number;
    downloading: number;
    progressPercent: number;
    currentTitle?: string;
  };
  onLoadPlaylist: () => void;
  onDownloadItem: (item: PlaylistItem) => void;
  onDownloadAll: () => void;
  onCancelQueue: () => void;
  onRetryItem: (itemId: string) => void;
  onSkipItem: (itemId: string) => void;
};

function statusLabel(status: "pending" | "downloading" | "completed" | "failed" | "skipped") {
  switch (status) {
    case "downloading":
      return "Baixando";
    case "completed":
      return "Concluido";
    case "failed":
      return "Falhou";
    case "skipped":
      return "Pulado";
    default:
      return "Pendente";
  }
}

function formatDuration(seconds?: number) {
  if (!seconds || seconds <= 0) {
    return "--:--";
  }

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function PlaylistPage(props: PlaylistPageProps) {
  const {
    playlistUrl,
    setPlaylistUrl,
    isLoadingPlaylist,
    playlistNotice,
    playlistData,
    isDownloading,
    isQueueRunning,
    queueItems,
    queueSummary,
    onLoadPlaylist,
    onDownloadItem,
    onDownloadAll,
    onCancelQueue,
    onRetryItem,
    onSkipItem,
  } = props;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
      <h3 className="font-bold text-sm text-foreground">Playlist</h3>
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 bg-card border border-border rounded-xl px-3">
          <Link2 className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={playlistUrl}
            onChange={(e) => setPlaylistUrl(e.target.value)}
            placeholder="Cole o link da playlist"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none py-2.5"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onLoadPlaylist();
              }
            }}
          />
        </div>
        <button
          className="rounded-xl h-10 px-4 bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-60"
          onClick={onLoadPlaylist}
          disabled={isLoadingPlaylist}
        >
          {isLoadingPlaylist ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </button>
      </div>

      {playlistNotice ? <p className="text-xs text-muted-foreground">{playlistNotice}</p> : null}

      {playlistData ? (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {queueSummary.total > 0 ? (
            <div className="px-4 py-3 border-b border-border bg-secondary/30">
              <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                <span>Total: {queueSummary.total}</span>
                <span>Concluidos: {queueSummary.completed}</span>
                <span>Falhas: {queueSummary.failed}</span>
                <span>Pulados: {queueSummary.skipped}</span>
                <span>Pendentes: {queueSummary.pending}</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${queueSummary.progressPercent}%` }} />
              </div>
              {queueSummary.currentTitle ? (
                <p className="text-[11px] text-muted-foreground mt-1">Em andamento: {queueSummary.currentTitle}</p>
              ) : null}
            </div>
          ) : null}

          <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{playlistData.title}</p>
              <p className="text-xs text-muted-foreground">{playlistData.entries.length} videos</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isQueueRunning ? (
                <button
                  className="h-8 px-3 rounded-md bg-secondary text-xs font-semibold hover:bg-secondary/80"
                  onClick={onCancelQueue}
                >
                  Cancelar fila
                </button>
              ) : null}
              <button
                className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-60"
                disabled={isDownloading}
                onClick={onDownloadAll}
              >
                <Download className="w-3.5 h-3.5 mr-1.5 inline" />
                Baixar todos
              </button>
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {queueItems.map((item) => (
              <article key={item.id} className="px-4 py-3 border-b border-border last:border-b-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                      <span className="inline-flex items-center gap-1">
                        <Video className="w-3.5 h-3.5" />
                        {formatDuration(item.durationSeconds)}
                      </span>
                      {item.channel ? (
                        <span className="inline-flex items-center gap-1 truncate">
                          <UserRound className="w-3.5 h-3.5" />
                          {item.channel}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 truncate">{item.url}</p>
                    <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-secondary">{statusLabel(item.status)}</span>
                      {item.attempts > 0 ? <span>Tentativa {item.attempts + 1}</span> : null}
                    </div>
                    {item.lastError ? (
                      <p className="text-[11px] text-destructive mt-1 inline-flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {item.lastError}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      className="h-8 px-3 rounded-md bg-secondary text-xs font-semibold hover:bg-secondary/80 disabled:opacity-60"
                      disabled={isDownloading || item.status === "downloading"}
                      onClick={() => onDownloadItem(item)}
                    >
                      <Music2 className="w-3.5 h-3.5 mr-1.5 inline" />
                      Baixar
                    </button>
                    <button
                      className="h-8 px-3 rounded-md bg-secondary text-xs font-semibold hover:bg-secondary/80 disabled:opacity-60"
                      disabled={item.status !== "failed"}
                      onClick={() => onRetryItem(item.id)}
                    >
                      <RefreshCcw className="w-3.5 h-3.5 mr-1.5 inline" />
                      Retry
                    </button>
                    <button
                      className="h-8 px-3 rounded-md bg-secondary text-xs font-semibold hover:bg-secondary/80 disabled:opacity-60"
                      disabled={item.status !== "pending" || !isQueueRunning}
                      onClick={() => onSkipItem(item.id)}
                    >
                      <SkipForward className="w-3.5 h-3.5 mr-1.5 inline" />
                      Pular
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
