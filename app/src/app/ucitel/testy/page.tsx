"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import TeacherLayout from "../../../components/TeacherLayout";
import { useAuth } from '@/hooks/useAuth';
import TestBuilder, { Question } from "../ukoly/components/TestBuilder";

interface TestTemplate {
    id: number;
    nazev: string;
    popis: string;
    typ: 'test' | 'outcome';
    created_at: string;
}

export default function TemplatesPage() {
    const { user } = useAuth();
    const [templates, setTemplates] = useState<TestTemplate[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);

    // Form State
    const [testType, setTestType] = useState<'test' | 'outcome'>('test');
    const [nazev, setNazev] = useState('');
    const [popis, setPopis] = useState('');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [outcomes, setOutcomes] = useState<{ id?: number; nazev: string }[]>([]);

    useEffect(() => {
        if (user) {
            fetchTemplates();
        }
    }, [user]);

    const fetchTemplates = async () => {
        try {
            const res = await fetch('/api/teacher/templates');
            if (res.ok) {
                const data = await res.json();
                setTemplates(data);
            }
        } catch (error) {
            console.error('Failed to fetch templates', error);
        }
    };

    const handleEditTemplate = async (id: number) => {
        try {
            const res = await fetch(`/api/teacher/templates/${id}`);
            if (res.ok) {
                const data = await res.json();
                setNazev(data.nazev);
                setPopis(data.popis || '');
                setTestType(data.typ);
                setQuestions(data.questions || []);
                setOutcomes(data.outcomes || []);
                setEditingTemplateId(id);
                setIsEditing(true);
                setIsCreating(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteTemplate = async (id: number) => {
        if (confirm("Opravdu chcete smazat tuto šablonu?")) {
            try {
                const res = await fetch(`/api/teacher/templates/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    setTemplates(templates.filter(t => t.id !== id));
                }
            } catch (error) {
                console.error(error);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            nazev,
            popis,
            typ: testType,
            questions,
            outcomes
        };

        try {
            let res;
            if (isEditing && editingTemplateId) {
                res = await fetch(`/api/teacher/templates/${editingTemplateId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                res = await fetch('/api/teacher/templates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            if (res.ok) {
                setIsCreating(false);
                resetForm();
                fetchTemplates();
            } else {
                alert('Chyba při ukládání šablony');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const resetForm = () => {
        setNazev('');
        setPopis('');
        setTestType('test');
        setQuestions([]);
        setOutcomes([]);
        setIsEditing(false);
        setEditingTemplateId(null);
    };

    return (
        <TeacherLayout>
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Šablony testů a kvízů</h1>
                        <p className="text-slate-500 mt-1">Vytvořte si šablony, které pak snadno nasdílíte jako úkol.</p>
                    </div>
                    <button
                        onClick={() => { setIsCreating(!isCreating); resetForm(); }}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${isCreating ? 'bg-slate-200 text-slate-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                    >
                        {isCreating ? 'Zrušit' : 'Nová šablona'}
                    </button>
                </div>

                {isCreating && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8 animate-fade-in-down">
                        <h2 className="text-xl font-bold text-slate-900 mb-6">{isEditing ? 'Upravit šablonu' : 'Vytvořit novou šablonu'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Typ šablony</label>
                                    <div className="flex p-1 bg-slate-100 rounded-lg w-max">
                                        <button type="button" onClick={() => setTestType('test')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${testType === 'test' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Standardní Test</button>
                                        <button type="button" onClick={() => setTestType('outcome')} className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${testType === 'outcome' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Výsledkový Kvíz</button>
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Název šablony</label>
                                    <input type="text" required value={nazev} onChange={e => setNazev(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" placeholder="Např. Test z matematiky - Logaritmy" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Popis (interní poznámka)</label>
                                    <textarea rows={2} value={popis} onChange={e => setPopis(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" placeholder="Krátký popis pro vaši orientaci..." />
                                </div>
                            </div>

                            <div className="border-t pt-6">
                                <TestBuilder
                                    questions={questions}
                                    onChange={setQuestions}
                                    taskType={testType}
                                    outcomes={outcomes}
                                    onOutcomesChange={setOutcomes}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                                <button type="button" onClick={() => { setIsCreating(false); resetForm(); }} className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg">Zrušit</button>
                                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-md">
                                    {isEditing ? 'Uložit změny' : 'Vytvořit šablonu'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map(tpl => (
                        <div key={tpl.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col group">
                            <div className="flex justify-between items-start mb-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${tpl.typ === 'outcome' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {tpl.typ === 'outcome' ? 'Výsledkový' : 'Test'}
                                </span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEditTemplate(tpl.id)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg></button>
                                    <button onClick={() => handleDeleteTemplate(tpl.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                                </div>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mb-1">{tpl.nazev}</h3>
                            <p className="text-sm text-slate-500 line-clamp-2 mb-4 flex-grow">{tpl.popis || 'Bez popisu'}</p>
                            <div className="text-[10px] text-slate-400 font-medium pt-3 border-t">Vytvořeno: {new Date(tpl.created_at).toLocaleDateString()}</div>
                        </div>
                    ))}
                </div>
                {templates.length === 0 && !isCreating && (
                    <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
                        <p className="text-slate-400 font-medium">Zatím nemáte žádné šablony. Vytvořte si první kliknutím na "Nová šablona".</p>
                    </div>
                )}
            </div>
        </TeacherLayout>
    );
}
