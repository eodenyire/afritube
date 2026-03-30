import { Play, Eye, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

interface VideoCardProps {
  id?: string;
  title: string;
  channel: string;
  views: string;
  duration: string;
  thumbnail: string;
  avatar: string;
  isMonetized?: boolean;
}

const VideoCard = ({ id, title, channel, views, duration, thumbnail, avatar, isMonetized }: VideoCardProps) => {
  const Wrapper = id ? Link : "div";
  const wrapperProps = id ? { to: `/watch/${id}` } : {};

  return (
    <Wrapper {...(wrapperProps as any)}>
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
        className="group cursor-pointer"
      >
        <div className="relative rounded-xl overflow-hidden aspect-video bg-secondary mb-3">
          <img src={thumbnail} alt={title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity scale-75 group-hover:scale-100">
              <Play size={20} className="text-primary-foreground ml-0.5" fill="currentColor" />
            </div>
          </div>
          <span className="absolute bottom-2 right-2 bg-black/80 text-foreground text-xs px-2 py-0.5 rounded font-medium">
            {duration}
          </span>
          {isMonetized && (
            <span className="absolute top-2 left-2 bg-gradient-gold text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Monetized
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <img src={avatar} alt={channel} className="w-9 h-9 rounded-full object-cover shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h3 className="font-medium text-sm text-foreground line-clamp-2 leading-snug">{title}</h3>
            <p className="text-xs text-muted-foreground mt-1">{channel}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1"><Eye size={12} />{views}</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Clock size={12} />2 days ago</span>
            </div>
          </div>
        </div>
      </motion.div>
    </Wrapper>
  );
};

export default VideoCard;
