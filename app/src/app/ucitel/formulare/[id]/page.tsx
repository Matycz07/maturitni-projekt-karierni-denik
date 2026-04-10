"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useParams } from 'next/navigation';
import TeacherLayout from "../../../../components/TeacherLayout";

// --- Types ---
interface FormOption {
    tempId: string;
    text: string;
    branchTo: string | null;
    outcomePoints: { outcomeKey: string; body: number }[];
}

interface FormQuestion {
    tempId: string;
    text: string;
    typ: 'radio' | 'checkbox' | 'text' | 'textarea';
    je_povinne: number;
    options: FormOption[];
    // Position on canvas
    x: number;
    y: number;
}

interface FormOutcome {
    tempId: string;
    nazev: string;
    popis: string;
    min_body: number;
    max_body: number;
}

const QTypes = [
    { value: 'radio', label: 'Jedna volba', icon: '◉' },
    { value: 'checkbox', label: 'Více voleb', icon: '☑' },
    { value: 'text', label: 'Krátký text', icon: 'Aa' },
    { value: 'textarea', label: 'Dlouhý text', icon: '¶' },
];

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'];

export default function FormEditorPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const formId = params.id as string;

    const [formName, setFormName] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [questions, setQuestions] = useState<FormQuestion[]>([]);
    const [outcomes, setOutcomes] = useState<FormOutcome[]>([]);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [selectedQ, setSelectedQ] = useState<string | null>(null);
    const [dragging, setDragging] = useState<string | null>(null);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [connecting, setConnecting] = useState<{ optTempId: string; qTempId: string } | null>(null);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [assignModal, setAssignModal] = useState(false);
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [panel, setPanel] = useState<'question' | 'outcomes' | 'settings'>('question');
    const canvasRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    const genId = () => Math.random().toString(36).substr(2, 9);

    // --- DATA LOADING ---
    const fetchForm = useCallback(async () => {
        try {
            const res = await fetch(`/api/teacher/forms/${formId}`);
            if (res.ok) {
                const data = await res.json();
                setFormName(data.nazev);
                setFormDesc(data.popis || '');

                const mappedOutcomes: FormOutcome[] = (data.outcomes || []).map((o: any) => ({
                    tempId: `o_${o.id}`, nazev: o.nazev, popis: o.popis || '',
                    min_body: o.min_body, max_body: o.max_body,
                }));
                setOutcomes(mappedOutcomes);

                const outcomeServerToTemp: Record<number, string> = {};
                (data.outcomes || []).forEach((o: any, idx: number) => {
                    outcomeServerToTemp[o.id] = mappedOutcomes[idx].tempId;
                });

                const mappedQ: FormQuestion[] = (data.questions || []).map((q: any, idx: number) => ({
                    tempId: `q_${q.id}`,
                    text: q.text, typ: q.typ || 'radio', je_povinne: q.je_povinne ?? 1,
                    x: (q.pos_x || q.pos_y) ? q.pos_x : 100 + (idx % 3) * 320,
                    y: (q.pos_x || q.pos_y) ? q.pos_y : 80 + Math.floor(idx / 3) * 280,
                    options: (q.options || []).map((opt: any) => ({
                        tempId: `opt_${opt.id}`, text: opt.text,
                        branchTo: opt.branchTo === null ? null : `q_${opt.branchTo}`,
                        outcomePoints: (opt.outcomePoints || []).map((op: any) => ({
                            outcomeKey: outcomeServerToTemp[op.vysledek_id] || '', body: op.body,
                        })),
                    })),
                }));
                setQuestions(mappedQ);
            }
        } catch (e) {
            console.error('Failed to fetch form:', e);
        }
    }, [formId]);

    useEffect(() => {
        if (!loading && user) {
            if (user.role !== 1) router.push('/');
            else fetchForm();
        }
    }, [user, loading, router, fetchForm]);

    // --- SAVE ---
    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/teacher/forms/${formId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nazev: formName, popis: formDesc,
                    questions: questions.map((q, i) => ({
                        tempId: q.tempId, text: q.text, typ: q.typ, je_povinne: q.je_povinne, x: q.x, y: q.y,
                        options: q.options.map(o => ({
                            text: o.text, branchTo: o.branchTo,
                            outcomePoints: o.outcomePoints,
                        })),
                    })),
                    outcomes: outcomes.map(o => ({
                        tempId: o.tempId, nazev: o.nazev, popis: o.popis,
                        min_body: o.min_body, max_body: o.max_body,
                    })),
                }),
            });
            if (res.ok) {
                setSaved(true);
                setTimeout(() => setSaved(false), 2000);
                fetchForm();
            }
        } catch (e) { console.error(e); }
        setSaving(false);
    };

    // --- QUESTION CRUD ---
    const addQuestion = (typ: 'radio' | 'checkbox' | 'text' | 'textarea' = 'radio') => {
        const newQ: FormQuestion = {
            tempId: genId(), text: '', typ, je_povinne: 1,
            options: typ === 'radio' || typ === 'checkbox'
                ? [{ tempId: genId(), text: 'Možnost 1', branchTo: null, outcomePoints: [] }, { tempId: genId(), text: 'Možnost 2', branchTo: null, outcomePoints: [] }]
                : [],
            x: -pan.x / zoom + 200 + Math.random() * 100,
            y: -pan.y / zoom + 200 + Math.random() * 100,
        };
        setQuestions([...questions, newQ]);
        setSelectedQ(newQ.tempId);
        setPanel('question');
    };

    const updateQ = (tempId: string, updates: Partial<FormQuestion>) => {
        setQuestions(qs => qs.map(q => q.tempId === tempId ? { ...q, ...updates } : q));
    };

    const deleteQ = (tempId: string) => {
        setQuestions(qs => {
            // Remove branches pointing to this question
            return qs.filter(q => q.tempId !== tempId).map(q => ({
                ...q,
                options: q.options.map(o => ({
                    ...o,
                    branchTo: o.branchTo === tempId ? null : o.branchTo,
                })),
            }));
        });
        if (selectedQ === tempId) setSelectedQ(null);
    };

    const addOption = (qTempId: string) => {
        setQuestions(qs => qs.map(q => q.tempId === qTempId ? {
            ...q,
            options: [...q.options, { tempId: genId(), text: `Možnost ${q.options.length + 1}`, branchTo: null, outcomePoints: [] }],
        } : q));
    };

    const updateOption = (qTempId: string, optTempId: string, updates: Partial<FormOption>) => {
        setQuestions(qs => qs.map(q => q.tempId === qTempId ? {
            ...q,
            options: q.options.map(o => o.tempId === optTempId ? { ...o, ...updates } : o),
        } : q));
    };

    const removeOption = (qTempId: string, optTempId: string) => {
        setQuestions(qs => qs.map(q => q.tempId === qTempId ? {
            ...q,
            options: q.options.filter(o => o.tempId !== optTempId),
        } : q));
    };

    // --- OUTCOMES ---
    const addOutcome = () => {
        setOutcomes([...outcomes, { tempId: genId(), nazev: '', popis: '', min_body: 0, max_body: 0 }]);
    };

    const updateOutcome = (idx: number, updates: Partial<FormOutcome>) => {
        const newO = [...outcomes];
        newO[idx] = { ...newO[idx], ...updates };
        setOutcomes(newO);
    };

    const removeOutcome = (idx: number) => {
        const removed = outcomes[idx];
        setOutcomes(outcomes.filter((_, i) => i !== idx));
        setQuestions(qs => qs.map(q => ({
            ...q,
            options: q.options.map(o => ({
                ...o,
                outcomePoints: o.outcomePoints.filter(op => op.outcomeKey !== removed.tempId),
            })),
        })));
    };

    // --- CANVAS DRAG ---
    const handleNodeMouseDown = (e: React.MouseEvent, qTempId: string) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        const q = questions.find(q => q.tempId === qTempId);
        if (!q) return;
        setDragging(qTempId);
        setSelectedQ(qTempId);
        setPanel('question');
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
            setDragOffset({
                x: (e.clientX - rect.left - pan.x) / zoom - q.x,
                y: (e.clientY - rect.top - pan.y) / zoom - q.y,
            });
        }
    };

    const handleCanvasMouseDown = (e: React.MouseEvent) => {
        if (e.button === 1 || (e.button === 0 && e.altKey)) {
            setIsPanning(true);
            setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        } else if (e.button === 0 && !connecting) {
            // Only deselect if clicking empty canvas area
            const target = e.target as HTMLElement;
            if (target === canvasRef.current || target.classList.contains('canvas-inner')) {
                setSelectedQ(null);
            }
        }
    };

    const handleCanvasMouseMove = (e: React.MouseEvent) => {
        if (dragging) {
            const rect = canvasRef.current?.getBoundingClientRect();
            if (rect) {
                const x = (e.clientX - rect.left - pan.x) / zoom - dragOffset.x;
                const y = (e.clientY - rect.top - pan.y) / zoom - dragOffset.y;
                updateQ(dragging, { x, y });
            }
        }
        if (isPanning) {
            setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
        }
    };

    const handleCanvasMouseUp = () => {
        setDragging(null);
        setIsPanning(false);
        // Don't cancel connecting mode on mouseup — user needs to click a target node
    };

    const handleWheel = (e: React.WheelEvent) => {
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        setZoom(z => Math.min(2, Math.max(0.3, z + delta)));
    };

    // --- CONNECTION PORT CLICK ---
    const handlePortMouseDown = (e: React.MouseEvent, optTempId: string, qTempId: string) => {
        e.stopPropagation();
        e.preventDefault();
        if (connecting) {
            // If already connecting, cancel and start new
            setConnecting({ optTempId, qTempId });
        } else {
            // Start connection from this option's output port
            setConnecting({ optTempId, qTempId });
        }
    };

    const handleRemoveConnection = (e: React.MouseEvent, optTempId: string, qTempId: string) => {
        e.stopPropagation();
        e.preventDefault();
        updateOption(qTempId, optTempId, { branchTo: null });
    };

    const handleNodeClick = (e: React.MouseEvent, targetQTempId: string) => {
        e.stopPropagation();
        e.preventDefault();
        if (connecting) {
            // Complete connection — link the source option to this target question
            if (connecting.qTempId !== targetQTempId) {
                updateOption(connecting.qTempId, connecting.optTempId, { branchTo: targetQTempId });
            }
            setConnecting(null);
        } else {
            setSelectedQ(targetQTempId);
            setPanel('question');
        }
    };

    // --- COMPUTE CONNECTIONS ---
    const connections = useMemo(() => {
        const conns: { fromQ: FormQuestion; opt: FormOption; toQ: FormQuestion; optIdx: number }[] = [];
        for (const q of questions) {
            for (let i = 0; i < q.options.length; i++) {
                const opt = q.options[i];
                if (opt.branchTo) {
                    const target = questions.find(tq => tq.tempId === opt.branchTo);
                    if (target) {
                        conns.push({ fromQ: q, opt, toQ: target, optIdx: i });
                    }
                }
            }
        }
        return conns;
    }, [questions]);

    // --- ASSIGN ---
    const fetchClasses = async () => {
        try {
            const res = await fetch('/api/teacher/classes');
            if (res.ok) setClasses(await res.json());
        } catch (e) { console.error(e); }
    };

    const handleAssign = async () => {
        if (!selectedClass) return;
        try {
            const res = await fetch(`/api/teacher/forms/${formId}/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ classId: parseInt(selectedClass) }),
            });
            if (res.ok) { alert('Formulář přiřazen!'); setAssignModal(false); }
        } catch (e) { console.error(e); }
    };

    const selQ = questions.find(q => q.tempId === selectedQ);

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
        </div>
    );
    if (!user || user.role !== 1) return null;

    const NODE_W = 280;
    const NODE_H_BASE = 48;

    return (
        <TeacherLayout>
            <div className="fixed inset-0 lg:left-72 flex flex-col bg-slate-100">
                {/* Top Toolbar */}
                <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-30 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.push('/ucitel/formulare')} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
                        </button>
                        <div className="w-px h-6 bg-slate-200"></div>
                        <input
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            className="font-bold text-slate-900 bg-transparent outline-none text-sm border border-transparent hover:border-slate-200 focus:border-emerald-400 rounded-lg px-2 py-1 transition-colors"
                            placeholder="Název formuláře..."
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Add question dropdown */}
                        {QTypes.map(t => (
                            <button key={t.value} onClick={() => addQuestion(t.value as any)} title={t.label}
                                className="w-8 h-8 rounded-lg bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-500 hover:text-emerald-600 text-xs font-bold flex items-center justify-center transition-all">
                                {t.icon}
                            </button>
                        ))}

                        <div className="w-px h-6 bg-slate-200 mx-1"></div>

                        <button onClick={() => { fetchClasses(); setAssignModal(true); }}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors">
                            Přiřadit třídě
                        </button>

                        <button onClick={handleSave} disabled={saving}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${saved
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                                }`}>
                            {saving ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> :
                                saved ? '✓ Uloženo' : 'Uložit'}
                        </button>
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Canvas */}
                    <div
                        ref={canvasRef}
                        className="canvas-inner flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing"
                        onMouseDown={handleCanvasMouseDown}
                        onMouseMove={handleCanvasMouseMove}
                        onMouseUp={handleCanvasMouseUp}
                        onMouseLeave={handleCanvasMouseUp}
                        onWheel={handleWheel}
                        style={{ background: 'radial-gradient(circle, #e2e8f0 1px, transparent 1px)', backgroundSize: `${20 * zoom}px ${20 * zoom}px`, backgroundPosition: `${pan.x}px ${pan.y}px` }}
                    >
                        {/* SVG for connections — 1x1 with overflow:visible renders paths at any coordinate */}
                        <svg ref={svgRef} className="absolute pointer-events-none z-10" width="1" height="1"
                            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0', overflow: 'visible', left: 0, top: 0 }}>
                            <defs>
                                <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                                    <polygon points="0 0, 8 3, 0 6" fill="#6366f1" />
                                </marker>
                            </defs>
                            {connections.map((conn, idx) => {
                                const fromX = conn.fromQ.x + NODE_W;
                                const fromY = conn.fromQ.y + NODE_H_BASE + conn.optIdx * 36 + 18;
                                const toX = conn.toQ.x;
                                const toY = conn.toQ.y + 24;
                                const midX = (fromX + toX) / 2;
                                return (
                                    <path
                                        key={idx}
                                        d={`M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`}
                                        stroke="#6366f1"
                                        strokeWidth="2"
                                        fill="none"
                                        strokeDasharray={conn.opt.branchTo ? 'none' : '5,5'}
                                        markerEnd="url(#arrowhead)"
                                        opacity="0.6"
                                    />
                                );
                            })}
                        </svg>

                        {/* Question Nodes */}
                        <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }} className="canvas-inner absolute inset-0">
                            {questions.map((q, qIdx) => {
                                const isSelected = selectedQ === q.tempId;
                                const color = COLORS[qIdx % COLORS.length];
                                const nodeH = NODE_H_BASE + (q.options.length > 0 ? q.options.length * 36 + 8 : q.typ === 'text' || q.typ === 'textarea' ? 36 : 0);
                                return (
                                    <div
                                        key={q.tempId}
                                        className={`absolute select-none transition-shadow duration-150 ${dragging === q.tempId ? 'z-50' : 'z-20'}`}
                                        style={{ left: q.x, top: q.y, width: NODE_W }}
                                    >
                                        <div className={`rounded-2xl shadow-lg ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-100 shadow-xl shadow-indigo-500/20' : 'shadow-slate-200/80'}`} style={{ overflow: 'visible' }}>
                                            {/* Input port — always visible in connection mode */}
                                            {connecting && connecting.qTempId !== q.tempId && (
                                                <div
                                                    className="absolute -left-3 top-5 w-6 h-6 bg-indigo-500 border-3 border-white rounded-full cursor-pointer hover:scale-125 transition-transform z-[60] shadow-lg shadow-indigo-500/50"
                                                    onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); handleNodeClick(e, q.tempId); }}
                                                    style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
                                                ></div>
                                            )}
                                            {/* Header - draggable */}
                                            <div
                                                className="px-4 py-3 flex items-center gap-2 cursor-move rounded-t-2xl"
                                                style={{ background: color }}
                                                onMouseDown={(e) => handleNodeMouseDown(e, q.tempId)}
                                                onClick={(e) => handleNodeClick(e, q.tempId)}
                                            >
                                                <span className="text-white/70 text-xs font-bold">Q{qIdx + 1}</span>
                                                <span className="text-white text-sm font-semibold truncate flex-1">{q.text || 'Bez textu'}</span>
                                                <span className="text-white/50 text-[10px]">{QTypes.find(t => t.value === q.typ)?.icon}</span>
                                            </div>

                                            {/* Body */}
                                            <div className="bg-white rounded-b-2xl" style={{ overflow: 'visible' }}>
                                                {(q.typ === 'radio' || q.typ === 'checkbox') && q.options.map((opt, oIdx) => (
                                                    <div key={opt.tempId} className="px-4 py-2 border-b border-slate-100 last:border-b-0 flex items-center gap-2 text-sm text-slate-700 relative group">
                                                        <span className="text-slate-300 text-xs">{q.typ === 'radio' ? '◯' : '☐'}</span>
                                                        <span className="truncate flex-1">{opt.text || `Možnost ${oIdx + 1}`}</span>

                                                        {/* Output port — uses onMouseDown to prevent drag and header click propagation */}
                                                        <div
                                                            className={`absolute -right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-white cursor-pointer hover:scale-150 transition-all z-[40] shadow-sm ${opt.branchTo ? 'bg-indigo-500 opacity-100' : 'bg-slate-400 opacity-0 group-hover:opacity-100'}`}
                                                            title={opt.branchTo ? 'Pravým klikem smaž / klikni pro nové propojení' : 'Klikni pro vytvoření větvení'}
                                                            onMouseDown={(e) => handlePortMouseDown(e, opt.tempId, q.tempId)}
                                                            onContextMenu={(e) => { e.preventDefault(); handleRemoveConnection(e, opt.tempId, q.tempId); }}
                                                        ></div>
                                                    </div>
                                                ))}
                                                {(q.typ === 'text' || q.typ === 'textarea') && (
                                                    <div className="px-4 py-2.5 text-xs text-slate-400 italic">
                                                        {q.typ === 'text' ? 'Textové pole' : 'Velké textové pole'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Connection mode indicator */}
                        {connecting && (
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg animate-pulse">
                                Klikněte na cílovou otázku pro propojení
                                <button onClick={() => setConnecting(null)} className="ml-2 text-white/60 hover:text-white">✕</button>
                            </div>
                        )}

                        {/* Zoom indicator */}
                        <div className="absolute bottom-4 right-4 z-30 flex items-center gap-1 bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200 shadow-sm text-xs text-slate-500">
                            <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className="px-2 py-1.5 hover:bg-slate-100 rounded-l-lg">−</button>
                            <span className="px-2 py-1.5 min-w-[40px] text-center font-mono">{Math.round(zoom * 100)}%</span>
                            <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="px-2 py-1.5 hover:bg-slate-100 rounded-r-lg">+</button>
                        </div>
                    </div>

                    {/* Right Panel */}
                    <div className="w-80 bg-white border-l border-slate-200 flex flex-col z-20 flex-shrink-0 overflow-hidden">
                        {/* Panel tabs */}
                        <div className="flex border-b border-slate-200 flex-shrink-0">
                            {[
                                { key: 'question', label: 'Otázka' },
                                { key: 'outcomes', label: 'Výsledky' },
                                { key: 'settings', label: 'Info' },
                            ].map(tab => (
                                <button key={tab.key} onClick={() => setPanel(tab.key as any)}
                                    className={`flex-1 py-3 text-xs font-semibold transition-colors ${panel === tab.key ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50/50' : 'text-slate-500 hover:text-slate-700'}`}>
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {/* Question Panel */}
                            {panel === 'question' && selQ && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Otázka</label>
                                        <textarea
                                            value={selQ.text}
                                            onChange={(e) => updateQ(selQ.tempId, { text: e.target.value })}
                                            placeholder="Znění otázky..."
                                            rows={2}
                                            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 resize-none"
                                        />
                                    </div>

                                    <div className="flex gap-2">
                                        {QTypes.map(t => (
                                            <button key={t.value} onClick={() => updateQ(selQ.tempId, { typ: t.value as any })}
                                                className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${selQ.typ === t.value ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                                {t.icon} {t.label.split(' ')[0]}
                                            </button>
                                        ))}
                                    </div>

                                    <label className="flex items-center gap-2 text-xs text-slate-600">
                                        <input type="checkbox" checked={selQ.je_povinne === 1}
                                            onChange={(e) => updateQ(selQ.tempId, { je_povinne: e.target.checked ? 1 : 0 })}
                                            className="rounded text-emerald-500" />
                                        Povinná otázka
                                    </label>

                                    {/* Options */}
                                    {(selQ.typ === 'radio' || selQ.typ === 'checkbox') && (
                                        <div>
                                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">Možnosti</label>
                                            <div className="space-y-2">
                                                {selQ.options.map((opt, oIdx) => (
                                                    <div key={opt.tempId} className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-slate-300 text-xs flex-shrink-0">{selQ.typ === 'radio' ? '◯' : '☐'}</span>
                                                            <input
                                                                type="text" value={opt.text}
                                                                onChange={(e) => updateOption(selQ.tempId, opt.tempId, { text: e.target.value })}
                                                                placeholder={`Možnost ${oIdx + 1}`}
                                                                className="flex-1 px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500"
                                                            />
                                                            <button onClick={() => removeOption(selQ.tempId, opt.tempId)}
                                                                className="text-slate-300 hover:text-rose-500 transition-colors p-0.5">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                                            </button>
                                                        </div>

                                                        {/* Branch Rule */}
                                                        <div className="ml-5 flex items-center gap-1.5">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-400"><path d="M6 3v12" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" /></svg>
                                                            <select
                                                                value={opt.branchTo || ''}
                                                                onChange={(e) => updateOption(selQ.tempId, opt.tempId, { branchTo: e.target.value || null })}
                                                                className="text-[11px] border border-slate-200 rounded px-1.5 py-0.5 text-slate-600 outline-none flex-1 focus:ring-1 focus:ring-indigo-400">
                                                                <option value="">Další otázka</option>
                                                                {questions.filter(tq => tq.tempId !== selQ.tempId).map((tq, tIdx) => (
                                                                    <option key={tq.tempId} value={tq.tempId}>
                                                                        → Q{questions.indexOf(tq) + 1}: {tq.text ? tq.text.substring(0, 25) : '...'}
                                                                    </option>
                                                                ))}
                                                                <option value="_end">→ Konec</option>
                                                            </select>
                                                        </div>

                                                        {/* Outcome Points */}
                                                        {outcomes.length > 0 && (
                                                            <div className="ml-5 flex flex-wrap gap-1.5 mt-1">
                                                                {outcomes.map(out => {
                                                                    const pt = opt.outcomePoints.find(op => op.outcomeKey === out.tempId);
                                                                    return (
                                                                        <div key={out.tempId} className="flex items-center gap-0.5">
                                                                            <span className="text-[9px] text-slate-400 truncate max-w-[50px]" title={out.nazev}>{out.nazev || '?'}</span>
                                                                            <input type="number" placeholder="0" value={pt?.body || ''}
                                                                                onChange={(e) => {
                                                                                    const val = parseFloat(e.target.value) || 0;
                                                                                    const newPts = opt.outcomePoints.filter(op => op.outcomeKey !== out.tempId);
                                                                                    if (val !== 0) newPts.push({ outcomeKey: out.tempId, body: val });
                                                                                    updateOption(selQ.tempId, opt.tempId, { outcomePoints: newPts });
                                                                                }}
                                                                                className="w-8 px-1 py-0.5 text-[10px] border border-slate-200 rounded text-center outline-none focus:ring-1 focus:ring-amber-400" />
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                                <button onClick={() => addOption(selQ.tempId)}
                                                    className="text-xs text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-1 mt-1">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                                    Přidat
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-3 border-t border-slate-100">
                                        <button onClick={() => deleteQ(selQ.tempId)}
                                            className="w-full py-2 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors">
                                            Smazat otázku
                                        </button>
                                    </div>
                                </div>
                            )}

                            {panel === 'question' && !selQ && (
                                <div className="text-center py-12 text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" className="mx-auto mb-3 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m15 15-6 6m0-6 6 6M21 3l-8.5 8.5" /><path d="M21 3h-6m6 0v6" /></svg>
                                    <p className="text-sm">Vyberte otázku na plátně<br />nebo přidejte novou</p>
                                </div>
                            )}

                            {/* Outcomes Panel */}
                            {panel === 'outcomes' && (
                                <div className="space-y-3">
                                    <p className="text-xs text-slate-400">Definujte výsledné kategorie. Žák uvidí kategorii s nejvíce body.</p>
                                    {outcomes.map((out, idx) => (
                                        <div key={out.tempId} className="bg-amber-50/80 p-3 rounded-xl border border-amber-100 space-y-2">
                                            <div className="flex gap-2">
                                                <input type="text" value={out.nazev}
                                                    onChange={(e) => updateOutcome(idx, { nazev: e.target.value })}
                                                    placeholder="Název"
                                                    className="flex-1 px-2.5 py-1.5 text-sm border border-amber-200 rounded-lg outline-none focus:ring-amber-400" />
                                                <button onClick={() => removeOutcome(idx)}
                                                    className="text-slate-400 hover:text-rose-500 p-1">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                                </button>
                                            </div>
                                            <input type="text" value={out.popis}
                                                onChange={(e) => updateOutcome(idx, { popis: e.target.value })}
                                                placeholder="Popis výsledku"
                                                className="w-full px-2.5 py-1.5 text-xs border border-amber-200 rounded-lg outline-none focus:ring-amber-400" />
                                        </div>
                                    ))}
                                    <button onClick={addOutcome}
                                        className="w-full py-2 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-dashed border-amber-300 rounded-xl transition-colors flex items-center justify-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                        Přidat kategorii
                                    </button>
                                </div>
                            )}

                            {/* Settings Panel */}
                            {panel === 'settings' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Název</label>
                                        <input value={formName} onChange={(e) => setFormName(e.target.value)}
                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/30" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 block">Popis</label>
                                        <textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)}
                                            rows={3}
                                            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/30 resize-none" />
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                                        <p className="text-xs font-medium text-slate-600 mb-1">Počet otázek: {questions.length}</p>
                                        <p className="text-xs font-medium text-slate-600 mb-1">Počet kategorií: {outcomes.length}</p>
                                        <p className="text-xs font-medium text-slate-600">Propojení: {connections.length}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Assign Modal */}
                {assignModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                            <h3 className="text-lg font-bold text-slate-900 mb-4">Přiřadit formulář třídě</h3>
                            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl mb-4 outline-none focus:ring-2 focus:ring-emerald-500/30 text-sm">
                                <option value="">Vyberte třídu...</option>
                                {classes.map((c: any) => <option key={c.id} value={c.id}>{c.nazev}</option>)}
                            </select>
                            <div className="flex gap-3">
                                <button onClick={handleAssign} disabled={!selectedClass}
                                    className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-bold disabled:opacity-50">Přiřadit</button>
                                <button onClick={() => setAssignModal(false)}
                                    className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold">Zrušit</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </TeacherLayout>
    );
}
