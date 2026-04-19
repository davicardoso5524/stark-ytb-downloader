import { Folder, Save } from "lucide-react";

type MediaType = "video" | "audio";

export type AppSettings = {
  defaultDestinationFolder: string;
  preferredMediaType: MediaType;
  defaultVideoQuality: string;
  defaultAudioQuality: string;
  downloadConcurrency: number;
};

type SettingsPageProps = {
  settings: AppSettings;
  onSettingsChange: (next: AppSettings) => void;
  onPickDefaultFolder: () => void;
};

export default function SettingsPage(props: SettingsPageProps) {
  const { settings, onSettingsChange, onPickDefaultFolder } = props;

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-5">
      <div className="bg-card border border-border rounded-2xl p-4">
        <h3 className="font-bold text-sm mb-2">Configuracoes</h3>
        <p className="text-xs text-muted-foreground">Essas preferencias ficam salvas localmente e viram o padrao dos novos downloads.</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <p className="text-sm text-foreground">Pasta padrao de download</p>
        <div className="flex items-center gap-2 rounded-xl bg-secondary/40 border border-border px-3 py-2">
          <Folder className="w-4 h-4 text-muted-foreground" />
          <input
            value={settings.defaultDestinationFolder}
            onChange={(e) =>
              onSettingsChange({
                ...settings,
                defaultDestinationFolder: e.target.value,
              })
            }
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            placeholder="Defina a pasta padrao"
          />
          <button onClick={onPickDefaultFolder} className="h-8 px-3 rounded-md bg-secondary text-xs font-semibold hover:bg-secondary/80">
            Selecionar
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <p className="text-sm text-foreground">Preferencias de formato</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-xs text-muted-foreground">
            Midia padrao
            <select
              value={settings.preferredMediaType}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  preferredMediaType: e.target.value as MediaType,
                })
              }
              className="mt-1 w-full bg-secondary border border-border text-foreground rounded-lg px-2.5 py-2 outline-none"
            >
              <option value="video">Video</option>
              <option value="audio">Audio</option>
            </select>
          </label>

          <label className="text-xs text-muted-foreground">
            Qualidade de video padrao
            <select
              value={settings.defaultVideoQuality}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  defaultVideoQuality: e.target.value,
                })
              }
              className="mt-1 w-full bg-secondary border border-border text-foreground rounded-lg px-2.5 py-2 outline-none"
            >
              <option value="2160">4K (2160p)</option>
              <option value="1080">Full HD (1080p)</option>
              <option value="720">HD (720p)</option>
              <option value="480">SD (480p)</option>
            </select>
          </label>

          <label className="text-xs text-muted-foreground sm:col-span-2">
            Qualidade de audio padrao
            <select
              value={settings.defaultAudioQuality}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  defaultAudioQuality: e.target.value,
                })
              }
              className="mt-1 w-full bg-secondary border border-border text-foreground rounded-lg px-2.5 py-2 outline-none"
            >
              <option value="320">MP3 320 kbps</option>
              <option value="192">MP3 192 kbps</option>
              <option value="128">MP3 128 kbps</option>
              <option value="64">MP3 64 kbps</option>
            </select>
          </label>

          <label className="text-xs text-muted-foreground sm:col-span-2">
            Downloads simultaneos (1-5)
            <select
              value={String(settings.downloadConcurrency)}
              onChange={(e) =>
                onSettingsChange({
                  ...settings,
                  downloadConcurrency: Math.max(1, Math.min(5, Number(e.target.value) || 3)),
                })
              }
              className="mt-1 w-full bg-secondary border border-border text-foreground rounded-lg px-2.5 py-2 outline-none"
            >
              <option value="1">1 download por vez</option>
              <option value="2">2 downloads</option>
              <option value="3">3 downloads (recomendado)</option>
              <option value="4">4 downloads</option>
              <option value="5">5 downloads</option>
            </select>
          </label>
        </div>
      </div>

      <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
        <Save className="w-3.5 h-3.5" />
        As alteracoes sao salvas automaticamente.
      </div>
    </div>
  );
}
