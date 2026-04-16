import React, { useState, useCallback } from "react";
import LoginScreen from "@/components/downloader/LoginScreen";
import Sidebar from "@/components/downloader/Sidebar";
import TopBar from "@/components/downloader/TopBar";
import HeroSection from "@/components/downloader/HeroSection";
import UrlInput from "@/components/downloader/UrlInput";
import VideoPreview from "@/components/downloader/VideoPreview";
import FormatSelector from "@/components/downloader/FormatSelector";
import DownloadProgress from "@/components/downloader/DownloadProgress";
import RecentDownloads from "@/components/downloader/RecentDownloads";
import PlaylistPage from "@/pages/PlaylistPage";
import SettingsPage from "@/pages/SettingsPage";

const MOCK_VIDEO = {
  title: "Como Criar Apps Incríveis com React e Tailwind CSS - Guia Completo 2026",
  channel: "Dev Academy BR",
  thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=450&fit=crop",
  duration: "24:17",
  views: "1.2M visualizações",
  likes: "45K",
};

function DownloaderPage() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [video, setVideo] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showProgress, setShowProgress] = useState(false);

  const handleSearch = useCallback(() => {
    if (!url.trim()) return;
    setIsLoading(true);
    setVideo(null);
    setShowProgress(false);
    setProgress(0);
    setTimeout(() => {
      setVideo(MOCK_VIDEO);
      setIsLoading(false);
    }, 1500);
  }, [url]);

  const handleDownload = useCallback(() => {
    setDownloading(true);
    setShowProgress(true);
    setProgress(0);
    let current = 0;
    const interval = setInterval(() => {
      current += Math.random() * 15 + 5;
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        setDownloading(false);
      }
      setProgress(current);
    }, 400);
  }, []);

  return (
    <div className="overflow-y-auto">
      <HeroSection />
      <UrlInput url={url} setUrl={setUrl} onSearch={handleSearch} isLoading={isLoading} />
      <VideoPreview video={video} />
      <FormatSelector visible={!!video} onDownload={handleDownload} downloading={downloading} />
      <DownloadProgress progress={progress} visible={showProgress} />
      <RecentDownloads />
    </div>
  );
}

const PAGE_MAP = {
  downloader: <DownloaderPage />,
  playlist: <PlaylistPage />,
  history: <RecentDownloads standalone />,
  settings: <SettingsPage />,
};

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [activePage, setActivePage] = useState("downloader");
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!loggedIn) {
    return <LoginScreen onLogin={() => setLoggedIn(true)} />;
  }

  return (
    <div className="flex h-screen bg-background font-inter overflow-hidden">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar activePage={activePage} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          {activePage === "downloader" && <DownloaderPage />}
          {activePage === "playlist" && <PlaylistPage />}
          {activePage === "settings" && <SettingsPage />}
          {activePage === "history" && <div className="max-w-2xl mx-auto"><RecentDownloads /></div>}
        </main>
      </div>
    </div>
  );
}