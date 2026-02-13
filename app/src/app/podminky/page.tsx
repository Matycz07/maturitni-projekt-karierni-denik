"use client";

import React from 'react';
import Link from 'next/link';

const TermsOfServicePage: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-8 sm:p-12">
                {/* Zpět na login */}
                <Link href="/login" className="inline-flex items-center text-indigo-600 hover:text-indigo-800 mb-8 transition-colors">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Zpět na přihlášení
                </Link>

                <h1 className="text-3xl font-bold text-slate-900 mb-8">Podmínky použití</h1>

                <div className="prose prose-slate max-w-none">
                    <p className="text-slate-600 mb-6">
                        <strong>Datum účinnosti:</strong> 6. února 2026
                    </p>

                    <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">1. Úvodní ustanovení</h2>
                    <p className="text-slate-600 mb-4">
                        Tyto podmínky použití (dále jen „Podmínky") upravují vztah mezi provozovatelem aplikace Kariérní deník
                        (dále jen „Aplikace") a uživateli této Aplikace. Používáním Aplikace souhlasíte s těmito Podmínkami.
                    </p>

                    <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">2. Popis služby</h2>
                    <p className="text-slate-600 mb-4">
                        Aplikace Kariérní deník je vzdělávací platforma určená pro studenty a učitele. Umožňuje:
                    </p>
                    <ul className="list-disc list-inside text-slate-600 mb-4 space-y-2">
                        <li>Správu tříd a studentů</li>
                        <li>Vytváření a odevzdávání úkolů</li>
                        <li>Ukládání dokumentů na Google Drive</li>
                        <li>Sledování kariérního postupu studentů</li>
                    </ul>

                    <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">3. Registrace a účet</h2>
                    <p className="text-slate-600 mb-4">
                        Pro použití Aplikace je nutné přihlášení prostřednictvím účtu Google. Uživatel je povinen:
                    </p>
                    <ul className="list-disc list-inside text-slate-600 mb-4 space-y-2">
                        <li>Poskytnout pravdivé a aktuální informace</li>
                        <li>Chránit své přihlašovací údaje před zneužitím</li>
                        <li>Neprodleně informovat provozovatele o jakémkoli neoprávněném použití účtu</li>
                    </ul>

                    <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">4. Pravidla používání</h2>
                    <p className="text-slate-600 mb-4">
                        Uživatel se zavazuje:
                    </p>
                    <ul className="list-disc list-inside text-slate-600 mb-4 space-y-2">
                        <li>Používat Aplikaci pouze k zákonným účelům</li>
                        <li>Nenahrávat obsah, který porušuje práva třetích stran</li>
                        <li>Nenarušovat funkčnost nebo bezpečnost Aplikace</li>
                        <li>Nešířit škodlivý software nebo spam</li>
                    </ul>

                    <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">5. Integrace s Google Drive</h2>
                    <p className="text-slate-600 mb-4">
                        Aplikace využívá Google Drive API pro ukládání a správu dokumentů. Přihlášením udělujete Aplikaci
                        oprávnění přistupovat k vašemu Google Disku v souladu s oprávněními, která jste schválili při přihlášení.
                    </p>

                    <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">6. Duševní vlastnictví</h2>
                    <p className="text-slate-600 mb-4">
                        Všechna práva k Aplikaci, včetně designu, kódu a obsahu, jsou majetkem provozovatele.
                        Uživatelé si ponechávají práva k obsahu, který sami vytvoří nebo nahrají.
                    </p>

                    <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">7. Omezení odpovědnosti</h2>
                    <p className="text-slate-600 mb-4">
                        Aplikace je poskytována „tak jak je". Provozovatel neručí za:
                    </p>
                    <ul className="list-disc list-inside text-slate-600 mb-4 space-y-2">
                        <li>Nepřetržitou dostupnost služby</li>
                        <li>Ztrátu dat způsobenou technickými problémy</li>
                        <li>Škody vzniklé nesprávným použitím Aplikace</li>
                    </ul>

                    <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">8. Ukončení služby</h2>
                    <p className="text-slate-600 mb-4">
                        Provozovatel si vyhrazuje právo ukončit přístup uživatele k Aplikaci v případě porušení těchto Podmínek.
                        Uživatel může kdykoli ukončit používání Aplikace odhlášením a odebráním přístupu v nastavení svého Google účtu.
                    </p>

                    <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">9. Změny podmínek</h2>
                    <p className="text-slate-600 mb-4">
                        Provozovatel si vyhrazuje právo tyto Podmínky kdykoli změnit. O významných změnách budou uživatelé informováni.
                    </p>

                    <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">10. Kontakt</h2>
                    <p className="text-slate-600 mb-4">
                        V případě dotazů ohledně těchto Podmínek nás kontaktujte na adrese uvedené v sekci Kontakt.
                    </p>

                    <div className="mt-12 pt-8 border-t border-slate-200">
                        <p className="text-sm text-slate-500">
                            Poslední aktualizace: 6. února 2026
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TermsOfServicePage;
