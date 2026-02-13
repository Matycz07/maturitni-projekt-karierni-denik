"use client";
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Stats {
    totalUsers: number;
    students: number;
    teachers: number;
    admins: number;
    totalClasses: number;
}

export default function AdministratorPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<Stats>({
        totalUsers: 0,
        students: 0,
        teachers: 0,
        admins: 0,
        totalClasses: 0
    });
    const [statsLoading, setStatsLoading] = useState(true);

    useEffect(() => {
        if (!loading && user && user.role !== 2) {
            router.push('/');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user?.role === 2) {
            fetchStats();
        }
    }, [user]);

    const fetchStats = async () => {
        try {
            const [usersRes, classesRes] = await Promise.all([
                fetch('/api/users'),
                fetch('/api/classes')
            ]);

            if (usersRes.ok && classesRes.ok) {
                const users = await usersRes.json();
                const classes = await classesRes.json();

                setStats({
                    totalUsers: users.length,
                    students: users.filter((u: { id_opravneni: number }) => u.id_opravneni === 0).length,
                    teachers: users.filter((u: { id_opravneni: number }) => u.id_opravneni === 1).length,
                    admins: users.filter((u: { id_opravneni: number }) => u.id_opravneni === 2).length,
                    totalClasses: classes.length
                });
            }
        } catch (error) {
            console.error('Failed to fetch stats', error);
        } finally {
            setStatsLoading(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-500 border-t-transparent"></div>
        </div>
    );
    if (!user) return null;

    const quickActions = [
        {
            title: 'Správa uživatelů',
            description: 'Přidávejte, upravujte a přiřazujte role uživatelům',
            href: '/administrator/uzivatele',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
            ),
            color: 'from-violet-500 to-purple-600',
            bgLight: 'bg-violet-50',
            textColor: 'text-violet-600'
        },
        {
            title: 'Správa tříd',
            description: 'Spravujte třídy a jejich členy',
            href: '/administrator/tridy',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                </svg>
            ),
            color: 'from-emerald-500 to-teal-600',
            bgLight: 'bg-emerald-50',
            textColor: 'text-emerald-600'
        },
        {
            title: 'Databáze',
            description: 'Přímý přístup k databázi a zálohy',
            href: '/administrator/databaze',
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                </svg>
            ),
            color: 'from-amber-500 to-orange-600',
            bgLight: 'bg-amber-50',
            textColor: 'text-amber-600'
        }
    ];

    const statCards = [
        {
            label: 'Celkem uživatelů',
            value: stats.totalUsers,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
            ),
            color: 'text-slate-600',
            bgColor: 'bg-slate-100'
        },
        {
            label: 'Žáci',
            value: stats.students,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                    <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                </svg>
            ),
            color: 'text-blue-600',
            bgColor: 'bg-blue-100'
        },
        {
            label: 'Učitelé',
            value: stats.teachers,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="8" y1="21" x2="16" y2="21"></line>
                    <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
            ),
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-100'
        },
        {
            label: 'Administrátoři',
            value: stats.admins,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
            ),
            color: 'text-violet-600',
            bgColor: 'bg-violet-100'
        },
        {
            label: 'Třídy',
            value: stats.totalClasses,
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                </svg>
            ),
            color: 'text-amber-600',
            bgColor: 'bg-amber-100'
        }
    ];

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <header className="mb-10">
                <div className="flex items-center gap-4 mb-2">
                    <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg shadow-violet-200">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Administrace</h1>
                        <p className="text-slate-500">Vítejte zpět, {user.name}</p>
                    </div>
                </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
                {statCards.map((stat, index) => (
                    <div
                        key={index}
                        className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300"
                    >
                        <div className={`w-10 h-10 ${stat.bgColor} rounded-xl flex items-center justify-center mb-3`}>
                            <span className={stat.color}>{stat.icon}</span>
                        </div>
                        <div className="text-2xl font-bold text-slate-900">
                            {statsLoading ? (
                                <div className="h-8 w-12 bg-slate-200 animate-pulse rounded"></div>
                            ) : stat.value}
                        </div>
                        <div className="text-sm text-slate-500">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <h2 className="text-xl font-semibold text-slate-800 mb-5">Rychlé akce</h2>
            <div className="grid md:grid-cols-3 gap-6">
                {quickActions.map((action, index) => (
                    <Link
                        key={index}
                        href={action.href}
                        className="group bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                    >
                        <div className={`w-14 h-14 bg-gradient-to-br ${action.color} rounded-2xl flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                            <span className="text-white">{action.icon}</span>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-violet-600 transition-colors">
                            {action.title}
                        </h3>
                        <p className="text-slate-500 text-sm leading-relaxed">
                            {action.description}
                        </p>
                        <div className="mt-4 flex items-center text-sm font-medium text-violet-600 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-0 group-hover:translate-x-1">
                            Přejít na stránku
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M5 12h14"></path>
                                <path d="M12 5l7 7-7 7"></path>
                            </svg>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
