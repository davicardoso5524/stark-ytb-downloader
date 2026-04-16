import React from "react";
import { motion } from "framer-motion";
import { Play, Clock, Eye, ThumbsUp, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function VideoPreview({ video }) {
  if (!video) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="max-w-2xl mx-auto mt-8 px-4"
    >
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-2xl shadow-black/20">
        {/* Thumbnail */}
        <div className="relative group cursor-pointer">
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full aspect-video object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center shadow-xl">
              <Play className="w-7 h-7 text-white ml-1" />
            </div>
          </div>
          <Badge className="absolute top-3 right-3 bg-black/70 text-white border-0 text-xs">
            <Clock className="w-3 h-3 mr-1" />
            {video.duration}
          </Badge>
        </div>

        {/* Info */}
        <div className="p-5">
          <h3 className="font-inter font-bold text-foreground text-base md:text-lg leading-snug line-clamp-2">
            {video.title}
          </h3>
          <div className="flex items-center gap-1.5 mt-2.5">
            <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center">
              <User className="w-3 h-3 text-muted-foreground" />
            </div>
            <span className="text-sm text-muted-foreground font-medium">{video.channel}</span>
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {video.views}
            </div>
            <div className="flex items-center gap-1">
              <ThumbsUp className="w-3.5 h-3.5" />
              {video.likes}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}