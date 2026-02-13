import React from 'react';
import AdminSidebar from '@/components/AdminSidebar';

export default function AdministratorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <AdminSidebar />
            <main className="lg:pl-72 min-h-screen">
                {children}
            </main>
        </div>
    );
}

