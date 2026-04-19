import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  Download,
  History,
  ListVideo,
  Menu,
  Settings,
  X,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import PlaylistPage, { PlaylistItem } from "./pages/PlaylistPage";
import SettingsPage, { AppSettings } from "./pages/SettingsPage";
import HistoryPage from "./pages/HistoryPage";
import LoginScreen from "./components/LoginScreen";
import DownloaderPage from "./components/DownloaderPage";

type VideoMetadata = {
  id: string;
  title: string;
  uploader?: string;
  durationSeconds?: number;
  webpageUrl?: string;
  thumbnail?: string;
};

type DownloadProgressEvent = {
  taskId: string;
  videoTitle: string;
  percent: number;
  rawLine: string;
};

type DownloadDoneEvent = {
  taskId: string;
  message: string;
};

type MediaType = "video" | "audio";
type DownloadSource = "standard" | "playlist";

type DownloadHistoryStatus = "started" | "completed" | "failed";

type DownloadHistoryEntry = {
  id: string;
  source: DownloadSource;
  url: string;
  title: string;
  destinationFolder: string;
  mediaType: MediaType;
  format: string;
  quality: string;
  status: DownloadHistoryStatus;
  percent: number;
  createdAt: string;
  updatedAt: string;
};

const HISTORY_STORAGE_KEY = "stark_tube_history_v1";
const HISTORY_LIMIT = 25;
const SETTINGS_STORAGE_KEY = "stark_tube_settings_v1";
const LICENSE_STORAGE_KEY = "stark_tube_license_key_v1";
const USER_NAME_STORAGE_KEY = "stark_tube_user_name_v1";
const KEY_SITE_URL = "https://starktube-web-key.vercel.app/";

async function readPersistedLicenseKey(): Promise<string | null> {
  try {
    const persisted = await invoke<string | null>("get_persisted_license_key");
    const normalized = persisted?.trim() ?? "";
    return normalized || null;
  } catch {
    const fallback = localStorage.getItem(LICENSE_STORAGE_KEY)?.trim() ?? "";
    return fallback || null;
  }
}

async function savePersistedLicenseKey(key: string): Promise<void> {
  const normalized = key.trim();
  if (!normalized) {
    return;
  }

  localStorage.setItem(LICENSE_STORAGE_KEY, normalized);

  try {
    await invoke("persist_license_key", { licenseKey: normalized });
  } catch {
    // keep local fallback when command is unavailable
  }
}

async function clearPersistedLicenseKey(): Promise<void> {
  localStorage.removeItem(LICENSE_STORAGE_KEY);

  try {
    await invoke("clear_persisted_license_key");
  } catch {
    // ignore when command is unavailable
  }
}

function normalizeHistoryEntry(entry: Partial<DownloadHistoryEntry>): DownloadHistoryEntry | null {
  if (!entry.id || !entry.url || !entry.title || !entry.destinationFolder) {
    return null;
  }

  const mediaType: MediaType = entry.mediaType === "audio" ? "audio" : "video";
  const status: DownloadHistoryStatus =
    entry.status === "completed" || entry.status === "failed" ? entry.status : "started";

  return {
    id: entry.id,
    source: entry.source === "playlist" ? "playlist" : "standard",
    url: entry.url,
    title: entry.title,
    destinationFolder: entry.destinationFolder,
    mediaType,
    format: entry.format || (mediaType === "audio" ? "mp3" : "mp4"),
    quality: entry.quality || (mediaType === "audio" ? "192" : "1080"),
    status,
    percent: Number.isFinite(entry.percent) ? Number(entry.percent) : 0,
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: entry.updatedAt || entry.createdAt || new Date().toISOString(),
  };
}

function mergeHistoryFromStore(store: PersistedDownloadHistory): DownloadHistoryEntry[] {
  const combined = [...store.standard, ...store.playlist]
    .map((item) => normalizeHistoryEntry(item))
    .filter((item): item is DownloadHistoryEntry => Boolean(item));

  return combined
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, HISTORY_LIMIT * 2);
}

function splitHistoryForStore(entries: DownloadHistoryEntry[]): PersistedDownloadHistory {
  const standard = entries.filter((entry) => entry.source === "standard").slice(0, HISTORY_LIMIT);
  const playlist = entries.filter((entry) => entry.source === "playlist").slice(0, HISTORY_LIMIT);
  return { standard, playlist };
}

async function readPersistedDownloadHistory(): Promise<DownloadHistoryEntry[]> {
  try {
    const history = await invoke<PersistedDownloadHistory>("get_persisted_download_history");
    return mergeHistoryFromStore(history || { standard: [], playlist: [] });
  } catch {
    try {
      const legacyRaw = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!legacyRaw) {
        return [];
      }

      const parsed = JSON.parse(legacyRaw) as Partial<DownloadHistoryEntry>[];
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .map((item) => normalizeHistoryEntry(item))
        .filter((item): item is DownloadHistoryEntry => Boolean(item))
        .slice(0, HISTORY_LIMIT * 2);
    } catch {
      return [];
    }
  }
}

async function persistDownloadHistory(entries: DownloadHistoryEntry[]): Promise<void> {
  const payload = splitHistoryForStore(entries);

  try {
    await invoke("persist_download_history", { history: payload });
  } catch {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries.slice(0, HISTORY_LIMIT * 2)));
    } catch {
      // ignore storage errors
    }
  }
}

type DownloadConfig = {
  source: DownloadSource;
  url: string;
  destinationFolder: string;
  mediaType: MediaType;
  format: string;
  quality: string;
  videoTitle: string;
};

type PlaylistData = {
  id?: string;
  title: string;
  entries: PlaylistItem[];
};

type LicenseChallenge = {
  product: string;
  version: string;
  platform: string;
  machineCode: string;
};

type LicenseVerificationResult = {
  valid: boolean;
  message: string;
};

type PersistedDownloadHistory = {
  standard: DownloadHistoryEntry[];
  playlist: DownloadHistoryEntry[];
};

type QueueItemStatus = "pending" | "downloading" | "completed" | "failed" | "skipped";

type QueueUiItem = PlaylistItem & {
  status: QueueItemStatus;
  attempts: number;
  lastError?: string;
};

