import React from "react";
import { motion } from "framer-motion";
import { Download, Zap, Shield, Sparkles } from "lucide-react";

export default function HeroSection() {
  return (
    <div className="relative text-center pt-16 pb-10 px-4">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="relative z-10"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          Rápido, Gratuito & Sem Limites
        </div>

        <h1 className="font-inter text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-foreground leading-tight">
          Baixe Vídeos do
          <br />
          <span className="text-primary">YouTube</span> Facilmente
        </h1>

        <p className="mt-5 text-muted-foreground text-base md:text-lg max-w-lg mx-auto leading-relaxed">
          Cole o link do vídeo e baixe em alta qualidade. MP4, MP3, 4K — tudo que você precisa em um só lugar.
        </p>

        <div className="flex items-center justify-center gap-6 mt-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span>Ultra Rápido</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span>100% Seguro</span>
          </div>
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-primary" />
            <span>Sem Limites</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}