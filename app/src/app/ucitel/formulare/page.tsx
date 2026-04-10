"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TeacherLayout from "../../../components/TeacherLayout";

interface Form {
    id: number;
    nazev: string;
    popis: string;
    questionCount: number;
    submissionCount: number;
    created_at: string;
    updated_at: string;
}

export default function FormularePage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [forms, setForms] = useState<Form[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');

    const fetchForms = useCallback(async () => {
        try {
            const res = await fetch('/api/teacher/forms');
            if (res.ok) {
                setForms(await res.json());
            }
        } catch (e) {
            console.error('Failed to fetch forms:', e);
        }
    }, []);

    useEffect(() => {
        if (!loading && user) {
            if (user.role !== 1) router.push('/');
            else fetchForms();
        }
    }, [user, loading, router, fetchForms]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;
        try {
            const res = await fetch('/api/teacher/forms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nazev: newName, popis: newDesc }),
            });
            if (res.ok) {
                const data = await res.json();
                router.push(`/ucitel/formulare/${data.id}`);
            }
        } catch (e) {
            console.error('Failed to create form:', e);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Opravdu chcete smazat tento formulář?')) return;
        try {
            await fetch(`/api/teacher/forms/${id}`, { method: 'DELETE' });
            fetchForms();
        } catch (e) {
            console.error('Failed to delete form:', e);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                    <span className="text-slate-500 text-sm">Načítání...</span>
                </div>
            </div>
        );
    }

    if (!user || user.role !== 1) return null;

    return (
        <TeacherLayout>
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <header className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                                <path d="M9 14h6"></path>
                                <path d="M9 18h6"></path>
                                <path d="M9 10h6"></path>
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Formuláře</h1>
                            <p className="text-slate-500 mt-0.5 text-sm">Vlastní formuláře s větvením a výsledky</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowCreate(!showCreate)}
                        className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all flex items-center gap-2 text-sm font-semibold"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Nový formulář
                    </button>
                </header>

                {/* Create Form */}
                {showCreate && (
                    <div className="p-6 rounded-2xl border border-slate-200 mb-8 shadow-sm bg-white animate-fade-in">
                        <h2 className="text-lg font-bold text-slate-900 mb-4">Vytvořit nový formulář</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Název formuláře</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="Např. Kariérní orientační test"
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 text-slate-900 bg-slate-50/50 transition-all outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Popis (nepovinný)</label>
                                <textarea
                                    value={newDesc}
                                    onChange={(e) => setNewDesc(e.target.value)}
                                    placeholder="Krátký popis formuláře..."
                                    rows={2}
                                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 text-slate-900 bg-slate-50/50 transition-all outline-none resize-none"
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl hover:shadow-lg transition-all text-sm"
                                >
                                    Vytvořit a upravit
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCreate(false)}
                                    className="px-6 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-all text-sm"
                                >
                                    Zrušit
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Forms Grid */}
                {forms.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                        Zatím žádné formuláře. Vytvořte první výše.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {forms.map((form) => (
                            <div
                                key={form.id}
                                className="relative group rounded-2xl border border-slate-200 hover:border-emerald-300 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 overflow-hidden bg-white"
                            >
                                <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-60 group-hover:opacity-100 transition-opacity"></div>
                                <div className="p-6 pt-5">
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-100 transition-colors flex-shrink-0">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors truncate">{form.nazev}</h3>
                                            {form.popis && <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{form.popis}</p>}
                                        </div>
                                    </div>

                                    <div className="flex gap-4 text-xs text-slate-400 mb-4">
                                        <span className="flex items-center gap-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                                            {form.questionCount} otázek
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                                            {form.submissionCount} odpovědí
                                        </span>
                                    </div>

                                    <div className="flex gap-2 border-t border-slate-100 pt-4">
                                        <Link
                                            href={`/ucitel/formulare/${form.id}`}
                                            className="flex-1 text-center py-2.5 px-4 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-semibold transition-colors"
                                        >
                                            Upravit
                                        </Link>

                                        <button
                                            onClick={() => handleDelete(form.id)}
                                            className="p-2.5 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-xl transition-colors"
                                            title="Smazat"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </TeacherLayout>
    );
}
