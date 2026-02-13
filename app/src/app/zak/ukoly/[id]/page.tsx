"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { useAuth } from '@/hooks/useAuth';

// --- Interfaces ---

interface Attachment {
    name: string;
    url: string;
    type: 'link' | 'file' | 'google_drive';
}

interface Option {
    id: number;
    text: string;
    isCorrect?: boolean;
    outcomePoints?: Record<string, number>;
}

interface Question {
    id: number;
    text: string;
    typ: string;
    points: number;
    options: Option[];
}

interface TaskDetail {
    id: number;
    title: string;
    description: string;
    dueDate: string;
    type: 'classic' | 'test' | 'outcome' | 'predefined_test';
    attachments?: Attachment[];
    questions?: (Question & { studentAnswerIds?: number[] })[];
    outcomes?: { id?: number; nazev: string }[];
    submission?: {
        status: string;
        submittedAt: string;
        hodnoceni?: string;
    };
    submittedAttachments?: Attachment[];
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

export default function StudentUkolDetailPage() {
    const { user } = useAuth();
    const params = useParams();
    const router = useRouter();
    const id = params?.id;

    const [task, setTask] = useState<TaskDetail | null>(null);
    const [loading, setLoading] = useState(true);

    // Classic Submission
    const [linkName, setLinkName] = useState('');
    const [linkUrl, setLinkUrl] = useState('');
    const [submittedLinks, setSubmittedLinks] = useState<Attachment[]>([]);

    // Test/Outcome Submission
    const [answers, setAnswers] = useState<Record<number, number[]>>({}); // questionId -> optionIds[]

    // Drive Search State
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    // Fix: Typování stavu searchResults
    const [searchResults, setSearchResults] = useState<DriveFile[]>([]);
    const [currentFolderId, setCurrentFolderId] = useState<string>('root');
    const [folderStack, setFolderStack] = useState<FolderNavItem[]>([]);
    const [selectedForAdding, setSelectedForAdding] = useState<DriveFile[]>([]);
    const [driveLoading, setDriveLoading] = useState(false);

    const [isSubmitted, setIsSubmitted] = useState(false);
    const [submissionDate, setSubmissionDate] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'idle'>('idle');

    useEffect(() => {
        if (user && id) {
            fetchTaskDetail();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, id]);

    // Autosave Draft
    useEffect(() => {
        if (!task || isSubmitted) return;

        // Skip initial load empty state or if just idle
        if (submittedLinks.length === 0 && Object.keys(answers).length === 0 && saveStatus === 'idle') return;

        const timer = setTimeout(async () => {
            setSaveStatus('saving');
            try {
                const payload = {
                    submittedLinks: task.type === 'classic' ? submittedLinks : undefined,
                    answers: (task.type === 'test' || task.type === 'outcome' || task.type === 'predefined_test') ? answers : undefined,
                    status: 'draft'
                };

                const res = await fetch(`/api/student/tasks/${id}/submit`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    setSaveStatus('saved');
                } else {
                    setSaveStatus('error');
                }
            } catch (err) {
                console.error(err);
                setSaveStatus('error');
            }
        }, 1500); // 1.5s debounce

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [submittedLinks, answers, isSubmitted, task, id]);
    // Poznámka: saveStatus není v dependecies úmyslně, aby se nezacyklil

    const fetchTaskDetail = async () => {
        try {
            const res = await fetch(`/api/student/tasks/${id}`);
            if (res.ok) {
                const data = await res.json();
                setTask(data);

                // Handle Submission or Draft
                if (data.submission) {
                    if (data.submission.status === 'submitted') {
                        setIsSubmitted(true);
                        setSubmissionDate(data.submission.submittedAt);
                    }
                    // Load data regardless of status (Draft or Submitted)
                    if (data.submittedAttachments) {
                        setSubmittedLinks(data.submittedAttachments);
                    }
                    if (data.questions) {
                        const savedAnswers: Record<number, number[]> = {};
                        data.questions.forEach((q: any) => {
                            if (q.studentAnswerIds && q.studentAnswerIds.length > 0) {
                                savedAnswers[q.id] = q.studentAnswerIds;
                            }
                        });
                        setAnswers(savedAnswers);
                    }
                }
            } else {
                alert('Úkol nenalezen nebo přístup odepřen');
                router.push('/zak/ukoly');
            }
        } catch (error) {
            console.error('Failed to fetch task', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddLink = () => {
        if (linkName && linkUrl) {
            setSubmittedLinks([...submittedLinks, { name: linkName, url: linkUrl, type: 'link' }]);
            setLinkName('');
            setLinkUrl('');
        }
    };

    const handleRemoveLink = (index: number) => {
        if (isSubmitted) return; // Prevent removing if submitted
        setSubmittedLinks(submittedLinks.filter((_, i) => i !== index));
    };

    const handleOptionSelect = (questionId: number, optionId: number, isMultiple: boolean = false) => {
        if (isSubmitted) return;
        setAnswers(prev => {
            const current = prev[questionId] || [];
            if (isMultiple) {
                if (current.includes(optionId)) {
                    return { ...prev, [questionId]: current.filter(id => id !== optionId) };
                } else {
                    return { ...prev, [questionId]: [...current, optionId] };
                }
            } else {
                return { ...prev, [questionId]: [optionId] };
            }
        });
    };

    const handleCreateDriveDoc = async (mimeType: string = 'application/vnd.google-apps.document') => {
        if (isSubmitted) return;
        let defaultName = "Moje práce - " + (task?.title || "");
        if (mimeType.includes('spreadsheet')) defaultName = "Tabulka - " + (task?.title || "");
        if (mimeType.includes('presentation')) defaultName = "Prezentace - " + (task?.title || "");

        const name = prompt("Zadejte název dokumentu:", defaultName);
        if (!name) return;

        try {
            const res = await fetch('/api/drive/create-doc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, mimeType })
            });
            if (res.ok) {
                const file = await res.json();
                setSubmittedLinks(prev => [...prev, { name: file.name, url: file.webViewLink, type: 'google_drive' }]);
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
        if (isSubmitted) return;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '*/*'; // Accept all

        // Fix: Použití Event a přetypování
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
                    setSubmittedLinks(prev => [...prev, { name: data.name, url: data.webViewLink, type: 'google_drive' }]);
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

    const toggleFileSelection = (file: DriveFile) => {
        if (isSubmitted) return;
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
        if (isSubmitted) return;
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

        const newLinks = selectedForAdding.map(file => ({
            name: file.name,
            url: file.webViewLink,
            type: 'google_drive' as const
        }));

        setSubmittedLinks(prev => [...prev, ...newLinks]);
        setShowSearch(false);
        setSelectedForAdding([]);
        setSearchQuery('');
        setSearchResults([]);
        setCurrentFolderId('root');
        setFolderStack([]);
    };

    const handleSubmit = async () => {
        if (!task) return;

        if (confirm("Opravdu chcete odevzdat?")) {
            const payload = {
                submittedLinks: task.type === 'classic' ? submittedLinks : undefined,
                answers: (task.type === 'test' || task.type === 'outcome' || task.type === 'predefined_test') ? answers : undefined,
                status: 'submitted'
            };

            try {
                const res = await fetch(`/api/student/tasks/${id}/submit`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    alert('Úspěšně odevzdáno!');
                    fetchTaskDetail(); // Refresh to update state
                } else {
                    alert('Chyba při odevzdávání.');
                }
            } catch (error) {
                console.error('Error submitting', error);
                alert('Chyba serveru');
            }
        }
    };

    const handleUnsubmit = async () => {
        if (!confirm("Opravdu chcete zrušit odevzdání? Tím se odstraní vaše odevzdání ze systému a budete moci odevzdat znovu.")) return;

        try {
            const res = await fetch(`/api/student/tasks/${id}/submit`, {
                method: 'DELETE'
            });
            if (res.ok) {
                alert("Odevzdání zrušeno. Nyní můžete úkol upravit a znovu odevzdat.");
                setIsSubmitted(false);
                setSubmissionDate(null);
                // We keep submittedLinks/answers in state so user can edit them
            } else {
                alert("Chyba při rušení odevzdání.");
            }
        } catch (err) {
            console.error(err);
            alert("Chyba serveru.");
        }
    }

    if (loading) return <div className="min-h-screen bg-slate-50 flex justify-center items-center">Načítání...</div>;
    if (!task) return null;

    const isLate = isSubmitted && task.dueDate && new Date(submissionDate!) > new Date(task.dueDate);

    return (
        <div className="max-w-4xl mx-auto">
            <Link href="/zak/ukoly" className="text-sm text-slate-500 hover:text-indigo-600 mb-4 inline-block">
                &larr; Zpět na seznam
            </Link>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 mb-2">{task.title}</h1>
                            <p className="text-slate-600">{task.description}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            {isSubmitted && (
                                <div className="flex flex-col items-end gap-1">
                                    <div className={`px-3 py-1 rounded-full text-sm font-bold border ${isLate ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                                        {isLate ? 'Pozdní odevzdání' : 'Odevzdáno'}
                                    </div>
                                    {task.submission?.hodnoceni && (
                                        <div className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                            Výsledek: {task.submission.hodnoceni}
                                        </div>
                                    )}
                                </div>
                            )}
                            {!isSubmitted && saveStatus !== 'idle' && (
                                <span className={`text-xs font-medium ${saveStatus === 'saved' ? 'text-green-600' : saveStatus === 'error' ? 'text-red-600' : 'text-slate-400'}`}>
                                    {saveStatus === 'saved' ? 'Uloženo' : saveStatus === 'saving' ? 'Ukládání...' : 'Chyba ukládání'}
                                </span>
                            )}
                        </div>
                    </div>

                    {task.dueDate && (
                        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-sm font-medium border border-amber-100">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            Termín: {new Date(task.dueDate).toLocaleDateString()}
                        </div>
                    )}
                </div>

                <div className="p-6">
                    {/* CLASSIC TASK UI */}
                    {task.type === 'classic' && (
                        <div className="space-y-8">
                            {/* Attachments from Teacher */}
                            {task.attachments && task.attachments.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 mb-3">Podklady k úkolu</h3>
                                    <ul className="space-y-2">
                                        {task.attachments.map((att: Attachment, i: number) => (
                                            <li key={i}>
                                                <a href={att.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-indigo-300 transition-all group">
                                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100">
                                                        {att.type === 'google_drive' ? (
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                                                        ) : (
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                                        )}
                                                    </div>
                                                    <span className="font-medium text-slate-700 group-hover:text-indigo-900">{att.name}</span>
                                                    <span className="text-xs text-slate-400 ml-auto">Otevřít</span>
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Student Submission Form */}
                            <div className={`rounded-xl p-6 border ${isSubmitted ? 'bg-green-50/30 border-green-100' : 'bg-indigo-50/50 border-indigo-100'}`}>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold text-slate-900">Vaše odevzdání</h3>
                                    {isSubmitted && (
                                        <span className="text-sm text-green-700 font-medium">Odesláno: {new Date(submissionDate!).toLocaleString()}</span>
                                    )}
                                </div>

                                {!isSubmitted && (
                                    <p className="text-sm text-slate-600 mb-4">Vložte odkazy na svou práci (Google Drive, dokumenty...) nebo vytvořené soubory.</p>
                                )}

                                {!isSubmitted && (
                                    <div className="flex flex-col gap-4 mb-4">
                                        <div className="flex gap-2 items-end">
                                            <div className="flex-1">
                                                <label className="block text-xs text-slate-500 mb-1">Název odkazu</label>
                                                <input
                                                    type="text"
                                                    value={linkName}
                                                    onChange={e => setLinkName(e.target.value)}
                                                    className="w-full px-3 py-2 border rounded-md text-sm"
                                                    placeholder="Název souboru / odkazu"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-xs text-slate-500 mb-1">URL adresa</label>
                                                <input
                                                    type="url"
                                                    value={linkUrl}
                                                    onChange={e => setLinkUrl(e.target.value)}
                                                    className="w-full px-3 py-2 border rounded-md text-sm"
                                                    placeholder="https://..."
                                                />
                                            </div>
                                            <button
                                                onClick={handleAddLink}
                                                className="px-4 py-2 bg-white border border-indigo-200 text-indigo-600 font-medium rounded-md hover:bg-indigo-50"
                                            >
                                                Přidat
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-2 my-2">
                                            <div className="h-px bg-indigo-200 flex-1 opacity-50"></div>
                                            <span className="text-xs text-indigo-400">NEBO</span>
                                            <div className="h-px bg-indigo-200 flex-1 opacity-50"></div>
                                        </div>

                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => handleCreateDriveDoc('application/vnd.google-apps.document')}
                                                className="p-3 bg-white border rounded-lg hover:bg-blue-50 hover:border-blue-200 transition-colors flex flex-col items-center gap-2 text-center"
                                            >
                                                <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                                </div>
                                                <span className="text-xs font-medium text-slate-700">Dokument</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleCreateDriveDoc('application/vnd.google-apps.spreadsheet')}
                                                className="p-3 bg-white border rounded-lg hover:bg-green-50 hover:border-green-200 transition-colors flex flex-col items-center gap-2 text-center"
                                            >
                                                <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center text-white">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>
                                                </div>
                                                <span className="text-xs font-medium text-slate-700">Tabulka</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleCreateDriveDoc('application/vnd.google-apps.presentation')}
                                                className="p-3 bg-white border rounded-lg hover:bg-amber-50 hover:border-amber-200 transition-colors flex flex-col items-center gap-2 text-center"
                                            >
                                                <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center text-white">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><path d="M9 3v18"></path><path d="m21 15-3-3 3-3"></path></svg>
                                                </div>
                                                <span className="text-xs font-medium text-slate-700">Prezentace</span>
                                            </button>

                                            <div className="flex flex-col gap-2">
                                                <button
                                                    type="button"
                                                    onClick={handleUploadFile}
                                                    className="flex-1 p-2 bg-white border rounded hover:bg-slate-50 flex items-center justify-center gap-2 text-xs font-medium text-slate-700"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                                    Nahrát soubor
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowSearch(true);
                                                        handleSearchDrive();
                                                    }}
                                                    className="flex-1 p-2 bg-white border rounded hover:bg-slate-50 flex items-center justify-center gap-2 text-xs font-medium text-slate-700"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                                    Hledat na Drive
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Drive Search Modal */}
                                {showSearch && (
                                    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                                        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col h-[80vh] animate-fade-in-up overflow-hidden">
                                            {/* Header */}
                                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                                <div>
                                                    <h3 className="text-xl font-bold text-slate-900">Google Drive</h3>
                                                    <p className="text-sm text-slate-500">Vyberte soubory pro odevzdání</p>
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
                                                        <p className="text-sm text-slate-500 animate-pulse">Načítání...</p>
                                                    </div>
                                                ) : searchResults.length === 0 ? (
                                                    <div className="text-center py-20 grayscale opacity-50">
                                                        <p className="text-4xl mb-4">📭</p>
                                                        <p className="text-slate-500 font-medium">Nic jsme nenašli</p>
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
                                                                        <p className="text-xs text-slate-400 truncate">{file.mimeType?.split('.').pop()}</p>
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
                                                    {selectedForAdding.length > 0 ? `Vybráno ${selectedForAdding.length}` : 'Nic nevybráno'}
                                                </div>
                                                <div className="flex gap-3">
                                                    <button onClick={() => setShowSearch(false)} className="px-4 py-2 text-slate-600 font-semibold text-sm hover:bg-white rounded-xl transition-colors">Zrušit</button>
                                                    <button
                                                        disabled={selectedForAdding.length === 0}
                                                        onClick={handleAddSelectedFiles}
                                                        className="px-6 py-2 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-200 transition-all"
                                                    >
                                                        Přidat vybrané
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {submittedLinks.length > 0 && (
                                    <ul className="space-y-2 mb-6">
                                        {submittedLinks.map((link, idx) => (
                                            <li key={idx} className="flex items-center justify-between bg-white p-2 px-3 rounded border border-indigo-100">
                                                <div className="flex items-center gap-2">
                                                    {/* Icon based on type */}
                                                    {link.type === 'google_drive' ? (
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                                    )}
                                                    <a href={link.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline text-sm font-medium">{link.name}</a>
                                                </div>
                                                {!isSubmitted && (
                                                    <button onClick={() => handleRemoveLink(idx)} className="text-red-400 hover:text-red-600">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                    </button>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {!isSubmitted ? (
                                    <button
                                        onClick={handleSubmit}
                                        disabled={task.type === 'classic' && submittedLinks.length === 0}
                                        className="w-full py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
                                    >
                                        Odevzdat domácí úkol
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleUnsubmit}
                                        className="w-full py-2.5 bg-white border border-red-300 text-red-600 font-semibold rounded-lg hover:bg-red-50 shadow-sm transition-all"
                                    >
                                        Zrušit odevzdání (upravit)
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TEST & OUTCOME UI RESULTS SUMMARY */}
                    {(task.type === 'test' || task.type === 'outcome' || task.type === 'predefined_test') && isSubmitted && task.questions && (
                        <div className="mb-8 p-6 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500"></div>
                            <div className="flex flex-col gap-6">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900">Vyhodnocení odevzdání</h3>
                                        <p className="text-sm text-slate-500">Přehled vašich výsledků a bodů</p>
                                    </div>
                                    <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-indigo-500 uppercase font-bold tracking-wider">Status</p>
                                            <p className="text-sm font-bold text-indigo-700">Dokončeno</p>
                                        </div>
                                    </div>
                                </div>

                                {(() => {
                                    const isOutcome = task.type === 'outcome' || !!task.outcomes?.length;

                                    if (isOutcome) {
                                        // Calculate scores for each outcome
                                        const scores: Record<string, number> = {};
                                        task.outcomes?.forEach(o => scores[o.nazev] = 0);

                                        task.questions?.forEach(q => {
                                            const selectedIds = answers[q.id] || [];
                                            q.options.forEach(opt => {
                                                if (selectedIds.includes(opt.id) && opt.outcomePoints) {
                                                    Object.entries(opt.outcomePoints).forEach(([name, pts]) => {
                                                        scores[name] = (scores[name] || 0) + (pts || 0);
                                                    });
                                                }
                                            });
                                        });

                                        const maxScore = Math.max(...Object.values(scores), 1);
                                        const sortedOutcomes = Object.entries(scores).sort((a, b) => b[1] - a[1]);

                                        return (
                                            <div className="space-y-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                                    <div className="space-y-4">
                                                        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                                            Bodový graf výsledků
                                                        </h4>
                                                        <div className="space-y-3">
                                                            {sortedOutcomes.map(([name, score], idx) => (
                                                                <div key={name} className="space-y-1">
                                                                    <div className="flex justify-between text-xs">
                                                                        <span className={`font-bold ${idx === 0 ? 'text-indigo-600' : 'text-slate-600'}`}>{name}</span>
                                                                        <span className="text-slate-400 font-medium">{score.toFixed(1)} b.</span>
                                                                    </div>
                                                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                                        <div
                                                                            className={`h-full rounded-full transition-all duration-1000 ${idx === 0 ? 'bg-indigo-500' : 'bg-slate-300'}`}
                                                                            style={{ width: `${(score / maxScore) * 100}%` }}
                                                                        ></div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col items-center text-center">
                                                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                                                            <span className="text-3xl">🏆</span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Nejvíce bodů</p>
                                                        <h3 className="text-2xl font-black text-indigo-900">{sortedOutcomes[0]?.[0] || 'Žádný výsledek'}</h3>
                                                        <div className="mt-4 px-4 py-1.5 bg-indigo-100 text-indigo-700 text-sm font-bold rounded-full">
                                                            {sortedOutcomes[0]?.[1].toFixed(1)} bodů celkem
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    } else {
                                        // Standard Test Scaling
                                        let totalScore = 0;
                                        let maxPossible = 0;
                                        task.questions?.forEach(q => {
                                            maxPossible += q.points;
                                            const correctIds = q.options.filter(o => o.isCorrect).map(o => o.id);
                                            const incorrectIds = q.options.filter(o => !o.isCorrect).map(o => o.id);
                                            const selected = q.studentAnswerIds || [];
                                            const c = selected.filter(id => correctIds.includes(id)).length;
                                            const w = selected.filter(id => incorrectIds.includes(id)).length;
                                            const qScore = Math.max(0, (c - w) / (correctIds.length || 1));
                                            totalScore += qScore * q.points;
                                        });

                                        const percentage = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0;

                                        return (
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Celkové body</p>
                                                    <p className="text-2xl font-black text-slate-900">{totalScore.toFixed(1)} <span className="text-xs text-slate-400">/ {maxPossible}</span></p>
                                                </div>
                                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Úspěšnost</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-2xl font-black text-indigo-600">{percentage}%</span>
                                                        <div className="flex-1 max-w-[50px] h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                            <div className="h-full bg-indigo-500" style={{ width: `${percentage}%` }}></div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Otázky</p>
                                                    <p className="text-2xl font-black text-slate-900">{task.questions?.length || 0}</p>
                                                </div>
                                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">Známka</p>
                                                    <p className="text-2xl font-black text-indigo-600">{task.submission?.hodnoceni?.split('(')[0] || '-'}</p>
                                                </div>
                                            </div>
                                        );
                                    }
                                })()}
                            </div>
                        </div>
                    )}

                    {/* TEST & OUTCOME UI */}
                    {(task.type === 'test' || task.type === 'outcome' || task.type === 'predefined_test') && task.questions && (
                        <div className="space-y-8">
                            <div className="space-y-6">
                                {task.questions.map((q, qIdx) => {
                                    const isOutcome = task.type === 'outcome' || !!task.outcomes?.length;
                                    const correctIds = q.options.filter(o => o.isCorrect).map(o => o.id);
                                    const incorrectIds = q.options.filter(o => !o.isCorrect).map(o => o.id);
                                    const selected = q.studentAnswerIds || [];
                                    const c = selected.filter(id => correctIds.includes(id)).length;
                                    const w = selected.filter(id => incorrectIds.includes(id)).length;

                                    let qScore = 0;
                                    if (isSubmitted) {
                                        if (isOutcome) {
                                            // Score breakdown will be shown per option, let's just keep q.points as reference
                                            qScore = q.points;
                                        } else {
                                            qScore = Math.max(0, (c - w) / (correctIds.length || 1)) * q.points;
                                        }
                                    }

                                    return (
                                        <div key={q.id} className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden relative">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600">
                                                        {qIdx + 1}
                                                    </div>
                                                    <h4 className="font-bold text-lg text-slate-800">{q.text}</h4>
                                                </div>
                                                {isSubmitted && !isOutcome && (
                                                    <div className="flex flex-col items-end">
                                                        <span className={`text-sm font-black px-3 py-1 rounded-full border ${qScore === q.points ? 'bg-green-50 text-green-700 border-green-200' : qScore > 0 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                            {qScore.toFixed(1)} / {q.points.toFixed(1)} b.
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-3">
                                                {q.options.map(opt => {
                                                    const isSelected = (answers[q.id] || []).includes(opt.id);
                                                    const showsOutcomePoints = isSubmitted && isOutcome && opt.outcomePoints;

                                                    return (
                                                        <div key={opt.id} className="relative group">
                                                            <label className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${isSubmitted ? 'cursor-default' : 'cursor-pointer hover:bg-slate-50'
                                                                } ${isSelected
                                                                    ? (isOutcome ? 'bg-indigo-50 border-indigo-200' : (opt.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'))
                                                                    : 'bg-white border-slate-100 shadow-sm'
                                                                }`}>
                                                                <input
                                                                    type={(task.type === 'test' || (task.type === 'predefined_test' && !task.outcomes?.length)) ? "checkbox" : "radio"}
                                                                    name={`q_${q.id}`}
                                                                    value={opt.id}
                                                                    checked={isSelected}
                                                                    onChange={() => handleOptionSelect(q.id, opt.id, (task.type === 'test' || (task.type === 'predefined_test' && !task.outcomes?.length)))}
                                                                    disabled={isSubmitted}
                                                                    className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                                                                />
                                                                <div className="flex-1">
                                                                    <div className="flex justify-between items-center">
                                                                        <span className={`text-sm font-medium ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>{opt.text}</span>
                                                                        {isSubmitted && !isOutcome && opt.isCorrect && (
                                                                            <span className="text-[10px] font-black text-green-600 bg-white px-2 py-0.5 rounded border border-green-100 uppercase">Správně</span>
                                                                        )}
                                                                    </div>
                                                                    {showsOutcomePoints && isSelected && (
                                                                        <div className="mt-2 flex flex-wrap gap-2">
                                                                            {Object.entries(opt.outcomePoints!).map(([name, pts]) => (
                                                                                pts > 0 && (
                                                                                    <span key={name} className="text-[10px] font-bold text-indigo-600 bg-white px-2 py-0.5 rounded border border-indigo-100">
                                                                                        +{pts} b. ({name})
                                                                                    </span>
                                                                                )
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {isSubmitted && !isOutcome && isSelected && !opt.isCorrect && (
                                                                    <div className="p-1 bg-white rounded-full text-red-500 shadow-sm border border-red-100">
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                                    </div>
                                                                )}
                                                                {isSubmitted && !isOutcome && opt.isCorrect && (
                                                                    <div className="p-1 bg-white rounded-full text-green-500 shadow-sm border border-green-100">
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                                    </div>
                                                                )}
                                                            </label>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="pt-4 border-t text-center">
                                {!isSubmitted ? (
                                    <button
                                        onClick={handleSubmit}
                                        className="w-full sm:w-auto px-8 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
                                    >
                                        {(task.type === 'test' || (task.type === 'predefined_test' && !task.outcomes?.length)) ? 'Odeslat test' : 'Zjistit výsledek'}
                                    </button>
                                ) : (
                                    <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center shadow-inner">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                </div>
                                                <div className="text-left">
                                                    <h3 className="text-xl font-black text-slate-900 leading-tight">
                                                        {(task.type === 'test' || (task.type === 'predefined_test' && !task.outcomes?.length)) ? 'Test odevzdán!' : 'Kvíz dokončen!'}
                                                    </h3>
                                                    <p className="text-slate-500 text-sm font-medium italic mt-1">Vaše odpovědi byly bezpečně uloženy.</p>
                                                </div>
                                            </div>
                                            {task.submission?.hodnoceni && (
                                                <div className="bg-indigo-50 px-8 py-4 rounded-3xl border-2 border-indigo-100 text-center relative overflow-hidden group">
                                                    <div className="absolute top-0 right-0 p-1">
                                                        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
                                                    </div>
                                                    <p className="text-[10px] text-indigo-500 uppercase tracking-[0.2em] font-black mb-1">Získané body</p>
                                                    <div className="text-4xl font-black text-indigo-700 tabular-nums">
                                                        {task.submission.hodnoceni}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                                            <p className="text-sm text-slate-500 font-medium">
                                                Tento test je po odevzdání finální a nelze jej upravit.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}