import { Github, Linkedin, Mail, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

const SecurityFooter = () => {
  return (
    <footer className="relative mt-20 border-t border-border/50 bg-card/40">
      {/* animated top border */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-primary opacity-70" />
      <div className="container mx-auto px-4 py-14">
        <div className="mb-10 grid gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2">
            <Link to="/" className="group flex items-center gap-2">
              <img src="/icon.png" alt="FortiScan" className="h-9 w-9 transition-transform group-hover:scale-110" />
              <span className="font-display text-xl font-medium text-gradient">FortiScan</span>
            </Link>
            <p className="mt-4 max-w-md leading-relaxed text-muted-foreground">
              AI-assisted code security platform. Scan for vulnerabilities, understand the risk, and apply
              secure fixes, all in one place.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Powered by Bandit &amp; Semgrep
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-4 font-display text-lg font-medium">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              {[
                { to: "/dashboard", label: "Dashboard" },
                { to: "/scanner", label: "Scanner" },
                { to: "/enhancer", label: "Enhancer" },
                { to: "/#demo", label: "Demo" },
              ].map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="text-muted-foreground transition-colors hover:text-primary">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="mb-4 font-display text-lg font-medium">Connect</h4>
            <div className="flex gap-3">
              {[
                { href: "https://github.com/Bihan-Banerjee/AI-Code-Security/", Icon: Github, label: "GitHub" },
                { href: "https://linktr.ee/bihanbanerjee26", Icon: Linkedin, label: "Links" },
                { href: "mailto:bihanbanerjee26@gmail.com", Icon: Mail, label: "Email" },
              ].map(({ href, Icon, label }) => (
                <a
                  key={label}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="grid h-11 w-11 place-items-center rounded-xl border border-border/60 bg-secondary/40 text-foreground transition-all hover:-translate-y-1 hover:border-primary/60 hover:text-primary hover:shadow-glow-sm"
                >
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-border/50 pt-8 md:flex-row">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} FortiScan. All rights reserved.</p>
          <div className="flex gap-6 text-sm">
            <Link to="/privacy-policy" className="text-muted-foreground transition-colors hover:text-primary">
              Privacy Policy
            </Link>
            <Link to="/terms-and-conditions" className="text-muted-foreground transition-colors hover:text-primary">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default SecurityFooter;
