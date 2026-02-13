"use client"; // Nutné pro Next.js App Router, pokud používáte useState

import React from 'react';

// --- IKONY ---
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);



const LoginPage: React.FC = () => {

  return (
    <div className="min-h-screen bg-slate-50 relative flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">

      {/* Dekorativní pozadí (Blobs) */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-indigo-200/40 rounded-full blur-3xl mix-blend-multiply animate-blob"></div>
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] bg-violet-200/40 rounded-full blur-3xl mix-blend-multiply animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-[10%] left-[20%] w-[40%] h-[40%] bg-blue-200/40 rounded-full blur-3xl mix-blend-multiply animate-blob animation-delay-4000"></div>
      </div>

      {/* Hlavní karta */}
      <div className="relative z-10 max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 sm:p-10 border border-white/50">

        {/* Hlavička */}
        <div className="text-center mb-8">

          {/* Placeholder pro Logo */}
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Vítejte zpět
          </h2>
        </div>

        {/* Sekce Google Login */}
        <div className="space-y-4">
          <button
            onClick={() => window.location.href = '/auth/google'}
            className="cursor-pointer w-full flex items-center justify-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm"
          >
            <GoogleIcon />
            <span>Pokračovat přes Google</span>
          </button>
        </div>

        <div className="mt-8 text-center text-xs text-slate-400">
          Přihlášením souhlasíte s našimi <a href="/podminky" className="underline hover:text-slate-600">podmínkami použití</a> a <a href="/soukromi" className="underline hover:text-slate-600">zásadami ochrany soukromí</a>.
        </div>
      </div>
    </div>
  );
};

export default LoginPage;