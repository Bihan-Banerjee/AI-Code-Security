const SecurityFooter = () => {
  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between py-4 px-3 space-y-2 md:space-y-0">
        
        {/* Left Section: Links */}
        <nav className="flex flex-wrap justify-center gap-4 text-base font-medium">
          <a
            href="/terms"
            className="transition-colors hover:text-primary"
          >
            Terms
          </a>
          <a
            href="/privacy"
            className="transition-colors hover:text-primary"
          >
            Privacy
          </a>
          <a
            href="/contact"
            className="transition-colors hover:text-primary"
          >
            Contact
          </a>
        </nav>

        {/* Right Section: Copyright */}
        <p className="text-sm text-muted-foreground text-center md:text-right">
          © 2025 SecureCode AI · All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default SecurityFooter;
