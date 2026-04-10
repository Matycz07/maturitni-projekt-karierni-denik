"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import TeacherLayout from "../../../../../components/TeacherLayout";

interface Answer {
    question_text: string;
    option_text: string | null;
    text_odpovedi: string | null;
}

interface Submission {
    id: number;
    jmeno: string;
    prijmeni: string;
    email: string;
    obrazek_url: string;
    datum: string;
    answers: Answer[];
    outcomeScores: Record<number, number>;
}

interface Outcome {
    id: number;
    nazev: string;
    popis: string;
}

export default function FormResultsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const formId = params.id as string;

    const [formName, setFormName] = useState('');
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [outcomes, setOutcomes] = useState<Outcome[]>([]);
    const [selectedSub, setSelectedSub] = useState<Submission | null>(null);

    const fetchResults = useCallback(async () => {
        try {
            const res = await fetch(`/api/teacher/forms/${formId}/results`);
            if (res.ok) {
                const data = await res.json();
                setFormName(data.form.nazev);
                setSubmissions(data.submissions);
                setOutcomes(data.outcomes);
            }
        } catch (e) {
            console.error('Failed to fetch results:', e);
        }
    }, [formId]);

    useEffect(() => {
        if (!loading && user) {
            if (user.role !== 1) router.push('/');
            else fetchResults();
        }
    }, [user, loading, router, fetchResults]);

    const getTopOutcome = (scores: Record<number, number>) => {
        let best: Outcome | null = null;
        let bestScore = -Infinity;
        for (const [id, score] of Object.entries(scores)) {
            if (score > bestScore) {
                bestScore = score;
                best = outcomes.find(o => o.id === parseInt(id)) || null;
            }
        }
        return best;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-50">
                <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user || user.role !== 1) return null;

    return (
        <TeacherLayout>
            <div className="max-w-5xl mx-auto">
                <header className="mb-8 flex items-center gap-3">
                    <button onClick={() => router.push('/ucitel/formulare')} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
                    </button>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-900">Výsledky: {formName}</h1>
                        <p className="text-sm text-slate-500">{submissions.length} odpovědí</p>
                    </div>
                </header>

                {/* Summary Stats */}
                {outcomes.length > 0 && submissions.length > 0 && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6 shadow-sm">
                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4">Rozložení výsledků</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {outcomes.map(out => {
                                const count = submissions.filter(s => getTopOutcome(s.outcomeScores)?.id === out.id).length;
                                const pct = submissions.length > 0 ? Math.round((count / submissions.length) * 100) : 0;
                                return (
                                    <div key={out.id} className="bg-emerald-50 rounded-xl p-4 text-center">
                                        <div className="text-2xl font-extrabold text-emerald-700">{pct}%</div>
                                        <div className="text-sm font-semibold text-emerald-600 mt-1">{out.nazev}</div>
                                        <div className="text-xs text-slate-400">{count} z {submissions.length}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Submissions List */}
                {submissions.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        Zatím žádné odpovědi.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {submissions.map(sub => {
                            const topOutcome = getTopOutcome(sub.outcomeScores);
                            return (
                                <div
                                    key={sub.id}
                                    className="bg-white rounded-xl border border-slate-200 hover:border-emerald-300 transition-all cursor-pointer shadow-sm hover:shadow-md"
                                    onClick={() => setSelectedSub(selectedSub?.id === sub.id ? null : sub)}
                                >
                                    <div className="p-4 flex items-center gap-4">
                                        <div className="relative w-10 h-10 flex-shrink-0">
                                            {sub.obrazek_url ? (
                                                <Image src={sub.obrazek_url} alt="" fill className="rounded-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                                                    {sub.jmeno?.[0]}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-slate-900">{sub.jmeno} {sub.prijmeni}</p>
                                            <p className="text-xs text-slate-400">{new Date(sub.datum).toLocaleString('cs-CZ')}</p>
                                        </div>
                                        {topOutcome && (
                                            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-sm font-semibold rounded-full">{topOutcome.nazev}</span>
                                        )}
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-slate-400 transition-transform ${selectedSub?.id === sub.id ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6" /></svg>
                                    </div>

                                    {selectedSub?.id === sub.id && (
                                        <div className="border-t border-slate-100 p-4 bg-slate-50/50">
                                            <div className="space-y-2">
                                                {sub.answers.map((ans, idx) => (
                                                    <div key={idx} className="flex gap-2">
                                                        <span className="text-xs font-bold text-slate-400 mt-0.5">Q{idx + 1}</span>
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-700">{ans.question_text}</p>
                                                            <p className="text-sm text-emerald-600">{ans.option_text || ans.text_odpovedi || '—'}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </TeacherLayout>
    );
}
