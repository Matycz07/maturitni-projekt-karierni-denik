"use client";
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface User {
    id: number;
    google_id: string;
    email: string;
    jmeno: string;
    prijmeni: string;
    obrazek_url: string;
    id_opravneni: number;
    role_name: string;
}

interface Class {
    id: number;
    nazev: string;
}

interface UserClass {
    id: number;
    nazev: string;
    id_tridy: number;
    id_uctu: number;
}

const ROLES = [
    { id: 0, name: 'Žák', color: 'bg-blue-500', lightColor: 'bg-blue-50 text-blue-700 border-blue-200', icon: '🎓' },
    { id: 1, name: 'Učitel', color: 'bg-emerald-500', lightColor: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: '👨‍🏫' },
    { id: 2, name: 'Administrátor', color: 'bg-violet-500', lightColor: 'bg-violet-50 text-violet-700 border-violet-200', icon: '🛡️' },
];

export default function UsersPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [userClasses, setUserClasses] = useState<Record<number, UserClass[]>>({});
    const [dataLoading, setDataLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<number | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showAddClassModal, setShowAddClassModal] = useState(false);

    useEffect(() => {
        if (!loading && user && user.role !== 2) {
            router.push('/');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user?.role === 2) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        try {
            const [usersRes, classesRes] = await Promise.all([
                fetch('/api/users'),
                fetch('/api/classes')
            ]);

            if (usersRes.ok && classesRes.ok) {
                const usersData = await usersRes.json();
                const classesData = await classesRes.json();
                setUsers(usersData);
                setClasses(classesData);

                const classesMap: Record<number, UserClass[]> = {};
                for (const u of usersData) {
                    const res = await fetch(`/api/users/${u.id}/classes`);
                    if (res.ok) {
                        classesMap[u.id] = await res.json();
                    }
                }
                setUserClasses(classesMap);
            }
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setDataLoading(false);
        }
    };

    const handleRoleChange = async (userId: number, newRole: number) => {
        try {
            const res = await fetch(`/api/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })
            });
            if (res.ok) {
                setUsers(users.map(u => u.id === userId ? { ...u, id_opravneni: newRole } : u));
            }
        } catch (error) {
            console.error('Failed to update role', error);
        }
    };

    const handleAddClass = async (userId: number, classId: string) => {
        if (!classId) return;
        try {
            const res = await fetch(`/api/users/${userId}/classes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ classId })
            });
            if (res.ok) {
                const classesRes = await fetch(`/api/users/${userId}/classes`);
                if (classesRes.ok) {
                    const data = await classesRes.json();
                    setUserClasses(prev => ({ ...prev, [userId]: data }));
                }
            }
        } catch (error) {
            console.error('Failed to add class', error);
        }
        setShowAddClassModal(false);
        setSelectedUser(null);
    };

    const handleRemoveClass = async (userId: number, classId: number) => {
        try {
            const res = await fetch(`/api/users/${userId}/classes/${classId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                const classesRes = await fetch(`/api/users/${userId}/classes`);
                if (classesRes.ok) {
                    const data = await classesRes.json();
                    setUserClasses(prev => ({ ...prev, [userId]: data }));
                }
            }
        } catch (error) {
            console.error('Failed to remove class', error);
        }
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.jmeno?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.prijmeni?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === null || u.id_opravneni === roleFilter;
        return matchesSearch && matchesRole;
    });

    if (loading || dataLoading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-500 border-t-transparent"></div>
        </div>
    );

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <header className="mb-8">
                <button
                    onClick={() => router.push('/administrator')}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-4 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5"></path>
                        <path d="M12 19l-7-7 7-7"></path>
                    </svg>
                    Zpět na dashboard
                </button>
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg shadow-violet-200">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Správa uživatelů</h1>
                        <p className="text-slate-500">Spravujte role a přístupy uživatelů</p>
                    </div>
                </div>
            </header>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="M21 21l-4.35-4.35"></path>
                        </svg>
                        <input
                            type="text"
                            placeholder="Hledat uživatele..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                        />
                    </div>

                    {/* Role Filter Buttons */}
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => setRoleFilter(null)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${roleFilter === null
                                ? 'bg-slate-900 text-white shadow-lg'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            Všichni ({users.length})
                        </button>
                        {ROLES.map(role => {
                            const count = users.filter(u => u.id_opravneni === role.id).length;
                            return (
                                <button
                                    key={role.id}
                                    onClick={() => setRoleFilter(role.id)}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${roleFilter === role.id
                                        ? `${role.color} text-white shadow-lg`
                                        : `${role.lightColor} border hover:opacity-80`
                                        }`}
                                >
                                    <span>{role.icon}</span>
                                    {role.name} ({count})
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Users Grid */}
            <div className="grid gap-4">
                {filteredUsers.map(u => (
                    <div
                        key={u.id}
                        className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 p-5"
                    >
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                            {/* User Info */}
                            <div className="flex items-center gap-4 flex-1">
                                <div className="relative">
                                    <Image
                                        src={u.obrazek_url || '/placeholder-avatar.png'}
                                        alt={u.jmeno || ''}
                                        width={56}
                                        height={56}
                                        className="rounded-xl object-cover"
                                    />
                                    <div className={`absolute -bottom-1 -right-1 w-5 h-5 ${ROLES[u.id_opravneni]?.color || 'bg-slate-400'} rounded-full border-2 border-white flex items-center justify-center text-xs`}>
                                        {ROLES[u.id_opravneni]?.icon}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-slate-900 truncate">
                                        {u.jmeno} {u.prijmeni}
                                    </h3>
                                    <p className="text-sm text-slate-500 truncate">{u.email}</p>
                                </div>
                            </div>

                            {/* Role Selector */}
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm text-slate-500 mr-2">Role:</span>
                                <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                                    {ROLES.map(role => (
                                        <button
                                            key={role.id}
                                            onClick={() => handleRoleChange(u.id, role.id)}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${u.id_opravneni === role.id
                                                ? `${role.color} text-white shadow-sm`
                                                : 'text-slate-600 hover:bg-slate-200'
                                                }`}
                                        >
                                            <span className="text-base">{role.icon}</span>
                                            <span className="hidden sm:inline">{role.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Classes */}
                            <div className="flex items-center gap-2 flex-wrap lg:justify-end lg:min-w-[200px]">
                                {userClasses[u.id]?.length > 0 ? (
                                    <>
                                        {userClasses[u.id].slice(0, 3).map(cls => (
                                            <span
                                                key={cls.id}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-100"
                                            >
                                                {cls.nazev}
                                                <button
                                                    onClick={() => handleRemoveClass(u.id, cls.id)}
                                                    className="ml-1 text-blue-400 hover:text-red-500 transition-colors"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                                    </svg>
                                                </button>
                                            </span>
                                        ))}
                                        {userClasses[u.id].length > 3 && (
                                            <span className="text-sm text-slate-500">
                                                +{userClasses[u.id].length - 3}
                                            </span>
                                        )}
                                    </>
                                ) : (
                                    <span className="text-sm text-slate-400 italic">Žádné třídy</span>
                                )}
                                <button
                                    onClick={() => {
                                        setSelectedUser(u);
                                        setShowAddClassModal(true);
                                    }}
                                    className="p-2 text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                                    title="Přidat třídu"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {filteredUsers.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 mx-auto mb-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <circle cx="11" cy="11" r="8"></circle>
                            <path d="M21 21l-4.35-4.35"></path>
                        </svg>
                        <p className="text-lg font-medium">Žádní uživatelé nenalezeni</p>
                        <p className="text-sm">Zkuste upravit vyhledávání nebo filtr</p>
                    </div>
                )}
            </div>

            {/* Add Class Modal */}
            {showAddClassModal && selectedUser && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-semibold text-slate-900">
                                Přidat třídu uživateli
                            </h3>
                            <button
                                onClick={() => {
                                    setShowAddClassModal(false);
                                    setSelectedUser(null);
                                }}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>

                        <div className="flex items-center gap-3 mb-6 p-3 bg-slate-50 rounded-xl">
                            <Image
                                src={selectedUser.obrazek_url || '/placeholder-avatar.png'}
                                alt={selectedUser.jmeno || ''}
                                width={40}
                                height={40}
                                className="rounded-lg"
                            />
                            <div>
                                <p className="font-medium text-slate-900">{selectedUser.jmeno} {selectedUser.prijmeni}</p>
                                <p className="text-sm text-slate-500">{selectedUser.email}</p>
                            </div>
                        </div>

                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {classes.filter(cls => !userClasses[selectedUser.id]?.some(uc => uc.id === cls.id)).map(cls => (
                                <button
                                    key={cls.id}
                                    onClick={() => handleAddClass(selectedUser.id, cls.id.toString())}
                                    className="w-full flex items-center gap-3 p-3 text-left bg-white border border-slate-200 rounded-xl hover:border-violet-300 hover:bg-violet-50 transition-all"
                                >
                                    <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                                        {cls.nazev?.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="font-medium text-slate-700">{cls.nazev}</span>
                                </button>
                            ))}
                            {classes.filter(cls => !userClasses[selectedUser.id]?.some(uc => uc.id === cls.id)).length === 0 && (
                                <div className="text-center py-8 text-slate-400">
                                    <p>Uživatel je již ve všech třídách</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
