import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { QueueProvider } from "@/hooks/useQueue";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Upload from "./pages/Upload.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Watch from "./pages/Watch.tsx";
import Search from "./pages/Search.tsx";
import CreatorProfile from "./pages/CreatorProfile.tsx";
import Admin from "./pages/Admin.tsx";
import NotFound from "./pages/NotFound.tsx";
import About from "./pages/About.tsx";
import Creators from "./pages/Creators.tsx";
import Advertise from "./pages/Advertise.tsx";
import Terms from "./pages/Terms.tsx";
import Privacy from "./pages/Privacy.tsx";
import Subscriptions from "./pages/Subscriptions.tsx";
import Playlist from "./pages/Playlist.tsx";
import Playlists from "./pages/Playlists.tsx";
import BrowsePlaylists from "./pages/BrowsePlaylists.tsx";
import Mix from "./pages/Mix.tsx";
import History from "./pages/History.tsx";
import Shorts from "./pages/Shorts.tsx";
import Live from "./pages/Live.tsx";
import LiveWatch from "./pages/LiveWatch.tsx";
import LiveStudio from "./pages/LiveStudio.tsx";
import StudioSEO from "./pages/StudioSEO.tsx";
import Moderation from "./pages/Moderation.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <QueueProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/watch/:id" element={<Watch />} />
            <Route path="/search" element={<Search />} />
            <Route path="/creator/:userId" element={<CreatorProfile />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/about" element={<About />} />
            <Route path="/creators" element={<Creators />} />
            <Route path="/advertise" element={<Advertise />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
             <Route path="/playlists" element={<Playlists />} />
             <Route path="/playlist/:id" element={<Playlist />} />
             <Route path="/browse-playlists" element={<BrowsePlaylists />} />
              <Route path="/mix" element={<Mix />} />
              <Route path="/history" element={<History />} />
              <Route path="/shorts" element={<Shorts />} />
              <Route path="/live" element={<Live />} />
              <Route path="/live/studio/:id" element={<LiveStudio />} />
              <Route path="/live/:id" element={<LiveWatch />} />
              <Route path="/studio/seo" element={<StudioSEO />} />
              <Route path="/moderation" element={<Moderation />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </AuthProvider>
        </BrowserRouter>
      </QueueProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
