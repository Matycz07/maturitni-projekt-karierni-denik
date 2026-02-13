"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TeacherLayout from "../../../components/TeacherLayout";

interface NotisekTopic {
    id: number;
    title: string;
    created_at: string;
    updated_at: string;
}

export default function NotisekPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [topics, setTopics] = useState<NotisekTopic[]>([]);
    const [newTopicTitle, setNewTopicTitle] = useState<string>('');
    const [editingTopicId, setEditingTopicId] = useState<number | null>(null);
    const [editingTopicTitle, setEditingTopicTitle] = useState<string>('');

    const fetchTopics = useCallback(async () => {
        try {
            const res = await fetch(`/api/teacher/notisek/topics`);
            if (res.ok) {
                const data: NotisekTopic[] = await res.json();
                setTopics(data);
            } else {
                setTopics([]);
            }
        } catch (error) {
            console.error('Failed to fetch topics:', error);
            setTopics([]);
        }
    }, []);

    useEffect(() => {
        if (!loading && user) {
            if (user.role !== 1) {
                router.push('/');
            } else {
                fetchTopics();
            }
        }
    }, [user, loading, router, fetchTopics]);

    useEffect(() => {
        if (!loading && typeof window !== 'undefined' && window.location.hash && topics.length > 0) {
            const id = window.location.hash.substring(1);
            setTimeout(() => {
                const element = document.getElementById(id);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('ring-4', 'ring-indigo-500', 'ring-offset-2');
                    setTimeout(() => element.classList.remove('ring-4', 'ring-indigo-500', 'ring-offset-2'), 3000);
                }
            }, 500);
        }
    }, [loading, topics]);

    const handleCreateTopic = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTopicTitle.trim()) return;

        try {
            const res = await fetch(`/api/teacher/notisek/topics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newTopicTitle }),
            });
            if (res.ok) {
                setNewTopicTitle('');
                fetchTopics();
            } else {
                alert('Chyba při vytváření tématu.');
            }
        } catch (error) {
            console.error('Failed to create topic:', error);
            alert('Chyba sítě.');
        }
    };

    const handleEditTopic = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTopicTitle.trim() || !editingTopicId) return;

        try {
            const res = await fetch(`/api/teacher/notisek/topics/${editingTopicId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: editingTopicTitle }),
            });
            if (res.ok) {
                setEditingTopicId(null);
                setEditingTopicTitle('');
                fetchTopics();
            } else {
                alert('Chyba při úpravě tématu.');
            }
        } catch (error) {
            console.error('Failed to update topic:', error);
            alert('Chyba sítě.');
        }
    };

    const handleDeleteTopic = async (topicId: number) => {
        if (!confirm('Opravdu chcete smazat toto téma a všechny jeho karty?')) return;

        try {
            const res = await fetch(`/api/teacher/notisek/topics/${topicId}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                fetchTopics();
            } else {
                alert('Chyba při mazání tématu.');
            }
        } catch (error) {
            console.error('Failed to delete topic:', error);
            alert('Chyba sítě.');
        }
    };

    const handleMoveTopic = async (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === topics.length - 1) return;

        const newTopics = [...topics];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;

        [newTopics[index], newTopics[swapIndex]] = [newTopics[swapIndex], newTopics[index]];
        setTopics(newTopics);

        const orderData = newTopics.map((t, i) => ({ id: t.id, poradi: i }));
        try {
            await fetch('/api/teacher/notisek/topics/reorder', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order: orderData }),
            });
        } catch (error) {
            console.error('Failed to reorder topics:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <span className="text-slate-500 text-sm">Načítání...</span>
                </div>
            </div>
        );
    }

    if (!user || user.role !== 1) {
        return null;
    }

    return (
        <TeacherLayout>
            <div className="max-w-7xl mx-auto">

                {/* HEADER */}
                <header className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Notísek</h1>
                            <p className="text-slate-500 mt-0.5 text-sm">Správa témat do notísku</p>
                        </div>
                    </div>
                    <Link
                        href="/ucitel/notisek/preview"
                        className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all flex items-center gap-2 text-sm font-semibold"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        Náhled notísku
                    </Link>
                </header>

                <div className="mb-12 animate-fade-in">
                    <div className="flex items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-800 mr-4 whitespace-nowrap">Témata</h2>
                        <div className="h-px bg-gradient-to-r from-slate-300 to-transparent w-full"></div>
                    </div>

                    {/* Create New Topic Form */}
                    <div className="p-6 rounded-2xl border border-slate-200 mb-8 shadow-sm bg-white">
                        <form onSubmit={handleCreateTopic} className="flex gap-3">
                            <input
                                type="text"
                                value={newTopicTitle}
                                onChange={(e) => setNewTopicTitle(e.target.value)}
                                placeholder="Název nového tématu (např. Důležité instituce)"
                                className="flex-grow px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 text-slate-900 bg-slate-50/50 transition-all outline-none"
                                required
                            />
                            <button
                                type="submit"
                                className="px-6 py-3 text-white font-bold rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all bg-gradient-to-r from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/20 text-sm"
                            >
                                Přidat
                            </button>
                        </form>
                    </div>

                    {/* Topics Grid */}
                    {topics.length === 0 ? (
                        <div className="text-center py-16 text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                            </svg>
                            Zatím žádná témata. Přidejte první téma výše.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {topics.map((topic, index) => (
                                <div
                                    key={topic.id}
                                    id={`notisek-topic-${topic.id}`}
                                    className="relative group rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 overflow-hidden bg-white"
                                >
                                    {/* Colored top bar */}
                                    <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-violet-500 opacity-60 group-hover:opacity-100 transition-opacity"></div>

                                    {/* Order Controls */}
                                    <div className="absolute top-4 right-2 flex flex-col gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleMoveTopic(index, 'up')}
                                            disabled={index === 0}
                                            className="p-1.5 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-600 rounded-lg text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            title="Posunout nahoru"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
                                        </button>
                                        <button
                                            onClick={() => handleMoveTopic(index, 'down')}
                                            disabled={index === topics.length - 1}
                                            className="p-1.5 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-600 rounded-lg text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            title="Posunout dolů"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                        </button>
                                    </div>

                                    <div className="p-6 pt-5">
                                        {editingTopicId === topic.id ? (
                                            <form onSubmit={handleEditTopic} className="flex flex-col gap-3">
                                                <input
                                                    type="text"
                                                    value={editingTopicTitle}
                                                    onChange={(e) => setEditingTopicTitle(e.target.value)}
                                                    className="px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 outline-none transition-all"
                                                    autoFocus
                                                    required
                                                />
                                                <div className="flex gap-2">
                                                    <button type="submit" className="px-4 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition-colors shadow-sm">Uložit</button>
                                                    <button type="button" onClick={() => setEditingTopicId(null)} className="px-4 py-1.5 bg-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-300 transition-colors">Zrušit</button>
                                                </div>
                                            </form>
                                        ) : (
                                            <>
                                                <div className="flex justify-between items-start mb-4 pr-8">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-100 transition-colors">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                                                                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                                                            </svg>
                                                        </div>
                                                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{topic.title}</h3>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2 mt-4 border-t border-slate-100 pt-4">
                                                    <Link
                                                        href={`/ucitel/notisek/${topic.id}`}
                                                        className="flex-1 text-center py-2.5 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-semibold transition-colors"
                                                    >
                                                        Otevřít karty
                                                    </Link>
                                                    <button
                                                        onClick={() => {
                                                            setEditingTopicId(topic.id);
                                                            setEditingTopicTitle(topic.title);
                                                        }}
                                                        className="p-2.5 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-xl transition-colors"
                                                        title="Upravit název"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteTopic(topic.id)}
                                                        className="p-2.5 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-xl transition-colors"
                                                        title="Smazat téma"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </TeacherLayout>
    );
}