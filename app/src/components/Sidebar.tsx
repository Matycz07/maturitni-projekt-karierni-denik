"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Image from "next/image";

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

const Sidebar = ({ isOpen = false, onClose }: SidebarProps) => {
    const pathname = usePathname();
    const { user } = useAuth();

    const menuItems = [
        {
            label: "Třídy",
            href: "/ucitel",
            disabled: false,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
            ),
        },
        {
            label: "K úkolům",
            href: "/ucitel/ukoly",
            disabled: false,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
            ),
        },
        {
            label: "Testy a kvízy",
            href: "/ucitel/testy",
            disabled: false,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                    <path d="M9 14l2 2 4-4"></path>
                </svg>
            ),
        },
        {
            label: "Notísek",
            href: "/ucitel/notisek",
            disabled: false,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
            ),
        }
    ];

    return (
        <>
            {/* Backdrop for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 lg:hidden"
                    onClick={onClose}
                />
            )}

            <aside className={`fixed left-0 top-16 w-64 h-[calc(100vh-4rem)] bg-white border-r border-slate-200 overflow-y-auto z-30 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-4 flex-1 flex flex-col">
                    <ul className="space-y-1">
                        {menuItems.map((item) => {
                            const isActive = pathname === item.href;
                            const isDisabled = item.disabled;

                            // Pokud je položka zakázaná, vykreslíme div místo Link a upravíme styly
                            if (isDisabled) {
                                return (
                                    <li key={item.href}>
                                        <div className="flex items-center gap-4 px-4 py-3 rounded-r-full text-sm font-medium text-slate-300 cursor-not-allowed select-none">
                                            <span className="text-slate-300">
                                                {item.icon}
                                            </span>
                                            {item.label}
                                        </div>
                                    </li>
                                );
                            }

                            // Standardní aktivní položka
                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        onClick={onClose}
                                        className={`flex items-center gap-4 px-4 py-3 rounded-r-full text-sm font-medium transition-colors ${isActive
                                            ? "bg-indigo-50 text-indigo-700"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                            }`}
                                    >
                                        <span className={`${isActive ? "text-indigo-600" : "text-slate-500"}`}>
                                            {item.icon}
                                        </span>
                                        {item.label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>

                    <div className="mt-4 pt-4 border-t border-slate-100 lg:mt-auto">
                        {user && (
                            <div className="flex items-center gap-3 mb-4 px-2">
                                <div className="relative w-10 h-10">
                                    {user.picture ? (
                                        <Image
                                            src={user.picture}
                                            alt={user.name}
                                            fill
                                            className="rounded-full object-cover border border-slate-200"
                                        />
                                    ) : (
                                        <div className="w-full h-full rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold border border-indigo-200">
                                            {user.name[0]}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
                                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                                </div>
                            </div>
                        )}
                        <a
                            href="/auth/logout"
                            className="flex items-center gap-4 px-4 py-3 rounded-r-full text-sm font-medium transition-colors text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                            <span className="text-red-500">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                    <polyline points="16 17 21 12 16 7"></polyline>
                                    <line x1="21" y1="12" x2="9" y2="12"></line>
                                </svg>
                            </span>
                            Odhlásit se
                        </a>
                    </div>
                </div>
            </aside>
        </>
    );
}

export default Sidebar;