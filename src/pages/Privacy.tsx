import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="max-w-[960px] mx-auto px-4 md:px-6 pt-24 pb-20 space-y-10">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-wider text-muted-foreground">Privacy</p>
          <h1 className="text-3xl md:text-4xl font-display font-bold">Privacy Overview</h1>
          <p className="text-muted-foreground">
            AfriTube is committed to protecting your privacy. This page summarizes how we treat data while a full
            privacy policy is finalized.
          </p>
        </header>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">What we collect</h2>
          <p className="text-muted-foreground">
            We collect account details, content you upload, and engagement activity to deliver personalized
            recommendations and analytics.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">How we use data</h2>
          <p className="text-muted-foreground">
            Data helps us keep the platform secure, improve content discovery, and support creator growth tools.
            We do not sell personal information.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Your choices</h2>
          <p className="text-muted-foreground">
            You can manage your profile and content visibility in your account settings. Updates to our privacy
            policy will be reflected here.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
