"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

interface TaskItem {
    id: number;
    title: string;
    description: string;
    dueDate: string;
    type: 'classic' | 'test' | 'outcome' | 'predefined_test';
    testId: number | null;
    templateType?: string;
    isSubmitted: number;
    className?: string;
    classSubject?: string;
}

interface ClassData {
    id: number;
    nazev: string;
    predmet: string;
    rocnik: string;
    ucebna: string;
    barva: string;
}

export default function ZakPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [classData, setClassData] = useState<ClassData | null>(null);
    const [joinCode, setJoinCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [joinError, setJoinError] = useState('');
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isCheckingClass, setIsCheckingClass] = useState(false);

    const fetchTasks = useCallback(async () => {
        try {
            const res = await fetch('/api/student/tasks');
            if (res.ok) {
                const data = await res.json();
                setTasks(data);
            }
        } catch (error) {
            console.error('Failed to fetch tasks', error);
        }
    }, []);

    const checkClass = useCallback(async () => {
        setIsCheckingClass(true);
        try {
            const res = await fetch('/api/student/me/class');
            if (res.ok) {
                const data = await res.json();
                setClassData(data);
                fetchTasks(); // Fetch tasks after class is confirmed
            } else {
                setClassData(null);
            }
        } catch (err) {
            console.error("Failed to fetch class", err);
        } finally {
            setIsCheckingClass(false);
            setIsLoadingData(false);
        }
    }, [fetchTasks]);

    const handleJoinClass = async (e: React.FormEvent) => {
        e.preventDefault();
        if (joinCode.length !== 7) {
            setJoinError('Kód musí mít přesně 7 znaků.');
            return;
        }

        setIsJoining(true);
        setJoinError('');

        try {
            const res = await fetch('/api/student/join-class', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: joinCode })
            });

            if (res.ok) {
                checkClass(); // Reload class status
            } else {
                const data = await res.json();
                setJoinError(data.error || 'Nepodařilo se připojit ke třídě.');
            }
        } catch (err) {
            setJoinError('Chyba při komunikaci se serverem.');
        } finally {
            setIsJoining(false);
        }
    };

    useEffect(() => {
        if (!loading && user && user.role !== 0) {
            // Redirect if not zak
        }
        if (user) {
            checkClass();
        }
    }, [user, loading, router, checkClass]);

    if (loading || isLoadingData) return <div className="flex items-center justify-center min-h-screen">Načítání...</div>;
    if (!user) return null;

    if (!classData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-slate-50">
                <div className="bg-white p-12 rounded-2xl shadow-lg max-w-lg w-full border border-slate-200">
                    <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Připojit se ke třídě</h1>
                    <p className="text-slate-500 mb-8">
                        Zadejte 7místný kód, který vám poskytl váš učitel.
                    </p>

                    <form onSubmit={handleJoinClass} className="space-y-4">
                        <div>
                            <input
                                type="text"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value)}
                                placeholder="Příklad: aB3xY7z"
                                maxLength={7}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-center text-xl font-mono tracking-widest"
                            />
                            {joinError && <p className="text-red-500 text-sm mt-2">{joinError}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={isJoining || joinCode.length !== 7}
                            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                        >
                            {isJoining ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Připojování...
                                </>
                            ) : (
                                "Připojit se"
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-8 border-t border-slate-100">
                        <p className="text-sm text-slate-500 mb-4">Máte potíže? Můžete zkusit ověřit ruční přidání.</p>
                        <button
                            onClick={checkClass}
                            disabled={isCheckingClass}
                            className="text-indigo-600 hover:text-indigo-700 font-medium text-sm flex items-center justify-center gap-2 mx-auto"
                        >
                            {isCheckingClass ? "Ověřování..." : "Zkontrolovat ruční přidání"}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const activeTasks = tasks.filter(t => t.isSubmitted === 0);

    return (
        <div className="p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Vítejte, {user.name}</h1>
                <p className="text-slate-500 mt-1">Máte před sebou skvělý den! Zde je přehled vašich úkolů.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content - Tasks */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                        </svg>
                        Aktuální úkoly
                    </h2>

                    {activeTasks.length > 0 ? (
                        <div className="space-y-4">
                            {activeTasks.map(task => (
                                <div key={task.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${(task.type === 'test' || (task.type === 'predefined_test' && task.templateType !== 'outcome')) ? 'bg-amber-100 text-amber-700' : (task.type === 'outcome' || (task.type === 'predefined_test' && task.templateType === 'outcome')) ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {(task.type === 'test' || (task.type === 'predefined_test' && task.templateType !== 'outcome')) ? 'TEST' : (task.type === 'outcome' || (task.type === 'predefined_test' && task.templateType === 'outcome')) ? 'KVÍZ' : 'ÚKOL'}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-semibold text-slate-900">{task.title}</h3>
                                            <p className="text-slate-500 text-sm mt-1">{classData.nazev}</p>
                                        </div>
                                        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full">
                                            Do {task.dueDate ? new Date(task.dueDate).toLocaleDateString('cs-CZ') : 'Neurčeno'}
                                        </span>
                                    </div>
                                    <p className="text-slate-600 mt-4 text-sm line-clamp-2">{task.description}</p>
                                    <div className="mt-4 flex justify-end">
                                        <a href={`/zak/ukoly/${task.id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline">
                                            Zobrazit detail
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white p-12 rounded-xl shadow-sm border border-slate-200 text-center">
                            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-slate-900">Vše hotovo!</h3>
                            <p className="text-slate-500 mt-2">Nemáte žádné aktivní úkoly. Užijte si volno.</p>
                        </div>
                    )}
                </div>

                {/* Right Panel - Info */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h2 className="text-lg font-bold text-slate-800 mb-4">Moje třída</h2>
                        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-900 font-bold"
                                style={{ backgroundColor: classData.barva || '#4f46e5' }}
                            >
                                {classData.rocnik}
                            </div>
                            <div>
                                <p className="font-medium text-slate-900">{classData.predmet}</p>
                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                        <line x1="16" y1="2" x2="16" y2="6"></line>
                                        <line x1="8" y1="2" x2="8" y2="6"></line>
                                        <line x1="3" y1="10" x2="21" y2="10"></line>
                                    </svg>
                                    <span>{classData.ucebna}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
