"use client";

import React from 'react';
import Link from 'next/link';

const PrivacyPolicyPage: React.FC = () => {
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

                <h1 className="text-3xl font-bold text-slate-900 mb-8">Zásady ochrany soukromí</h1>

                <div className="prose prose-slate max-w-none">
                    <p className="text-slate-600 mb-6">
                        <strong>Datum účinnosti:</strong> 6. února 2026
                    </p>

                    <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">1. Úvod</h2>
                    <p className="text-slate-600 mb-4">
                        Tyto Zásady ochrany soukromí (dále jen „Zásady") popisují, jak aplikace Kariérní deník
                        (dále jen „Aplikace") shromažďuje, používá a chrání vaše osobní údaje.
                    </p>

                    <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">2. Jaké údaje shromažďujeme</h2>
                    <p className="text-slate-600 mb-4">
                        Při používání Aplikace můžeme shromažďovat následující informace:
                    </p>

                    <h3 className="text-lg font-medium text-slate-700 mt-6 mb-3">2.1 Údaje z Google účtu</h3>
                    <ul className="list-disc list-inside text-slate-600 mb-4 space-y-2">
                        <li><strong>Jméno a příjmení</strong> - pro identifikaci v rámci Aplikace</li>
                        <li><strong>E-mailová adresa</strong> - pro přihlášení a komunikaci</li>
                        <li><strong>Profilový obrázek</strong> - pro zobrazení v uživatelském rozhraní</li>
                    </ul>

                    <h3 className="text-lg font-medium text-slate-700 mt-6 mb-3">2.2 Údaje z Google Drive</h3>
                    <p className="text-slate-600 mb-4">
                        S vaším souhlasem přistupujeme k vašemu Google Disku za účelem:
                    </p>
                    <ul className="list-disc list-inside text-slate-600 mb-4 space-y-2">
                        <li>Vytváření a ukládání dokumentů souvisejících s vaší činností v Aplikaci</li>
                        <li>Prohlížení a výběru souborů pro nahrání do úkolů</li>
                        <li>Organizace souborů ve složkách</li>
                    </ul>

                    <h3 className="text-lg font-medium text-slate-700 mt-6 mb-3">2.3 Údaje vytvořené v Aplikaci</h3>
                    <ul className="list-disc list-inside text-slate-600 mb-4 space-y-2">
                        <li>Informace o třídách a členství</li>
                        <li>Odevzdané úkoly a přílohy</li>
                        <li>Hodnocení a zpětná vazba</li>
                    </ul>

                    <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">3. Jak údaje používáme</h2>
                    <p className="text-slate-600 mb-4">
                        Vaše osobní údaje používáme k:
                    </p>
                    <ul className="list-disc list-inside text-slate-600 mb-4 space-y-2">
                        <li>Poskytování a zlepšování služeb Aplikace</li>
                        <li>Autentizaci a správě vašeho účtu</li>
                        <li>Komunikaci ohledně služby</li>
                        <li>Zajištění bezpečnosti a prevenci zneužití</li>
                    </ul>

                    <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">4. Sdílení údajů</h2>
                    <p className="text-slate-600 mb-4">
                        Vaše osobní údaje nesdílíme s třetími stranami, s výjimkou:
                    </p>
                    <ul className="list-disc list-inside text-slate-600 mb-4 space-y-2">
                        <li><strong>Učitelé</strong> - vidí informace o studentech ve svých třídách</li>
                        <li><strong>Spolužáci</strong> - mohou vidět vaše jméno v rámci třídy</li>
                        <li><strong>Právní požadavky</strong> - pokud to vyžaduje zákon</li>
                    </ul>

                    <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">5. Integrace s Google</h2>
                    <p className="text-slate-600 mb-4">
                        Aplikace využívá služby Google pro přihlášení a ukládání souborů. Používání těchto služeb
                        se řídí také <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800">Zásadami ochrany soukromí Google</a>.
                    </p>
                    <p className="text-slate-600 mb-4">
                        Přístup k vašemu Google Disku můžete kdykoli odebrat v nastavení svého Google účtu na adrese{' '}
                        <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800">myaccount.google.com/permissions</a>.
                    </p>

                    <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">6. Zabezpečení údajů</h2>
                    <p className="text-slate-600 mb-4">
                        Implementujeme vhodná technická a organizační opatření k ochraně vašich osobních údajů, včetně:
                    </p>
                    <ul className="list-disc list-inside text-slate-600 mb-4 space-y-2">
                        <li>Šifrované přenosy dat (HTTPS)</li>
                        <li>Bezpečné ukládání přístupových tokenů</li>
                        <li>Pravidelné bezpečnostní kontroly</li>
                    </ul>

                    <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">7. Vaše práva</h2>
                    <p className="text-slate-600 mb-4">
                        V souladu s GDPR máte právo:
                    </p>
                    <ul className="list-disc list-inside text-slate-600 mb-4 space-y-2">
                        <li><strong>Právo na přístup</strong> - získat kopii svých osobních údajů</li>
                        <li><strong>Právo na opravu</strong> - opravit nepřesné údaje</li>
                        <li><strong>Právo na výmaz</strong> - požádat o smazání svých údajů</li>
                        <li><strong>Právo na přenositelnost</strong> - získat údaje ve strojově čitelném formátu</li>
                        <li><strong>Právo vznést námitku</strong> - proti zpracování údajů</li>
                    </ul>

                    <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">8. Uchovávání údajů</h2>
                    <p className="text-slate-600 mb-4">
                        Účet se nedá smazat přímo uživatelem. Smazání je možné pouze v případě, že váš učitel požádá správce o jeho odstranění. Jelikož smazání provádí správce manuálně, je doba odstranění údajů neurčitá a nelze garantovat, zda a kdy budou údaje přesně smazány. Vaše osobní údaje uchováváme po dobu existence vašeho účtu.
                    </p>

                    <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">9. Cookies a sledování</h2>
                    <p className="text-slate-600 mb-4">
                        Aplikace používá pouze nezbytné session cookies pro udržení přihlášení.
                        Nepoužíváme analytické ani reklamní cookies.
                    </p>

                    <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">10. Změny zásad</h2>
                    <p className="text-slate-600 mb-4">
                        Tyto Zásady můžeme příležitostně aktualizovat. O významných změnách vás budeme informovat
                        prostřednictvím e-mailu nebo oznámení v Aplikaci.
                    </p>

                    <h2 className="text-xl font-semibold text-slate-800 mt-8 mb-4">11. Kontakt</h2>
                    <p className="text-slate-600 mb-4">
                        Pokud máte otázky ohledně těchto Zásad nebo zpracování vašich osobních údajů, kontaktujte nás
                        prostřednictvím sekce Kontakt v Aplikaci.
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

export default PrivacyPolicyPage;
