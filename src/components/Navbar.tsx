import { useState, useEffect } from "react";
import { Search, Upload, Bell, Menu, X, User, LogOut, Shield, History as HistoryIcon, Clapperboard, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [notifCount, setNotifCount] = useState(0);
  const { user, profile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) { setNotifCount(0); return; }
    const fetchNotifCount = async () => {
      const lastSeen = localStorage.getItem("afritube_notif_seen");
      const since = lastSeen
        ? new Date(lastSeen).toISOString()
        : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: subs } = await supabase
        .from("subscriptions")
        .select("creator_id")
        .eq("subscriber_id", user.id);

      const creatorIds = (subs ?? []).map((s: any) => s.creator_id);
      if (creatorIds.length === 0) return;

      const { count } = await supabase
        .from("videos")
        .select("*", { count: "exact", head: true })
        .in("user_id", creatorIds)
        .eq("is_published", true)
        .gt("created_at", since);

      setNotifCount(count ?? 0);
    };
    fetchNotifCount();
  }, [user]);

  useEffect(() => {
    const term = searchQuery.trim();
    if (term.length < 2) {
      setSearchSuggestions([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      const { data } = await supabase
        .from("videos")
        .select("title, category")
        .eq("visibility", "public")
        .eq("processing_status", "ready")
        .or(`title.ilike.%${term}%,category.ilike.%${term}%`)
        .order("views", { ascending: false })
        .limit(8);
      const merged = Array.from(
        new Set(
          (data ?? [])
            .flatMap((row: any) => [row.title, row.category])
            .filter((value: string | null) => !!value)
            .map((value: string) => value.trim()),
        ),
      )
        .filter((value) => value.toLowerCase().includes(term.toLowerCase()))
        .slice(0, 6);
      setSearchSuggestions(merged);
    }, 200);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const handleNotificationClick = () => {
    navigate("/subscriptions");
    setNotifCount(0);
  };

  const navLinks = [
    { label: "Videos", href: "/#videos" },
    { label: "Shorts", href: "/shorts" },
    { label: "Live", href: "/live" },
    { label: "Music", href: "/#music" },
    { label: "Blogs", href: "/#blogs" },
    { label: "Creators", href: "/#creators" },
    { label: "Advertise", href: "/advertise" },
    ...(user ? [{ label: "Subscriptions", href: "/subscriptions" }] : []),
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between px-4 md:px-6 h-16">
        {/* Logo */}
        <a href="/" className="flex items-center gap-0 shrink-0">
          <img src="/favicon.png" alt="AfriTube logo" className="h-9 w-9 object-contain -mr-2" />
          <span className="font-display font-bold text-xl text-foreground">
            Afri<span className="text-gradient-gold">Tube</span>
          </span>
        </a>

        {/* Search */}
        <div className="hidden md:flex flex-1 max-w-lg mx-6">
          <div
            className={`flex items-center w-full rounded-full border transition-all duration-200 ${
              searchFocused ? "border-primary shadow-gold" : "border-border"
            } bg-secondary`}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (searchQuery.trim()) {
                  navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                  setSearchFocused(false);
                }
              }}
              className="flex items-center w-full relative"
            >
              <input
                name="q"
                type="text"
                placeholder="Search videos, music, blogs..."
                className="flex-1 bg-transparent px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
              <button type="submit" className="px-4 py-2 text-muted-foreground hover:text-primary transition-colors">
                <Search size={18} />
              </button>
              {searchFocused && searchSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] rounded-xl border border-border bg-card shadow-lg overflow-hidden z-30">
                  {searchSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setSearchQuery(suggestion);
                        setSearchFocused(false);
                        navigate(`/search?q=${encodeURIComponent(suggestion)}`);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-secondary transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4">
          {isAdmin && (
            <Button variant="outline" size="sm" className="rounded-full gap-1.5" onClick={() => navigate("/admin")}>
              <Shield size={14} /> Admin
            </Button>
          )}
          {user && (
            <Button variant="outline" size="sm" className="rounded-full gap-1.5 hidden lg:flex" onClick={() => navigate("/studio/seo")}>
              <Clapperboard size={14} /> Studio
            </Button>
          )}
          {isAdmin && (
            <Button variant="outline" size="sm" className="rounded-full gap-1.5 hidden lg:flex" onClick={() => navigate("/moderation")}>
              <Shield size={14} /> Moderation
            </Button>
          )}
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => navigate("/shorts")}>
            <Clapperboard size={20} />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => navigate("/live")}>
            <Radio size={20} />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => navigate("/upload")}>
            <Upload size={20} />
          </Button>
          {user && (
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => navigate("/history")}>
              <HistoryIcon size={20} />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hidden sm:flex relative" onClick={handleNotificationClick}>
            <Bell size={20} />
            {user && notifCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none pointer-events-none">
                {notifCount > 9 ? "9+" : notifCount}
              </span>
            )}
          </Button>

          {user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/dashboard")}
                className="w-8 h-8 rounded-full overflow-hidden border-2 border-primary"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-gold flex items-center justify-center text-primary-foreground text-xs font-bold">
                    {profile?.display_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
              </button>
              <Button
                variant="ghost"
                size="icon"
                onClick={signOut}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut size={18} />
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={() => navigate("/auth")}
              className="bg-gradient-gold text-primary-foreground font-semibold rounded-full px-4 hover:opacity-90 transition-opacity"
            >
              <User size={16} className="mr-1" />
              Sign In
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-muted-foreground"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden glass border-t border-border"
          >
            <div className="px-4 py-3 space-y-1">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="block px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
                >
                  {link.label}
                </a>
              ))}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => { setMobileOpen(false); navigate("/admin"); }}
                  className="block w-full text-left px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
                >
                  Admin Panel
                </button>
              )}
              {user && (
                <button
                  type="button"
                  onClick={() => { setMobileOpen(false); navigate("/studio/seo"); }}
                  className="block w-full text-left px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
                >
                  Studio SEO
                </button>
              )}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => { setMobileOpen(false); navigate("/moderation"); }}
                  className="block w-full text-left px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
                >
                  Moderation
                </button>
              )}
              <div className="pt-2">
                {user && (
                  <button
                    type="button"
                    onClick={() => { setMobileOpen(false); navigate("/history"); }}
                    className="block w-full text-left px-3 py-2 mb-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
                  >
                    Watch History
                  </button>
                )}
                <form onSubmit={(e) => { e.preventDefault(); const q = (e.currentTarget.elements.namedItem("mq") as HTMLInputElement).value; if (q.trim()) { setMobileOpen(false); navigate(`/search?q=${encodeURIComponent(q.trim())}`); } }} className="flex items-center rounded-full border border-border bg-secondary">
                  <input
                    name="mq"
                    type="text"
                    placeholder="Search..."
                    className="flex-1 bg-transparent px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                  />
                  <button type="submit" className="px-4 py-2 text-muted-foreground">
                    <Search size={18} />
                  </button>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
