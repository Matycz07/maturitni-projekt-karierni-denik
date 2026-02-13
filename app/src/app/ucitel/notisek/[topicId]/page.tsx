"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import TeacherLayout from "../../../../components/TeacherLayout";

interface NotisekTopic {
    id: number;
    title: string;
    created_at: string;
    updated_at: string;
}

interface NotisekCard {
    id: number;
    title: string | null;
    content: string | null;
    link_url: string | null;
    link_text: string | null;
    image_url: string | null;
    ord: number;
    created_at: string;
    updated_at: string;
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

type ImageInputMode = 'url' | 'file' | 'drive';

export default function NotisekTopicDetailPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const topicId = params?.topicId as string;

    const [topic, setTopic] = useState<NotisekTopic | null>(null);
    const [cards, setCards] = useState<NotisekCard[]>([]);
    const [isAddingCard, setIsAddingCard] = useState(false);

    // Form states
    const [newCardTitle, setNewCardTitle] = useState('');
    const [newCardContent, setNewCardContent] = useState('');
    const [newCardLinkUrl, setNewCardLinkUrl] = useState('');
    const [newCardLinkText, setNewCardLinkText] = useState('');
    const [newCardImageUrl, setNewCardImageUrl] = useState('');

    const [editingCardId, setEditingCardId] = useState<number | null>(null);
    const [editCardTitle, setEditCardTitle] = useState('');
    const [editCardContent, setEditCardContent] = useState('');
    const [editCardLinkUrl, setEditCardLinkUrl] = useState('');
    const [editCardLinkText, setEditCardLinkText] = useState('');
    const [editCardImageUrl, setEditCardImageUrl] = useState('');
    const [editCardOrder, setEditCardOrder] = useState(0);

    // Image input mode
    const [newImageMode, setNewImageMode] = useState<ImageInputMode>('url');
    const [editImageMode, setEditImageMode] = useState<ImageInputMode>('url');
    const [isUploading, setIsUploading] = useState(false);
    const newFileInputRef = useRef<HTMLInputElement>(null);
    const editFileInputRef = useRef<HTMLInputElement>(null);

    // Google Drive
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<DriveFile[]>([]);
    const [currentImageField, setCurrentImageField] = useState<'new' | 'edit' | null>(null);
    const [currentFolderId, setCurrentFolderId] = useState<string>('root');
    const [folderStack, setFolderStack] = useState<FolderNavItem[]>([]);
    const [driveLoading, setDriveLoading] = useState(false);

    const fetchTopicDetails = useCallback(async () => {
        const resClasses = await fetch('/api/teacher/classes');
        if (resClasses.ok) {
            const classesData = await resClasses.json();
            if (classesData.length > 0) {
                for (const cls of classesData) {
                    const resTopics = await fetch(`/api/teacher/classes/${cls.id}/notisek/topics`);
                    if (resTopics.ok) {
                        const topicsData: NotisekTopic[] = await resTopics.json();
                        const foundTopic = topicsData.find(t => t.id === parseInt(topicId));
                        if (foundTopic) {
                            setTopic(foundTopic);
                            return;
                        }
                    }
                }
            }
        }
        setTopic({ id: parseInt(topicId), title: 'Detail tématu', created_at: '', updated_at: '' });
    }, [topicId]);

    const fetchCards = useCallback(async () => {
        try {
            const res = await fetch(`/api/teacher/notisek/topics/${topicId}/cards`);
            if (res.ok) {
                const data: NotisekCard[] = await res.json();
                setCards(data.sort((a, b) => a.ord - b.ord));
            } else {
                setCards([]);
            }
        } catch (error) {
            console.error('Failed to fetch cards:', error);
            setCards([]);
        }
    }, [topicId]);

    useEffect(() => {
        if (!loading && user) {
            if (user.role !== 1) {
                router.push('/');
            } else if (topicId) {
                fetchTopicDetails();
                fetchCards();
            }
        }
    }, [user, loading, router, topicId, fetchTopicDetails, fetchCards]);