type QueueTask = {
  id: string;
  attempt: number;
};

type BulkLinkStatus = "validating" | "ready" | "queued" | "downloading" | "completed" | "failed";

type BulkLinkItem = {
  id: string;
  url: string;
  title: string;
  thumbnail?: string;
  channel?: string;
  status: BulkLinkStatus;
  lastError?: string;
};

const DEFAULT_SETTINGS: AppSettings = {
  defaultDestinationFolder: "",
  preferredMediaType: "video",
  defaultVideoQuality: "1080",
  defaultAudioQuality: "320",
  downloadConcurrency: 3,
};

const BULK_LINK_LIMIT = 10;

type ActivePage = "downloader" | "playlist" | "history" | "settings";

type FormatOption = {
  id: string;
  label: string;
  qualityLabel: string;
  ext: string;
  recommended?: boolean;
};

const NAV_ITEMS: Array<{ id: ActivePage; label: string; icon: typeof Download }> = [
  { id: "downloader", label: "Downloader", icon: Download },
  { id: "playlist", label: "Playlist", icon: ListVideo },
  { id: "history", label: "Historico", icon: History },
  { id: "settings", label: "Configuracoes", icon: Settings },
];

const VIDEO_OPTIONS: FormatOption[] = [
  { id: "2160", label: "4K", qualityLabel: "2160p", ext: "MP4", recommended: true },
  { id: "1080", label: "Full HD", qualityLabel: "1080p", ext: "MP4" },
  { id: "720", label: "HD", qualityLabel: "720p", ext: "MP4" },
  { id: "480", label: "SD", qualityLabel: "480p", ext: "MP4" },
];

const AUDIO_OPTIONS: FormatOption[] = [
  { id: "320", label: "MP3", qualityLabel: "320 kbps", ext: "MP3", recommended: true },
  { id: "192", label: "MP3", qualityLabel: "192 kbps", ext: "MP3" },
  { id: "128", label: "MP3", qualityLabel: "128 kbps", ext: "MP3" },
  { id: "64", label: "MP3", qualityLabel: "64 kbps", ext: "MP3" },
];

function statusLabel(status: DownloadHistoryStatus) {
  if (status === "completed") {
    return "Concluido";
  }

  if (status === "failed") {
    return "Falhou";
  }

  return "Em andamento";
}

