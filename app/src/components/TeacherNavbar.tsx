"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";

interface TeacherNavbarProps {
    onMenuClick: () => void;
}

const TeacherNavbar = ({ onMenuClick }: TeacherNavbarProps) => {
    const { user } = useAuth();

    return (
        <header className="fixed top-0 z-50 w-full bg-white border-b border-gray-100 shadow-sm">
            <div className="h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
                {/* Left section - Logo & Menu */}
                <div className="flex items-center gap-4">
                    {/* Hamburger menu for mobile */}
                    <button
                        onClick={onMenuClick}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors lg:hidden"
                        aria-label="Toggle menu"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </button>

                    <Link href="/ucitel" className="flex items-center gap-3 group">
                        <div className="relative w-9 h-9 transition-transform group-hover:scale-105">
                            <Image src="/karierni-denik-logo.svg" alt="Logo" width={36} height={36} />
                        </div>
                        <div className="hidden sm:flex flex-col">
                            <span className="text-lg font-bold text-gray-900 leading-tight">
                                Karierní Deník
                            </span>
                            <span className="text-xs text-emerald-600 font-medium -mt-0.5">
                                Pro učitele
                            </span>
                        </div>
                    </Link>
                </div>

                {/* Center section - Quick actions (desktop only) */}
                <div className="hidden lg:flex items-center gap-2">
                    <Link
                        href="/ucitel"
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Nová třída
                    </Link>
                    <Link
                        href="/ucitel/ukoly"
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        Úkoly
                    </Link>
                    <Link
                        href="/ucitel/testy"
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                            <path d="M9 14l2 2 4-4"></path>
                        </svg>
                        Testy
                    </Link>
                </div>

                {/* Right section - User profile */}
                <div className="flex items-center gap-3">
                    {user && (
                        <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-gray-50 rounded-full">
                            <div className="relative w-8 h-8">
                                {user.picture ? (
                                    <Image
                                        src={user.picture}
                                        alt={user.name}
                                        fill
                                        className="rounded-full object-cover ring-2 ring-white"
                                    />
                                ) : (
                                    <div className="w-full h-full rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-semibold text-sm ring-2 ring-white">
                                        {user.name[0]}
                                    </div>
                                )}
                            </div>
                            <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">
                                {user.name}
                            </span>
                        </div>
                    )}

                    <a
                        href="/auth/logout"
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Odhlásit se"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                    </a>
                </div>
            </div>
        </header>
    );
};

export default TeacherNavbar;
