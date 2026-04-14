import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border py-12">
      <div className="max-w-[1440px] mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-0">
            <img src="/favicon.png" alt="AfriTube" className="h-10 w-10 object-contain -mr-2" />
            <span className="font-display font-bold text-lg text-foreground">
              Afri<span className="text-gradient-gold">Tube</span>
            </span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link to="/about" className="hover:text-foreground transition-colors">
              About
            </Link>
            <Link to="/creators" className="hover:text-foreground transition-colors">
              Creators
            </Link>
            <Link to="/advertise" className="hover:text-foreground transition-colors">
              Advertise
            </Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} AfriTube - A product of African Digital Technologies
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
