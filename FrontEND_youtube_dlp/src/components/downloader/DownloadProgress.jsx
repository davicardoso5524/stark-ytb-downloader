import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Download } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function DownloadProgress({ progress, visible }) {
  if (!visible) return null;

  const completed = progress >= 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto mt-6 px-4"
    >
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xl shadow-black/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {completed ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <Download className="w-5 h-5 text-primary animate-bounce" />
            )}
            <span className="font-inter font-bold text-sm text-foreground">
              {completed ? "Download Concluído!" : "Baixando..."}
            </span>
          </div>
          <span className="text-sm font-bold text-foreground">{Math.round(progress)}%</span>
        </div>

        <Progress value={progress} className="h-2.5 bg-secondary" />

        {!completed && (
          <p className="text-xs text-muted-foreground mt-2.5">
            Preparando seu arquivo... Não feche esta página.
          </p>
        )}
        {completed && (
          <p className="text-xs text-green-500 mt-2.5 font-medium">
            Seu arquivo está pronto! O download começará automaticamente.
          </p>
        )}
      </div>
    </motion.div>
  );
}