"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from '@/hooks/useAuth';

interface TaskItem {
    id: number;
    title: string;
    description: string;
    dueDate: string;
    type: 'classic' | 'test';
    isSubmitted: number; // 0 or >0
    submittedAt?: string;
}

export default function StudentUkolyPage() {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<TaskItem[]>([]);

    useEffect(() => {
        if (user) {
            fetchTasks();
        }
    }, [user]);

    const fetchTasks = async () => {
        try {
            const res = await fetch('/api/student/tasks');
            if (res.ok) {
                const data = await res.json();
                setTasks(data);
            }
        } catch (error) {
            console.error('Failed to fetch tasks', error);
        }
    };

    const currentTasks = tasks
        .filter(t => t.isSubmitted === 0)
        .sort((a, b) => {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });

    const submittedTasks = tasks
        .filter(t => t.isSubmitted > 0)
        .sort((a, b) => {
            const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
            const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
            return dateB - dateA; // Newest first
        });

    return (
        <div className="max-w-5xl">
            <h1 className="text-3xl font-bold text-slate-900 mb-8">Moje úkoly</h1>

            <div className="space-y-8">
                <div>
                    <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        Aktuální úkoly
                    </h2>
                    {currentTasks.length === 0 ? (
                        <div className="text-center py-8 bg-white rounded-xl border border-slate-200 border-dashed">
                            <p className="text-slate-500">Žádné aktuální úkoly to splnění.</p>
                        </div>
                    ) : (
                        currentTasks.map(task => (
                            <Link key={task.id} href={`/zak/ukoly/${task.id}`}>
                                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex justify-between items-center group cursor-pointer mb-4 border-l-4 border-l-indigo-500">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${task.type === 'test' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {task.type === 'test' ? 'TEST' : 'ÚKOL'}
                                            </span>
                                            <h3 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{task.title}</h3>
                                        </div>
                                        <p className="text-slate-500 text-sm mb-2 line-clamp-1">{task.description}</p>
                                        <div className="flex items-center gap-4 text-xs text-slate-400">
                                            <span className="flex items-center gap-1 font-medium text-slate-600">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                                Odevzdat do: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Bez termínu'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-slate-400 group-hover:translate-x-1 transition-transform">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>

                <div>
                    <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        Odevzdané úkoly
                    </h2>
                    {submittedTasks.length === 0 ? (
                        <div className="text-center py-8 bg-white rounded-xl border border-slate-200 border-dashed">
                            <p className="text-slate-500">Zatím žádné odevzdané úkoly.</p>
                        </div>
                    ) : (
                        submittedTasks.map(task => (
                            <Link key={task.id} href={`/zak/ukoly/${task.id}`}>
                                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 hover:bg-white hover:shadow-sm transition-all flex justify-between items-center group cursor-pointer mb-4 opacity-75 hover:opacity-100">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium flex items-center gap-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                Odevzdáno
                                            </span>
                                            <h3 className="text-lg font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">{task.title}</h3>
                                        </div>
                                        <p className="text-slate-500 text-sm line-clamp-1">{task.description}</p>
                                        <div className="mt-2 text-xs text-slate-400">
                                            Odevzdáno: {task.submittedAt ? new Date(task.submittedAt).toLocaleDateString() : 'Neznámo'}
                                        </div>
                                    </div>
                                    <div className="text-slate-400 group-hover:translate-x-1 transition-transform">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </div>

    );
}
