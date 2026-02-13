"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface Teacher {
    id: number;
    jmeno: string;
    prijmeni: string;
    email: string;
    obrazek_url: string;
}

interface User {
    id: number;
    jmeno: string;
    prijmeni: string;
    email: string;
    obrazek_url: string;
    id_opravneni: number;
}

interface InviteTeacherModalProps {
    isOpen: boolean;
    onClose: () => void;
    classId: number;
    ownerId?: number;
}

export default function InviteTeacherModal({ isOpen, onClose, classId, ownerId }: InviteTeacherModalProps) {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(false);

    const fetchTeachers = useCallback(async () => {
        try {
            const res = await fetch(`/api/teacher/classes/${classId}/teachers`);
            if (res.ok) setTeachers(await res.json());
        } catch (err) {
            console.error("Failed to fetch teachers:", err);
        }
    }, [classId]);

    const fetchAllUsers = useCallback(async () => {
        try {
            const res = await fetch('/api/users');
            if (res.ok) setAllUsers(await res.json());
        } catch (err) {
            console.error("Failed to fetch users:", err);
        }
    }, []);

    useEffect(() => {
        if (isOpen && classId) {
            fetchTeachers();
            fetchAllUsers();
        }
    }, [isOpen, classId, fetchTeachers, fetchAllUsers]);

    const handleInvite = async (userId: number) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/teacher/classes/${classId}/teachers`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });
            if (res.ok) fetchTeachers();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (teacherId: number) => {
        try {
            const res = await fetch(`/api/teacher/classes/${classId}/teachers/${teacherId}`, {
                method: "DELETE",
            });
            if (res.ok) setTeachers(teachers.filter((t) => t.id !== teacherId));
        } catch (err) {
            console.error("Failed to remove teacher:", err);
        }
    };

    const availableTeachers = allUsers
        .filter(u => u.id_opravneni === 1)
        .filter(u => !teachers.some(t => t.id === u.id))
        .filter(u => ownerId ? u.id !== ownerId : true) // Exclude owner
        .filter(u => !searchTerm ||
            `${u.jmeno} ${u.prijmeni}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-cyan-50">
                    <h2 className="text-xl font-bold text-slate-900">Spravovat učitele</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-white/50">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Current Teachers */}
                    <div>
                        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                            Aktuální učitelé ({teachers.length})
                        </h3>
                        <div className="space-y-2">
                            {teachers.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-4 bg-slate-50 rounded-xl">Zatím žádní učitelé</p>
                            ) : (
                                teachers.map((teacher) => (
                                    <div key={teacher.id} className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-100">
                                        <div className="flex items-center gap-3">
                                            {teacher.obrazek_url ? (
                                                <Image src={teacher.obrazek_url} alt="" width={36} height={36} className="rounded-full" />
                                            ) : (
                                                <div className="w-9 h-9 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 text-xs font-bold">
                                                    {teacher.jmeno?.[0]}{teacher.prijmeni?.[0]}
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">{teacher.jmeno} {teacher.prijmeni}</p>
                                                <p className="text-xs text-slate-500">{teacher.email}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => handleRemove(teacher.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-lg">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                                <line x1="6" y1="6" x2="18" y2="18"></line>
                                            </svg>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Add Teacher */}
                    <div>
                        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                            Přidat učitele
                        </h3>
                        <div className="relative mb-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="M21 21l-4.35-4.35"></path>
                            </svg>
                            <input
                                type="text"
                                placeholder="Hledat učitele..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                            />
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {availableTeachers.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-4">{searchTerm ? 'Žádní učitelé nenalezeni' : 'Žádní dostupní učitelé'}</p>
                            ) : (
                                availableTeachers.map((u) => (
                                    <button
                                        key={u.id}
                                        onClick={() => handleInvite(u.id)}
                                        disabled={loading}
                                        className="w-full flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50 transition-all text-left"
                                    >
                                        {u.obrazek_url ? (
                                            <Image src={u.obrazek_url} alt="" width={36} height={36} className="rounded-full" />
                                        ) : (
                                            <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold">
                                                {u.jmeno?.[0]}{u.prijmeni?.[0]}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-700">{u.jmeno} {u.prijmeni}</p>
                                            <p className="text-xs text-slate-400 truncate">{u.email}</p>
                                        </div>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="12" y1="5" x2="12" y2="19"></line>
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
