import { Play, Pause, Heart } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

interface AudioCardProps {
  title: string;
  artist: string;
  cover: string;
  streams: string;
  duration: string;
}

const AudioCard = ({ title, artist, cover, streams, duration }: AudioCardProps) => {
  const [liked, setLiked] = useState(false);
  const [playing, setPlaying] = useState(false);

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
              onClick={(e) => { e.stopPropagation(); setPlaying(!playing); }}
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
      <p className="text-xs text-muted-foreground mt-0.5">{streams} streams • {duration}</p>
    </motion.div>
  );
};

export default AudioCard;
