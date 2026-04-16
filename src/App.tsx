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
  videoTitle: string;
  percent: number;
  rawLine: string;
};

type DownloadDoneEvent = {
  message: string;
};

type MediaType = "video" | "audio";

type DownloadHistoryStatus = "started" | "completed" | "failed";

type DownloadHistoryEntry = {
  id: string;
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

type DownloadConfig = {
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

const DEFAULT_SETTINGS: AppSettings = {
  defaultDestinationFolder: "",
  preferredMediaType: "video",
  defaultVideoQuality: "1080",
  defaultAudioQuality: "320",
};

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
  const [isQueueRunning, setIsQueueRunning] = useState(false);
  const [queueUiItems, setQueueUiItems] = useState<QueueUiItem[]>([]);
  const [queueCurrentId, setQueueCurrentId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [userName, setUserName] = useState("");
  const [loginKey, setLoginKey] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isCheckingLicense, setIsCheckingLicense] = useState(false);
  const [licenseChallenge, setLicenseChallenge] = useState<LicenseChallenge | null>(null);
  const activeHistoryIdRef = useRef<string | null>(null);
  const playlistQueueRef = useRef<QueueTask[]>([]);
  const queueUiItemsRef = useRef<QueueUiItem[]>([]);

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
      const cachedKey = localStorage.getItem(LICENSE_STORAGE_KEY)?.trim();
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
          localStorage.removeItem(LICENSE_STORAGE_KEY);
        }
      } catch {
        if (mounted) {
          localStorage.removeItem(LICENSE_STORAGE_KEY);
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
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as DownloadHistoryEntry[];
      if (Array.isArray(parsed)) {
        setHistoryEntries(parsed.slice(0, HISTORY_LIMIT));
      }
    } catch {
      setHistoryEntries([]);
    }
  }, []);

  useEffect(() => {
    queueUiItemsRef.current = queueUiItems;
  }, [queueUiItems]);

  useEffect(() => {
    if (!isQueueRunning || isDownloading) {
      return;
    }

    const nextTask = playlistQueueRef.current.shift();
    if (!nextTask) {
      setIsQueueRunning(false);
      setQueueCurrentId(null);
      return;
    }

    const queueItem = queueUiItemsRef.current.find((item) => item.id === nextTask.id);
    if (!queueItem || queueItem.status === "skipped") {
      return;
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
        setQueueUiItems((prev) =>
          prev.map((item) =>
            item.id === queueItem.id
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
  }, [isDownloading, isQueueRunning]);

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
    if (finished >= queueSummary.total && !isDownloading && playlistQueueRef.current.length === 0) {
      setIsQueueRunning(false);
      setPlaylistNotice(
        `Fila finalizada: ${queueSummary.completed} concluido(s), ${queueSummary.failed} falha(s), ${queueSummary.skipped} pulado(s).`,
      );
    }
  }, [isDownloading, isQueueRunning, queueSummary]);

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
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(historyEntries));
    } catch {
      // keep UI funcional mesmo se localStorage estiver indisponivel
    }
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
        setIsDownloading(true);
        const percent = Math.max(0, Math.min(100, Number(event.payload.percent) || 0));
        setDownloadPercent(percent);
        if (event.payload.videoTitle) {
          setDownloadTitle(event.payload.videoTitle);
        }

        if (activeHistoryIdRef.current) {
          updateHistoryEntry(activeHistoryIdRef.current, (entry) => ({
            ...entry,
            title: event.payload.videoTitle || entry.title,
            percent,
            updatedAt: new Date().toISOString(),
          }));
        }
      });

      disposeComplete = await listen<DownloadDoneEvent>("download-complete", (event) => {
        setIsDownloading(false);
        setDownloadPercent(100);
        setStatus(event.payload.message);

        if (activeHistoryIdRef.current) {
          updateHistoryEntry(activeHistoryIdRef.current, (entry) => ({
            ...entry,
            status: "completed",
            percent: 100,
            updatedAt: new Date().toISOString(),
          }));
          activeHistoryIdRef.current = null;
        }
      });

      disposeError = await listen<DownloadDoneEvent>("download-error", (event) => {
        setIsDownloading(false);
        setError(event.payload.message);
        setStatus("Falha no download.");

        if (activeHistoryIdRef.current) {
          updateHistoryEntry(activeHistoryIdRef.current, (entry) => ({
            ...entry,
            status: "failed",
            updatedAt: new Date().toISOString(),
          }));
          activeHistoryIdRef.current = null;
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
    setHistoryEntries((prev) => [entry, ...prev].slice(0, HISTORY_LIMIT));
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
      }
    } catch {
      setError("Nao foi possivel abrir o seletor de pastas.");
    }
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
      setPlaylistNotice(`Playlist carregada: ${data.entries.length} video(s).`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setPlaylistNotice(message);
    } finally {
      setIsLoadingPlaylist(false);
    }
  }

  async function runDownload(config: DownloadConfig) {
    const historyId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const now = new Date().toISOString();

    addHistoryEntry({
      id: historyId,
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

    activeHistoryIdRef.current = historyId;
    setDownloadPercent(0);
    setDownloadTitle(config.videoTitle);
    setIsDownloading(true);
    setStatus("Iniciando download...");

    await invoke("start_download", {
      url: config.url,
      destinationFolder: config.destinationFolder,
      videoTitle: config.videoTitle,
      mediaType: config.mediaType,
      format: config.format,
      quality: config.quality,
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

    try {
      await runDownload({
        url: url.trim(),
        destinationFolder: destinationFolder.trim(),
        videoTitle: metadata.title,
        mediaType,
        format: mediaType === "video" ? videoFormat : audioFormat,
        quality: mediaType === "video" ? videoQuality : audioQuality,
      });
    } catch (err) {
      activeHistoryIdRef.current = null;
      setIsDownloading(false);
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

    const selection = getCurrentFormatSelection();

    setError("");
    setStatus(`Baixando item da playlist: ${item.title}`);

    try {
      await runDownload({
        url: item.url,
        destinationFolder: destinationFolder.trim(),
        videoTitle: item.title,
        mediaType: selection.mediaType,
        format: selection.format,
        quality: selection.quality,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
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

    playlistQueueRef.current = resumable;
    setIsQueueRunning(true);
    setPlaylistNotice(`Fila iniciada com ${resumable.length} item(ns).`);
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
    if (queueCurrentId === itemId && isDownloading) {
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
    if (isDownloading) {
      return;
    }

    applyHistoryEntry(entry);
    setError("");
    setStatus("Revalidando item do historico...");

    try {
      const result = await fetchMetadataFromUrl(entry.url);
      setMetadata(result);

      await runDownload({
        url: entry.url,
        destinationFolder: entry.destinationFolder,
        mediaType: entry.mediaType,
        format: entry.format,
        quality: entry.quality,
        videoTitle: result.title,
      });
    } catch (err) {
      activeHistoryIdRef.current = null;
      setIsDownloading(false);
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setStatus("Falha ao repetir download do historico.");
    }
  }

  function formatHistoryTime(value: string) {
    try {
      return new Date(value).toLocaleString("pt-BR");
    } catch {
      return value;
    }
  }

  const topDownloadEntries = historyEntries.slice(0, 8);

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

      localStorage.setItem(LICENSE_STORAGE_KEY, key);
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
              isValidating={isValidating}
              isDownloading={isDownloading}
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
              statusLabel={statusLabel}
              onUrlChange={setUrl}
              onValidateUrl={() => {
                void validateUrl();
              }}
              onDestinationChange={setDestinationFolder}
              onPickFolder={() => {
                void pickFolder();
              }}
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
              isQueueRunning={isQueueRunning}
              queueItems={queueUiItems}
              queueSummary={queueSummary}
              onLoadPlaylist={() => {
                void loadPlaylist();
              }}
              onDownloadItem={(item) => {
                void downloadPlaylistItem(item);
              }}
              onDownloadAll={queuePlaylistDownloads}
              onCancelQueue={cancelPlaylistQueue}
              onRetryItem={retryQueueItem}
              onSkipItem={skipQueueItem}
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
