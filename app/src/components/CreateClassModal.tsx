"use client";

import { useState, useEffect } from "react";

interface CreateClassModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: ClassData) => void;
    initialData?: ClassData | null;
}

export interface ClassData {
    id?: number;
    subject: string;
    section: string;
    room: string;
    color: string;
    image?: string;
}

const COLORS = [
    { name: "Blue", value: "bg-blue-600" },
    { name: "Emerald", value: "bg-emerald-600" },
    { name: "Orange", value: "bg-orange-600" },
    { name: "Slate", value: "bg-slate-700" },
    { name: "Amber", value: "bg-amber-600" },
    { name: "Purple", value: "bg-purple-600" },
    { name: "Rose", value: "bg-rose-600" },
    { name: "Cyan", value: "bg-cyan-600" },
];

export default function CreateClassModal({ isOpen, onClose, onSubmit, initialData }: CreateClassModalProps) {
    const [formData, setFormData] = useState<ClassData>({
        subject: "",
        section: "",
        room: "",
        color: COLORS[0].value,
    });

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({
                subject: "",
                section: "",
                room: "",
                color: COLORS[0].value,
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-xl font-bold text-slate-900">
                        {initialData ? "Upravit třídu" : "Vytvořit novou třídu"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Předmět</label>
                        <input
                            type="text"
                            required
                            value={formData.subject}
                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            placeholder="Např. Matematika"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Třída</label>
                            <input
                                type="text"
                                required
                                value={formData.section}
                                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                placeholder="Např. 4.A"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Ročník</label>
                            <input
                                type="text"
                                value={formData.room}
                                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                placeholder="Např. 2025/26"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Barva karty</label>
                        <div className="flex flex-wrap gap-2">
                            {COLORS.map((color) => (
                                <button
                                    key={color.value}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, color: color.value })}
                                    className={`w-8 h-8 rounded-full ${color.value} transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${formData.color === color.value ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : ''
                                        }`}
                                    title={color.name}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                        >
                            Zrušit
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 font-medium shadow-sm hover:shadow transition-all"
                        >
                            {initialData ? "Uložit změny" : "Vytvořit třídu"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
