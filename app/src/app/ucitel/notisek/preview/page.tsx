"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import NotisekViewer, { Topic } from '@/components/NotisekViewer';

export default function TeacherNotisekPreview() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [data, setData] = useState<Topic[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);

    useEffect(() => {
        if (!loading && user) {
            if (user.role !== 1) {
                router.push('/');
            } else {
                fetchPreviewData();
            }
        }
    }, [user, loading, router]);

    const fetchPreviewData = async () => {
        try {
            const res = await fetch('/api/teacher/notisek/preview');
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (error) {
            console.error("Chyba při načítání náhledu", error);
        } finally {
            setIsLoadingData(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-800 bg-gray-50">
                Načítám...
            </div>
        );
    }

    if (!user || user.role !== 1) {
        return null; // Redirecting in useEffect
    }

    return (
        <div className="relative">
            <div className="fixed top-4 right-4 z-50">
                <button
                    onClick={() => router.back()}
                    className="bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-gray-700 transition-colors"
                >
                    Zpět do úprav
                </button>
            </div>
            <div className="border-4 border-indigo-500 min-h-screen relative">
                <div className="absolute top-0 left-0 bg-indigo-500 text-white px-3 py-1 text-sm font-bold uppercase z-40 rounded-br-lg">
                    Náhled notísku
                </div>
                <NotisekViewer data={data} isLoading={isLoadingData} />
            </div>
        </div>
    );
}
