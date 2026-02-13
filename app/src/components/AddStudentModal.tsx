"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

interface Student {
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

interface AddStudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    classId: number;
    currentStudents: Student[];
    onStudentAdded: () => void;
}

export default function AddStudentModal({ isOpen, onClose, classId, currentStudents, onStudentAdded }: AddStudentModalProps) {
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(false);

    const fetchAllUsers = useCallback(async () => {
        try {
            const res = await fetch('/api/users');
            if (res.ok) setAllUsers(await res.json());
        } catch (err) {
            console.error("Failed to fetch users:", err);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchAllUsers();
            setSearchTerm("");
        }
    }, [isOpen, fetchAllUsers]);

    const handleAddStudent = async (userId: number) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/teacher/classes/${classId}/students`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });
            if (res.ok) {
                onStudentAdded();
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const availableStudents = allUsers
        .filter(u => u.id_opravneni === 0) // Only students
        .filter(u => !currentStudents.some(s => s.id === u.id))
        .filter(u => !searchTerm ||
            `${u.jmeno} ${u.prijmeni}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-emerald-50 to-teal-50">
                    <h2 className="text-xl font-bold text-slate-900">Přidat studenta</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-white/50">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="p-6">
                    {/* Search */}
                    <div className="relative mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="M21 21l-4.35-4.35"></path>
                        </svg>
                        <input
                            type="text"
                            placeholder="Hledat studenty..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                        />
                    </div>

                    {/* Student List */}
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                        {availableStudents.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mx-auto mb-3 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                </svg>
                                <p className="text-sm">{searchTerm ? 'Žádní studenti nenalezeni' : 'Žádní dostupní studenti'}</p>
                            </div>
                        ) : (
                            availableStudents.map((u) => (
                                <button
                                    key={u.id}
                                    onClick={() => handleAddStudent(u.id)}
                                    disabled={loading}
                                    className="w-full flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50 transition-all text-left disabled:opacity-50"
                                >
                                    {u.obrazek_url ? (
                                        <Image src={u.obrazek_url} alt="" width={40} height={40} className="rounded-full" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-sm font-bold">
                                            {u.jmeno?.[0]}{u.prijmeni?.[0]}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-700">{u.jmeno} {u.prijmeni}</p>
                                        <p className="text-xs text-slate-400 truncate">{u.email}</p>
                                    </div>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
    );
}