    // --- File Upload Handler ---
    const handleFileUpload = async (file: File, target: 'new' | 'edit') => {
        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const uploadRes = await fetch('/api/drive/upload', {
                method: 'POST',
                body: formData,
            });

            if (!uploadRes.ok) {
                const errData = await uploadRes.json();
                alert(errData.message || errData.error || 'Chyba při nahrávání souboru.');
                return;
            }

            const uploadedFile = await uploadRes.json();

            // Make it public
            const publicRes = await fetch('/api/drive/make-public', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileId: uploadedFile.id }),
            });

            if (!publicRes.ok) {
                const errData = await publicRes.json();
                alert(errData.message || errData.error || 'Chyba při nastavování veřejného přístupu.');
                return;
            }

            // Use direct Google thumbnail link
            const directUrl = `https://lh3.googleusercontent.com/d/${uploadedFile.id}`;

            if (target === 'new') {
                setNewCardImageUrl(directUrl);
            } else {
                setEditCardImageUrl(directUrl);
            }
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Chyba při nahrávání souboru.');
        } finally {
            setIsUploading(false);
        }
    };

    // ... CRUD Handlers
    const handleAddCard = async (e: React.FormEvent) => {
        e.preventDefault();
        const nextOrder = cards.length > 0 ? Math.max(...cards.map(c => c.ord)) + 1 : 0;
        try {
            const res = await fetch(`/api/teacher/notisek/topics/${topicId}/cards`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newCardTitle, content: newCardContent, link_url: newCardLinkUrl,
                    link_text: newCardLinkText, image_url: newCardImageUrl, order: nextOrder,
                }),
            });
            if (res.ok) {
                setIsAddingCard(false);
                setNewCardTitle(''); setNewCardContent(''); setNewCardLinkUrl('');
                setNewCardLinkText(''); setNewCardImageUrl('');
                fetchCards();
            }
        } catch (err) { console.error(err); }
    };

    const handleEditCard = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingCardId) return;
        try {
            const res = await fetch(`/api/teacher/notisek/cards/${editingCardId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: editCardTitle, content: editCardContent, link_url: editCardLinkUrl,
                    link_text: editCardLinkText, image_url: editCardImageUrl, order: editCardOrder,
                }),
            });
            if (res.ok) { setEditingCardId(null); fetchCards(); }
        } catch (err) { console.error(err); }
    };

    const handleDeleteCard = async (cardId: number) => {
        if (!confirm('Opravdu chcete smazat tuto kartu?')) return;
        try {
            const res = await fetch(`/api/teacher/notisek/cards/${cardId}`, { method: 'DELETE' });
            if (res.ok) fetchCards();
        } catch (err) { console.error(err); }
    };

    const handleMoveCard = async (cardId: number, direction: 'up' | 'down') => {
        const cardIndex = cards.findIndex(c => c.id === cardId);
        if (cardIndex === -1) return;
        const newCards = [...cards];
        const targetIndex = direction === 'up' ? cardIndex - 1 : cardIndex + 1;

        if (targetIndex >= 0 && targetIndex < newCards.length) {
            const cardToMove = newCards[cardIndex];
            const cardToSwap = newCards[targetIndex];
            const tempOrder = cardToMove.ord;
            cardToMove.ord = cardToSwap.ord;
            cardToSwap.ord = tempOrder;

            newCards.sort((a, b) => a.ord - b.ord);
            setCards(newCards);

            await fetch(`/api/teacher/notisek/cards/${cardToMove.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cardToMove) });
            await fetch(`/api/teacher/notisek/cards/${cardToSwap.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cardToSwap) });
        }
    };

    // Google Drive logic
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
                alert(data.message || data.error || 'Chyba při prohledávání Drive');
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

    const handleSelectDriveFile = async (file: DriveFile) => {
        if (file.mimeType === 'application/vnd.google-apps.folder') {
            handleNavigateToFolder(file.id, file.name);
            return;
        }

        const resPublic = await fetch('/api/drive/make-public', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileId: file.id }) });
        if (!resPublic.ok) {
            const data = await resPublic.json();
            alert(data.message || data.error || 'Chyba při nastavování veřejného přístupu.');
            return;
        }

        // Use direct Google thumbnail link for Drive images
        const directUrl = `https://lh3.googleusercontent.com/d/${file.id}`;

        if (currentImageField === 'new') setNewCardImageUrl(directUrl);
        else if (currentImageField === 'edit') setEditCardImageUrl(directUrl);

        setShowSearch(false);
        setSearchQuery('');
        setSearchResults([]);
        setCurrentFolderId('root');
        setFolderStack([]);
    };

    // --- Image Input Component ---
    const ImageInput = ({ mode, setMode, imageUrl, setImageUrl, target }: {
        mode: ImageInputMode;
        setMode: (m: ImageInputMode) => void;
        imageUrl: string;
        setImageUrl: (url: string) => void;
        target: 'new' | 'edit';
    }) => {
        const fileRef = target === 'new' ? newFileInputRef : editFileInputRef;

        return (
            <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Obrázek</label>

                {/* Mode tabs */}
                <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-slate-50 p-0.5">
                    {[
                        { key: 'url' as ImageInputMode, label: 'URL', icon: '🔗' },
                        { key: 'file' as ImageInputMode, label: 'Soubor', icon: '📁' },
                        { key: 'drive' as ImageInputMode, label: 'Google Drive', icon: '☁️' },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => {
                                setMode(tab.key);
                                if (tab.key === 'drive') {
                                    setCurrentImageField(target);
                                    setShowSearch(true);
                                    handleSearchDrive();
                                }
                            }}
                            className={`flex-1 py-2 px-3 text-xs font-semibold rounded-lg transition-all ${mode === tab.key
                                    ? 'bg-white text-indigo-700 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <span className="mr-1">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* URL Input */}
                {mode === 'url' && (
                    <input
                        type="text"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm"
                        placeholder="https://example.com/image.jpg"
                    />
                )}

                {/* File Upload */}
                {mode === 'file' && (
                    <div className="space-y-2">
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file, target);
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            disabled={isUploading}
                            className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isUploading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin"></span>
                                    Nahrávání na Google Drive...
                                </span>
                            ) : (
                                <span className="flex flex-col items-center gap-1">
                                    <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                                    </svg>
                                    Klikněte pro výběr obrázku
                                </span>
                            )}
                        </button>
                    </div>
                )}

                {/* Drive mode opens the modal — just show a hint */}
                {mode === 'drive' && !imageUrl && (
                    <button
                        type="button"
                        onClick={() => {
                            setCurrentImageField(target);
                            setShowSearch(true);
                            handleSearchDrive();
                        }}
                        className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-600 transition-all"
                    >
                        <span className="flex flex-col items-center gap-1">
                            <span className="text-2xl">☁️</span>
                            Klikněte pro otevření Google Drive
                        </span>
                    </button>
                )}

                {/* Preview of selected image */}
                {imageUrl && (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                        <img
                            src={imageUrl}
                            alt="Náhled"
                            className="w-full h-32 object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <button
                            type="button"
                            onClick={() => setImageUrl('')}
                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-lg"
                            title="Odstranit obrázek"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                        <div className="px-3 py-2 text-xs text-slate-400 truncate">{imageUrl}</div>
                    </div>
                )}
            </div>
        );
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <span className="text-slate-500 text-sm">Načítání...</span>
            </div>
        </div>
    );
    if (!user || user.role !== 1) return null;

    return (
        <TeacherLayout>
            <div className="max-w-screen-2xl mx-auto">
                {/* Page Header */}
                <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <Link href="/ucitel/notisek" className="text-sm text-slate-400 hover:text-indigo-600 mb-2 inline-flex items-center gap-1 transition-colors group">
                            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                            Zpět na témata
                        </Link>
                        <header className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="7" height="7"></rect>
                                    <rect x="14" y="3" width="7" height="7"></rect>
                                    <rect x="14" y="14" width="7" height="7"></rect>
                                    <rect x="3" y="14" width="7" height="7"></rect>
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{topic?.title || 'Téma'}</h1>
                                <p className="text-slate-400 mt-0.5 text-xs">Správa karet a zdrojů</p>
                            </div>
                        </header>
                    </div>
                    <button
                        onClick={() => setIsAddingCard(!isAddingCard)}
                        className={`w-full sm:w-auto px-6 py-3 font-bold rounded-xl shadow-lg transition-all text-sm tracking-wide flex items-center justify-center gap-2 ${isAddingCard
                                ? 'bg-slate-700 text-white hover:bg-slate-800'
                                : 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:shadow-indigo-500/40 hover:-translate-y-0.5 shadow-indigo-500/25'
                            }`}
                    >
                        {isAddingCard ? (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                Zavřít formulář
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                Nová karta
                            </>
                        )}
                    </button>
                </div>

                {/* ADD CARD FORM */}
                {isAddingCard && (
                    <div className="mb-8 p-6 rounded-2xl border border-slate-200 shadow-xl animate-fade-in-down bg-white">
                        <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            </div>
                            Přidat novou kartu
                        </h3>
                        <form onSubmit={handleAddCard} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Nadpis</label>
                                    <input type="text" value={newCardTitle} onChange={(e) => setNewCardTitle(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" />
                                </div>
                                <ImageInput
                                    mode={newImageMode} setMode={setNewImageMode}
                                    imageUrl={newCardImageUrl} setImageUrl={setNewCardImageUrl}
                                    target="new"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Obsah</label>
                                <textarea value={newCardContent} onChange={(e) => setNewCardContent(e.target.value)} rows={3}
                                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Odkaz URL</label>
                                    <input type="url" value={newCardLinkUrl} onChange={(e) => setNewCardLinkUrl(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" placeholder="https://..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Text odkazu</label>
                                    <input type="text" value={newCardLinkText} onChange={(e) => setNewCardLinkText(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" />
                                </div>
                            </div>
                            <button type="submit" className="w-full py-3 rounded-xl font-bold text-white hover:shadow-lg hover:-translate-y-0.5 transition-all bg-gradient-to-r from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/20">
                                Uložit kartu
                            </button>
                        </form>
                    </div>
                )}

                {/* MASONRY LAYOUT */}
                <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 gap-5 space-y-5 pb-20">
                    {cards.map(card => (
                        <div key={card.id} className="break-inside-avoid relative rounded-2xl overflow-hidden border border-slate-200 hover:border-indigo-300 hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 group bg-white">
                            {/* Action buttons - top right corner, no overlay */}
                            <div className="absolute top-2 right-2 z-20 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <button onClick={() => handleMoveCard(card.id, 'up')} className="p-2.5 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 transition-colors border border-slate-100" title="Nahoru">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"></polyline></svg>
                                </button>
                                <button onClick={() => handleMoveCard(card.id, 'down')} className="p-2.5 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 transition-colors border border-slate-100" title="Dolů">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                </button>
                                <button onClick={() => {
                                    setEditingCardId(card.id);
                                    setEditCardTitle(card.title || ''); setEditCardContent(card.content || '');
                                    setEditCardLinkUrl(card.link_url || ''); setEditCardLinkText(card.link_text || '');
                                    setEditCardImageUrl(card.image_url || ''); setEditCardOrder(card.ord);
                                    setEditImageMode('url');
                                }} className="p-2.5 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg hover:bg-indigo-50 text-indigo-500 hover:text-indigo-700 transition-colors border border-slate-100" title="Upravit">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                </button>
                                <button onClick={() => handleDeleteCard(card.id)} className="p-2.5 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors border border-slate-100" title="Smazat">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            </div>

                            <div className="h-40 w-full relative bg-slate-50 overflow-hidden border-b border-slate-100">
                                {card.image_url ? (
                                    <img
                                        src={card.image_url}
                                        alt={card.title || 'Náhled'}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : card.link_url ? (
                                    <iframe
                                        src={card.link_url}
                                        className="pointer-events-none absolute top-0 left-0 w-[200%] h-[200%] origin-top-left scale-50 opacity-60 group-hover:opacity-80 transition-opacity"
                                        title="Preview"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center">
                                            <span className="text-3xl">📝</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-5">
                                {card.title && <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">{card.title}</h3>}
                                <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-wrap mb-4">
                                    {card.content}
                                </p>

                                {card.link_url && (
                                    <div className="mt-auto pt-3 border-t border-slate-100">
                                        <a href={card.link_url} target="_blank" rel="noopener noreferrer"
                                            className="inline-flex items-center text-xs font-semibold text-indigo-500 hover:text-indigo-700 transition-colors group/link">
                                            {card.link_text || 'Otevřít odkaz'}
                                            <svg className="ml-1 w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* EDIT CARD MODAL */}
                {editingCardId !== null && (
                    <div className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditingCardId(null)}>
                        <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full animate-fade-in-up overflow-hidden" onClick={(e) => e.stopPropagation()}>
                            {/* Modal Header */}
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-indigo-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900">Upravit kartu</h3>
                                </div>
                                <button onClick={() => setEditingCardId(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>

                            {/* Modal Body — Two columns */}
                            <div className="p-6 max-h-[70vh] overflow-y-auto">
                                <form onSubmit={handleEditCard} className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* LEFT COLUMN — Nadpis + Obsah */}
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Nadpis</label>
                                                <input type="text" value={editCardTitle} onChange={e => setEditCardTitle(e.target.value)}
                                                    className="w-full bg-white text-slate-900 px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                                    placeholder="Nadpis karty" autoFocus />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Obsah</label>
                                                <textarea value={editCardContent} onChange={e => setEditCardContent(e.target.value)} rows={8}
                                                    className="w-full bg-white text-slate-900 px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all resize-none"
                                                    placeholder="Obsah karty" />
                                            </div>
                                        </div>

                                        {/* RIGHT COLUMN — Obrázek + Odkaz */}
                                        <div className="space-y-4">
                                            <ImageInput
                                                mode={editImageMode} setMode={setEditImageMode}
                                                imageUrl={editCardImageUrl} setImageUrl={setEditCardImageUrl}
                                                target="edit"
                                            />

                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Odkaz URL</label>
                                                <input type="url" value={editCardLinkUrl} onChange={e => setEditCardLinkUrl(e.target.value)}
                                                    className="w-full bg-white text-slate-900 px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                                    placeholder="https://..." />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Text odkazu</label>
                                                <input type="text" value={editCardLinkText} onChange={e => setEditCardLinkText(e.target.value)}
                                                    className="w-full bg-white text-slate-900 px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
                                                    placeholder="Text odkazu" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                                        <button type="button" onClick={() => setEditingCardId(null)} className="px-5 py-2.5 text-sm text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors font-medium">Zrušit</button>
                                        <button type="submit" className="px-6 py-2.5 text-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg transition-all font-bold shadow-md shadow-emerald-500/20">Uložit změny</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Google Drive Search Modal */}
                {showSearch && (
                    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col h-[80vh] animate-fade-in-up overflow-hidden">
                            {/* Header */}
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-indigo-50/50">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">Google Drive</h3>
                                    <p className="text-sm text-slate-500">Vyberte médium pro vaši kartu</p>
                                </div>
                                <button onClick={() => setShowSearch(false)} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600">
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
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all text-sm outline-none"
                                        />
                                        <svg className="absolute left-3 top-3 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                    </div>
                                    <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-semibold rounded-xl hover:shadow-md shadow-sm transition-all">Hledat</button>
                                </form>

                                <div className="flex items-center gap-2 text-xs font-medium overflow-x-auto pb-2 text-slate-500">
                                    <button
                                        onClick={() => {
                                            setCurrentFolderId('root');
                                            setFolderStack([]);
                                            setSearchQuery('');
                                            handleSearchDrive(undefined, 'root');
                                        }}
                                        className={`hover:text-indigo-600 truncate ${currentFolderId === 'root' ? 'text-indigo-600' : ''}`}
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
                                                className="hover:text-indigo-600 truncate max-w-[100px]"
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
                                        <p className="text-sm text-slate-500 animate-pulse">Prohledáváme váš disk...</p>
                                    </div>
                                ) : searchResults.length === 0 ? (
                                    <div className="text-center py-20 opacity-50">
                                        <p className="text-4xl mb-4">🔍</p>
                                        <p className="text-slate-500 font-medium">Nebyly nalezeny žádné soubory</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-1">
                                        {searchResults.map(file => {
                                            const isFolder = file.mimeType === 'application/vnd.google-apps.folder';

                                            return (
                                                <div
                                                    key={file.id}
                                                    onClick={() => handleSelectDriveFile(file)}
                                                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all group"
                                                >
                                                    <div className="flex-shrink-0">
                                                        {isFolder ? (
                                                            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg group-hover:bg-amber-200">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                                                            </div>
                                                        ) : file.mimeType?.includes('image') ? (
                                                            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg group-hover:bg-emerald-200">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                                            </div>
                                                        ) : file.mimeType?.includes('video') ? (
                                                            <div className="p-2 bg-red-100 text-red-600 rounded-lg group-hover:bg-red-200">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><polygon points="10 8 14 10 10 12 10 8"></polygon><line x1="2" y1="18" x2="22" y2="18"></line></svg>
                                                            </div>
                                                        ) : (
                                                            <div className="p-2 bg-slate-100 text-slate-500 rounded-lg group-hover:bg-slate-200">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-slate-900 truncate">{file.name}</p>
                                                        <p className="text-xs text-slate-400 uppercase tracking-wider">{isFolder ? 'Složka' : file.mimeType?.split('/').pop()}</p>
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
                            <div className="p-6 border-t border-slate-100 flex justify-end bg-slate-50/50">
                                <button onClick={() => setShowSearch(false)} className="px-6 py-2 bg-white border border-slate-200 text-slate-600 font-bold text-sm rounded-xl hover:bg-slate-50 transition-all shadow-sm">
                                    Zavřít
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </TeacherLayout>
    );
}