import { FormEvent } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Download, Eye, Key, Loader2, Mail, Sparkles } from "lucide-react";

type LoginScreenProps = {
  userName: string;
  loginKey: string;
  loginError: string;
  isSubmitting: boolean;
  machineCode?: string;
  keySiteUrl?: string;
  onNameChange: (value: string) => void;
  onKeyChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export default function LoginScreen(props: LoginScreenProps) {
  const {
    userName,
    loginKey,
    loginError,
    isSubmitting,
    machineCode,
    keySiteUrl,
    onNameChange,
    onKeyChange,
    onSubmit,
  } = props;

  return (
    <div className="min-h-screen bg-background font-inter flex overflow-hidden">
      <div className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 bg-card border-r border-border p-10 relative overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <Download className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-black text-xl text-foreground tracking-tight">
            Stark <span className="text-red-500">Tube</span>
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">PRO</span>
        </div>

        <div className="relative z-10 space-y-8">
          <h2 className="font-black text-4xl text-foreground leading-tight">
            Baixe qualquer video.
            <br />
            <span className="text-primary">Sem limites.</span>
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">Interface nova aplicada ao app Tauri</p>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-xs text-muted-foreground">© 2026 Stark Tube. Apenas para uso pessoal.</p>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-10 relative">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="mb-8">
            <h1 className="font-black text-3xl text-foreground">Entrar</h1>
            <p className="text-muted-foreground text-sm mt-2">
              Esta tela valida localmente a chave de licenca, sem API.
            </p>
          </div>

          {machineCode ? (
            <div className="mb-4 rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Machine Code</p>
              <p className="text-xs font-semibold text-foreground break-all mt-1">{machineCode}</p>
            </div>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Nome</label>
              <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4">
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  placeholder="Seu nome"
                  className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm py-3 outline-none"
                  value={userName}
                  onChange={(e) => onNameChange(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Chave</label>
              <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4">
                <Key className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm py-3 outline-none"
                  value={loginKey}
                  onChange={(e) => onKeyChange(e.target.value)}
                />
                <Eye className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/25">
              <div className="flex items-center gap-2.5 min-w-0">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                <p className="text-xs text-destructive font-medium truncate">Cole a key emitida no site para liberar</p>
              </div>
              {keySiteUrl ? (
                <a
                  href={keySiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="h-8 px-3 rounded-md bg-destructive text-destructive-foreground text-[11px] font-semibold inline-flex items-center shrink-0"
                >
                  Pegar key
                </a>
              ) : null}
            </div>

            <button
              type="submit"
                disabled={isSubmitting}
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-lg shadow-primary/25"
            >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2 inline" />
                    Verificando...
                  </>
                ) : (
                  "Entrar"
                )}
            </button>

              {loginError ? (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/25">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                  <p className="text-xs text-destructive font-medium">{loginError}</p>
                </div>
              ) : null}
          </form>
        </motion.div>
      </div>
    </div>
  );
}
