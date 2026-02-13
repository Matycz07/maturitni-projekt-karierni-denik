"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import TeacherLayout from "../../../components/TeacherLayout";
import { useAuth } from '@/hooks/useAuth';
import TestBuilder, { Question } from "./components/TestBuilder";

// --- Interfaces ---

interface Attachment {
    name: string;
    url: string;
    type: 'link' | 'file' | 'google_drive';
}

interface TeacherClass {
    id: number;
    subject: string;
    section: string;
}

interface TaskItem {
    id: number;
    title: string;
    description: string;
    dueDate: string;
    classId: number;
    type: 'classic' | 'test' | 'outcome' | 'predefined_test';
    attachments?: Attachment[];
    questions?: Question[];
    outcomes?: { id?: number; nazev: string }[];
    testId?: number;
}

interface DriveFile {
    id: string;
    name: string;
    webViewLink: string;
    iconLink?: string;
    mimeType?: string;
}

interface FolderNavItem {
    id: string;
    name: string;
}

interface RawClassData {
    id: number;
    predmet?: string;
    nazev?: string;
    rocnik: string;
}

export default function UkolyPage() {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [classes, setClasses] = useState<TeacherClass[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const [editingTaskId, setEditingTaskId] = useState<number | null>(null);

    // Form State
    const [taskType, setTaskType] = useState<'classic' | 'test' | 'outcome' | 'predefined_test'>('classic');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [filterClassId, setFilterClassId] = useState('');

    // Templates
    const [templates, setTemplates] = useState<{ id: number; nazev: string, typ: string }[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

    // Classic specific
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [newLinkName, setNewLinkName] = useState('');
    const [newLinkUrl, setNewLinkUrl] = useState('');

    // Test specific
    const [questions, setQuestions] = useState<Question[]>([]);
    const [outcomes, setOutcomes] = useState<{ id?: number; nazev: string }[]>([]);

    // Drive Search State
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<DriveFile[]>([]);
    const [currentFolderId, setCurrentFolderId] = useState<string>('root');
    const [folderStack, setFolderStack] = useState<FolderNavItem[]>([]);
    const [selectedForAdding, setSelectedForAdding] = useState<DriveFile[]>([]);
    const [driveLoading, setDriveLoading] = useState(false);

    useEffect(() => {
        if (user) {
            fetchClasses();
            fetchTasks();
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
            console.error(error);
        }
    };

    const fetchClasses = async () => {
        try {
            const res = await fetch('/api/teacher/classes');
            if (res.ok) {
                const data = await res.json();
                // Fix: Typování API odpovědi místo any
                setClasses(data.map((c: RawClassData) => ({
                    id: c.id,
                    subject: c.predmet || c.nazev || 'Neznámý předmět',
                    section: c.rocnik
                })));
            }
        } catch (error) {
            console.error('Failed to fetch classes', error);
        }
    };

    const fetchTasks = async () => {
        try {
            const res = await fetch('/api/teacher/tasks');
            if (res.ok) {
                const data = await res.json();
                setTasks(data);
            }
        } catch (error) {
            console.error('Failed to fetch tasks', error);
        }
    };

    const handleEditTask = async (id: number) => {
        try {
            const res = await fetch(`/api/teacher/tasks/${id}`);
            if (res.ok) {
                const data = await res.json();

                // Populate form
                setTitle(data.title);
                setDescription(data.description || '');
                setDueDate(data.dueDate ? data.dueDate.split('T')[0] : '');
                setSelectedClassId(data.classId.toString());
                setTaskType(data.type);

                if (data.type === 'classic') {
                    setAttachments(data.attachments || []);
                } else if (data.type === 'test' || data.type === 'outcome') {
                    setQuestions(data.questions || []);
                    setOutcomes(data.outcomes || []);
                } else if (data.testId) {
                    setTaskType('predefined_test');
                    setSelectedTemplateId(data.testId.toString());
                }

                setEditingTaskId(id);
                setIsEditing(true);
                setIsCreating(true);

                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (error) {
            console.error('Failed to fetch task details', error);
        }
    };

    const handleAddAttachment = (e: React.MouseEvent) => {
        e.preventDefault();
        if (newLinkName && newLinkUrl) {
            setAttachments([...attachments, { name: newLinkName, url: newLinkUrl, type: 'link' }]);
            setNewLinkName('');
            setNewLinkUrl('');
        }
    };

    const handleRemoveAttachment = (index: number) => {
        setAttachments(attachments.filter((_, i) => i !== index));
    };

    const handleDeleteTask = async (id: number) => {
        if (confirm("Opravdu chcete smazat tento úkol?")) {
            try {
                const res = await fetch(`/api/teacher/tasks/${id}`, {
                    method: 'DELETE'
                });
                if (res.ok) {
                    setTasks(tasks.filter(t => t.id !== id));
                } else {
                    alert("Chyba při mazání.");
                }
            } catch (error) {
                console.error("Delete failed", error);
            }
        }
    };

    const handleCreateDriveDoc = async (mimeType: string = 'application/vnd.google-apps.document') => {
        let defaultName = "Nový dokument";
        if (mimeType.includes('spreadsheet')) defaultName = "Nová tabulka";
        if (mimeType.includes('presentation')) defaultName = "Nová prezentace";
        if (mimeType.includes('form')) defaultName = "Nový formulář";

        const name = prompt("Zadejte název souboru:", defaultName);
        if (!name) return;

        try {
            const res = await fetch('/api/drive/create-doc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, mimeType })
            });
            if (res.ok) {
                const file = await res.json();
                setAttachments([...attachments, { name: file.name, url: file.webViewLink, type: 'google_drive' }]);
            } else {
                const data = await res.json();
                alert(data.message || data.error || 'Chyba při vytváření Google Doc.');
            }
        } catch (error) {
            console.error(error);
            alert('Chyba připojení k serveru');
        }
    };

    const handleUploadFile = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '*/*';

        // Fix: Použití nativního Event typu místo any
        input.onchange = async (e: Event) => {
            const target = e.target as HTMLInputElement;
            const file = target.files?.[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('file', file);

            try {
                const res = await fetch('/api/drive/upload', {
                    method: 'POST',
                    body: formData
                });
                if (res.ok) {
                    const data = await res.json();
                    setAttachments([...attachments, { name: data.name, url: data.webViewLink, type: 'google_drive' }]);
                } else {
                    const data = await res.json();
                    alert(data.message || data.error || 'Chyba při nahrávání');
                }
            } catch (err) {
                console.error(err);
                alert('Chyba serveru');
            }
        };
        input.click();
    };

    const handleSearchDrive = async (e?: React.FormEvent, folderId?: string) => {
        if (e) e.preventDefault();
        setDriveLoading(true);
        const fId = folderId || currentFolderId;
        try {
            const url = searchQuery
                ? `/api/drive/search?q=${encodeURIComponent(searchQuery)}`
                : `/api/drive/search?folderId=${fId}`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setSearchResults(data);
            } else {
                const data = await res.json();
                console.error('Drive search failed:', data.message || data.error);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setDriveLoading(false);
        }
    };

    const handleNavigateToFolder = (folderId: string, folderName: string) => {
        setFolderStack(prev => [...prev, { id: currentFolderId, name: folderStack.length === 0 ? 'Kariérní deník' : folderName }]);
        setCurrentFolderId(folderId);
        setSearchQuery('');
        handleSearchDrive(undefined, folderId);
    };

    const handleNavigateBack = () => {
        if (folderStack.length === 0) return;
        const newStack = [...folderStack];
        const last = newStack.pop();
        if (last) {
            setFolderStack(newStack);
            setCurrentFolderId(last.id);
            setSearchQuery('');
            handleSearchDrive(undefined, last.id);
        }
    };

    const toggleFileSelection = (file: DriveFile) => {
        if (file.mimeType === 'application/vnd.google-apps.folder') {
            handleNavigateToFolder(file.id, file.name);
            return;
        }

        setSelectedForAdding(prev =>
            prev.some(f => f.id === file.id)
                ? prev.filter(f => f.id !== file.id)
                : [...prev, file]
        );
    };

    const handleAddSelectedFiles = async () => {
        // Make all public first
        for (const file of selectedForAdding) {
            try {
                await fetch('/api/drive/make-public', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileId: file.id })
                });
            } catch (err) {
                console.error('Failed to make public', err);
            }
        }

        const newAttachments = selectedForAdding.map(file => ({
            name: file.name,
            url: file.webViewLink,
            type: 'google_drive' as const
        }));

        setAttachments(prev => [...prev, ...newAttachments]);
        setShowSearch(false);
        setSelectedForAdding([]);
        setSearchQuery('');
        setSearchResults([]);
        setCurrentFolderId('root');
        setFolderStack([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClassId) {
            alert('Vyberte třídu');
            return;
        }

        if (dueDate) {
            const selectedDate = new Date(dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (selectedDate < today) {
                alert('Termín odevzdání nemůže být v minulosti.');
                return;
            }
        }

        const payload = {
            title,
            description,
            dueDate,
            classId: parseInt(selectedClassId),
            type: taskType === 'predefined_test' ? 'predefined_test' : taskType,
            testId: taskType === 'predefined_test' ? parseInt(selectedTemplateId) : undefined,
            attachments: taskType === 'classic' ? attachments : undefined,
            questions: (taskType === 'test' || taskType === 'outcome') ? questions : undefined,
            outcomes: taskType === 'outcome' ? outcomes : undefined
        };

        try {
            let res;
            if (isEditing && editingTaskId) {
                res = await fetch(`/api/teacher/tasks/${editingTaskId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                res = await fetch('/api/teacher/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }

            if (res.ok) {
                setIsCreating(false);
                setIsEditing(false);
                setEditingTaskId(null);
                resetForm();
                fetchTasks();
            } else {
                alert('Chyba při ukládání úkolu');
            }
        } catch (error) {
            console.error(error);
            alert('Chyba při komunikaci se serverem');
        }
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setDueDate('');
        setSelectedClassId('');
        setAttachments([]);
        setQuestions([]);
        setOutcomes([]);
        setTaskType('classic');
        setSelectedTemplateId('');
        setIsEditing(false);
        setEditingTaskId(null);
    };

    return (
        <TeacherLayout>
            <div className="max-w-7xl mx-auto">

                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Domácí úkoly a Testy</h1>
                        <p className="text-slate-500 mt-1">Správa zadání pro vaše studenty.</p>
                    </div>
                    <button
                        onClick={() => {
                            if (isCreating) {
                                setIsCreating(false);
                                resetForm();
                            } else {
                                setIsCreating(true);
                                resetForm();
                            }
                        }}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${isCreating
                            ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                            }`}
                    >
                        {isCreating ? 'Zrušit' : 'Nový úkol / Test'}
                    </button>
                </div>

                {isCreating && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8 animate-fade-in-down">
                        <h2 className="text-xl font-bold text-slate-900 mb-6">
                            {isEditing ? 'Upravit zadání' : 'Vytvořit nové zadání'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Typ zadání</label>
                                    <div className="flex p-1 bg-slate-100 rounded-lg w-max">
                                        <button
                                            type="button"
                                            onClick={() => setTaskType('classic')}
                                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${taskType === 'classic' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                                }`}
                                        >
                                            Klasický úkol
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTaskType('test')}
                                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${taskType === 'test' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                                }`}
                                        >
                                            Test / Kvíz
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTaskType('outcome')}
                                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${taskType === 'outcome' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                                }`}
                                        >
                                            Výsledkový (Kariérní) kvíz
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setTaskType('predefined_test')}
                                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${taskType === 'predefined_test' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                                }`}
                                        >
                                            Vložit hotový test
                                        </button>
                                    </div>
                                </div>

                                {taskType === 'predefined_test' && (
                                    <div className="col-span-2 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 mb-2">
                                        <label className="block text-sm font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                                            Vyberte šablonu testu nebo kvízu
                                        </label>
                                        <select
                                            required={taskType === 'predefined_test'}
                                            value={selectedTemplateId}
                                            onChange={(e) => setSelectedTemplateId(e.target.value)}
                                            className="w-full px-3 py-2 border border-indigo-200 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white shadow-sm"
                                        >
                                            <option value="">-- Vyberte jednu ze svých šablon --</option>
                                            {templates.map(tpl => (
                                                <option key={tpl.id} value={tpl.id}>
                                                    {tpl.nazev} ({tpl.typ === 'outcome' ? 'Kvíz' : 'Test'})
                                                </option>
                                            ))}
                                        </select>
                                        {templates.length === 0 && (
                                            <p className="mt-2 text-xs text-indigo-600">
                                                Nemáte žádné šablony. <Link href="/ucitel/testy" className="underline font-bold">Vytvořte si je zde</Link>.
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Název zadání</label>
                                    <input
                                        type="text"
                                        required
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Např. Lineární rovnice - procvičování"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Třída</label>
                                    <select
                                        required
                                        value={selectedClassId}
                                        onChange={(e) => setSelectedClassId(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="">Vyberte třídu...</option>
                                        {classes.map(c => (
                                            <option key={c.id} value={c.id}>{c.subject} ({c.section})</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Termín odevzdání (nepovinné)</label>
                                    <input
                                        type="date"
                                        value={dueDate}
                                        min={new Date().toISOString().split('T')[0]}
                                        onChange={(e) => setDueDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Popis</label>
                                    <textarea
                                        rows={3}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Detailní instrukce pro studenty..."
                                    />
                                </div>
                            </div>

                            <div className="border-t pt-6">
                                {taskType === 'classic' ? (
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-semibold text-slate-900">Přílohy a Materiály</h3>
                                        <p className="text-sm text-slate-500">Přidejte odkazy na materiály (Google Drive, YouTube, články...). Studenti pak budou moci odevzdat svou práci.</p>

                                        {attachments.length > 0 && (
                                            <ul className="space-y-2 mb-4">
                                                {attachments.map((att, idx) => (
                                                    <li key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                                                        <div className="flex items-center gap-2">
                                                            {att.type === 'google_drive' ? (
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                                                            ) : (
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                                            )}
                                                            <a href={att.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">{att.name}</a>
                                                        </div>
                                                        <button type="button" onClick={() => handleRemoveAttachment(idx)} className="text-red-500 hover:text-red-700">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}

                                        <div className="flex flex-col gap-4">
                                            <div className="flex gap-2 items-end">
                                                <div className="flex-1">
                                                    <label className="block text-xs text-slate-500 mb-1">Název odkazu</label>
                                                    <input
                                                        type="text"
                                                        value={newLinkName}
                                                        onChange={e => setNewLinkName(e.target.value)}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                                        placeholder="Např. Prezentace PDF"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-xs text-slate-500 mb-1">URL adresa</label>
                                                    <input
                                                        type="url"
                                                        value={newLinkUrl}
                                                        onChange={e => setNewLinkUrl(e.target.value)}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm"
                                                        placeholder="https://..."
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleAddAttachment}
                                                    className="px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-md hover:bg-slate-200"
                                                >
                                                    Přidat
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-2 my-2">
                                                <div className="h-px bg-slate-200 flex-1"></div>
                                                <span className="text-xs text-slate-400">NEBO</span>
                                                <div className="h-px bg-slate-200 flex-1"></div>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => handleCreateDriveDoc('application/vnd.google-apps.document')}
                                                    className="p-3 border rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors flex flex-col items-center gap-2 text-center"
                                                >
                                                    <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                                    </div>
                                                    <span className="text-xs font-medium text-slate-700">Dokument</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleCreateDriveDoc('application/vnd.google-apps.spreadsheet')}
                                                    className="p-3 border rounded-lg hover:bg-green-50 hover:border-green-200 transition-colors flex flex-col items-center gap-2 text-center"
                                                >
                                                    <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center text-white">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>
                                                    </div>
                                                    <span className="text-xs font-medium text-slate-700">Tabulka</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleCreateDriveDoc('application/vnd.google-apps.presentation')}
                                                    className="p-3 border rounded-lg hover:bg-amber-50 hover:border-amber-200 transition-colors flex flex-col items-center gap-2 text-center"
                                                >
                                                    <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center text-white">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M9 3v18"></path><path d="m21 15-3-3 3-3"></path></svg>
                                                    </div>
                                                    <span className="text-xs font-medium text-slate-700">Prezentace</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => handleCreateDriveDoc('application/vnd.google-apps.form')}
                                                    className="p-3 border rounded-lg hover:bg-purple-50 hover:border-purple-200 transition-colors flex flex-col items-center gap-2 text-center"
                                                >
                                                    <div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center text-white">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M9 14h6"></path><path d="M9 18h6"></path><path d="M9 10h6"></path></svg>
                                                    </div>
                                                    <span className="text-xs font-medium text-slate-700">Formulář</span>
                                                </button>

                                                <div className="flex flex-col gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={handleUploadFile}
                                                        className="flex-1 p-2 border rounded hover:bg-slate-50 flex items-center justify-center gap-2 text-xs font-medium text-slate-700"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                                        Nahrát soubor
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setShowSearch(true);
                                                            handleSearchDrive(); // Trigger initial load
                                                        }}
                                                        className="flex-1 p-2 border rounded hover:bg-slate-50 flex items-center justify-center gap-2 text-xs font-medium text-slate-700"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                                        Hledat na Drive
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : taskType === 'predefined_test' ? (
                                    <div className="bg-slate-50 p-8 rounded-xl border border-dashed border-slate-300 text-center">
                                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M9 14l2 2 4-4"></path></svg>
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800 mb-1">Předpřipravený obsah</h3>
                                        <p className="text-sm text-slate-500 max-w-sm mx-auto">
                                            Studentům se zobrazí otázky ze zvolené šablony. Obsah šablony můžete upravit v sekci <Link href="/ucitel/testy" className="text-indigo-600 font-semibold hover:underline">Testy a kvízy</Link>.
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        <TestBuilder
                                            questions={questions}
                                            onChange={setQuestions}
                                            taskType={taskType}
                                            outcomes={outcomes}
                                            onOutcomesChange={setOutcomes}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCreating(false);
                                        resetForm();
                                    }}
                                    className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    Zrušit
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all"
                                >
                                    {isEditing ? 'Uložit změny' : 'Vytvořit zadání'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {showSearch && (
                    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col h-[80vh] animate-fade-in-up overflow-hidden">
                            {/* Header */}
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">Google Drive</h3>
                                    <p className="text-sm text-slate-500">Vyberte jeden nebo více souborů</p>
                                </div>
                                <button onClick={() => setShowSearch(false)} className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>

                            {/* Controls & Breadcrumbs */}
                            <div className="px-6 py-4 space-y-4">
                                <form onSubmit={(e) => handleSearchDrive(e)} className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            autoFocus
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            placeholder="Hledat na celém disku..."
                                            className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all text-sm"
                                        />
                                        <svg className="absolute left-3 top-2.5 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                    </div>
                                    <button type="submit" className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 shadow-sm transition-colors">Hledat</button>
                                </form>

                                <div className="flex items-center gap-2 text-xs font-medium overflow-x-auto pb-2 scrollbar-hide">
                                    <button
                                        onClick={() => {
                                            setCurrentFolderId('root');
                                            setFolderStack([]);
                                            setSearchQuery('');
                                            handleSearchDrive(undefined, 'root');
                                        }}
                                        className={`hover:text-indigo-600 truncate ${currentFolderId === 'root' ? 'text-indigo-600' : 'text-slate-400'}`}
                                    >
                                        Kariérní deník
                                    </button>
                                    {folderStack.map((f, i) => (
                                        <React.Fragment key={f.id}>
                                            <span className="text-slate-300">/</span>
                                            <button
                                                onClick={() => {
                                                    const newStack = folderStack.slice(0, i);
                                                    setFolderStack(newStack);
                                                    setCurrentFolderId(f.id);
                                                    setSearchQuery('');
                                                    handleSearchDrive(undefined, f.id);
                                                }}
                                                className="text-slate-400 hover:text-indigo-600 truncate max-w-[100px]"
                                            >
                                                {f.name}
                                            </button>
                                        </React.Fragment>
                                    ))}
                                    {folderStack.length > 0 && <span className="text-slate-300">/</span>}
                                    {folderStack.length > 0 && <span className="text-indigo-600 font-bold truncate">Zde</span>}
                                </div>
                            </div>

                            {/* Results */}
                            <div className="flex-1 overflow-y-auto px-6 pb-4">
                                {driveLoading ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                                        <div className="w-8 h-8 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
                                        <p className="text-sm text-slate-500 animate-pulse">Načítání souborů...</p>
                                    </div>
                                ) : searchResults.length === 0 ? (
                                    <div className="text-center py-20 grayscale opacity-50">
                                        <p className="text-4xl mb-4">📭</p>
                                        <p className="text-slate-500 font-medium">Tato složka je prázdná</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-1">
                                        {searchResults.map(file => {
                                            const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                                            const isSelected = selectedForAdding.some(f => f.id === file.id);

                                            return (
                                                <div
                                                    key={file.id}
                                                    onClick={() => toggleFileSelection(file)}
                                                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${isSelected ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-slate-50 border-transparent'
                                                        }`}
                                                >
                                                    <div className="relative">
                                                        {isFolder ? (
                                                            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                                                            </div>
                                                        ) : file.mimeType?.includes('document') ? (
                                                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                                            </div>
                                                        ) : file.mimeType?.includes('spreadsheet') ? (
                                                            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>
                                                            </div>
                                                        ) : file.mimeType?.includes('presentation') ? (
                                                            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M9 3v18"></path><path d="m21 15-3-3 3-3"></path></svg>
                                                            </div>
                                                        ) : file.mimeType?.includes('pdf') ? (
                                                            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                                                            </div>
                                                        ) : (
                                                            <div className="p-2 bg-slate-100 text-slate-500 rounded-lg">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                                                            </div>
                                                        )}
                                                        {isSelected && (
                                                            <div className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white rounded-full p-0.5 border-2 border-white">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-slate-900 truncate">{file.name}</p>
                                                        <p className="text-xs text-slate-400">
                                                            {isFolder ? 'Složka' : file.mimeType?.split('.').pop()?.toUpperCase() || 'Soubor'}
                                                        </p>
                                                    </div>
                                                    {isFolder && (
                                                        <svg className="text-slate-300" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div className="text-sm text-slate-500 font-medium">
                                    {selectedForAdding.length > 0 ? (
                                        <span className="text-indigo-600">Vybráno {selectedForAdding.length} {selectedForAdding.length === 1 ? 'soubor' : selectedForAdding.length < 5 ? 'soubory' : 'souborů'}</span>
                                    ) : (
                                        'Nic nevybráno'
                                    )}
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => setShowSearch(false)} className="px-4 py-2 text-slate-600 font-semibold text-sm hover:bg-white rounded-xl transition-colors">Zrušit</button>
                                    <button
                                        disabled={selectedForAdding.length === 0}
                                        onClick={handleAddSelectedFiles}
                                        className="px-6 py-2 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-200 transition-all hover:-translate-y-0.5 active:translate-y-0"
                                    >
                                        Přidat vybrané
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    <div className="flex justify-between items-end mb-4">
                        <h2 className="text-xl font-bold text-slate-900">Seznam zadání</h2>

                        <div className="w-64">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Filtrovat podle třídy</label>
                            <select
                                value={filterClassId}
                                onChange={(e) => setFilterClassId(e.target.value)}
                                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                            >
                                <option value="">Všechny třídy</option>
                                {classes.map(c => (
                                    <option key={c.id} value={c.id}>{c.subject} ({c.section})</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {tasks.filter(t => !filterClassId || t.classId.toString() === filterClassId).length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                            <p className="text-slate-500">
                                {tasks.length === 0 ? "Zatím nebyly vytvořeny žádné úkoly." : "Pro vybranou třídu nebyly nalezeny žádné úkoly."}
                            </p>
                        </div>
                    ) : tasks.filter(t => !filterClassId || t.classId.toString() === filterClassId).map(task => (
                        <div key={task.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex justify-between items-center group">
                            <div className="flex-1 min-w-0 pr-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${(task.type === 'test' || task.type === 'predefined_test') ? 'bg-amber-100 text-amber-700' :
                                        task.type === 'outcome' ? 'bg-purple-100 text-purple-700' :
                                            'bg-blue-100 text-blue-700'
                                        }`}>
                                        {task.type === 'test' || (task.type === 'predefined_test' && !templates.find(tpl => tpl.id === task.testId)?.typ.includes('outcome')) ? 'TEST' :
                                            task.type === 'outcome' || (task.type === 'predefined_test' && templates.find(tpl => tpl.id === task.testId)?.typ === 'outcome') ? 'KVÍZ' : 'ÚKOL'}
                                    </span>
                                    <h3 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{task.title}</h3>
                                    <span className="text-xs text-slate-400 font-normal px-2 py-0.5 bg-slate-50 rounded border border-slate-100">
                                        {classes.find(c => c.id === task.classId)?.subject} ({classes.find(c => c.id === task.classId)?.section})
                                    </span>
                                </div>
                                <p className="text-slate-500 text-sm mb-2 line-clamp-1">{task.description}</p>
                                <div className="flex items-center gap-4 text-xs text-slate-400">
                                    <span className="flex items-center gap-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Bez termínu'}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleEditTask(task.id)}
                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                                    title="Upravit úkol"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                </button>
                                <button
                                    onClick={() => handleDeleteTask(task.id)}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                    title="Smazat úkol"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </TeacherLayout>
    );
}