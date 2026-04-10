"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useParams } from 'next/navigation';

interface FormOption {
    id: number;
    text: string;
    branchTo: number | null;
}

interface FormQuestion {
    id: number;
    text: string;
    typ: string;
    je_povinne: number;
    options: FormOption[];
}

interface FormOutcome {
    id: number;
    nazev: string;
    popis: string;
}

type ScreenState = 'welcome' | 'question' | 'submitting' | 'result' | 'already_done';

export default function StudentFormPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const taskId = params.id as string;

    const [formName, setFormName] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [questions, setQuestions] = useState<FormQuestion[]>([]);
    const [outcomes, setOutcomes] = useState<FormOutcome[]>([]);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [currentQIdx, setCurrentQIdx] = useState(0);
    const [answers, setAnswers] = useState<Record<number, { moznost_id?: number | number[]; text_odpovedi?: string }>>({});
    const answersRef = useRef<Record<number, { moznost_id?: number | number[]; text_odpovedi?: string }>>({});
    const [history, setHistory] = useState<number[]>([0]);
    const [screen, setScreen] = useState<ScreenState>('welcome');
    const [result, setResult] = useState<any>(null);
    const [slideDir, setSlideDir] = useState<'up' | 'down'>('up');
    const [animating, setAnimating] = useState(false);
    const textRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

    const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    const fetchForm = useCallback(async () => {
        try {
            const res = await fetch(`/api/student/forms/${taskId}`);
            if (res.ok) {
                const data = await res.json();
                setFormName(data.form.nazev);
                setFormDesc(data.form.popis || '');
                setQuestions(data.questions);
                setOutcomes(data.outcomes);
                if (data.isSubmitted) {
                    setIsSubmitted(true);
                    setScreen('already_done');
                }
            }
        } catch (e) {
            console.error('Failed to fetch form:', e);
        }
    }, [taskId]);

    useEffect(() => {
        if (!loading && user) fetchForm();
    }, [user, loading, fetchForm]);

    const currentQ = questions[currentQIdx];

    const handleSelectOption = (optionId: number) => {
        if (!currentQ || animating) return;
        setAnswers(prev => {
            const currentAns = prev[currentQ.id] || {};
            let nextMoznost;
            
            if (currentQ.typ === 'checkbox') {
                const currentArr = Array.isArray(currentAns.moznost_id) ? currentAns.moznost_id : (currentAns.moznost_id ? [currentAns.moznost_id as number] : []);
                if (currentArr.includes(optionId)) {
                    nextMoznost = currentArr.filter(id => id !== optionId);
                } else {
                    nextMoznost = [...currentArr, optionId];
                }
                if (nextMoznost.length === 0) nextMoznost = undefined;
            } else {
                nextMoznost = optionId;
            }
            
            const next = { ...prev, [currentQ.id]: { ...currentAns, moznost_id: nextMoznost } };
            answersRef.current = next;
            return next;
        });

        // Auto-advance after short delay for radio
        if (currentQ.typ === 'radio') {
            setTimeout(() => goNext(optionId), 400);
        }
    };

    const handleTextAnswer = (text: string) => {
        if (!currentQ) return;
        setAnswers(prev => {
            const next = { ...prev, [currentQ.id]: { text_odpovedi: text } };
            answersRef.current = next;
            return next;
        });
    };

    const transition = (nextIdx: number | 'end', dir: 'up' | 'down') => {
        setAnimating(true);
        setSlideDir(dir);
        setTimeout(() => {
            if (nextIdx === 'end') {
                handleSubmit();
            } else {
                setCurrentQIdx(nextIdx);
                setAnimating(false);
            }
        }, 300);
    };

    const goNext = (selectedOptId?: number) => {
        if (!currentQ || animating) return;

        const currentAnswer = selectedOptId
            ? { moznost_id: selectedOptId }
            : answers[currentQ.id];

        // Determine next question based on branching
        let nextIdx: number | 'end' = currentQIdx + 1;

        if (currentAnswer?.moznost_id) {
            const selectedOpt = currentQ.options.find(o => o.id === currentAnswer.moznost_id);
            if (selectedOpt?.branchTo !== null && selectedOpt?.branchTo !== undefined) {
                const targetIdx = questions.findIndex(q => q.id === selectedOpt.branchTo);
                nextIdx = targetIdx !== -1 ? targetIdx : 'end';
            }
        }

        if (nextIdx === 'end' || (typeof nextIdx === 'number' && nextIdx >= questions.length)) {
            transition('end', 'up');
        } else {
            setHistory(prev => [...prev, nextIdx as number]);
            transition(nextIdx as number, 'up');
        }
    };

    const goBack = () => {
        if (history.length <= 1 || animating) return;
        const newHistory = [...history];
        newHistory.pop();
        setHistory(newHistory);
        transition(newHistory[newHistory.length - 1], 'down');
    };

    const handleSubmit = async () => {
        setScreen('submitting');
        try {
            const answerArray: any[] = [];
            Object.entries(answersRef.current).forEach(([qId, ans]) => {
                if (Array.isArray(ans.moznost_id)) {
                    ans.moznost_id.forEach(mId => {
                         answerArray.push({
                             otazka_id: parseInt(qId),
                             moznost_id: mId,
                             text_odpovedi: null
                         });
                    });
                } else {
                    answerArray.push({
                        otazka_id: parseInt(qId),
                        moznost_id: ans.moznost_id || null,
                        text_odpovedi: ans.text_odpovedi || null,
                    });
                }
            });

            const res = await fetch(`/api/student/forms/${taskId}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers: answerArray }),
            });

            if (res.ok) {
                const data = await res.json();
                setResult(data);
                setTimeout(() => setScreen('result'), 1500);
            }
        } catch (e) {
            console.error('Failed to submit form:', e);
        }
    };

    const canGoNext = () => {
        if (!currentQ) return false;
        if (currentQ.je_povinne === 0) return true;
        const ans = answers[currentQ.id];
        if (!ans) return false;
        if (currentQ.typ === 'radio') return !!ans.moznost_id;
        if (currentQ.typ === 'checkbox') return Array.isArray(ans.moznost_id) ? ans.moznost_id.length > 0 : !!ans.moznost_id;
        if (currentQ.typ === 'text' || currentQ.typ === 'textarea') return !!ans.text_odpovedi?.trim();
        return true;
    };

    // Keyboard shortcuts
    useEffect(() => {
        if (screen !== 'question' || animating) return;

        const handler = (e: KeyboardEvent) => {
            if (screen === 'question' && currentQ) {
                // Enter = next
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (canGoNext()) goNext();
                }

                // Letter keys for options
                if (currentQ.typ === 'radio' || currentQ.typ === 'checkbox') {
                    const letterIdx = e.key.toUpperCase().charCodeAt(0) - 65;
                    if (letterIdx >= 0 && letterIdx < currentQ.options.length) {
                        handleSelectOption(currentQ.options[letterIdx].id);
                    }
                }
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    });

    // Focus text input
    useEffect(() => {
        if (screen === 'question' && currentQ && (currentQ.typ === 'text' || currentQ.typ === 'textarea')) {
            setTimeout(() => textRef.current?.focus(), 350);
        }
    }, [currentQIdx, screen]);

    const progress = questions.length > 0 ? ((history.length - 1) / questions.length) * 100 : 0;

    if (loading) {
        return (
            <div className="fixed inset-0 bg-slate-50 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    // === WELCOME SCREEN ===
    if (screen === 'welcome') {
        return (
            <div className="fixed inset-0 bg-white overflow-hidden">
                {/* Decorative gradients */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-indigo-100 to-transparent rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-violet-100 to-transparent rounded-full blur-3xl"></div>

                <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6">
                    <div className="max-w-2xl w-full text-center">
                        {/* Icon */}
                        <div className="w-20 h-20 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30 animate-[bounce_3s_ease-in-out_infinite]">
                            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                                <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                                <path d="M9 14h6" /><path d="M9 18h6" /><path d="M9 10h6" />
                            </svg>
                        </div>

                        <h1 className="text-5xl md:text-6xl font-black text-slate-900 mb-4 tracking-tight leading-[1.1]">
                            {formName}
                        </h1>

                        {formDesc && (
                            <p className="text-xl text-slate-500 mb-12 max-w-lg mx-auto leading-relaxed">
                                {formDesc}
                            </p>
                        )}

                        <button
                            onClick={() => setScreen('question')}
                            className="group relative inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                        >
                            Začít
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:translate-x-1 transition-transform">
                                <path d="m9 18 6-6-6-6" />
                            </svg>
                        </button>

                        <p className="text-slate-400 text-sm mt-8">
                            {questions.length} otázek • Zabere pár minut
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // === ALREADY DONE SCREEN ===
    if (screen === 'already_done') {
        return (
            <div className="fixed inset-0 bg-slate-50 flex items-center justify-center px-6">
                <div className="max-w-lg w-full text-center">
                    <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 mb-3">Hotovo</h1>
                    <p className="text-slate-500 text-lg mb-10">Tento formulář jste již vyplnili.</p>
                    <button onClick={() => router.back()} className="px-8 py-4 bg-slate-200 text-slate-700 rounded-2xl font-semibold hover:bg-slate-300 transition-colors backdrop-blur-sm">
                        Zpět
                    </button>
                </div>
            </div>
        );
    }

    // === SUBMITTING SCREEN ===
    if (screen === 'submitting') {
        return (
            <div className="fixed inset-0 bg-slate-50 flex items-center justify-center px-6">
                <div className="text-center">
                    <div className="relative w-24 h-24 mx-auto mb-8">
                        <div className="absolute inset-0 rounded-full border-2 border-slate-200"></div>
                        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-500 animate-spin"></div>
                        <div className="absolute inset-3 rounded-full border-2 border-transparent border-t-violet-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                    </div>
                    <p className="text-slate-600 text-lg font-medium animate-pulse">Odesílám odpovědi...</p>
                </div>
            </div>
        );
    }

    // === RESULT SCREEN ===
    if (screen === 'result' && result) {
        return (
            <div className="fixed inset-0 bg-slate-50 overflow-auto">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-emerald-100 to-transparent rounded-full blur-3xl"></div>

                <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-16">
                    <div className="max-w-xl w-full text-center">
                        {/* Success animation */}
                        <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30 animate-[scale-in_0.5s_ease-out]">
                            <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                        </div>

                        <p className="text-slate-400 text-sm uppercase tracking-widest font-bold mb-3">Váš výsledek</p>

                        {result.matchedOutcome ? (
                            <>
                                <h1 className="text-5xl md:text-6xl font-black text-slate-900 mb-4 tracking-tight">
                                    {result.matchedOutcome.nazev}
                                </h1>
                                {result.matchedOutcome.popis && (
                                    <p className="text-xl text-slate-500 mb-10 leading-relaxed max-w-md mx-auto">
                                        {result.matchedOutcome.popis}
                                    </p>
                                )}
                            </>
                        ) : (
                            <>
                                <h1 className="text-5xl font-black text-slate-900 mb-4">Děkujeme!</h1>
                                <p className="text-xl text-slate-500 mb-10">Formulář byl úspěšně odeslán.</p>
                            </>
                        )}

                        {/* Score bars */}
                        {outcomes.length > 0 && Object.keys(result.outcomeScores).length > 0 && (
                            <div className="bg-white rounded-3xl p-8 mb-10 border border-slate-200 text-left shadow-xl shadow-slate-200/50">
                                <p className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-6">Bodové rozložení</p>
                                <div className="space-y-5">
                                    {outcomes.map((out, idx) => {
                                        const score = result.outcomeScores[out.id] || 0;
                                        const maxScore = Math.max(...Object.values(result.outcomeScores as Record<string, number>), 1);
                                        const pct = (score / maxScore) * 100;
                                        const isTop = result.matchedOutcome?.id === out.id;
                                        return (
                                            <div key={out.id} style={{ animationDelay: `${idx * 150}ms` }} className="animate-[fade-up_0.5s_ease-out_both]">
                                                <div className="flex justify-between items-baseline mb-2">
                                                    <span className={`font-bold text-sm ${isTop ? 'text-emerald-600' : 'text-slate-600'}`}>{out.nazev}</span>
                                                    <span className={`text-sm font-mono ${isTop ? 'text-emerald-600' : 'text-slate-400'}`}>{score}</span>
                                                </div>
                                                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-1000 ease-out ${isTop ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-slate-300'}`}
                                                        style={{ width: `${pct}%`, transitionDelay: `${idx * 150 + 300}ms` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => router.back()}
                            className="px-8 py-4 bg-slate-200 text-slate-700 rounded-2xl font-semibold hover:bg-slate-300 transition-all backdrop-blur-sm"
                        >
                            Zpět na úkoly
                        </button>
                    </div>
                </div>

                <style jsx>{`
                    @keyframes scale-in { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                    @keyframes fade-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                `}</style>
            </div>
        );
    }

    // === QUESTION SCREEN ===
    return (
        <div className="fixed inset-0 bg-slate-50 overflow-hidden">
            {/* Progress bar */}
            <div className="absolute top-0 left-0 right-0 z-50 h-1 bg-slate-200">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
            </div>

            {/* Question counter */}
            <div className="absolute top-6 right-8 z-50">
                <span className="text-slate-400 text-sm font-mono">{currentQIdx + 1}/{questions.length}</span>
            </div>

            {/* Back button */}
            <button
                onClick={goBack}
                disabled={history.length <= 1}
                className="absolute top-6 left-8 z-50 p-2 text-slate-400 hover:text-slate-700 disabled:opacity-0 transition-all"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
            </button>

            {/* Main question area */}
            <div className="flex items-center justify-center min-h-screen px-6 py-20">
                {currentQ && (
                    <div
                        key={currentQ.id}
                        className={`max-w-2xl w-full transition-all duration-300 ease-out ${animating
                            ? slideDir === 'up'
                                ? 'opacity-0 translate-y-12'
                                : 'opacity-0 -translate-y-12'
                            : 'opacity-100 translate-y-0'
                            }`}
                    >
                        {/* Question number badge */}
                        <div className="flex items-center gap-3 mb-6">
                            <span className="text-indigo-600 font-mono text-sm font-bold">{currentQIdx + 1}</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-300"><path d="m9 18 6-6-6-6" /></svg>
                        </div>

                        {/* Question text */}
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-10 leading-tight tracking-tight">
                            {currentQ.text}
                            {currentQ.je_povinne === 1 && <span className="text-rose-500 ml-1">*</span>}
                        </h2>

                        {/* Radio / Checkbox Options */}
                        {(currentQ.typ === 'radio' || currentQ.typ === 'checkbox') && (
                            <div className="space-y-3">
                                {currentQ.options.map((opt, idx) => {
                                    const currentAns = answers[currentQ.id]?.moznost_id;
                                    const isSelected = Array.isArray(currentAns) 
                                        ? currentAns.includes(opt.id) 
                                        : currentAns === opt.id;
                                    return (
                                        <button
                                            key={opt.id}
                                            onClick={() => handleSelectOption(opt.id)}
                                            className={`group w-full text-left px-6 py-5 rounded-2xl border transition-all duration-200 flex items-center gap-5 ${isSelected
                                                ? 'border-indigo-500 bg-indigo-50 text-indigo-900 shadow-sm shadow-indigo-100'
                                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 shadow-sm'
                                                }`}
                                        >
                                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${isSelected
                                                ? 'bg-indigo-500 text-white'
                                                : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'
                                                }`}>
                                                {LETTERS[idx]}
                                            </span>
                                            <span className="text-lg font-medium">{opt.text}</span>
                                            {isSelected && (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="ml-auto text-indigo-600">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Text Input */}
                        {currentQ.typ === 'text' && (
                            <div className="relative">
                                <input
                                    ref={textRef as React.RefObject<HTMLInputElement>}
                                    type="text"
                                    value={answers[currentQ.id]?.text_odpovedi || ''}
                                    onChange={(e) => handleTextAnswer(e.target.value)}
                                    placeholder="Napište odpověď..."
                                    className="w-full bg-transparent border-b-2 border-slate-300 focus:border-indigo-500 text-slate-900 text-2xl py-4 outline-none transition-colors placeholder:text-slate-300"
                                />
                            </div>
                        )}

                        {/* Textarea */}
                        {currentQ.typ === 'textarea' && (
                            <div className="relative">
                                <textarea
                                    ref={textRef as React.RefObject<HTMLTextAreaElement>}
                                    value={answers[currentQ.id]?.text_odpovedi || ''}
                                    onChange={(e) => handleTextAnswer(e.target.value)}
                                    placeholder="Napište odpověď..."
                                    rows={4}
                                    className="w-full bg-transparent border-b-2 border-slate-300 focus:border-indigo-500 text-slate-900 text-xl py-4 outline-none transition-colors resize-none placeholder:text-slate-300"
                                />
                            </div>
                        )}

                        {/* Next button for text/textarea or when manual advance needed */}
                        {(currentQ.typ === 'text' || currentQ.typ === 'textarea' || currentQ.typ === 'checkbox') && (
                            <div className="mt-8 flex items-center gap-4">
                                <button
                                    onClick={() => goNext()}
                                    disabled={!canGoNext()}
                                    className="group inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl font-bold transition-all shadow-md"
                                >
                                    OK
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="group-hover:translate-x-0.5 transition-transform"><polyline points="20 6 9 17 4 12" /></svg>
                                </button>
                                <span className="text-slate-400 text-sm">
                                    stiskněte <kbd className="px-2 py-0.5 bg-slate-200 rounded text-slate-500 font-mono text-xs">Enter ↵</kbd>
                                </span>
                            </div>
                        )}

                        {/* Keyboard hint for options */}
                        {(currentQ.typ === 'radio' || currentQ.typ === 'checkbox') && (
                            <div className="mt-6 text-slate-400 text-sm">
                                Stiskněte <kbd className="px-2 py-0.5 bg-slate-200 rounded text-slate-500 font-mono text-xs">A</kbd> <kbd className="px-2 py-0.5 bg-slate-200 rounded text-slate-500 font-mono text-xs">B</kbd> <kbd className="px-2 py-0.5 bg-slate-200 rounded text-slate-500 font-mono text-xs">C</kbd> ... pro výběr
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
