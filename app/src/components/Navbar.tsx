"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';

// --- IKONY ---
const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" x2="20" y1="12" y2="12" />
    <line x1="4" x2="20" y1="6" y2="6" />
    <line x1="4" x2="20" y1="18" y2="18" />
  </svg>
);

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

// --- NAVBAR ---
const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth(false);

  // Efekt pro přidání stínu při scrollování
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '/', label: 'Domů' },
    { href: '/services', label: 'Služby' },
    { href: '/pricing', label: 'Ceník' },
    { href: '/contact', label: 'Kontakt' },
    { href: '/login', label: 'Přihlásit se', isButton: true },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 z-50 w-full transition-all duration-300 ${scrolled
          ? "bg-white/90 backdrop-blur-md border-b border-slate-200/50 shadow-sm"
          : "bg-transparent border-b border-transparent"
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group" onClick={() => setIsMenuOpen(false)}>
              <div className="relative w-8 h-8 transition-transform transform group-hover:scale-110">
                {/* Zde předpokládám existenci SVG, pokud není, použijte fallback */}
                <Image src="./karierni-denik-logo.svg" alt="Logo" width={32} height={32} />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                Karierní Deník
              </span>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:block">
              <ul className="flex items-center space-x-8">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  if (link.isButton) {
                    if (user) {
                      return (
                        <li key="logout">
                          <a
                            href="/auth/logout"
                            className="px-5 py-2.5 rounded-full bg-red-600 text-white text-sm font-medium hover:bg-red-700 hover:shadow-lg hover:shadow-red-500/30 transition-all duration-300"
                          >
                            Odhlásit se
                          </a>
                        </li>
                      )
                    }
                    return (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="px-5 py-2.5 rounded-full bg-slate-900 text-white text-sm font-medium hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-300"
                        >
                          {link.label}
                        </Link>
                      </li>
                    );
                  }
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className={`text-sm font-medium transition-colors duration-200 ${isActive
                          ? "text-indigo-600 font-semibold"
                          : "text-slate-600 hover:text-slate-900"
                          }`}
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Mobilní menu tlačítko */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-slate-600 rounded-md hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
              >
                <span className="sr-only">Menu</span>
                {isMenuOpen ? <XIcon /> : <MenuIcon />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobilní menu overlay */}
      <div
        className={`fixed inset-0 z-40 bg-white transform transition-transform duration-300 ease-in-out md:hidden ${isMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
      >
        <div className="flex flex-col h-full pt-24 px-6 pb-6">
          <ul className="flex flex-col space-y-6">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <li key={`mobile-${link.href}`}>
                  <Link
                    href={link.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`block text-2xl font-semibold ${link.isButton
                      ? "mt-4 text-center py-4 bg-indigo-600 text-white rounded-xl shadow-lg"
                      : isActive
                        ? "text-indigo-600"
                        : "text-slate-800"
                      }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </>
  );
};

export default Navbar;