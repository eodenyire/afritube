import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Play, Music, BookOpen, TrendingUp, Upload, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import VideoCard from "@/components/VideoCard";
import AudioCard from "@/components/AudioCard";
import BlogCard from "@/components/BlogCard";
import CreatorBadge from "@/components/CreatorBadge";
import SectionHeader from "@/components/SectionHeader";
import CategoryPills from "@/components/CategoryPills";

import heroBg from "@/assets/hero-bg.jpg";
import thumb1 from "@/assets/thumb-1.jpg";
import thumb2 from "@/assets/thumb-2.jpg";
import thumb3 from "@/assets/thumb-3.jpg";
import thumb4 from "@/assets/thumb-4.jpg";
import album1 from "@/assets/album-1.jpg";
import album2 from "@/assets/album-2.jpg";
import album3 from "@/assets/album-3.jpg";
import album4 from "@/assets/album-4.jpg";
import blog1 from "@/assets/blog-1.jpg";
import blog2 from "@/assets/blog-2.jpg";

const videoCategories = ["Trending", "Music", "Comedy", "Tech", "Food", "Travel", "Education", "Sports"];

const videos = [
  { title: "Afrobeats Live: Lagos to the World Tour 2025", channel: "Afro Vibes", views: "1.2M", duration: "45:20", thumbnail: thumb1, avatar: album2, isMonetized: true },
  { title: "How to Cook the Perfect Jollof Rice — The Ultimate Guide", channel: "Chef Amara", views: "845K", duration: "18:33", thumbnail: thumb2, avatar: album1, isMonetized: true },
  { title: "Building Africa's Next Tech Unicorn — Startup Documentary", channel: "TechAfrika", views: "320K", duration: "1:02:15", thumbnail: thumb3, avatar: album3, isMonetized: false },
  { title: "Serengeti Sunrise — 4K Wildlife Documentary", channel: "NatureAfrica", views: "2.1M", duration: "52:08", thumbnail: thumb4, avatar: album4, isMonetized: true },
];

const audios = [
  { title: "Midnight in Lagos", artist: "Ayo Beats", cover: album1, streams: "3.2M", duration: "3:45" },
  { title: "Sahara Dreams", artist: "Nala Queen", cover: album2, streams: "1.8M", duration: "4:12" },
  { title: "Amapiano Sunrise", artist: "DJ Mzansi", cover: album3, streams: "5.1M", duration: "5:30" },
  { title: "Highlife Gold", artist: "Kwame & The Elders", cover: album4, streams: "890K", duration: "6:15" },
];

const blogs = [
  { title: "The Rise of African Street Fashion: From Lagos to Paris", excerpt: "How African designers are reshaping global fashion with bold prints, sustainable materials, and unapologetic creativity.", author: "Zara Okafor", avatar: album2, cover: blog1, readTime: "5 min read", likes: 234, comments: 42, category: "Fashion" },
  { title: "Inside Africa's Digital Art Revolution", excerpt: "A new generation of African digital artists is blending tradition with technology to create stunning visual narratives.", author: "Kofi Mensah", avatar: album4, cover: blog2, readTime: "8 min read", likes: 189, comments: 31, category: "Art & Culture" },
];

const creators = [
  { name: "Afro Vibes", avatar: album2, subscribers: 150, watchHours: 2400, isEligible: true },
  { name: "Chef Amara", avatar: album1, subscribers: 87, watchHours: 650, isEligible: false },
  { name: "DJ Mzansi", avatar: album3, subscribers: 120, watchHours: 1100, isEligible: true },
  { name: "Kofi Mensah", avatar: album4, subscribers: 45, watchHours: 320, isEligible: false },
];

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-16 overflow-hidden">
        <div className="relative h-[70vh] min-h-[500px] flex items-center">
          <img src={heroBg} alt="AfriTube" className="absolute inset-0 w-full h-full object-cover" width={1920} height={800} />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          <div className="relative z-10 max-w-[1440px] mx-auto px-4 md:px-6 w-full">
            <motion.div {...fadeUp} className="max-w-xl">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={18} className="text-primary" />
                <span className="text-sm font-medium text-primary">Africa's #1 Content Platform</span>
              </div>
              <h1 className="font-display font-bold text-4xl md:text-6xl leading-tight text-foreground">
                Watch. Listen.{" "}
                <span className="text-gradient-gold">Create.</span>
              </h1>
              <p className="text-muted-foreground text-lg mt-4 leading-relaxed">
                Stream videos, discover music, read stories — all from Africa's most vibrant creators. Upload your content and earn from your passion.
              </p>
              <div className="flex flex-wrap gap-3 mt-8">
                <Button size="lg" className="bg-gradient-gold text-primary-foreground font-semibold rounded-full px-8 hover:opacity-90 transition-opacity shadow-gold">
                  <Play size={18} className="mr-2" fill="currentColor" /> Start Watching
                </Button>
                <Button size="lg" variant="outline" className="rounded-full px-8 border-border text-foreground hover:bg-secondary">
                  <Upload size={18} className="mr-2" /> Upload Content
                </Button>
              </div>
              <div className="flex items-center gap-6 mt-8 text-sm text-muted-foreground">
                <span><strong className="text-foreground">10M+</strong> Views Daily</span>
                <span><strong className="text-foreground">50K+</strong> Creators</span>
                <span><strong className="text-foreground">30+</strong> Countries</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <main className="max-w-[1440px] mx-auto px-4 md:px-6 space-y-16 pb-20">
        {/* Videos */}
        <motion.section {...fadeUp} id="videos">
          <SectionHeader icon={<Play size={22} />} title="Trending Videos" subtitle="The hottest content from across Africa" />
          <CategoryPills categories={videoCategories} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
            {videos.map((v) => (
              <VideoCard key={v.title} {...v} />
            ))}
          </div>
        </motion.section>

        {/* Audio */}
        <motion.section {...fadeUp} id="music">
          <SectionHeader icon={<Music size={22} />} title="Hot Tracks" subtitle="Afrobeats, Amapiano, Highlife and more" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {[...audios, ...audios.slice(0, 2)].map((a, i) => (
              <AudioCard key={`${a.title}-${i}`} {...a} />
            ))}
          </div>
        </motion.section>

        {/* Blogs */}
        <motion.section {...fadeUp} id="blogs">
          <SectionHeader icon={<BookOpen size={22} />} title="Featured Stories" subtitle="Voices, opinions, and stories from the continent" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {blogs.map((b) => (
              <BlogCard key={b.title} {...b} />
            ))}
          </div>
        </motion.section>

        {/* Creator Monetization */}
        <motion.section {...fadeUp} id="creators">
          <SectionHeader icon={<TrendingUp size={22} />} title="Creator Hub" subtitle="Track your progress to monetization — 100 subscribers & 1,000 watch hours" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {creators.map((c) => (
              <CreatorBadge key={c.name} {...c} />
            ))}
          </div>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="max-w-[1440px] mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-gold flex items-center justify-center font-display font-bold text-primary-foreground">A</div>
              <span className="font-display font-bold text-lg text-foreground">Afri<span className="text-gradient-gold">Tube</span></span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">About</a>
              <a href="#" className="hover:text-foreground transition-colors">Creators</a>
              <a href="#" className="hover:text-foreground transition-colors">Advertise</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            </div>
            <p className="text-xs text-muted-foreground">© 2025 AfriTube. Made with ❤️ for Africa.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
