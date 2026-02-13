"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import TeacherLayout from "../../components/TeacherLayout";
import CreateClassModal, { ClassData } from "../../components/CreateClassModal";
import { useAuth } from '@/hooks/useAuth';

interface TeacherClass {
    id: number;
    subject: string;
    section: string;
    room: string;
    color: string;
    studentCount: number;
    kod: string;
}

interface ApiClass {
    id: number;
    predmet?: string;
    nazev: string;
    rocnik: string;
    ucebna: string;
    barva: string;
    studentCount?: number;
    kod: string;
}

export default function TridaPage() {
    const { user } = useAuth();

    const [classes, setClasses] = useState<TeacherClass[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<ClassData | null>(null);
    const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

    // Fetch data on load
    useEffect(() => {
        if (user) {
            fetchClasses();
        }
    }, [user]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setOpenDropdownId(null);
        if (openDropdownId !== null) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [openDropdownId]);

    const fetchClasses = async () => {
        try {
            const res = await fetch('/api/teacher/classes');
            if (res.ok) {
                const data: ApiClass[] = await res.json();
                const mappedClasses: TeacherClass[] = data.map((c) => ({
                    id: c.id,
                    subject: c.predmet || c.nazev,
                    section: c.rocnik,
                    room: c.ucebna,
                    color: c.barva,
                    studentCount: c.studentCount || 0,
                    kod: c.kod
                }));
                setClasses(mappedClasses);
            }
        } catch (error) {
            console.error('Failed to fetch classes:', error);
        }
    };

    const handleCreateClass = async (data: ClassData) => {
        try {
            if (editingClass) {
                const res = await fetch(`/api/teacher/classes/${editingClass.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (res.ok) {
                    fetchClasses();
                }
            } else {
                const res = await fetch('/api/teacher/classes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (res.ok) {
                    fetchClasses();
                }
            }
            setEditingClass(null);
        } catch (error) {
            console.error('Failed to save class:', error);
            alert('Chyba při ukládání třídy');
        }
    };

    const handleEditClick = (cls: TeacherClass) => {
        setEditingClass({
            id: cls.id,
            subject: cls.subject,
            section: cls.section,
            room: cls.room,
            color: cls.color
        } as unknown as ClassData);
        setIsModalOpen(true);
    };

    const handleDeleteClick = async (id: number) => {
        if (confirm("Opravdu chcete smazat tuto třídu?")) {
            try {
                const res = await fetch(`/api/teacher/classes/${id}`, {
                    method: 'DELETE'
                });
                if (res.ok) {
                    setClasses(classes.filter(c => c.id !== id));
                }
            } catch (error) {
                console.error('Failed to delete class:', error);
                alert('Chyba při mazání třídy');
            }
        }
    };

    const openCreateModal = () => {
        setEditingClass(null);
        setIsModalOpen(true);
    };

    return (
        <TeacherLayout>
            <div className="max-w-7xl mx-auto">
                {/* Page Header */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                                Správa tříd
                            </h1>
                            <p className="text-gray-500 mt-1">
                                Spravujte své třídy a studenty na jednom místě.
                            </p>
                        </div>
                        <button
                            onClick={openCreateModal}
                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-200 font-medium"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            <span>Vytvořit třídu</span>
                        </button>
                    </div>
                </div>


                {/* Classes Grid */}
                <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Vaše třídy</h2>
                </div>

                {classes.length === 0 ? (
                    <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                <polyline points="9 22 9 12 15 12 15 22"></polyline>
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">Zatím nemáte žádné třídy</h3>
                        <p className="text-gray-500 mb-4">Vytvořte svou první třídu a začněte učit.</p>
                        <button
                            onClick={openCreateModal}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Vytvořit třídu
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {classes.map((cls) => (
                            <div key={cls.id} className="group">
                                <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:border-gray-200 transition-all duration-300 h-full flex flex-col">
                                    {/* Card Header */}
                                    <div className={`h-24 ${cls.color} relative p-4 flex flex-col justify-between`}>
                                        <div className="flex justify-between items-start">
                                            <Link href={`/trida/${cls.id}`} className="hover:underline decoration-white/50 underline-offset-4 flex-1">
                                                <h2 className="text-lg font-bold text-white truncate pr-2">
                                                    {cls.subject}
                                                </h2>
                                            </Link>
                                            <div className="relative">
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setOpenDropdownId(openDropdownId === cls.id ? null : cls.id);
                                                    }}
                                                    className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <circle cx="12" cy="12" r="1"></circle>
                                                        <circle cx="19" cy="12" r="1"></circle>
                                                        <circle cx="5" cy="12" r="1"></circle>
                                                    </svg>
                                                </button>
                                                {/* Dropdown */}
                                                {openDropdownId === cls.id && (
                                                    <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-xl py-1.5 z-20 border border-gray-100">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setOpenDropdownId(null);
                                                                handleEditClick(cls);
                                                            }}
                                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                            </svg>
                                                            Upravit
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setOpenDropdownId(null);
                                                                handleDeleteClick(cls.id);
                                                            }}
                                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                            </svg>
                                                            Smazat
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-white/90 text-sm font-medium">{cls.section}</p>
                                    </div>

                                    {/* Card Body */}
                                    <div className="p-4 flex-grow flex flex-col">
                                        <div className="space-y-2 flex-grow">
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                                    <circle cx="9" cy="7" r="4"></circle>
                                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                                </svg>
                                                <span className="text-sm font-medium">{cls.studentCount} žáků</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                                </svg>
                                                <span className="text-sm">{cls.room}</span>
                                            </div>
                                        </div>

                                        {/* Class Code */}
                                        <div className="mt-4 flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-gray-100 group/code hover:border-emerald-200 transition-colors">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Kód třídy</span>
                                                <span className="text-sm font-mono font-bold text-gray-700">{cls.kod}</span>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    navigator.clipboard.writeText(cls.kod);
                                                    const target = e.currentTarget;
                                                    const originalHTML = target.innerHTML;
                                                    target.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                                                    setTimeout(() => target.innerHTML = originalHTML, 2000);
                                                }}
                                                className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-white rounded-lg transition-all opacity-0 group-hover/code:opacity-100"
                                                title="Kopírovat kód"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                                </svg>
                                            </button>
                                        </div>

                                        {/* Card Footer */}
                                        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                                            <Link
                                                href={`/trida/${cls.id}`}
                                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                                            >
                                                Otevřít
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                                    <polyline points="12 5 19 12 12 19"></polyline>
                                                </svg>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <CreateClassModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleCreateClass}
                initialData={editingClass}
            />
        </TeacherLayout>
    );
}