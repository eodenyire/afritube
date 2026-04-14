import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

const About = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="max-w-[960px] mx-auto px-4 md:px-6 pt-24 pb-20 space-y-10">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-wider text-muted-foreground">About</p>
          <h1 className="text-3xl md:text-4xl font-display font-bold">About AfriTube</h1>
          <p className="text-muted-foreground">
            AfriTube is Africa&apos;s multi-format digital content ecosystem for video, audio, and blogs. We&apos;re
            building a home where creators publish, grow, and monetize while audiences discover stories that feel
            authentic and close to home.
          </p>
        </header>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Our mission</h2>
          <p className="text-muted-foreground">
            Empower African creators with tools, visibility, and monetization opportunities tailored to African
            realities — from mobile-first experiences to community-driven discovery.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">What you can do on AfriTube</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Watch and share trending African video content.</li>
            <li>Stream music and audio series with built-in community engagement.</li>
            <li>Read blogs and stories from creators across the continent.</li>
          </ul>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Built for creators and audiences</h2>
          <p className="text-muted-foreground">
            AfriTube combines discovery, community, and growth tools so creators can focus on storytelling while
            audiences get a seamless experience across formats.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;
