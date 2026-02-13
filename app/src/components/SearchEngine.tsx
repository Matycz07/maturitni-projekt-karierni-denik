"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface SearchResult {
    id: number;
    title: string;
    type: 'class' | 'task' | 'notisek_topic' | 'notisek_card';
    parentId?: number;
}

export default function SearchEngine() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isFocused, setIsFocused] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

    const { user } = useAuth();
    const router = useRouter();
    const searchRef = useRef<HTMLDivElement>(null);
    const mobileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsFocused(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (query.length >= 2) {
                setIsLoading(true);
                try {
                    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
                    if (res.ok) {
                        const data = await res.json();
                        setResults(data);
                    }
                } catch (error) {
                    console.error('Search failed:', error);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setResults([]);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    useEffect(() => {
        if (isMobileSearchOpen && mobileInputRef.current) {
            mobileInputRef.current.focus();
        }
    }, [isMobileSearchOpen]);

    const handleResultClick = (result: SearchResult) => {
        setIsFocused(false);
        setIsMobileSearchOpen(false);
        setQuery('');
        setResults([]);

        const isTeacher = user?.role === 1;
        let path = '';
        let hash = '';

        switch (result.type) {
            case 'class':
                path = isTeacher ? `/ucitel` : `/zak`;
                break;
            case 'task':
                path = isTeacher ? `/ucitel/ukoly` : `/zak/ukoly/${result.id}`;
                hash = `#task-${result.id}`;
                break;
            case 'notisek_topic':
                path = isTeacher ? `/ucitel/notisek` : `/zak/notisek`;
                hash = `#notisek-topic-${result.id}`;
                break;
            case 'notisek_card':
                path = isTeacher ? `/ucitel/notisek` : `/zak/notisek`;
                hash = `#notisek-card-${result.id}`;
                break;
        }

        if (path) {
            if (window.location.pathname === path && hash) {
                const elementId = hash.substring(1);

                // If we are already on this hash, hashchange won't fire. 
                // We manually trigger the logic for NotisekViewer or other observers.
                if (window.location.hash === hash) {
                    window.dispatchEvent(new HashChangeEvent('hashchange'));
                } else {
                    window.location.hash = elementId;
                }

                // If element is already in DOM, we can scroll to it immediately
                const element = document.getElementById(elementId);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('ring-4', 'ring-indigo-500', 'ring-offset-2');
                    setTimeout(() => element.classList.remove('ring-4', 'ring-indigo-500', 'ring-offset-2'), 3000);
                }
            } else {
                router.push(path + hash);
            }
        }
    };

    if (!user) return null;

    return (
        <div ref={searchRef} className="search-engine-wrapper">
            {/* Desktop Version */}
            <div className="hidden lg:block relative w-full max-w-md">
                <div className="relative">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        placeholder="Hledat..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                    />
                    <div className="absolute left-3 top-2.5 text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    </div>
                </div>

                {isFocused && (query.length >= 2 || results.length > 0) && (
                    <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2">
                        <div className="max-h-[400px] overflow-y-auto">
                            {results.length > 0 ? (
                                results.map((result, idx) => (
                                    <button
                                        key={`desktop-${result.type}-${result.id}-${idx}`}
                                        onClick={() => handleResultClick(result)}
                                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-none"
                                    >
                                        <div className={`p-2 rounded-lg ${result.type === 'class' ? 'bg-blue-100 text-blue-600' : result.type === 'task' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                {result.type === 'class' && <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></>}
                                                {result.type === 'task' && <><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></>}
                                                {(result.type === 'notisek_topic' || result.type === 'notisek_card') && <><path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"></path><polygon points="18 2 22 6 12 16 8 16 8 12 18 2"></polygon></>}
                                            </svg>
                                        </div>
                                        <div className="flex flex-col items-start truncate">
                                            <span className="text-sm font-semibold text-slate-900 truncate w-full">{result.title}</span>
                                            <span className="text-[10px] uppercase font-bold text-slate-400">
                                                {result.type === 'class' ? 'Třída' : result.type === 'task' ? 'Úkol' : 'Notýsek'}
                                            </span>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="p-4 text-center text-slate-500 text-sm">Žádné výsledky</div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile Version - Icon Trigger */}
            <div className="lg:hidden">
                <button
                    onClick={() => setIsMobileSearchOpen(true)}
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition-all"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </button>

                {isMobileSearchOpen && (
                    <div className="fixed inset-0 z-[200] bg-white flex flex-col p-4 animate-in fade-in slide-in-from-bottom-5 duration-300">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="flex-grow relative">
                                <input
                                    ref={mobileInputRef}
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Hledat..."
                                    className="w-full pl-10 pr-4 py-3 bg-slate-100 border-none rounded-xl text-lg focus:ring-2 focus:ring-indigo-500"
                                />
                                <div className="absolute left-3 top-3.5 text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                </div>
                                {isLoading && (
                                    <div className="absolute right-3 top-3.5">
                                        <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={() => { setIsMobileSearchOpen(false); setQuery(''); setResults([]); }}
                                className="text-slate-500 font-medium px-2"
                            >
                                Zrušit
                            </button>
                        </div>

                        <div className="flex-grow overflow-y-auto space-y-2">
                            {results.length > 0 ? (
                                results.map((result, idx) => (
                                    <button
                                        key={`mobile-${result.type}-${result.id}-${idx}`}
                                        onClick={() => handleResultClick(result)}
                                        className="w-full p-4 flex items-center gap-4 bg-slate-50 rounded-2xl active:bg-slate-100 border border-transparent active:border-slate-200 transition-all"
                                    >
                                        <div className={`p-3 rounded-xl ${result.type === 'class' ? 'bg-blue-100 text-blue-600' : result.type === 'task' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'}`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                {result.type === 'class' && <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></>}
                                                {result.type === 'task' && <><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></>}
                                                {(result.type === 'notisek_topic' || result.type === 'notisek_card') && <><path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"></path><polygon points="18 2 22 6 12 16 8 16 8 12 18 2"></polygon></>}
                                            </svg>
                                        </div>
                                        <div className="flex flex-col items-start truncate">
                                            <span className="text-lg font-bold text-slate-900 truncate w-full">{result.title}</span>
                                            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                                                {result.type === 'class' ? 'Třída' : result.type === 'task' ? 'Úkol' : 'Notýsek'}
                                            </span>
                                        </div>
                                    </button>
                                ))
                            ) : query.length >= 2 ? (
                                <div className="text-center py-12">
                                    <div className="text-4xl mb-4">🔍</div>
                                    <p className="text-slate-500 font-medium">Pro "{query}" jsme nic nenašli.</p>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-slate-400 font-medium">
                                    Vyhledejte třídy, domácí úkoly nebo témata z notýsku.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
