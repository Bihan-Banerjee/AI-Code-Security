import { Github, Linkedin, Mail } from "lucide-react";

const SecurityFooter = () => {
  return (
    <footer className="border-t bg-gray-100">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between py-6 px-4 space-y-4 md:space-y-0">
        
        {/* Left Section: Links */}
        <nav className="flex flex-wrap justify-center gap-6 text-sm font-medium">
          <a
            href="/terms-and-conditions"
            className="transition-colors hover:text-primary hover:underline text-gray-700"
          >
            Terms
          </a>
          <a
            href="/privacy-policy"
            className="transition-colors hover:text-primary hover:underline text-gray-700"
          >
            Privacy
          </a>
          <a
            href="/about"
            className="transition-colors hover:text-primary hover:underline text-gray-700"
          >
            Contact
          </a>
        </nav>

        {/* Center Section: Social Icons */}
        <div className="flex gap-4">
          <a
            href="https://github.com/Bihan-Banerjee/AI-Code-Security/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full transition hover:bg-primary/10"
          >
            <Github className="h-5 w-5 text-gray-700 hover:text-primary transition" />
          </a>
          <a
            href="https://linktr.ee/bihanbanerjee26"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full transition hover:bg-primary/10"
          >
            <Linkedin className="h-5 w-5 text-gray-700 hover:text-primary transition" />
          </a>
          <a
            href="mailto:youremail@example.com"
            className="p-2 rounded-full transition hover:bg-primary/10"
          >
            <Mail className="h-5 w-5 text-gray-700 hover:text-primary transition" />
          </a>
        </div>

        {/* Right Section: Copyright */}
        <p className="text-xs md:text-sm text-gray-600 text-center md:text-right">
          © 2025 <span className="font-semibold text-primary">SecureCode AI</span> · All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default SecurityFooter;
