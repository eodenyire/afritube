import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

const Advertise = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="max-w-[960px] mx-auto px-4 md:px-6 pt-24 pb-20 space-y-10">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-wider text-muted-foreground">Advertise</p>
          <h1 className="text-3xl md:text-4xl font-display font-bold">Reach audiences across Africa</h1>
          <p className="text-muted-foreground">
            AfriTube is building advertising and brand partnership tools that help businesses connect with engaged
            communities across video, music, and blogs.
          </p>
        </header>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">What to expect</h2>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Brand-safe placements across creator content.</li>
            <li>Targeted discovery for audiences by region and interest.</li>
            <li>Collaborations and sponsored campaigns with top creators.</li>
          </ul>
        </section>
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Self-serve is live</h2>
          <p className="text-muted-foreground">
            Create an advertiser account, upload your creative, set a budget and CPM bid, and your campaign runs as
            pre-roll on monetized creators' videos. Creators keep 55% of ad revenue.
          </p>
          <Link
            to="/ads"
            className="inline-flex items-center rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-medium"
          >
            Open Ads manager
          </Link>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Advertise;
