"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import NotisekViewer, { Topic } from '@/components/NotisekViewer';

export default function StudentNotisekViewer() {
    const { user, loading } = useAuth();
    const [data, setData] = useState<Topic[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);

    useEffect(() => {
        if (user && !loading) {
            fetchFullNotisek();
        }
    }, [user, loading]);

    const fetchFullNotisek = async () => {
        try {
            const res = await fetch('/api/student/notisek/full');
            if (res.ok) {
                const json = await res.json();
                setData(json);
            }
        } catch (error) {
            console.error("Chyba při načítání notýsku", error);
        } finally {
            setIsLoadingData(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-gray-800">
                Načítám...
            </div>
        );
    }

    return <NotisekViewer data={data} isLoading={isLoadingData} />;
}
