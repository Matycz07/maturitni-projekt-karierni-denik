"use client";

import React, { useState, useEffect } from 'react';
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

export default function AdminUserManagement() {
    const [users, setUsers] = useState<User[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [userClasses, setUserClasses] = useState<Record<number, UserClass[]>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

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

                // Fetch classes for each user (this could be optimized, but for now it's fine)
                const classesMap: Record<number, UserClass[]> = {};
                for (const user of usersData) {
                    const res = await fetch(`/api/users/${user.id}/classes`);
                    if (res.ok) {
                        classesMap[user.id] = await res.json();
                    }
                }
                setUserClasses(classesMap);
            }
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
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
                // Refresh user classes
                const res = await fetch(`/api/users/${userId}/classes`);
                if (res.ok) {
                    const data = await res.json();
                    setUserClasses(prev => ({ ...prev, [userId]: data }));
                }
            }
        } catch (error) {
            console.error('Failed to add class', error);
        }
    };

    const handleRemoveClass = async (userId: number, classId: number) => {
        try {
            const res = await fetch(`/api/users/${userId}/classes/${classId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                // Refresh user classes
                const res = await fetch(`/api/users/${userId}/classes`);
                if (res.ok) {
                    const data = await res.json();
                    setUserClasses(prev => ({ ...prev, [userId]: data }));
                }
            }
        } catch (error) {
            console.error('Failed to remove class', error);
        }
    };

    if (loading) return <div>Načítání uživatelů...</div>;

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uživatel</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Třídy</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                        <tr key={user.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0 h-10 w-10">
                                        <Image className="rounded-full" src={user.obrazek_url} alt="" width={40} height={40} />
                                    </div>
                                    <div className="ml-4">
                                        <div className="text-sm font-medium text-gray-900">{user.jmeno} {user.prijmeni}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{user.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <select
                                    value={user.id_opravneni}
                                    onChange={(e) => handleRoleChange(user.id, parseInt(e.target.value))}
                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                >
                                    <option value={0}>Žák</option>
                                    <option value={1}>Učitel</option>
                                    <option value={2}>Administrátor</option>
                                </select>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col gap-2">
                                    <div className="flex flex-wrap gap-1">
                                        {userClasses[user.id]?.map(cls => (
                                            <span key={cls.id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {cls.nazev}
                                                <button
                                                    onClick={() => handleRemoveClass(user.id, cls.id)}
                                                    className="ml-1 text-blue-500 hover:text-blue-700"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <select
                                            className="block w-full pl-3 pr-10 py-1 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    handleAddClass(user.id, e.target.value);
                                                    e.target.value = ""; // Reset select
                                                }
                                            }}
                                        >
                                            <option value="">Přidat třídu...</option>
                                            {classes.map(cls => (
                                                <option key={cls.id} value={cls.id}>{cls.nazev}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
