"use client";

import React from 'react';

export interface Outcome {
    id?: number;
    nazev: string;
}

export interface Option {
    id?: number;
    text: string;
    isCorrect: boolean;
    outcomePoints?: Record<string, number>; // Mapping outcome name to points
}

export interface Question {
    id?: number;
    text: string;
    points?: number;
    options: Option[];
}

interface TestBuilderProps {
    questions: Question[];
    onChange: (questions: Question[]) => void;
    taskType?: 'classic' | 'test' | 'outcome';
    outcomes?: Outcome[];
    onOutcomesChange?: (outcomes: Outcome[]) => void;
}

export default function TestBuilder({ questions, onChange, taskType = 'test', outcomes = [], onOutcomesChange }: TestBuilderProps) {

    const addQuestion = () => {
        onChange([...questions, { text: '', points: 1, options: [{ text: '', isCorrect: false }] }]);
    };

    const updateQuestion = (index: number, updates: Partial<Question>) => {
        const newQuestions = [...questions];
        newQuestions[index] = { ...newQuestions[index], ...updates };
        onChange(newQuestions);
    };

    const removeQuestion = (index: number) => {
        const newQuestions = questions.filter((_, i) => i !== index);
        onChange(newQuestions);
    };

    const addOption = (qIndex: number) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options.push({ text: '', isCorrect: false, outcomePoints: {} });
        onChange(newQuestions);
    };

    const updateOption = (qIndex: number, oIndex: number, updates: Partial<Option>) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options[oIndex] = { ...newQuestions[qIndex].options[oIndex], ...updates };
        onChange(newQuestions);
    };

    const toggleCorrect = (qIndex: number, oIndex: number) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options[oIndex].isCorrect = !newQuestions[qIndex].options[oIndex].isCorrect;
        onChange(newQuestions);
    };

    const removeOption = (qIndex: number, oIndex: number) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options = newQuestions[qIndex].options.filter((_, i) => i !== oIndex);
        onChange(newQuestions);
    };

    const updateOutcomePoint = (qIndex: number, oIndex: number, outcomeNazev: string, value: string) => {
        const numValue = parseFloat(value) || 0;
        const newQuestions = [...questions];
        const option = newQuestions[qIndex].options[oIndex];
        const newOutcomePoints = { ...(option.outcomePoints || {}) };

        if (numValue === 0) {
            delete newOutcomePoints[outcomeNazev];
        } else {
            newOutcomePoints[outcomeNazev] = numValue;
        }

        option.outcomePoints = newOutcomePoints;
        onChange(newQuestions);
    };

    const addOutcome = () => {
        if (onOutcomesChange) {
            onOutcomesChange([...outcomes, { nazev: '' }]);
        }
    };

    const updateOutcome = (index: number, nazev: string) => {
        if (onOutcomesChange) {
            const newOutcomes = [...outcomes];
            newOutcomes[index].nazev = nazev;
            onOutcomesChange(newOutcomes);
        }
    };

    const removeOutcome = (index: number) => {
        if (onOutcomesChange) {
            onOutcomesChange(outcomes.filter((_, i) => i !== index));
        }
    };

    return (
        <div className="space-y-6">
            {taskType === 'outcome' && (
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 mb-6">
                    <h3 className="text-lg font-semibold text-indigo-900 mb-4 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7h-9"></path><path d="M14 17H5"></path><circle cx="17" cy="17" r="3"></circle><circle cx="7" cy="7" r="3"></circle></svg>
                        Definice výsledků (kategorií)
                    </h3>
                    <div className="space-y-3">
                        {outcomes.map((outcome, idx) => (
                            <div key={idx} className="flex gap-2">
                                <input
                                    type="text"
                                    value={outcome.nazev}
                                    onChange={(e) => updateOutcome(idx, e.target.value)}
                                    placeholder="Název výsledku (např. Introvert)"
                                    className="flex-grow px-3 py-2 border border-indigo-200 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeOutcome(idx)}
                                    className="p-2 text-indigo-400 hover:text-red-500 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={addOutcome}
                            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Přidat kategorii výsledku
                        </button>
                    </div>
                </div>
            )}

            <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Otázky testu</h3>

            {questions.map((q, qIndex) => (
                <div key={qIndex} className="bg-slate-50 p-4 rounded-lg border border-slate-200 relative group">
                    <button
                        type="button"
                        onClick={() => removeQuestion(qIndex)}
                        className="absolute top-2 right-2 text-slate-400 hover:text-red-500 p-1 transition-colors"
                        title="Odstranit otázku"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 pr-8">
                        <div className="md:col-span-3">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Otázka {qIndex + 1}</label>
                            <input
                                type="text"
                                value={q.text}
                                onChange={(e) => updateQuestion(qIndex, { text: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Zadejte znění otázky..."
                            />
                        </div>
                        {taskType === 'test' && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Body</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={q.points ?? 1}
                                    onChange={(e) => updateQuestion(qIndex, { points: parseFloat(e.target.value) || 0 })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                        )}
                    </div>

                    <div className="space-y-4 pl-4 border-l-2 border-indigo-100">
                        {q.options.map((opt, oIndex) => (
                            <div key={oIndex} className="space-y-2">
                                <div className="flex items-center gap-3">
                                    {taskType === 'test' && (
                                        <input
                                            type="checkbox"
                                            checked={opt.isCorrect}
                                            onChange={() => toggleCorrect(qIndex, oIndex)}
                                            className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                                            title="Označit jako správnou odpověď"
                                        />
                                    )}
                                    <input
                                        type="text"
                                        value={opt.text}
                                        onChange={(e) => updateOption(qIndex, oIndex, { text: e.target.value })}
                                        className={`flex-grow px-3 py-2 border rounded-md text-sm transition-colors ${opt.isCorrect ? 'border-indigo-300 bg-indigo-50' : 'border-slate-300 bg-white'}`}
                                        placeholder={`Možnost ${oIndex + 1}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeOption(qIndex, oIndex)}
                                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                </div>

                                {taskType === 'outcome' && outcomes.length > 0 && (
                                    <div className="ml-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 bg-white/50 p-2 rounded border border-dashed border-slate-200">
                                        {outcomes.map((out, outIdx) => (
                                            <div key={outIdx} className="flex flex-col gap-1">
                                                <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold truncate" title={out.nazev}>
                                                    {out.nazev || 'Bez názvu'}
                                                </label>
                                                <input
                                                    type="number"
                                                    size={1}
                                                    placeholder="Body"
                                                    value={opt.outcomePoints?.[out.nazev] || ''}
                                                    onChange={(e) => updateOutcomePoint(qIndex, oIndex, out.nazev, e.target.value)}
                                                    className="px-2 py-1 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500 outline-none"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => addOption(qIndex)}
                            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 mt-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Přidat možnost
                        </button>
                    </div>
                </div>
            ))}

            <button
                type="button"
                onClick={addQuestion}
                className="w-full py-4 bg-white border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-indigo-500 hover:text-indigo-600 transition-all flex justify-center items-center gap-2 font-medium"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Přidat další otázku
            </button>
        </div>
    );
}
