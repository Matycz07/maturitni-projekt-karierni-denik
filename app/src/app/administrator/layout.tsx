import React from 'react';
import AdminSidebar from '@/components/AdminSidebar';

export default function AdministratorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-slate-50">
            <AdminSidebar />
            <main className="lg:pl-72 min-h-screen">
                {children}
            </main>
        </div>
    );
}

