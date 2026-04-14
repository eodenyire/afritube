import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";

const Creators = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="max-w-[960px] mx-auto px-4 md:px-6 pt-24 pb-20 space-y-10">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-wider text-muted-foreground">Creators</p>
          <h1 className="text-3xl md:text-4xl font-display font-bold">Create, grow, and monetize on AfriTube</h1>
          <p className="text-muted-foreground">
            AfriTube helps African creators build audiences across video, music, and blogs. Share your story,
            connect with fans, and unlock monetization as you grow.
          </p>
        </header>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Creator tools</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Upload and publish videos, audio tracks, and blogs in one place.</li>
            <li>Track performance with built-in analytics and engagement signals.</li>
            <li>Access creator programs as you reach eligibility milestones.</li>
          </ul>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Start exploring</h2>
          <p className="text-muted-foreground">
            Discover creators across Africa or upload your own content to get started.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/search?type=creators">Explore creators</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/upload">Upload content</Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Creators;
