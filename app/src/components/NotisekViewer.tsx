"use client";

import React from 'react';

export interface Card {
    id: number;
    title: string | null;
    content: string | null;
    link_url: string | null;
    link_text: string | null;
    image_url: string | null;
    ord: number;
}

export interface Topic {
    id: number;
    title: string;
    cards: Card[];
}

interface NotisekViewerProps {
    data: Topic[];
    isLoading?: boolean;
}

export default function NotisekViewer({ data, isLoading = false }: NotisekViewerProps) {
    const [collapsedTopics, setCollapsedTopics] = React.useState<Record<number, boolean>>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('notisek_collapsed_topics');
            return saved ? JSON.parse(saved) : {};
        }
        return {};
    });

    const toggleTopic = (id: number) => {
        setCollapsedTopics(prev => {
            const newState = {
                ...prev,
                [id]: !prev[id]
            };
            localStorage.setItem('notisek_collapsed_topics', JSON.stringify(newState));
            return newState;
        });
    };

    React.useEffect(() => {
        const handleHash = () => {
            if (typeof window === 'undefined') return;
            const hash = window.location.hash.substring(1);
            if (!hash) return;

            let topicToExpand: number | null = null;
            if (hash.startsWith('notisek-topic-')) {
                topicToExpand = parseInt(hash.replace('notisek-topic-', ''));
            } else if (hash.startsWith('notisek-card-')) {
                const cardId = parseInt(hash.replace('notisek-card-', ''));
                const topic = data.find(t => t.cards.some(c => c.id === cardId));
                if (topic) topicToExpand = topic.id;
            }

            if (topicToExpand !== null) {
                setCollapsedTopics(prev => {
                    if (prev[topicToExpand!]) {
                        const newState = { ...prev, [topicToExpand!]: false };
                        localStorage.setItem('notisek_collapsed_topics', JSON.stringify(newState));
                        return newState;
                    }
                    return prev;
                });
            }

            setTimeout(() => {
                const element = document.getElementById(hash);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    element.classList.add('ring-4', 'ring-orange-400', 'ring-offset-2');
                    setTimeout(() => element.classList.remove('ring-4', 'ring-orange-400', 'ring-offset-2'), 3000);
                }
            }, 100);
        };

        if (!isLoading) {
            handleHash();
            window.addEventListener('hashchange', handleHash);
            return () => window.removeEventListener('hashchange', handleHash);
        }
    }, [isLoading, data]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-orange-50/30">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
                    <span className="text-slate-500 text-sm">Načítám Notísek...</span>
                </div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="min-h-screen p-6 font-sans bg-gradient-to-br from-slate-50 to-orange-50/30">
                <header className="mb-10 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Notísek</h1>
                        <p className="text-slate-500 mt-0.5 text-sm">Přehled zdrojů</p>
                    </div>
                </header>
                <div className="p-12 text-center border border-slate-200 rounded-2xl bg-white shadow-sm text-slate-400">
                    <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                    Zatím zde nejsou žádné záznamy od učitele.
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 font-sans text-slate-800 bg-gradient-to-br from-slate-50 to-orange-50/30">

            <header className="mb-10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                    </svg>
                </div>
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Notísek</h1>
                    <p className="text-slate-500 mt-0.5 text-sm">Správa témat do notísku</p>
                </div>
            </header>

            {data.map((topic) => {
                const isCollapsed = collapsedTopics[topic.id];
                return (
                    <div key={topic.id} id={`notisek-topic-${topic.id}`} className="mb-12 animate-fade-in group/topic">
                        <div
                            className="flex items-center mb-6 cursor-pointer select-none group/header"
                            onClick={() => toggleTopic(topic.id)}
                        >
                            <div className={`mr-3 transition-transform duration-300 ${isCollapsed ? '-rotate-90' : ''}`}>
                                <div className="w-7 h-7 rounded-lg bg-orange-50 group-hover/header:bg-orange-100 flex items-center justify-center transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-orange-400 group-hover/header:text-orange-600 transition-colors">
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </div>
                            </div>
                            <h2 className="text-xl font-bold text-slate-800 transition-colors group-hover/header:text-orange-600 mr-4 whitespace-nowrap">
                                {topic.title}
                                {isCollapsed && <span className="ml-3 text-sm font-normal text-slate-400">({topic.cards.length} karet)</span>}
                            </h2>
                            <div className="h-px bg-gradient-to-r from-slate-200 to-transparent w-full group-hover/header:from-orange-300/50 transition-colors"></div>
                        </div>

                        {!isCollapsed && (
                            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 gap-5 space-y-5">
                                {topic.cards.map((card) => (
                                    <a
                                        key={card.id}
                                        id={`notisek-card-${card.id}`}
                                        href={card.link_url || '#'}
                                        target={card.link_url ? "_blank" : "_self"}
                                        className={`break-inside-avoid block relative rounded-2xl overflow-hidden border border-slate-200 hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-xl group bg-white ${card.link_url
                                                ? 'hover:border-orange-300 hover:shadow-orange-500/10 cursor-pointer'
                                                : 'cursor-default'
                                            }`}
                                        onClick={(e) => !card.link_url && e.preventDefault()}
                                    >
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
                                                    className="pointer-events-none absolute top-0 left-0 w-[200%] h-[200%] origin-top-left scale-50 opacity-70"
                                                    tabIndex={-1}
                                                    title="Preview"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-100 to-rose-100 flex items-center justify-center">
                                                        <span className="text-3xl">📄</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-5">
                                            {card.title && (
                                                <h3 className={`text-lg font-bold text-slate-900 mb-2 transition-colors ${card.link_url ? 'group-hover:text-orange-600' : ''}`}>
                                                    {card.title}
                                                </h3>
                                            )}
                                            <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-wrap">
                                                {card.content}
                                            </p>

                                            {(card.link_text || card.link_url) && (
                                                <div className="mt-4 pt-3 border-t border-slate-100">
                                                    <span className="inline-flex items-center text-xs font-semibold text-orange-500 group-hover:text-orange-700 transition-colors">
                                                        {card.link_text || 'Otevřít'}
                                                        <svg className="ml-1 w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
