"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";

interface PortfolioFile {
    id: number;
    nazev: string;
    popis: string | null;
    google_file_id: string;
    google_file_url: string;
    mime_type: string;
    velikost: number;
    created_at: string;
    updated_at: string;
}

const getFileIcon = (mimeType: string) => {
    if (mimeType?.includes("pdf")) {
        return (
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
            </div>
        );
    }
    if (mimeType?.includes("image")) {
        return (
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
            </div>
        );
    }
    if (mimeType?.includes("word") || mimeType?.includes("document")) {
        return (
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
            </div>
        );
    }
    if (mimeType?.includes("presentation") || mimeType?.includes("powerpoint")) {
        return (
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-600">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="8" y1="21" x2="16" y2="21"></line>
                    <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
            </div>
        );
    }
    if (mimeType?.includes("spreadsheet") || mimeType?.includes("excel")) {
        return (
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <rect x="8" y="12" width="8" height="6" rx="1"></rect>
                </svg>
            </div>
        );
    }
    if (mimeType?.includes("video")) {
        return (
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600">
                    <polygon points="23 7 16 12 23 17 23 7"></polygon>
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                </svg>
            </div>
        );
    }
    return (
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
        </div>
    );
};

const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

export default function PortfolioPage() {
    const { user, loading } = useAuth();
    const [files, setFiles] = useState<PortfolioFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState("");
    const [editingFile, setEditingFile] = useState<number | null>(null);
    const [editName, setEditName] = useState("");
    const [editDesc, setEditDesc] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dragCounter = useRef(0);

    const fetchFiles = useCallback(async () => {
        try {
            const res = await fetch("/api/student/portfolio");
            if (res.ok) {
                const data = await res.json();
                setFiles(data);
            }
        } catch (err) {
            console.error("Failed to fetch portfolio", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) fetchFiles();
    }, [user, fetchFiles]);

    const handleUpload = async (fileList: FileList) => {
        if (fileList.length === 0) return;

        setIsUploading(true);
        setError("");

        for (let i = 0; i < fileList.length; i++) {
            const file = fileList[i];
            setUploadProgress(`Nahrávám ${file.name}... (${i + 1}/${fileList.length})`);

            const formData = new FormData();
            formData.append("file", file);

            try {
                const res = await fetch("/api/student/portfolio/upload", {
                    method: "POST",
                    body: formData,
                });

                if (!res.ok) {
                    const data = await res.json();
                    setError(data.message || data.error || "Chyba při nahrávání souboru.");
                    break;
                }
            } catch (err) {
                setError("Chyba sítě při nahrávání souboru.");
                break;
            }
        }

        setIsUploading(false);
        setUploadProgress("");
        fetchFiles();
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) handleUpload(e.target.files);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current += 1;
        if (dragCounter.current === 1) setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current -= 1;
        if (dragCounter.current === 0) setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        dragCounter.current = 0;
        if (e.dataTransfer.files) handleUpload(e.dataTransfer.files);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Opravdu chcete smazat tento soubor z portfolia?")) return;
        try {
            const res = await fetch(`/api/student/portfolio/${id}`, { method: "DELETE" });
            if (res.ok) {
                setFiles(files.filter((f) => f.id !== id));
            }
        } catch (err) {
            console.error("Failed to delete", err);
        }
    };

    const handleEdit = (file: PortfolioFile) => {
        setEditingFile(file.id);
        setEditName(file.nazev);
        setEditDesc(file.popis || "");
    };

    const handleSaveEdit = async () => {
        if (editingFile === null) return;
        try {
            const res = await fetch(`/api/student/portfolio/${editingFile}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nazev: editName, popis: editDesc }),
            });
            if (res.ok) {
                setFiles(
                    files.map((f) =>
                        f.id === editingFile ? { ...f, nazev: editName, popis: editDesc } : f
                    )
                );
                setEditingFile(null);
            }
        } catch (err) {
            console.error("Failed to update", err);
        }
    };

    if (loading || isLoading) {
        return <div className="flex items-center justify-center min-h-[60vh]">Načítání...</div>;
    }
    if (!user) return null;

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600">
                                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                                </svg>
                            </div>
                            Moje Portfolio
                        </h1>
                        <p className="text-slate-500 mt-2">
                            Nahrajte své práce, certifikáty, projekty a další soubory do portfolia.
                        </p>
                    </div>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 hover:shadow-xl font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        Nahrát soubor
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                        accept="*/*"
                    />
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="15" y1="9" x2="9" y2="15"></line>
                        <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                    {error}
                    <button onClick={() => setError("")} className="ml-auto text-red-500 hover:text-red-700">✕</button>
                </div>
            )}

            {/* Upload Progress */}
            {isUploading && (
                <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-700 text-sm flex items-center gap-3">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {uploadProgress}
                </div>
            )}

            {/* Drop Zone / File List */}
            <div
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`transition-all duration-300 ${isDragging ? "ring-2 ring-indigo-400 ring-offset-4 rounded-2xl" : ""}`}
            >
                {files.length === 0 ? (
                    <div
                        className={`flex flex-col items-center justify-center text-center py-20 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${isDragging
                            ? "border-indigo-400 bg-indigo-50"
                            : "border-slate-300 bg-white hover:border-indigo-300 hover:bg-slate-50"
                            }`}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">
                            {isDragging ? "Pusťte soubory sem" : "Zatím nemáte žádné soubory"}
                        </h3>
                        <p className="text-slate-500 max-w-md">
                            Přetáhněte sem soubory (PDF, obrázky, dokumenty...) nebo klikněte pro výběr.
                        </p>
                        <p className="text-xs text-slate-400 mt-4">
                            Soubory budou uloženy na váš Google Disk v složce &quot;karierni-denik-portfolio&quot;
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Drop hint when dragging */}
                        {isDragging && (
                            <div className="p-6 rounded-2xl border-2 border-dashed border-indigo-400 bg-indigo-50 text-center">
                                <p className="text-indigo-600 font-medium">Pusťte soubory sem pro nahrání</p>
                            </div>
                        )}

                        {files.map((file) => (
                            <div
                                key={file.id}
                                className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-indigo-200 hover:shadow-md transition-all group"
                            >
                                {editingFile === file.id ? (
                                    /* Edit Mode */
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-medium text-slate-500 mb-1 block">Název</label>
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-slate-500 mb-1 block">Popis (volitelné)</label>
                                            <textarea
                                                value={editDesc}
                                                onChange={(e) => setEditDesc(e.target.value)}
                                                placeholder="Přidejte popis k souboru..."
                                                rows={2}
                                                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm resize-none"
                                            />
                                        </div>
                                        <div className="flex gap-2 justify-end">
                                            <button
                                                onClick={() => setEditingFile(null)}
                                                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                            >
                                                Zrušit
                                            </button>
                                            <button
                                                onClick={handleSaveEdit}
                                                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                                            >
                                                Uložit
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* View Mode */
                                    <div className="flex items-center gap-4">
                                        {getFileIcon(file.mime_type)}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-slate-900 truncate">{file.nazev}</h3>
                                            {file.popis && (
                                                <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{file.popis}</p>
                                            )}
                                            <div className="flex items-center gap-3 mt-1.5">
                                                <span className="text-xs text-slate-400">
                                                    {formatFileSize(file.velikost)}
                                                </span>
                                                <span className="text-xs text-slate-300">•</span>
                                                <span className="text-xs text-slate-400">
                                                    {new Date(file.created_at).toLocaleDateString("cs-CZ")}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <a
                                                href={file.google_file_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                title="Otevřít"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                                    <polyline points="15 3 21 3 21 9"></polyline>
                                                    <line x1="10" y1="14" x2="21" y2="3"></line>
                                                </svg>
                                            </a>
                                            <button
                                                onClick={() => handleEdit(file)}
                                                className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                title="Upravit"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(file.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Smazat"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="3 6 5 6 21 6"></polyline>
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Upload More */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2 text-sm font-medium"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Nahrát další soubor
                        </button>
                    </div>
                )}
            </div>

            {/* Stats */}
            {files.length > 0 && (
                <div className="mt-8 flex items-center justify-between text-sm text-slate-400">
                    <span>{files.length} {files.length === 1 ? "soubor" : files.length < 5 ? "soubory" : "souborů"} v portfoliu</span>
                    <span>Celkem: {formatFileSize(files.reduce((acc, f) => acc + f.velikost, 0))}</span>
                </div>
            )}
        </div>
    );
}
