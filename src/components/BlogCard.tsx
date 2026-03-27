import { BookOpen, MessageCircle, Heart } from "lucide-react";
import { motion } from "framer-motion";

interface BlogCardProps {
  title: string;
  excerpt: string;
  author: string;
  avatar: string;
  cover: string;
  readTime: string;
  likes: number;
  comments: number;
  category: string;
}

const BlogCard = ({ title, excerpt, author, avatar, cover, readTime, likes, comments, category }: BlogCardProps) => {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="group cursor-pointer rounded-xl overflow-hidden bg-card border border-border hover:border-primary/30 transition-colors shadow-card"
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        <img src={cover} alt={title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        <span className="absolute top-3 left-3 bg-gradient-coral text-accent-foreground text-[11px] font-semibold px-3 py-1 rounded-full">
          {category}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-display font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">{title}</h3>
        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{excerpt}</p>
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <img src={avatar} alt={author} className="w-7 h-7 rounded-full object-cover" />
            <div>
              <p className="text-xs font-medium text-foreground">{author}</p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1"><BookOpen size={10} />{readTime}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Heart size={12} />{likes}</span>
            <span className="flex items-center gap-1"><MessageCircle size={12} />{comments}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default BlogCard;