function App() {
  const [url, setUrl] = useState("");
  const [destinationFolder, setDestinationFolder] = useState("");
  const [status, setStatus] = useState("Pronto para validar URL");
  const [error, setError] = useState("");
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadPercent, setDownloadPercent] = useState(0);
  const [downloadTitle, setDownloadTitle] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>("video");
  const [videoFormat, setVideoFormat] = useState("mp4");
  const [audioFormat, setAudioFormat] = useState("mp3");
  const [videoQuality, setVideoQuality] = useState("1080");
  const [audioQuality, setAudioQuality] = useState("192");
  const [historyEntries, setHistoryEntries] = useState<DownloadHistoryEntry[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [activePage, setActivePage] = useState<ActivePage>("downloader");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [formatTab, setFormatTab] = useState<MediaType>("video");
  const [selectedVideoQuality, setSelectedVideoQuality] = useState("1080");
  const [selectedAudioQuality, setSelectedAudioQuality] = useState("320");
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(false);
  const [playlistNotice, setPlaylistNotice] = useState("");
  const [playlistData, setPlaylistData] = useState<PlaylistData | null>(null);
  const [showDownloaderRecents, setShowDownloaderRecents] = useState(true);
  const [showPlaylistRecents, setShowPlaylistRecents] = useState(true);
  const [bulkLinkInput, setBulkLinkInput] = useState("");
  const [bulkLinks, setBulkLinks] = useState<BulkLinkItem[]>([]);
  const [bulkNotice, setBulkNotice] = useState("");
  const [isQueueRunning, setIsQueueRunning] = useState(false);
  const [queueUiItems, setQueueUiItems] = useState<QueueUiItem[]>([]);
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState<string[]>([]);
  const [queueCurrentId, setQueueCurrentId] = useState<string | null>(null);
  const [activeTaskCount, setActiveTaskCount] = useState(0);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [userName, setUserName] = useState("");
  const [loginKey, setLoginKey] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isCheckingLicense, setIsCheckingLicense] = useState(false);
  const [licenseChallenge, setLicenseChallenge] = useState<LicenseChallenge | null>(null);
  const taskHistoryRef = useRef<Map<string, string>>(new Map());
  const taskResolverRef = useRef<
    Map<string, { resolve: () => void; reject: (error: Error) => void }>
  >(new Map());
  const playlistQueueRef = useRef<QueueTask[]>([]);
  const queueUiItemsRef = useRef<QueueUiItem[]>([]);
  const bulkQueueRef = useRef<string[]>([]);
  const bulkLinksRef = useRef<BulkLinkItem[]>([]);

  const MAX_QUEUE_RETRIES = 2;

  useEffect(() => {
    const savedName = localStorage.getItem(USER_NAME_STORAGE_KEY)?.trim();
    if (savedName) {
      setUserName(savedName);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        const challenge = await invoke<LicenseChallenge>("get_license_challenge");
        if (mounted) {
          setLicenseChallenge(challenge);
        }
      } catch {
        // ignore when command is unavailable during dev reload
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      const cachedKey = await readPersistedLicenseKey();
      if (!cachedKey) {
        return;
      }
      setIsCheckingLicense(true);

      try {
        const result = await invoke<LicenseVerificationResult>("verify_license_key", {
          licenseKey: cachedKey,
        });

        if (!mounted) {
          return;
        }

        if (result.valid) {
          setLoggedIn(true);
          setLoginError("");
          setLoginKey(cachedKey);
        } else {
          await clearPersistedLicenseKey();
        }
      } catch {
        if (mounted) {
          await clearPersistedLicenseKey();
        }
      } finally {
        if (mounted) {
          setIsCheckingLicense(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      const next = await readPersistedDownloadHistory();
      if (mounted) {
        setHistoryEntries(next);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    queueUiItemsRef.current = queueUiItems;
  }, [queueUiItems]);

  useEffect(() => {
    bulkLinksRef.current = bulkLinks;
  }, [bulkLinks]);

  const maxParallelDownloads = Math.max(1, Math.min(5, settings.downloadConcurrency || 3));
  const canStartAnotherDownload = activeTaskCount < maxParallelDownloads;

  useEffect(() => {
    if (!isQueueRunning) {
      return;
    }

    const runningQueueDownloads = queueUiItemsRef.current.filter(
      (item) => item.status === "downloading",
    ).length;
    const maxConcurrency = Math.max(1, Math.min(5, settings.downloadConcurrency || 3));

    if (runningQueueDownloads >= maxConcurrency) {
      return;
    }

    let availableSlots = maxConcurrency - runningQueueDownloads;

    while (availableSlots > 0) {
      const nextTask = playlistQueueRef.current.shift();
      if (!nextTask) {
        break;
      }

      const queueItem = queueUiItemsRef.current.find((item) => item.id === nextTask.id);
      if (!queueItem || queueItem.status === "skipped") {
        continue;
      }

      setQueueCurrentId(queueItem.id);
      setQueueUiItems((prev) =>
        prev.map((item) =>
          item.id === queueItem.id
            ? {
                ...item,
                status: "downloading",
                attempts: Math.max(item.attempts, nextTask.attempt),
              }
            : item,
        ),
      );

      void (async () => {
        try {
          await downloadPlaylistItem(queueItem);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          if (nextTask.attempt < MAX_QUEUE_RETRIES) {
            const nextAttempt = nextTask.attempt + 1;
            playlistQueueRef.current.push({ id: queueItem.id, attempt: nextAttempt });
            setQueueUiItems((prev) =>
              prev.map((item) =>
                item.id === queueItem.id
                  ? {
                      ...item,
                      status: "pending",
                      attempts: nextAttempt,
                      lastError: message,
                    }
                  : item,
              ),
            );
          } else {
            setQueueUiItems((prev) =>
              prev.map((item) =>
                item.id === queueItem.id
                  ? {
                      ...item,
                      status: "failed",
                      attempts: nextTask.attempt,
                      lastError: message,
                    }
                  : item,
              ),
            );
          }
        } finally {
          setQueueCurrentId(null);
        }
      })();

      availableSlots -= 1;
    }
  }, [activeTaskCount, isQueueRunning, settings.downloadConcurrency]);

  useEffect(() => {
    const maxConcurrency = Math.max(1, Math.min(5, settings.downloadConcurrency || 3));
    const runningBulkDownloads = bulkLinksRef.current.filter((item) => item.status === "downloading").length;

    if (runningBulkDownloads >= maxConcurrency) {
      return;
    }

    let availableSlots = maxConcurrency - runningBulkDownloads;
    const selection = getCurrentFormatSelection();

    while (availableSlots > 0) {
      const nextId = bulkQueueRef.current.shift();
      if (!nextId) {
        break;
      }

      const nextItem = bulkLinksRef.current.find((item) => item.id === nextId);
      if (!nextItem || nextItem.status !== "queued") {
        continue;
      }

      setBulkLinks((prev) =>
        prev.map((item) =>
          item.id === nextId
            ? {
                ...item,
                status: "downloading",
                lastError: undefined,
              }
            : item,
        ),
      );

      void (async () => {
        try {
          await runDownload({
            source: "standard",
            url: nextItem.url,
            destinationFolder: destinationFolder.trim(),
            videoTitle: nextItem.title || nextItem.url,
            mediaType: selection.mediaType,
            format: selection.format,
            quality: selection.quality,
          });

          setBulkLinks((prev) =>
            prev.map((item) =>
              item.id === nextId
                ? {
                    ...item,
                    status: "completed",
                    lastError: undefined,
                  }
                : item,
            ),
          );
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          setBulkLinks((prev) =>
            prev.map((item) =>
              item.id === nextId
                ? {
                    ...item,
                    status: "failed",
                    lastError: message,
                  }
                : item,
            ),
          );
        }
      })();

      availableSlots -= 1;
    }
  }, [
    activeTaskCount,
    bulkLinks,
    destinationFolder,
    formatTab,
    selectedAudioQuality,
    selectedVideoQuality,
    settings.downloadConcurrency,
  ]);

  const queueSummary = useMemo(() => {
    const total = queueUiItems.length;
    const completed = queueUiItems.filter((item) => item.status === "completed").length;
    const failed = queueUiItems.filter((item) => item.status === "failed").length;
    const skipped = queueUiItems.filter((item) => item.status === "skipped").length;
    const downloading = queueUiItems.filter((item) => item.status === "downloading").length;
    const pending = queueUiItems.filter((item) => item.status === "pending").length;
    const processed = completed + failed + skipped;
    const progressPercent = total > 0 ? Math.round((processed / total) * 100) : 0;
    const currentItem = queueCurrentId ? queueUiItems.find((item) => item.id === queueCurrentId) : undefined;

    return {
      total,
      completed,
      failed,
      skipped,
      pending,
      downloading,
      progressPercent,
      currentTitle: currentItem?.title,
    };
  }, [queueCurrentId, queueUiItems]);

  useEffect(() => {
    if (!isQueueRunning) {
      return;
    }

    if (queueSummary.total === 0) {
      return;
    }

    const finished = queueSummary.completed + queueSummary.failed + queueSummary.skipped;
    if (finished >= queueSummary.total && queueSummary.downloading === 0 && playlistQueueRef.current.length === 0) {
      setIsQueueRunning(false);
      setPlaylistNotice(
        `Fila finalizada: ${queueSummary.completed} concluido(s), ${queueSummary.failed} falha(s), ${queueSummary.skipped} pulado(s).`,
      );
    }
  }, [isQueueRunning, queueSummary]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      const next: AppSettings = {
        defaultDestinationFolder: parsed.defaultDestinationFolder || "",
        preferredMediaType: parsed.preferredMediaType === "audio" ? "audio" : "video",
        defaultVideoQuality: parsed.defaultVideoQuality || "1080",
        defaultAudioQuality: parsed.defaultAudioQuality || "320",
        downloadConcurrency: Math.max(1, Math.min(5, Number(parsed.downloadConcurrency) || 3)),
      };

      setSettings(next);

      if (!destinationFolder.trim() && next.defaultDestinationFolder.trim()) {
        setDestinationFolder(next.defaultDestinationFolder);
      }

      setFormatTab(next.preferredMediaType);
      setSelectedVideoQuality(next.defaultVideoQuality);
      setSelectedAudioQuality(next.defaultAudioQuality);
    } catch {
      // keep defaults when storage is unavailable or invalid
    }
  }, []);

  useEffect(() => {
    void persistDownloadHistory(historyEntries);
  }, [historyEntries]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore storage write failures
    }
  }, [settings]);

  useEffect(() => {
    let disposeProgress: (() => void) | undefined;
    let disposeComplete: (() => void) | undefined;
    let disposeError: (() => void) | undefined;

    const updateHistoryEntry = (
      id: string,
      updater: (entry: DownloadHistoryEntry) => DownloadHistoryEntry,
    ) => {
      setHistoryEntries((prev) => {
        const next = prev.map((entry) => (entry.id === id ? updater(entry) : entry));
        return next;
      });
    };

    const setupListeners = async () => {
      disposeProgress = await listen<DownloadProgressEvent>("download-progress", (event) => {
        setActiveTaskCount(taskResolverRef.current.size);
        setIsDownloading(taskResolverRef.current.size > 0);
        const percent = Math.max(0, Math.min(100, Number(event.payload.percent) || 0));
        setDownloadPercent(percent);
        if (event.payload.videoTitle) {
          setDownloadTitle(event.payload.videoTitle);
        }

        const historyId = taskHistoryRef.current.get(event.payload.taskId);
        if (historyId) {
          updateHistoryEntry(historyId, (entry) => ({
            ...entry,
            title: event.payload.videoTitle || entry.title,
            percent,
            updatedAt: new Date().toISOString(),
          }));
        }
      });

      disposeComplete = await listen<DownloadDoneEvent>("download-complete", (event) => {
        const resolver = taskResolverRef.current.get(event.payload.taskId);
        if (resolver) {
          resolver.resolve();
          taskResolverRef.current.delete(event.payload.taskId);
        }

        const historyId = taskHistoryRef.current.get(event.payload.taskId);
        taskHistoryRef.current.delete(event.payload.taskId);

        setActiveTaskCount(taskResolverRef.current.size);
        setIsDownloading(taskResolverRef.current.size > 0);
        setDownloadPercent(100);
        setStatus(event.payload.message);

        if (historyId) {
          updateHistoryEntry(historyId, (entry) => ({
            ...entry,
            status: "completed",
            percent: 100,
            updatedAt: new Date().toISOString(),
          }));
        }
      });

      disposeError = await listen<DownloadDoneEvent>("download-error", (event) => {
        const resolver = taskResolverRef.current.get(event.payload.taskId);
        if (resolver) {
          resolver.reject(new Error(event.payload.message));
          taskResolverRef.current.delete(event.payload.taskId);
        }

        const historyId = taskHistoryRef.current.get(event.payload.taskId);
        taskHistoryRef.current.delete(event.payload.taskId);

        setActiveTaskCount(taskResolverRef.current.size);
        setIsDownloading(taskResolverRef.current.size > 0);
        setError(event.payload.message);
        setStatus("Falha no download.");

        if (historyId) {
          updateHistoryEntry(historyId, (entry) => ({
            ...entry,
            status: "failed",
            updatedAt: new Date().toISOString(),
          }));
        }
      });
    };

    setupListeners();

    return () => {
      if (disposeProgress) {
        disposeProgress();
      }
      if (disposeComplete) {
        disposeComplete();
      }
      if (disposeError) {
        disposeError();
      }
    };
  }, []);

  function addHistoryEntry(entry: DownloadHistoryEntry) {
    setHistoryEntries((prev) => [entry, ...prev].slice(0, HISTORY_LIMIT * 2));
  }

  async function fetchMetadataFromUrl(nextUrl: string) {
    return invoke<VideoMetadata>("fetch_video_metadata", {
      url: nextUrl.trim(),
    });
  }

  async function fetchPlaylistFromUrl(nextUrl: string) {
    return invoke<PlaylistData>("fetch_playlist_entries", {
      url: nextUrl.trim(),
    });
  }

  function isYoutubeUrl(value: string) {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return false;
    }

    return (
      (normalized.startsWith("https://") || normalized.startsWith("http://")) &&
      (normalized.includes("youtube.com/") || normalized.includes("youtu.be/"))
    );
  }

  const isUrlFormatValid = useMemo(() => {
    const value = url.trim().toLowerCase();
    if (!value) {
      return false;
    }

    return (
      (value.startsWith("https://") || value.startsWith("http://")) &&
      (value.includes("youtube.com/") || value.includes("youtu.be/"))
    );
  }, [url]);

  async function pickFolder() {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Selecione a pasta de destino",
      });

      if (typeof selected === "string") {
        setDestinationFolder(selected);
        setSettings((prev) =>
          prev.defaultDestinationFolder === selected
            ? prev
            : {
                ...prev,
                defaultDestinationFolder: selected,
              },
        );
      }
    } catch {
      setError("Nao foi possivel abrir o seletor de pastas.");
    }
  }

  function handleDestinationFolderChange(value: string) {
    setDestinationFolder(value);

    const normalized = value.trim();
    if (!normalized) {
      return;
    }

    setSettings((prev) =>
      prev.defaultDestinationFolder === normalized
        ? prev
        : {
            ...prev,
            defaultDestinationFolder: normalized,
          },
    );
  }

  async function validateUrl() {
    setError("");
    setMetadata(null);

    if (!isUrlFormatValid) {
      setError("Informe uma URL valida do YouTube (youtube.com ou youtu.be).");
      return;
    }

    setIsValidating(true);
    setStatus("Validando URL e buscando metadados...");

    try {
      const result = await fetchMetadataFromUrl(url);
      setMetadata(result);
      setStatus("URL valida. Metadados carregados com sucesso.");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setStatus("Falha na validacao da URL.");
    } finally {
      setIsValidating(false);
    }
  }

  async function loadPlaylist() {
    setError("");
    setPlaylistNotice("");

    if (!playlistUrl.trim()) {
      setPlaylistNotice("Cole uma URL de playlist para continuar.");
      return;
    }

    setIsLoadingPlaylist(true);
    try {
      const data = await fetchPlaylistFromUrl(playlistUrl);
      setPlaylistData(data);
      setQueueCurrentId(null);
      playlistQueueRef.current = [];
      setIsQueueRunning(false);
      setQueueUiItems(
        data.entries.map((entry) => ({
          ...entry,
          status: "pending",
          attempts: 0,
        })),
      );
      setSelectedPlaylistIds([]);
      setPlaylistNotice(`Playlist carregada: ${data.entries.length} video(s).`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setPlaylistNotice(message);
    } finally {
      setIsLoadingPlaylist(false);
    }
  }

  async function addBulkLink() {
    const nextUrl = bulkLinkInput.trim();
    setBulkNotice("");

    if (!nextUrl) {
      setBulkNotice("Cole um link antes de adicionar ao multi link.");
      return;
    }

    if (!isYoutubeUrl(nextUrl)) {
      setBulkNotice("Use um link valido do YouTube para o multi link.");
      return;
    }

    if (bulkLinksRef.current.length >= BULK_LINK_LIMIT) {
      setBulkNotice(`Limite do multi link: ${BULK_LINK_LIMIT} links.`);
      return;
    }

    if (bulkLinksRef.current.some((item) => item.url.trim().toLowerCase() === nextUrl.toLowerCase())) {
      setBulkNotice("Esse link ja foi adicionado no multi link.");
      return;
    }

    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setBulkLinkInput("");
    setBulkLinks((prev) => [
      {
        id,
        url: nextUrl,
        title: "Buscando metadados...",
        status: "validating",
      },
      ...prev,
    ]);

    try {
      const meta = await fetchMetadataFromUrl(nextUrl);
      setBulkLinks((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                title: meta.title || nextUrl,
                thumbnail: meta.thumbnail,
                channel: meta.uploader,
                status: "ready",
              }
            : item,
        ),
      );
    } catch {
      setBulkLinks((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                title: nextUrl,
                status: "ready",
              }
            : item,
        ),
      );
      setBulkNotice("Alguns links ficaram sem metadados, mas podem ser baixados normalmente.");
    }
  }

  function removeBulkLink(itemId: string) {
    bulkQueueRef.current = bulkQueueRef.current.filter((id) => id !== itemId);
    setBulkLinks((prev) => prev.filter((item) => item.id !== itemId));
  }

  function clearBulkLinks() {
    bulkQueueRef.current = [];
    setBulkLinks([]);
    setBulkNotice("");
  }

  function startBulkDownloads() {
    setError("");

    if (!destinationFolder.trim()) {
      setError("Selecione uma pasta de destino antes do download.");
      setBulkNotice("Defina a pasta de destino para iniciar o multi link.");
      return;
    }

    const resumableIds = bulkLinksRef.current
      .filter((item) => item.status === "ready" || item.status === "failed")
      .map((item) => item.id);

    if (resumableIds.length === 0) {
      setBulkNotice("Nao ha links prontos para baixar no multi link.");
      return;
    }

    const alreadyQueued = new Set(bulkQueueRef.current);
    const toQueue = resumableIds.filter((id) => !alreadyQueued.has(id));

    if (toQueue.length === 0) {
      setBulkNotice("Multi link ja esta em andamento.");
      return;
    }

    bulkQueueRef.current.push(...toQueue);
    setBulkLinks((prev) =>
      prev.map((item) =>
        toQueue.includes(item.id)
          ? {
              ...item,
              status: "queued",
              lastError: undefined,
            }
          : item,
      ),
    );
    setBulkNotice(`Multi link iniciado com ${toQueue.length} link(s).`);
  }

  async function runDownload(config: DownloadConfig) {
    const historyId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const taskId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const now = new Date().toISOString();

    addHistoryEntry({
      id: historyId,
      source: config.source,
      url: config.url,
      title: config.videoTitle,
      destinationFolder: config.destinationFolder,
      mediaType: config.mediaType,
      format: config.format,
      quality: config.quality,
      status: "started",
      percent: 0,
      createdAt: now,
      updatedAt: now,
    });

    taskHistoryRef.current.set(taskId, historyId);
    setDownloadPercent(0);
    setDownloadTitle(config.videoTitle);
    setIsDownloading(true);
    setStatus("Iniciando download...");

    await new Promise<void>((resolve, reject) => {
      taskResolverRef.current.set(taskId, { resolve, reject });
      setActiveTaskCount(taskResolverRef.current.size);

      void invoke("start_download", {
        taskId,
        url: config.url,
        destinationFolder: config.destinationFolder,
        videoTitle: config.videoTitle,
        mediaType: config.mediaType,
        format: config.format,
        quality: config.quality,
      }).catch((err) => {
        taskResolverRef.current.delete(taskId);
        taskHistoryRef.current.delete(taskId);
        setActiveTaskCount(taskResolverRef.current.size);
        setIsDownloading(taskResolverRef.current.size > 0);
        reject(err instanceof Error ? err : new Error(String(err)));
      });
    });
  }

  async function startDownload() {
    setError("");

    if (!metadata) {
      setError("Valide uma URL primeiro para iniciar o download.");
      return;
    }

    if (!destinationFolder.trim()) {
      setError("Selecione uma pasta de destino antes do download.");
      return;
    }

    if (!canStartAnotherDownload) {
      setError(`Limite de ${maxParallelDownloads} downloads simultaneos atingido.`);
      return;
    }

    try {
      await runDownload({
        source: "standard",
        url: url.trim(),
        destinationFolder: destinationFolder.trim(),
        videoTitle: metadata.title,
        mediaType,
        format: mediaType === "video" ? videoFormat : audioFormat,
        quality: mediaType === "video" ? videoQuality : audioQuality,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setStatus("Falha ao iniciar download.");
    }
  }

  async function startDownloadFromSelector() {
    setMediaType(formatTab);

    if (formatTab === "video") {
      setVideoFormat("mp4");
      setVideoQuality(selectedVideoQuality);
    } else {
      setAudioFormat("mp3");
      setAudioQuality(selectedAudioQuality);
    }

    await startDownload();
  }

  function getCurrentFormatSelection() {
    const selectedMediaType = formatTab;
    const selectedFormat = selectedMediaType === "video" ? "mp4" : "mp3";
    const selectedQuality =
      selectedMediaType === "video" ? selectedVideoQuality : selectedAudioQuality;

    return {
      mediaType: selectedMediaType,
      format: selectedFormat,
      quality: selectedQuality,
    };
  }

  async function downloadPlaylistItem(item: PlaylistItem) {
    if (!destinationFolder.trim()) {
      setError("Selecione uma pasta de destino antes do download.");
      setActivePage("downloader");
      return;
    }

    if (!canStartAnotherDownload) {
      setPlaylistNotice(`Limite de ${maxParallelDownloads} downloads simultaneos atingido.`);
      return;
    }

    const selection = getCurrentFormatSelection();

    setError("");
    setStatus(`Baixando item da playlist: ${item.title}`);
    setQueueUiItems((prev) =>
      prev.map((entry) =>
        entry.id === item.id
          ? {
              ...entry,
              status: "downloading",
              lastError: undefined,
            }
          : entry,
      ),
    );

    try {
      await runDownload({
        source: "playlist",
        url: item.url,
        destinationFolder: destinationFolder.trim(),
        videoTitle: item.title,
        mediaType: selection.mediaType,
        format: selection.format,
        quality: selection.quality,
      });

      setQueueUiItems((prev) =>
        prev.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                status: "completed",
                lastError: undefined,
              }
            : entry,
        ),
      );
      setSelectedPlaylistIds((prev) => prev.filter((id) => id !== item.id));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setQueueUiItems((prev) =>
        prev.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                status: "failed",
                lastError: message,
              }
            : entry,
        ),
      );
      setError(message);
      setStatus("Falha ao iniciar download de item da playlist.");
      throw err;
    }
  }

  function queuePlaylistDownloads() {
    if (!playlistData || queueUiItems.length === 0) {
      setPlaylistNotice("Nenhum item disponivel para download na playlist.");
      return;
    }

    if (!destinationFolder.trim()) {
      setPlaylistNotice("Defina a pasta de destino antes de baixar a playlist.");
      return;
    }

    const resumable = queueUiItems
      .filter((item) => item.status === "pending" || item.status === "failed")
      .map((item) => ({ id: item.id, attempt: item.attempts }));

    if (resumable.length === 0) {
      setPlaylistNotice("Nao ha itens pendentes para a fila.");
      return;
    }

    if (resumable.length > 5) {
      setPlaylistNotice(
        `Voce selecionou ${resumable.length} itens. Para volumes maiores que 5, recomendamos usar fluxo de playlist com fila.`
      );
    }

    playlistQueueRef.current = resumable;
    setIsQueueRunning(true);
    setPlaylistNotice(`Fila iniciada com ${resumable.length} item(ns).`);
  }

  function queueSelectedPlaylistDownloads() {
    if (!playlistData || queueUiItems.length === 0) {
      setPlaylistNotice("Nenhum item disponivel para download na playlist.");
      return;
    }

    if (!destinationFolder.trim()) {
      setPlaylistNotice("Defina a pasta de destino antes de baixar a playlist.");
      return;
    }

    if (selectedPlaylistIds.length === 0) {
      setPlaylistNotice("Selecione pelo menos um item da playlist.");
      return;
    }

    const selected = new Set(selectedPlaylistIds);
    const resumable = queueUiItems
      .filter(
        (item) =>
          selected.has(item.id) &&
          (item.status === "pending" || item.status === "failed" || item.status === "skipped"),
      )
      .map((item) => ({ id: item.id, attempt: item.attempts }));

    if (resumable.length === 0) {
      setPlaylistNotice("Os itens selecionados ja foram concluidos ou estao indisponiveis.");
      return;
    }

    if (resumable.length > 5) {
      setPlaylistNotice(
        `Voce selecionou ${resumable.length} itens. Para volumes maiores que 5, recomendamos usar fluxo de playlist com fila.`
      );
    }

    playlistQueueRef.current = resumable;
    setIsQueueRunning(true);
    setPlaylistNotice(`Fila selecionada iniciada com ${resumable.length} item(ns).`);
  }

  function togglePlaylistSelection(itemId: string) {
    setSelectedPlaylistIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId],
    );
  }

  function toggleSelectAllPlaylist(selectAll: boolean) {
    if (!selectAll) {
      setSelectedPlaylistIds([]);
      return;
    }

    const selectableIds = queueUiItems
      .filter((item) => item.status !== "completed")
      .map((item) => item.id);
    setSelectedPlaylistIds(selectableIds);
  }

  function cancelPlaylistQueue() {
    playlistQueueRef.current = [];
    setIsQueueRunning(false);
    setQueueCurrentId(null);
    setPlaylistNotice("Fila da playlist cancelada.");
  }

  function retryQueueItem(itemId: string) {
    const item = queueUiItems.find((entry) => entry.id === itemId);
    if (!item) {
      return;
    }

    setQueueUiItems((prev) =>
      prev.map((entry) =>
        entry.id === itemId
          ? {
              ...entry,
              status: "pending",
              attempts: 0,
              lastError: undefined,
            }
          : entry,
      ),
    );

    playlistQueueRef.current.push({ id: itemId, attempt: 0 });
    if (!isQueueRunning) {
      setIsQueueRunning(true);
    }
  }

  function skipQueueItem(itemId: string) {
    if (queueUiItemsRef.current.some((entry) => entry.id === itemId && entry.status === "downloading")) {
      setPlaylistNotice("Nao e possivel pular o item em andamento no momento.");
      return;
    }

    playlistQueueRef.current = playlistQueueRef.current.filter((task) => task.id !== itemId);
    setQueueUiItems((prev) =>
      prev.map((entry) =>
        entry.id === itemId
          ? {
              ...entry,
              status: "skipped",
            }
          : entry,
      ),
    );
  }

  function applyHistoryEntry(entry: DownloadHistoryEntry) {
    setUrl(entry.url);
    setDestinationFolder(entry.destinationFolder);
    setMediaType(entry.mediaType);

    if (entry.mediaType === "video") {
      setVideoFormat(entry.format);
      setVideoQuality(entry.quality);
    } else {
      setAudioFormat(entry.format);
      setAudioQuality(entry.quality);
    }

    setDownloadTitle(entry.title);
    setDownloadPercent(entry.percent);
    setStatus("Configuracao carregada do historico.");
  }

  async function redownloadFromHistory(entry: DownloadHistoryEntry) {
    if (!canStartAnotherDownload) {
      setError(`Limite de ${maxParallelDownloads} downloads simultaneos atingido.`);
      return;
    }

    applyHistoryEntry(entry);
    setError("");
    setStatus("Revalidando item do historico...");

    try {
      const result = await fetchMetadataFromUrl(entry.url);
      setMetadata(result);

      await runDownload({
        source: entry.source,
        url: entry.url,
        destinationFolder: entry.destinationFolder,
        mediaType: entry.mediaType,
        format: entry.format,
        quality: entry.quality,
        videoTitle: result.title,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setStatus("Falha ao repetir download do historico.");
    }
  }

  async function openHistoryDestinationFolder(entry: DownloadHistoryEntry) {
    try {
      await invoke("open_folder", {
        path: entry.destinationFolder,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Nao foi possivel abrir a pasta de destino.");
    }
  }

  function formatHistoryTime(value: string) {
    try {
      return new Date(value).toLocaleString("pt-BR");
    } catch {
      return value;
    }
  }

  const topDownloadEntries = historyEntries
    .filter((entry) => entry.source === "standard")
    .slice(0, 8);

  const topPlaylistEntries = historyEntries
    .filter((entry) => entry.source === "playlist")
    .slice(0, 8);

  const currentVideo = metadata
    ? {
        title: metadata.title,
        channel: metadata.uploader || "Canal desconhecido",
        thumbnail: metadata.thumbnail,
        duration:
          metadata.durationSeconds && metadata.durationSeconds > 0
            ? `${Math.floor(metadata.durationSeconds / 60)}:${String(metadata.durationSeconds % 60).padStart(2, "0")}`
            : "--:--",
      }
    : null;

  const selectedOptions = formatTab === "video" ? VIDEO_OPTIONS : AUDIO_OPTIONS;
  const selectedQuality = formatTab === "video" ? selectedVideoQuality : selectedAudioQuality;
  const canStartDownload = activeTaskCount < maxParallelDownloads;
  const bulkReadyCount = bulkLinks.filter(
    (item) => item.status === "ready" || item.status === "failed",
  ).length;

  useEffect(() => {
    if (bulkLinks.length === 0) {
      return;
    }

    const hasInFlight = bulkLinks.some(
      (item) => item.status === "queued" || item.status === "downloading" || item.status === "validating",
    );
    if (hasInFlight || bulkQueueRef.current.length > 0) {
      return;
    }

    const completed = bulkLinks.filter((item) => item.status === "completed").length;
    const failed = bulkLinks.filter((item) => item.status === "failed").length;

    if (completed > 0 || failed > 0) {
      setBulkNotice(`Multi link finalizado: ${completed} concluido(s), ${failed} falha(s).`);
    }
  }, [bulkLinks]);

  function handleSettingsChange(next: AppSettings) {
    setSettings(next);
    setFormatTab(next.preferredMediaType);
    setSelectedVideoQuality(next.defaultVideoQuality);
    setSelectedAudioQuality(next.defaultAudioQuality);

    if (!destinationFolder.trim() && next.defaultDestinationFolder.trim()) {
      setDestinationFolder(next.defaultDestinationFolder);
    }
  }

  async function pickDefaultFolderForSettings() {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Selecione a pasta padrao",
      });

      if (typeof selected === "string") {
        handleSettingsChange({
          ...settings,
          defaultDestinationFolder: selected,
        });
      }
    } catch {
      setError("Nao foi possivel selecionar a pasta padrao.");
    }
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = userName.trim();
    if (!trimmedName) {
      setLoginError("Informe seu nome.");
      return;
    }

    const key = loginKey.trim();
    if (!key) {
      setLoginError("Informe a chave de licenca.");
      return;
    }

    setLoginError("");
    setIsCheckingLicense(true);

    try {
      const result = await invoke<LicenseVerificationResult>("verify_license_key", {
        licenseKey: key,
      });

      if (!result.valid) {
        setLoginError(result.message || "Chave invalida.");
        return;
      }

      await savePersistedLicenseKey(key);
      localStorage.setItem(USER_NAME_STORAGE_KEY, trimmedName);
      setUserName(trimmedName);
      setLoggedIn(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLoginError(message || "Falha ao validar chave.");
    } finally {
      setIsCheckingLicense(false);
    }
  }

  function openHistoryPage() {
    setActivePage("history");
    setMobileOpen(false);
  }

  if (!loggedIn) {
    return (
      <LoginScreen
        userName={userName}
        loginKey={loginKey}
        loginError={loginError}
        isSubmitting={isCheckingLicense}
        machineCode={licenseChallenge?.machineCode}
        keySiteUrl={KEY_SITE_URL}
        onNameChange={setUserName}
        onKeyChange={setLoginKey}
        onSubmit={submitLogin}
      />
    );
  }

  return (
    <div className="flex h-screen bg-background font-inter overflow-hidden">
      <aside className="hidden md:flex w-56 shrink-0 h-screen sticky top-0 border-r border-sidebar-border bg-sidebar">
        <div className="flex flex-col w-full">
          <div className="flex items-center justify-between px-5 h-14 border-b border-sidebar-border shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                <Download className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <span className="font-bold text-sidebar-foreground text-sm tracking-tight">
                Stark <span className="text-red-500">Tube</span>
              </span>
            </div>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
              const active = activePage === id;
              return (
                <button
                  key={id}
                  onClick={() => setActivePage(id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    {label}
                  </span>
                  {!active ? <ChevronRight className="w-3.5 h-3.5 opacity-40" /> : null}
                </button>
              );
            })}
          </nav>
          <div className="px-4 py-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                {userName.trim().charAt(0).toUpperCase() || "U"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-sidebar-foreground truncate">{userName || "Usuario"}</p>
                <p className="text-[11px] text-muted-foreground truncate">Licenca local</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <AnimatePresence>
        {mobileOpen ? (
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
              className="fixed left-0 top-0 bottom-0 w-56 z-50 md:hidden bg-sidebar border-r border-sidebar-border"
            >
              <div className="flex items-center justify-between px-5 h-14 border-b border-sidebar-border">
                <span className="font-bold text-sidebar-foreground text-sm">
                  Stark <span className="text-red-500">Tube</span>
                </span>
                <button onClick={() => setMobileOpen(false)} className="w-7 h-7 rounded-lg hover:bg-sidebar-accent">
                  <X className="w-4 h-4 text-sidebar-foreground" />
                </button>
              </div>
              <nav className="px-3 py-4 space-y-1">
                {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
                  const active = activePage === id;
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        setActivePage(id);
                        setMobileOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium ${
                        active ? "bg-primary text-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  );
                })}
              </nav>
              <div className="px-4 py-4 border-t border-sidebar-border mt-auto">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent">
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                    {userName.trim().charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-sidebar-foreground truncate">{userName || "Usuario"}</p>
                    <p className="text-[11px] text-muted-foreground truncate">Licenca local</p>
                  </div>
                </div>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/80 border-b border-border h-14 flex items-center px-4 gap-3">
          <button onClick={() => setMobileOpen(true)} className="md:hidden w-9 h-9 rounded-lg hover:bg-secondary">
            <Menu className="w-4 h-4 text-foreground mx-auto" />
          </button>
          <h2 className="font-bold text-foreground text-base capitalize">{activePage}</h2>
        </header>

        <main className="flex-1 overflow-y-auto">
          {activePage === "downloader" ? (
            <DownloaderPage
              url={url}
              destinationFolder={destinationFolder}
              bulkLinkInput={bulkLinkInput}
              bulkLinks={bulkLinks}
              bulkNotice={bulkNotice}
              bulkLinkLimit={BULK_LINK_LIMIT}
              bulkReadyCount={bulkReadyCount}
              isValidating={isValidating}
              isDownloading={isDownloading}
              canStartDownload={canStartDownload}
              downloadPercent={downloadPercent}
              downloadTitle={downloadTitle}
              status={status}
              error={error}
              hasMetadata={Boolean(metadata)}
              currentVideo={currentVideo}
              formatTab={formatTab}
              selectedOptions={selectedOptions}
              selectedQuality={selectedQuality}
              topDownloadEntries={topDownloadEntries}
              showRecentDownloads={showDownloaderRecents}
              statusLabel={statusLabel}
              onUrlChange={setUrl}
              onValidateUrl={() => {
                void validateUrl();
              }}
              onDestinationChange={handleDestinationFolderChange}
              onPickFolder={() => {
                void pickFolder();
              }}
              onBulkLinkInputChange={setBulkLinkInput}
              onAddBulkLink={() => {
                void addBulkLink();
              }}
              onStartBulkDownload={startBulkDownloads}
              onRemoveBulkLink={removeBulkLink}
              onClearBulkLinks={clearBulkLinks}
              onSetFormatTab={setFormatTab}
              onSelectQuality={(optionId) => {
                if (formatTab === "video") {
                  setSelectedVideoQuality(optionId);
                } else {
                  setSelectedAudioQuality(optionId);
                }
              }}
              onStartDownload={() => {
                void startDownloadFromSelector();
              }}
              onOpenHistory={openHistoryPage}
              onOpenFolder={(entryId) => {
                const entry = historyEntries.find((item) => item.id === entryId);
                if (entry) {
                  void openHistoryDestinationFolder(entry);
                }
              }}
              onToggleRecentDownloads={() => {
                setShowDownloaderRecents((prev) => !prev);
              }}
            />
          ) : null}

          {activePage === "history" ? (
            <HistoryPage
              entries={historyEntries}
              isDownloading={isDownloading}
              formatHistoryTime={formatHistoryTime}
              statusLabel={statusLabel}
              onApply={(entryId) => {
                const entry = historyEntries.find((item) => item.id === entryId);
                if (entry) {
                  applyHistoryEntry(entry);
                }
              }}
              onRedownload={(entryId) => {
                const entry = historyEntries.find((item) => item.id === entryId);
                if (entry) {
                  void redownloadFromHistory(entry);
                }
              }}
              onOpenFolder={(entryId) => {
                const entry = historyEntries.find((item) => item.id === entryId);
                if (entry) {
                  void openHistoryDestinationFolder(entry);
                }
              }}
            />
          ) : null}

          {activePage === "playlist" ? (
            <PlaylistPage
              playlistUrl={playlistUrl}
              setPlaylistUrl={setPlaylistUrl}
              isLoadingPlaylist={isLoadingPlaylist}
              playlistNotice={playlistNotice}
              playlistData={playlistData}
              isDownloading={isDownloading}
              canStartDownload={canStartDownload}
              downloadPercent={downloadPercent}
              downloadTitle={downloadTitle}
              isQueueRunning={isQueueRunning}
              queueItems={queueUiItems}
              selectedItemIds={selectedPlaylistIds}
              topPlaylistEntries={topPlaylistEntries}
              showPlaylistRecents={showPlaylistRecents}
              queueSummary={queueSummary}
              onLoadPlaylist={() => {
                void loadPlaylist();
              }}
              onDownloadItem={(item) => {
                void downloadPlaylistItem(item);
              }}
              onDownloadAll={queuePlaylistDownloads}
              onDownloadSelected={queueSelectedPlaylistDownloads}
              onCancelQueue={cancelPlaylistQueue}
              onRetryItem={retryQueueItem}
              onSkipItem={skipQueueItem}
              onToggleSelectItem={togglePlaylistSelection}
              onToggleSelectAll={toggleSelectAllPlaylist}
              onTogglePlaylistRecents={() => {
                setShowPlaylistRecents((prev) => !prev);
              }}
              onOpenFolder={(entryId) => {
                const entry = historyEntries.find((item) => item.id === entryId);
                if (entry) {
                  void openHistoryDestinationFolder(entry);
                }
              }}
              onOpenHistory={openHistoryPage}
            />
          ) : null}

          {activePage === "settings" ? (
            <SettingsPage
              settings={settings}
              onSettingsChange={handleSettingsChange}
              onPickDefaultFolder={() => {
                void pickDefaultFolderForSettings();
              }}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}

export default App;
