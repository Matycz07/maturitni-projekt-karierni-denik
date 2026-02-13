"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Image from "next/image";

interface StudentSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const StudentSidebar = ({ isOpen, onClose }: StudentSidebarProps) => {
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useAuth();

    const menuItems = [
        {
            label: "Úkoly",
            href: "/zak/ukoly",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
            ),
        },
        {
            label: "Portfolio",
            href: "/zak/portfolio",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                    <line x1="12" y1="11" x2="12" y2="17"></line>
                    <line x1="9" y1="14" x2="15" y2="14"></line>
                </svg>
            ),
        },
        {
            label: "Notísek",
            href: "/zak/notisek",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
            ),
        },
    ];

    return (
        <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col h-dvh w-64 bg-white border-r border-slate-200 overflow-y-auto transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out`}>
            <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between gap-3">
                <div onClick={() => router.push('/zak')} className="flex items-center gap-3 cursor-pointer">
                    <div className="relative w-8 h-8">
                        <Image src="/karierni-denik-logo.svg" alt="Logo" width={32} height={32} />
                    </div>
                    <span className="text-xl font-bold text-slate-800">Karierní Deník</span>
                </div>
                <button onClick={onClose} className="lg:hidden text-slate-500 hover:text-slate-700">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>

            <div className="flex-1 py-6 px-4">
                <ul className="space-y-1">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={`flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${isActive
                                        ? "bg-indigo-50 text-indigo-700"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                        }`}
                                    onClick={onClose} // Close sidebar on link click
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
            </div>

            <div className="p-4 border-t border-slate-100">
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
                    className="flex items-center gap-4 px-4 py-3 rounded-lg text-sm font-medium transition-colors text-red-600 hover:bg-red-50 hover:text-red-700"
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
        </aside>
    );
};

export default StudentSidebar;
