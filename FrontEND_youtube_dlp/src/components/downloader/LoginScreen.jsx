import React, { useState } from "react";
import { motion } from "framer-motion";
import { Download, Eye, EyeOff, Key, Mail, Loader2, AlertCircle, Sparkles, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginScreen({ onLogin }) {
  const [form, setForm] = useState({ email: "", key: "" });
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.key.trim()) {
      setError("Preencha todos os campos.");
      return;
    }
    setError("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (form.key.length < 6) {
        setError("Chave de acesso inválida. Verifique e tente novamente.");
      } else {
        onLogin && onLogin();
      }
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-background font-inter flex overflow-hidden">
      {/* Left panel - branding */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 bg-card border-r border-border p-10 relative overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
            <Download className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-black text-xl text-foreground tracking-tight">TubeGrab</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">PRO</span>
        </div>

        {/* Center content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="font-black text-4xl text-foreground leading-tight">
              Baixe qualquer vídeo.<br />
              <span className="text-primary">Sem limites.</span>
            </h2>
            <p className="mt-4 text-muted-foreground text-sm leading-relaxed max-w-xs">
              Acesse com sua chave de licença e aproveite downloads ilimitados em alta qualidade.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: Zap, label: "Download ultra rápido", desc: "Velocidade máxima da sua conexão" },
              { icon: Shield, label: "100% seguro e privado", desc: "Nenhum dado seu é armazenado" },
              { icon: Sparkles, label: "4K, MP3, MP4 e mais", desc: "Todos os formatos suportados" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-muted-foreground">
          © 2026 TubeGrab. Apenas para uso pessoal.
        </p>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center px-6 py-10 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary/8 rounded-full blur-[100px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <Download className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-black text-lg text-foreground tracking-tight">TubeGrab</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">PRO</span>
          </div>

          <div className="mb-8">
            <h1 className="font-black text-3xl text-foreground">Bem-vindo de volta</h1>
            <p className="text-muted-foreground text-sm mt-2">
              Entre com seu e-mail e chave de acesso para continuar.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">E-mail</label>
              <div className={`flex items-center gap-3 bg-card border rounded-xl px-4 transition-colors ${
                error && !form.email ? "border-destructive" : "border-border focus-within:border-primary/50"
              }`}>
                <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  type="email"
                  placeholder="seu@email.com"
                  className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm py-3 outline-none"
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Chave de Acesso</label>
                <span className="text-xs text-primary font-medium cursor-pointer hover:opacity-80">Não tem uma chave?</span>
              </div>
              <div className={`flex items-center gap-3 bg-card border rounded-xl px-4 transition-colors ${
                error ? "border-destructive" : "border-border focus-within:border-primary/50"
              }`}>
                <Key className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  type={showKey ? "text" : "password"}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm py-3 outline-none font-mono tracking-widest"
                  value={form.key}
                  onChange={(e) => setForm(f => ({ ...f, key: e.target.value }))}
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(v => !v)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20"
              >
                <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                <p className="text-xs text-destructive font-medium">{error}</p>
              </motion.div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-lg shadow-primary/25 mt-2"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Verificando...</>
              ) : (
                "Entrar"
              )}
            </Button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">licença</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* License info box */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border">
            <Key className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-foreground">Precisa de uma licença?</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Adquira sua chave de acesso no nosso site e use aqui para entrar.
              </p>
              <button className="text-xs text-primary font-semibold mt-1.5 hover:opacity-80 transition-opacity">
                Acessar site de cadastro →
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}