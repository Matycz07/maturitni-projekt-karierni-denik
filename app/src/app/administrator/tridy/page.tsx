"use client";
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface Class {
    id: number;
    nazev: string;
    predmet: string;
    rocnik: string;
    ucebna: string;
    barva: string;
    kod: string;
    vlastnik_id: number;
}

interface User {
    id: number;
    jmeno: string;
    prijmeni: string;
    email: string;
    obrazek_url: string;
    id_opravneni: number;
}

interface ClassMember {
    id: number;
    jmeno: string;
    prijmeni: string;
    email: string;
    obrazek_url: string;
}

export default function ClassesPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [classes, setClasses] = useState<Class[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [classMembers, setClassMembers] = useState<Record<number, ClassMember[]>>({});
    const [classTeachers, setClassTeachers] = useState<Record<number, ClassMember[]>>({});
    const [dataLoading, setDataLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClass, setSelectedClass] = useState<Class | null>(null);
    const [showMembersModal, setShowMembersModal] = useState(false);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [showTeachersModal, setShowTeachersModal] = useState(false);
    const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
    const [memberSearchTerm, setMemberSearchTerm] = useState('');
    const [addMemberSearchTerm, setAddMemberSearchTerm] = useState('');
    const [addTeacherSearchTerm, setAddTeacherSearchTerm] = useState('');

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
            const [classesRes, usersRes] = await Promise.all([
                fetch('/api/classes'),
                fetch('/api/users')
            ]);

            if (classesRes.ok && usersRes.ok) {
                const classesData = await classesRes.json();
                const usersData = await usersRes.json();
                setClasses(classesData);
                setUsers(usersData);

                // Fetch members and teachers for each class
                const membersMap: Record<number, ClassMember[]> = {};
                const teachersMap: Record<number, ClassMember[]> = {};
                for (const cls of classesData) {
                    const [membersRes, teachersRes] = await Promise.all([
                        fetch(`/api/admin/classes/${cls.id}/members`),
                        fetch(`/api/admin/classes/${cls.id}/teachers`)
                    ]);
                    if (membersRes.ok) {
                        membersMap[cls.id] = await membersRes.json();
                    }
                    if (teachersRes.ok) {
                        teachersMap[cls.id] = await teachersRes.json();
                    } else {
                        teachersMap[cls.id] = [];
                    }
                }
                setClassMembers(membersMap);
                setClassTeachers(teachersMap);
            }
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setDataLoading(false);
        }
    };

    const handleAddMember = async (classId: number, userId: number) => {
        try {
            const res = await fetch(`/api/users/${userId}/classes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ classId })
            });
            if (res.ok) {
                const membersRes = await fetch(`/api/admin/classes/${classId}/members`);
                if (membersRes.ok) {
                    const data = await membersRes.json();
                    setClassMembers(prev => ({ ...prev, [classId]: data }));
                }
            }
        } catch (error) {
            console.error('Failed to add member', error);
        }
    };

    const handleRemoveMember = async (classId: number, userId: number) => {
        try {
            const res = await fetch(`/api/users/${userId}/classes/${classId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setClassMembers(prev => ({
                    ...prev,
                    [classId]: prev[classId]?.filter(m => m.id !== userId) || []
                }));
            }
        } catch (error) {
            console.error('Failed to remove member', error);
        }
    };

    const handleAddTeacher = async (classId: number, userId: number) => {
        try {
            const res = await fetch(`/api/admin/classes/${classId}/teachers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
            });
            if (res.ok) {
                const teachersRes = await fetch(`/api/admin/classes/${classId}/teachers`);
                if (teachersRes.ok) {
                    const data = await teachersRes.json();
                    setClassTeachers(prev => ({ ...prev, [classId]: data }));
                }
            }
        } catch (error) {
            console.error('Failed to add teacher', error);
        }
    };

    const handleRemoveTeacher = async (classId: number, userId: number) => {
        try {
            const res = await fetch(`/api/admin/classes/${classId}/teachers/${userId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                setClassTeachers(prev => ({
                    ...prev,
                    [classId]: prev[classId]?.filter(t => t.id !== userId) || []
                }));
            }
        } catch (error) {
            console.error('Failed to remove teacher', error);
        }
    };

    const filteredClasses = classes.filter(cls =>
        cls.nazev?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.predmet?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.rocnik?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getOwner = (ownerId: number) => users.find(u => u.id === ownerId);

    // Filter members for modal with search
    const getFilteredMembers = (classId: number) => {
        const members = classMembers[classId] || [];
        if (!memberSearchTerm) return members;
        return members.filter(m =>
            `${m.jmeno} ${m.prijmeni}`.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
            m.email?.toLowerCase().includes(memberSearchTerm.toLowerCase())
        );
    };

    // Filter available students for adding
    const getAvailableStudents = (classId: number) => {
        const currentMembers = classMembers[classId] || [];
        return users
            .filter(u => u.id_opravneni === 0) // Only students
            .filter(u => !currentMembers.some(m => m.id === u.id))
            .filter(u =>
                !addMemberSearchTerm ||
                `${u.jmeno} ${u.prijmeni}`.toLowerCase().includes(addMemberSearchTerm.toLowerCase()) ||
                u.email?.toLowerCase().includes(addMemberSearchTerm.toLowerCase())
            );
    };

    // Filter available teachers for adding
    const getAvailableTeachers = (classId: number) => {
        const currentTeachers = classTeachers[classId] || [];
        return users
            .filter(u => u.id_opravneni === 1) // Only teachers
            .filter(u => !currentTeachers.some(t => t.id === u.id))
            .filter(u =>
                !addTeacherSearchTerm ||
                `${u.jmeno} ${u.prijmeni}`.toLowerCase().includes(addTeacherSearchTerm.toLowerCase()) ||
                u.email?.toLowerCase().includes(addTeacherSearchTerm.toLowerCase())
            );
    };

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
                    <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg shadow-emerald-200">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Správa tříd</h1>
                        <p className="text-slate-500">Přehled všech tříd, jejich žáků a učitelů</p>
                    </div>
                </div>
            </header>

            {/* Search */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6">
                <div className="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="M21 21l-4.35-4.35"></path>
                    </svg>
                    <input
                        type="text"
                        placeholder="Hledat třídy..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                </div>
            </div>

            {/* Classes Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClasses.map(cls => {
                    const owner = getOwner(cls.vlastnik_id);
                    const members = classMembers[cls.id] || [];
                    const teachers = classTeachers[cls.id] || [];
                    return (
                        <div
                            key={cls.id}
                            className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                        >
                            {/* Color Header */}
                            <div
                                className="h-3"
                                style={{ backgroundColor: cls.barva || '#6366f1' }}
                            ></div>

                            <div className="p-5">
                                {/* Class Info */}
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="font-semibold text-lg text-slate-900">{cls.nazev || cls.predmet}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            {cls.rocnik && (
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                                                    {cls.rocnik}
                                                </span>
                                            )}
                                            {cls.ucebna && (
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                                                    {cls.ucebna}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium border border-emerald-100">
                                            {members.length} žáků
                                        </span>
                                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-100">
                                            {teachers.length} učitelů
                                        </span>
                                        {cls.kod && (
                                            <code className="text-xs text-slate-400 font-mono">{cls.kod}</code>
                                        )}
                                    </div>
                                </div>

                                {/* Owner */}
                                {owner && (
                                    <div className="flex items-center gap-2 mb-4 p-2 bg-slate-50 rounded-lg">
                                        <Image
                                            src={owner.obrazek_url || '/placeholder-avatar.png'}
                                            alt={owner.jmeno || ''}
                                            width={28}
                                            height={28}
                                            className="rounded-full"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-700 truncate">
                                                {owner.jmeno} {owner.prijmeni}
                                            </p>
                                            <p className="text-xs text-slate-400">Vlastník</p>
                                        </div>
                                    </div>
                                )}

                                {/* Members Preview */}
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex -space-x-2">
                                        {members.slice(0, 4).map((member, idx) => (
                                            <Image
                                                key={member.id}
                                                src={member.obrazek_url || '/placeholder-avatar.png'}
                                                alt={member.jmeno || ''}
                                                width={32}
                                                height={32}
                                                className="rounded-full border-2 border-white"
                                                style={{ zIndex: 4 - idx }}
                                            />
                                        ))}
                                        {members.length > 4 && (
                                            <div className="w-8 h-8 bg-slate-200 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium text-slate-600">
                                                +{members.length - 4}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => {
                                                setSelectedClass(cls);
                                                setMemberSearchTerm('');
                                                setShowMembersModal(true);
                                            }}
                                            className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                            title="Zobrazit žáky"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                                <circle cx="9" cy="7" r="4"></circle>
                                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => {
                                                setSelectedClass(cls);
                                                setAddMemberSearchTerm('');
                                                setShowAddMemberModal(true);
                                            }}
                                            className="p-2 text-violet-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                                            title="Přidat žáka"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                                <circle cx="8.5" cy="7" r="4"></circle>
                                                <line x1="20" y1="8" x2="20" y2="14"></line>
                                                <line x1="23" y1="11" x2="17" y2="11"></line>
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Teachers Section */}
                                <div className="pt-3 border-t border-slate-100">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-slate-400 uppercase">Učitelé</span>
                                            <div className="flex -space-x-2">
                                                {teachers.slice(0, 3).map((teacher, idx) => (
                                                    <Image
                                                        key={teacher.id}
                                                        src={teacher.obrazek_url || '/placeholder-avatar.png'}
                                                        alt={teacher.jmeno || ''}
                                                        width={28}
                                                        height={28}
                                                        className="rounded-full border-2 border-white"
                                                        style={{ zIndex: 3 - idx }}
                                                    />
                                                ))}
                                                {teachers.length > 3 && (
                                                    <div className="w-7 h-7 bg-blue-100 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium text-blue-600">
                                                        +{teachers.length - 3}
                                                    </div>
                                                )}
                                                {teachers.length === 0 && (
                                                    <span className="text-xs text-slate-400 italic">Žádní</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => {
                                                    setSelectedClass(cls);
                                                    setShowTeachersModal(true);
                                                }}
                                                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Zobrazit učitele"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                    <circle cx="12" cy="12" r="3"></circle>
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedClass(cls);
                                                    setAddTeacherSearchTerm('');
                                                    setShowAddTeacherModal(true);
                                                }}
                                                className="p-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Přidat učitele"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {filteredClasses.length === 0 && (
                    <div className="col-span-full text-center py-12 text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 mx-auto mb-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                        </svg>
                        <p className="text-lg font-medium">Žádné třídy nenalezeny</p>
                        <p className="text-sm">Zkuste upravit vyhledávání</p>
                    </div>
                )}
            </div>

            {/* Members Modal */}
            {showMembersModal && selectedClass && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-xl font-semibold text-slate-900">
                                    Žáci ve třídě
                                </h3>
                                <p className="text-sm text-slate-500">{selectedClass.nazev}</p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowMembersModal(false);
                                    setSelectedClass(null);
                                }}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>

                        {/* Search */}
                        <div className="relative mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="M21 21l-4.35-4.35"></path>
                            </svg>
                            <input
                                type="text"
                                placeholder="Hledat žáky..."
                                value={memberSearchTerm}
                                onChange={(e) => setMemberSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-sm"
                            />
                        </div>

                        <div className="space-y-2 overflow-y-auto flex-1">
                            {getFilteredMembers(selectedClass.id).map(member => (
                                <div
                                    key={member.id}
                                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"
                                >
                                    <Image
                                        src={member.obrazek_url || '/placeholder-avatar.png'}
                                        alt={member.jmeno || ''}
                                        width={40}
                                        height={40}
                                        className="rounded-lg"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-900">{member.jmeno} {member.prijmeni}</p>
                                        <p className="text-sm text-slate-500 truncate">{member.email}</p>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveMember(selectedClass.id, member.id)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Odebrat z třídy"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="8.5" cy="7" r="4"></circle>
                                            <line x1="23" y1="11" x2="17" y2="11"></line>
                                        </svg>
                                    </button>
                                </div>
                            ))}
                            {getFilteredMembers(selectedClass.id).length === 0 && (
                                <div className="text-center py-8 text-slate-400">
                                    <p>{memberSearchTerm ? 'Žádní žáci nenalezeni' : 'Třída nemá žádné žáky'}</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <button
                                onClick={() => {
                                    setShowMembersModal(false);
                                    setAddMemberSearchTerm('');
                                    setShowAddMemberModal(true);
                                }}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-medium hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg shadow-violet-200"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="8.5" cy="7" r="4"></circle>
                                    <line x1="20" y1="8" x2="20" y2="14"></line>
                                    <line x1="23" y1="11" x2="17" y2="11"></line>
                                </svg>
                                Přidat žáka
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Member Modal */}
            {showAddMemberModal && selectedClass && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-xl font-semibold text-slate-900">
                                    Přidat žáka
                                </h3>
                                <p className="text-sm text-slate-500">{selectedClass.nazev}</p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowAddMemberModal(false);
                                    setSelectedClass(null);
                                }}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>

                        {/* Search */}
                        <div className="relative mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="M21 21l-4.35-4.35"></path>
                            </svg>
                            <input
                                type="text"
                                placeholder="Hledat žáky..."
                                value={addMemberSearchTerm}
                                onChange={(e) => setAddMemberSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all text-sm"
                            />
                        </div>

                        <div className="space-y-2 overflow-y-auto flex-1">
                            {getAvailableStudents(selectedClass.id).map(u => (
                                <button
                                    key={u.id}
                                    onClick={() => handleAddMember(selectedClass.id, u.id)}
                                    className="w-full flex items-center gap-3 p-3 text-left bg-white border border-slate-200 rounded-xl hover:border-violet-300 hover:bg-violet-50 transition-all"
                                >
                                    <Image
                                        src={u.obrazek_url || '/placeholder-avatar.png'}
                                        alt={u.jmeno || ''}
                                        width={40}
                                        height={40}
                                        className="rounded-lg"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-700">{u.jmeno} {u.prijmeni}</p>
                                        <p className="text-sm text-slate-400 truncate">{u.email}</p>
                                    </div>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                </button>
                            ))}
                            {getAvailableStudents(selectedClass.id).length === 0 && (
                                <div className="text-center py-8 text-slate-400">
                                    <p>{addMemberSearchTerm ? 'Žádní žáci nenalezeni' : 'Žádní dostupní žáci k přidání'}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Teachers Modal */}
            {showTeachersModal && selectedClass && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-xl font-semibold text-slate-900">
                                    Učitelé třídy
                                </h3>
                                <p className="text-sm text-slate-500">{selectedClass.nazev}</p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowTeachersModal(false);
                                    setSelectedClass(null);
                                }}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-2 overflow-y-auto flex-1">
                            {(classTeachers[selectedClass.id] || []).map(teacher => (
                                <div
                                    key={teacher.id}
                                    className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100"
                                >
                                    <Image
                                        src={teacher.obrazek_url || '/placeholder-avatar.png'}
                                        alt={teacher.jmeno || ''}
                                        width={40}
                                        height={40}
                                        className="rounded-lg"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-900">{teacher.jmeno} {teacher.prijmeni}</p>
                                        <p className="text-sm text-slate-500 truncate">{teacher.email}</p>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveTeacher(selectedClass.id, teacher.id)}
                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Odebrat z třídy"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="8.5" cy="7" r="4"></circle>
                                            <line x1="23" y1="11" x2="17" y2="11"></line>
                                        </svg>
                                    </button>
                                </div>
                            ))}
                            {(classTeachers[selectedClass.id] || []).length === 0 && (
                                <div className="text-center py-8 text-slate-400">
                                    <p>Třída nemá žádné přiřazené učitele</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-100">
                            <button
                                onClick={() => {
                                    setShowTeachersModal(false);
                                    setAddTeacherSearchTerm('');
                                    setShowAddTeacherModal(true);
                                }}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-cyan-700 transition-all shadow-lg shadow-blue-200"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                Přidat učitele
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Teacher Modal */}
            {showAddTeacherModal && selectedClass && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-xl font-semibold text-slate-900">
                                    Přidat učitele
                                </h3>
                                <p className="text-sm text-slate-500">{selectedClass.nazev}</p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowAddTeacherModal(false);
                                    setSelectedClass(null);
                                }}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>

                        {/* Search */}
                        <div className="relative mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="M21 21l-4.35-4.35"></path>
                            </svg>
                            <input
                                type="text"
                                placeholder="Hledat učitele..."
                                value={addTeacherSearchTerm}
                                onChange={(e) => setAddTeacherSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                            />
                        </div>

                        <div className="space-y-2 overflow-y-auto flex-1">
                            {getAvailableTeachers(selectedClass.id).map(u => (
                                <button
                                    key={u.id}
                                    onClick={() => handleAddTeacher(selectedClass.id, u.id)}
                                    className="w-full flex items-center gap-3 p-3 text-left bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all"
                                >
                                    <Image
                                        src={u.obrazek_url || '/placeholder-avatar.png'}
                                        alt={u.jmeno || ''}
                                        width={40}
                                        height={40}
                                        className="rounded-lg"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-700">{u.jmeno} {u.prijmeni}</p>
                                        <p className="text-sm text-slate-400 truncate">{u.email}</p>
                                    </div>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                </button>
                            ))}
                            {getAvailableTeachers(selectedClass.id).length === 0 && (
                                <div className="text-center py-8 text-slate-400">
                                    <p>{addTeacherSearchTerm ? 'Žádní učitelé nenalezeni' : 'Žádní dostupní učitelé k přidání'}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
