"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import StudentSidebar from '@/components/StudentSidebar';
import SearchEngine from '@/components/SearchEngine';
import Image from 'next/image';

export default function StudentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const router = useRouter();

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <StudentSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            {/* Overlay for mobile */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/75 z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            <main className="flex-1 lg:ml-64 min-h-screen transition-all duration-300 ease-in-out">
                {/* Desktop Header */}
                <header className="hidden lg:flex items-center justify-between h-16 px-8 border-b border-slate-200 bg-white sticky top-0 z-50">
                    <div className="flex-1 max-w-2xl">
                        <SearchEngine />
                    </div>
                </header>

                {/* Mobile Header */}
                <header className="flex items-center justify-between p-4 border-b border-slate-200 bg-white lg:hidden">
                    <button onClick={toggleSidebar} className="text-slate-500 hover:text-slate-700">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </button>
                    <div onClick={() => router.push('/zak')} className="cursor-pointer flex items-center gap-2">
                        <Image src="/karierni-denik-logo.svg" alt="Logo" width={24} height={24} />
                        <h1 className="text-xl font-bold text-slate-800">Karierní Deník</h1>
                    </div>
                    <div className="flex items-center">
                        <SearchEngine />
                    </div>
                </header>

                <div className="p-4 sm:p-6 lg:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}

