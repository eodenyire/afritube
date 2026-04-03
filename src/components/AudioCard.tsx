import { Play, Pause, Heart, MoreVertical } from "lucide-react";
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import VideoContextMenu from "./VideoContextMenu";

interface AudioCardProps {
  id?: string;
  title: string;
  artist: string;
  cover: string;
  streams: string;
  duration: string;
  audioUrl?: string;
}

const AudioCard = ({ id, title, artist, cover, streams, duration, audioUrl }: AudioCardProps) => {
  const [liked, setLiked] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [realDuration, setRealDuration] = useState<string>(duration);
  const [streamCount, setStreamCount] = useState<string>(streams);
  const [menuOpen, setMenuOpen] = useState(false);
  const hasCountedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setPlaying(false);
      audioRef.current.onloadedmetadata = () => {
        if (!audioRef.current) return;
        const secs = Math.round(audioRef.current.duration);
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        setRealDuration(`${m}:${s.toString().padStart(2, "0")}`);
      };
      audioRef.current.ontimeupdate = () => {
        // Count a stream after 30 seconds of playback (or full track if shorter)
        if (!audioRef.current || hasCountedRef.current) return;
        const threshold = Math.min(30, audioRef.current.duration * 0.5);
        if (audioRef.current.currentTime >= threshold) {
          hasCountedRef.current = true;
          // Increment in DB
          if (id) {
            supabase.rpc("increment_streams", { track_id: id }).then(() => {
              // Update display count locally
              setStreamCount((prev) => {
                const raw = parseFloat(prev.replace(/[KM]/g, "")) *
                  (prev.includes("M") ? 1_000_000 : prev.includes("K") ? 1_000 : 1);
                const next = raw + 1;
                if (next >= 1_000_000) return `${(next / 1_000_000).toFixed(1)}M`;
                if (next >= 1_000) return `${(next / 1_000).toFixed(1)}K`;
                return next.toString();
              });
            });
          }
        }
      };
    }
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="group cursor-pointer"
    >
      <div className="relative rounded-xl overflow-hidden aspect-square bg-secondary mb-3">
        <img src={cover} alt={title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end p-3">
          <div className="flex items-center justify-between w-full opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-primary flex items-center justify-center hover:opacity-90 transition-opacity"
            >
              {playing ? (
                <Pause size={18} className="text-primary-foreground" fill="currentColor" />
              ) : (
                <Play size={18} className="text-primary-foreground ml-0.5" fill="currentColor" />
              )}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setLiked(!liked); }}
              className="w-8 h-8 rounded-full bg-black/50 flex items-center justify-center"
            >
              <Heart size={16} className={liked ? "text-coral fill-coral" : "text-foreground"} />
            </button>
          </div>
        </div>
      </div>
      <h3 className="font-medium text-sm text-foreground truncate">{title}</h3>
      <p className="text-xs text-muted-foreground mt-0.5">{artist}</p>
      <div className="flex items-center justify-between mt-0.5">
        <p className="text-xs text-muted-foreground">{streamCount} streams • {realDuration}</p>
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <MoreVertical size={13} />
        </button>
      </div>
      {menuOpen && (
        <VideoContextMenu
          audioId={id}
          title={title}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </motion.div>
  );
};

export default AudioCard;
