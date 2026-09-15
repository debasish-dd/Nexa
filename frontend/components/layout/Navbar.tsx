"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navLinks = [
  { name: "Home", href: "/" },
  // { name: "Communities", href: "/communities" },
  { name: "About", href: "/about" },
];

function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-250 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Left side: Logo + Navigation */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            onClick={() => setMenuOpen(false)}
            className="shrink-0"
          >
            <Image
              src="/nexa-logo.svg"
              alt="NEXA"
              width={200}
              height={64}
              priority
              className="w-35 h-auto sm:w-42.5 md:w-50"
            />
          </Link>

          {/* Desktop navigation */}
          <div className="hidden items-center gap-7 md:flex">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(link.href));

              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`relative py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "text-slate-950"
                      : "text-slate-500 hover:text-slate-950"
                  }`}
                >
                  {link.name}

                  <span
                    className={`absolute bottom-0 left-0 h-0.5 rounded-full bg-slate-950 transition-all duration-200 ${
                      isActive ? "w-full" : "w-0"
                    }`}
                  />
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right side: Authentication */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950"
          >
            Login
          </Link>

           <Link
                href="/signup"
                onClick={() => setMenuOpen(false)}
                className="flex-1 rounded-lg bg-lime-400 px-4 py-2.5 text-center text-sm font-semibold text-slate-950 transition-colors hover:bg-lime-300"
              >
                Sign Up
              </Link>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
          className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 md:hidden"
        >
          {menuOpen ? (
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(link.href));

              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`relative rounded-lg px-3 py-3 text-sm font-medium ${
                    isActive
                      ? "bg-slate-50 text-slate-950"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {link.name}

                  {isActive && (
                    <span className="absolute bottom-2 left-3 right-3 h-0.5 rounded-full bg-slate-950" />
                  )}
                </Link>
              );
            })}

            <div className="mt-3 flex gap-3 border-t border-slate-200 pt-4">
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Login
              </Link>

              <Link
                href="/signup"
                onClick={() => setMenuOpen(false)}
                className="flex-1 rounded-lg bg-lime-400 px-4 py-2.5 text-center text-sm font-semibold text-slate-950 transition-colors hover:bg-lime-300"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
