import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="max-w-[960px] mx-auto px-4 md:px-6 pt-24 pb-20 space-y-10">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-wider text-muted-foreground">Terms</p>
          <h1 className="text-3xl md:text-4xl font-display font-bold">Terms of Service</h1>
          <p className="text-muted-foreground">
            These terms provide a high-level overview of how AfriTube works. A complete legal document will be
            published as the platform continues to grow.
          </p>
        </header>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Using AfriTube</h2>
          <p className="text-muted-foreground">
            By using AfriTube, you agree to follow our community guidelines, respect other users, and only upload
            content that you have the rights to share.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Content and ownership</h2>
          <p className="text-muted-foreground">
            Creators retain ownership of their work. AfriTube may display and distribute content on the platform
            to provide discovery, streaming, and engagement features.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Updates</h2>
          <p className="text-muted-foreground">
            We will update these terms as the platform evolves. Changes will be announced within the product and
            reflected on this page.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
