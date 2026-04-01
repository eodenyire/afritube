import { useState } from "react";
import { Search, Upload, Bell, Menu, X, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const navLinks = [
    { label: "Videos", href: "#videos" },
    { label: "Music", href: "#music" },
    { label: "Blogs", href: "#blogs" },
    { label: "Creators", href: "#creators" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between px-4 md:px-6 h-16">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-gold flex items-center justify-center font-display font-bold text-primary-foreground text-lg">
            A
          </div>
          <span className="font-display font-bold text-xl text-foreground hidden sm:block">
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
            <form onSubmit={(e) => { e.preventDefault(); const q = (e.currentTarget.elements.namedItem("q") as HTMLInputElement).value; if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`); }} className="flex items-center w-full">
              <input
                name="q"
                type="text"
                placeholder="Search videos, music, blogs..."
                className="flex-1 bg-transparent px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
              <button type="submit" className="px-4 py-2 text-muted-foreground hover:text-primary transition-colors">
                <Search size={18} />
              </button>
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
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => navigate("/upload")}>
            <Upload size={20} />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hidden sm:flex">
            <Bell size={20} />
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
              <div className="pt-2">
                <div className="flex items-center rounded-full border border-border bg-secondary">
                  <input
                    type="text"
                    placeholder="Search..."
                    className="flex-1 bg-transparent px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                  />
                  <button className="px-4 py-2 text-muted-foreground">
                    <Search size={18} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
