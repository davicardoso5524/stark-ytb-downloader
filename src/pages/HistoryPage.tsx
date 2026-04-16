type DownloadHistoryStatus = "started" | "completed" | "failed";

type DownloadHistoryEntry = {
  id: string;
  url: string;
  title: string;
  destinationFolder: string;
  status: DownloadHistoryStatus;
  updatedAt: string;
};

type HistoryPageProps = {
  entries: DownloadHistoryEntry[];
  isDownloading: boolean;
  formatHistoryTime: (value: string) => string;
  statusLabel: (status: DownloadHistoryStatus) => string;
  onApply: (entryId: string) => void;
  onRedownload: (entryId: string) => void;
};

export default function HistoryPage(props: HistoryPageProps) {
  const { entries, isDownloading, formatHistoryTime, statusLabel, onApply, onRedownload } = props;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-3">
      {entries.length === 0 ? (
        <div className="p-4 rounded-xl bg-card border border-border text-sm text-muted-foreground">Nenhum download salvo ainda.</div>
      ) : (
        entries.map((entry) => (
          <article key={entry.id} className="rounded-xl bg-card border border-border p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">{entry.title}</h3>
              <span className="text-[11px] px-2 py-1 rounded-md bg-secondary text-secondary-foreground">{statusLabel(entry.status)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 break-all">{entry.url}</p>
            <p className="text-xs text-muted-foreground mt-1">Destino: {entry.destinationFolder}</p>
            <p className="text-xs text-muted-foreground mt-1">Atualizado em: {formatHistoryTime(entry.updatedAt)}</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => onApply(entry.id)}
                disabled={isDownloading}
                className="h-8 px-3 rounded-md bg-secondary text-xs font-semibold hover:bg-secondary/80 disabled:opacity-50"
              >
                Usar configuracao
              </button>
              <button
                type="button"
                onClick={() => onRedownload(entry.id)}
                disabled={isDownloading}
                className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50"
              >
                Baixar novamente
              </button>
            </div>
          </article>
        ))
      )}
    </div>
  );
}
