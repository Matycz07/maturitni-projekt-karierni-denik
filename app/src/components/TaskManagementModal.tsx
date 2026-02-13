"use client";

import { useState } from "react";

export interface Task {
    id: number;
    title: string;
    description: string;
    dueDate: string;
    classId: number;
}

interface TaskManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    classes: { id: number; subject: string; section: string }[];
    tasks: Task[];
    onAddTask: (task: Task) => void;
    onDeleteTask: (id: number) => void;
}

export default function TaskManagementModal({ isOpen, onClose, classes, tasks, onAddTask, onDeleteTask }: TaskManagementModalProps) {
    const [newTask, setNewTask] = useState<Partial<Task>>({
        title: "",
        description: "",
        dueDate: "",
        classId: classes[0]?.id,
    });

    if (!isOpen) return null;

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTask.title || !newTask.classId) return;

        const task: Task = {
            id: Date.now(),
            title: newTask.title,
            description: newTask.description || "",
            dueDate: newTask.dueDate || "",
            classId: Number(newTask.classId),
        };

        onAddTask(task);
        setNewTask({ title: "", description: "", dueDate: "", classId: classes[0]?.id });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-xl font-bold text-slate-900">Správa úkolů</h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {/* Form for new task */}
                    <form onSubmit={handleAddTask} className="mb-8 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Nový úkol</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Název úkolu</label>
                                <input
                                    type="text"
                                    required
                                    value={newTask.title}
                                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                                    placeholder="Např. Písemka"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Třída</label>
                                <select
                                    value={newTask.classId}
                                    onChange={(e) => setNewTask({ ...newTask, classId: Number(e.target.value) })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                                >
                                    {classes.map(c => (
                                        <option key={c.id} value={c.id}>{c.subject} ({c.section})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-slate-500 mb-1">Popis</label>
                                <textarea
                                    value={newTask.description}
                                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                                    placeholder="Podrobnosti k úkolu..."
                                    rows={2}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Termín</label>
                                <input
                                    type="date"
                                    value={newTask.dueDate}
                                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                                />
                            </div>
                            <div className="flex items-end">
                                <button
                                    type="submit"
                                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm transition-colors shadow-sm"
                                >
                                    Přidat úkol
                                </button>
                            </div>
                        </div>
                    </form>

                    {/* Task List */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">Seznam úkolů</h3>
                        {tasks.length === 0 ? (
                            <p className="text-slate-500 text-center py-8">Žádné úkoly.</p>
                        ) : (
                            tasks.map(task => {
                                const assignedClass = classes.find(c => c.id === task.classId);
                                return (
                                    <div key={task.id} className="flex items-start justify-between p-4 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-shadow">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-semibold text-slate-900">{task.title}</h4>
                                                {assignedClass && (
                                                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">
                                                        {assignedClass.subject}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-600 mb-2">{task.description}</p>
                                            <div className="flex items-center gap-4 text-xs text-slate-400">
                                                <span className="flex items-center gap-1">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                                    {task.dueDate || "Bez termínu"}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => onDeleteTask(task.id)}
                                            className="text-slate-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
                                            title="Smazat úkol"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            </svg>
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
