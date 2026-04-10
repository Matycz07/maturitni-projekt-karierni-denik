"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Image from "next/image";

interface StudentSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const StudentSidebar = ({ isOpen, onClose }: StudentSidebarProps) => {
    const pathname = usePathname();
    const { user } = useAuth();

    const menuItems = [
        {
            label: "Úkoly",
            href: "/zak/ukoly",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
            ),
        },
        {
            label: "Portfolio",
            href: "/zak/portfolio",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    <line x1="12" y1="11" x2="12" y2="17"></line>
                    <line x1="9" y1="14" x2="15" y2="14"></line>
                </svg>
            ),
        },
        {
            label: "Notýsek",
            href: "/zak/notisek",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
            ),
        },
    ];

    return (
        <>
            {/* Backdrop for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden transition-opacity"
                    onClick={onClose}
                />
            )}

            <aside
                className={`fixed left-0 top-0 w-72 h-dvh bg-white border-r border-gray-100 overflow-y-auto z-50 flex flex-col transition-transform duration-300 ease-out lg:translate-x-0 ${isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
                    }`}
            >
                {/* Logo Header */}
                <div className="h-16 px-6 border-b border-gray-100 flex items-center">
                    <Link href="/zak" className="flex items-center gap-3 group" onClick={onClose}>
                        <div className="relative w-9 h-9 transition-transform group-hover:scale-105">
                            <Image src="/karierni-denik-logo.svg" alt="Logo" width={36} height={36} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-lg font-bold text-gray-900 leading-tight">
                                Karierní Deník
                            </span>
                            <span className="text-xs text-indigo-600 font-medium -mt-0.5">
                                Pro žáky
                            </span>
                        </div>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4">
                    <div className="mb-6">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4">
                            Navigace
                        </span>
                    </div>

                    <ul className="space-y-1">
                        {menuItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        onClick={onClose}
                                        className={`flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                                            ? "bg-indigo-50 text-indigo-700 shadow-sm"
                                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                                            }`}
                                    >
                                        <span
                                            className={`transition-colors ${isActive ? "text-indigo-600" : "text-gray-400"
                                                }`}
                                        >
                                            {item.icon}
                                        </span>
                                        {item.label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* User section */}
                <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                    {user && (
                        <div className="flex items-center gap-3 mb-4 p-3 bg-white rounded-xl shadow-sm">
                            <div className="relative w-11 h-11 flex-shrink-0">
                                {user.picture ? (
                                    <Image
                                        src={user.picture}
                                        alt={user.name}
                                        fill
                                        className="rounded-full object-cover ring-2 ring-indigo-100"
                                    />
                                ) : (
                                    <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                                        {user.name[0]}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                    {user.name}
                                </p>
                                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                            </div>
                        </div>
                    )}

                    <a
                        href="/auth/logout"
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors w-full"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        Odhlásit se
                    </a>
                </div>
            </aside>
        </>
    );
};

export default StudentSidebar;
