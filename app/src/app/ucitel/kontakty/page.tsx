"use client";

import { useState, useEffect } from "react";
import TeacherLayout from "../../../components/TeacherLayout";
import { useAuth } from "@/hooks/useAuth";

interface School {
    id: number;
    nazev: string;
    adresa: string;
    fakulta: string;
    obor: string;
    web: string;
    email: string;
    poznamka: string;
}

interface Contact {
    id: number;
    jmeno: string;
    email: string;
    telefon: string;
    pozice: string;
    skola_id: number | null;
    skola_nazev: string | null;
    poznamka: string;
}

type TabType = "skoly" | "kontakty";

export default function KontaktyPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>("skoly");
    const [schools, setSchools] = useState<School[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal states
    const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    const [editingSchool, setEditingSchool] = useState<School | null>(null);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);

    // Form states for school
    const [schoolForm, setSchoolForm] = useState({
        nazev: "",
        adresa: "",
        fakulta: "",
        obor: "",
        web: "",
        email: "",
        poznamka: ""
    });

    // Form states for contact
    const [contactForm, setContactForm] = useState({
        jmeno: "",
        email: "",
        telefon: "",
        pozice: "",
        skola_id: null as number | null,
        poznamka: ""
    });

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [schoolsRes, contactsRes] = await Promise.all([
                fetch("/api/teacher/skoly"),
                fetch("/api/teacher/kontakty")
            ]);
            if (schoolsRes.ok) setSchools(await schoolsRes.json());
            if (contactsRes.ok) setContacts(await contactsRes.json());
        } catch (error) {
            console.error("Error fetching data:", error);
        }
        setIsLoading(false);
    };

    // School handlers
    const openSchoolModal = (school?: School) => {
        if (school) {
            setEditingSchool(school);
            setSchoolForm({
                nazev: school.nazev || "",
                adresa: school.adresa || "",
                fakulta: school.fakulta || "",
                obor: school.obor || "",
                web: school.web || "",
                email: school.email || "",
                poznamka: school.poznamka || ""
            });
        } else {
            setEditingSchool(null);
            setSchoolForm({ nazev: "", adresa: "", fakulta: "", obor: "", web: "", email: "", poznamka: "" });
        }
        setIsSchoolModalOpen(true);
    };

    const handleSchoolSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingSchool ? `/api/teacher/skoly/${editingSchool.id}` : "/api/teacher/skoly";
            const method = editingSchool ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(schoolForm)
            });
            if (res.ok) {
                fetchData();
                setIsSchoolModalOpen(false);
            }
        } catch (error) {
            console.error("Error saving school:", error);
        }
    };

    const handleDeleteSchool = async (id: number) => {
        if (confirm("Opravdu chcete smazat tuto školu?")) {
            try {
                const res = await fetch(`/api/teacher/skoly/${id}`, { method: "DELETE" });
                if (res.ok) fetchData();
            } catch (error) {
                console.error("Error deleting school:", error);
            }
        }
    };

    // Contact handlers
    const openContactModal = (contact?: Contact) => {
        if (contact) {
            setEditingContact(contact);
            setContactForm({
                jmeno: contact.jmeno || "",
                email: contact.email || "",
                telefon: contact.telefon || "",
                pozice: contact.pozice || "",
                skola_id: contact.skola_id,
                poznamka: contact.poznamka || ""
            });
        } else {
            setEditingContact(null);
            setContactForm({ jmeno: "", email: "", telefon: "", pozice: "", skola_id: null, poznamka: "" });
        }
        setIsContactModalOpen(true);
    };

    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingContact ? `/api/teacher/kontakty/${editingContact.id}` : "/api/teacher/kontakty";
            const method = editingContact ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(contactForm)
            });
            if (res.ok) {
                fetchData();
                setIsContactModalOpen(false);
            }
        } catch (error) {
            console.error("Error saving contact:", error);
        }
    };

    const handleDeleteContact = async (id: number) => {
        if (confirm("Opravdu chcete smazat tento kontakt?")) {
            try {
                const res = await fetch(`/api/teacher/kontakty/${id}`, { method: "DELETE" });
                if (res.ok) fetchData();
            } catch (error) {
                console.error("Error deleting contact:", error);
            }
        }
    };

    return (
        <TeacherLayout>
            <div className="max-w-7xl mx-auto">
                {/* Page Header */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                                Kontakty & Školy
                            </h1>
                            <p className="text-gray-500 mt-1">
                                Spravujte kontakty na osoby z VŠ a seznam škol.
                            </p>
                        </div>
                        <button
                            onClick={() => activeTab === "skoly" ? openSchoolModal() : openContactModal()}
                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-200 font-medium"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            <span>{activeTab === "skoly" ? "Přidat školu" : "Přidat kontakt"}</span>
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="mb-6">
                    <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
                        <button
                            onClick={() => setActiveTab("skoly")}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "skoly"
                                    ? "bg-white text-emerald-700 shadow-sm"
                                    : "text-gray-600 hover:text-gray-900"
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                <polyline points="9 22 9 12 15 12 15 22"></polyline>
                            </svg>
                            Školy ({schools.length})
                        </button>
                        <button
                            onClick={() => setActiveTab("kontakty")}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "kontakty"
                                    ? "bg-white text-emerald-700 shadow-sm"
                                    : "text-gray-600 hover:text-gray-900"
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                            Kontakty ({contacts.length})
                        </button>
                    </div>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                    </div>
                ) : activeTab === "skoly" ? (
                    /* Schools Table */
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        {schools.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                        <polyline points="9 22 9 12 15 12 15 22"></polyline>
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-1">Zatím nemáte žádné školy</h3>
                                <p className="text-gray-500 mb-4">Přidejte první školu pro správu kontaktů.</p>
                                <button
                                    onClick={() => openSchoolModal()}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                    Přidat školu
                                </button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Název</th>
                                            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Fakulta</th>
                                            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Obor</th>
                                            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                                            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Web</th>
                                            <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Akce</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {schools.map((school) => (
                                            <tr key={school.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                                                            {school.nazev.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-gray-900">{school.nazev}</p>
                                                            {school.adresa && <p className="text-xs text-gray-500">{school.adresa}</p>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{school.fakulta || "—"}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{school.obor || "—"}</td>
                                                <td className="px-6 py-4">
                                                    {school.email ? (
                                                        <a href={`mailto:${school.email}`} className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                                                <polyline points="22,6 12,13 2,6"></polyline>
                                                            </svg>
                                                            {school.email}
                                                        </a>
                                                    ) : "—"}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {school.web ? (
                                                        <a href={school.web.startsWith("http") ? school.web : `https://${school.web}`} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1.5">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <circle cx="12" cy="12" r="10"></circle>
                                                                <line x1="2" y1="12" x2="22" y2="12"></line>
                                                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                                                            </svg>
                                                            Web
                                                        </a>
                                                    ) : "—"}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => openSchoolModal(school)}
                                                            className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                            title="Upravit"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteSchool(school.id)}
                                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Smazat"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Contacts Table */
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        {contacts.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="9" cy="7" r="4"></circle>
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-1">Zatím nemáte žádné kontakty</h3>
                                <p className="text-gray-500 mb-4">Přidejte první kontakt na osobu z VŠ.</p>
                                <button
                                    onClick={() => openContactModal()}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                    Přidat kontakt
                                </button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Jméno</th>
                                            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pozice</th>
                                            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Škola</th>
                                            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                                            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Telefon</th>
                                            <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Akce</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {contacts.map((contact) => (
                                            <tr key={contact.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                                                            {contact.jmeno.charAt(0).toUpperCase()}
                                                        </div>
                                                        <p className="font-semibold text-gray-900">{contact.jmeno}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {contact.pozice ? (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                                            {contact.pozice}
                                                        </span>
                                                    ) : "—"}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{contact.skola_nazev || "—"}</td>
                                                <td className="px-6 py-4">
                                                    {contact.email ? (
                                                        <a href={`mailto:${contact.email}`} className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                                                <polyline points="22,6 12,13 2,6"></polyline>
                                                            </svg>
                                                            {contact.email}
                                                        </a>
                                                    ) : "—"}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {contact.telefon ? (
                                                        <a href={`tel:${contact.telefon}`} className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1.5">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                                            </svg>
                                                            {contact.telefon}
                                                        </a>
                                                    ) : "—"}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => openContactModal(contact)}
                                                            className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                            title="Upravit"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteContact(contact.id)}
                                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Smazat"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* School Modal */}
            {isSchoolModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900">
                                    {editingSchool ? "Upravit školu" : "Nová škola"}
                                </h2>
                                <button
                                    onClick={() => setIsSchoolModalOpen(false)}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <form onSubmit={handleSchoolSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Název školy *</label>
                                <input
                                    type="text"
                                    value={schoolForm.nazev}
                                    onChange={(e) => setSchoolForm({ ...schoolForm, nazev: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                    placeholder="např. Univerzita Karlova"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Fakulta</label>
                                    <input
                                        type="text"
                                        value={schoolForm.fakulta}
                                        onChange={(e) => setSchoolForm({ ...schoolForm, fakulta: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                        placeholder="např. FIT"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Obor</label>
                                    <input
                                        type="text"
                                        value={schoolForm.obor}
                                        onChange={(e) => setSchoolForm({ ...schoolForm, obor: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                        placeholder="např. Informatika"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresa</label>
                                <input
                                    type="text"
                                    value={schoolForm.adresa}
                                    onChange={(e) => setSchoolForm({ ...schoolForm, adresa: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                    placeholder="např. Praha 1"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                                    <input
                                        type="email"
                                        value={schoolForm.email}
                                        onChange={(e) => setSchoolForm({ ...schoolForm, email: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                        placeholder="info@skola.cz"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Web</label>
                                    <input
                                        type="text"
                                        value={schoolForm.web}
                                        onChange={(e) => setSchoolForm({ ...schoolForm, web: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                        placeholder="www.skola.cz"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Poznámka</label>
                                <textarea
                                    value={schoolForm.poznamka}
                                    onChange={(e) => setSchoolForm({ ...schoolForm, poznamka: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none"
                                    rows={3}
                                    placeholder="Volitelná poznámka..."
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsSchoolModalOpen(false)}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Zrušit
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium"
                                >
                                    {editingSchool ? "Uložit" : "Vytvořit"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Contact Modal */}
            {isContactModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900">
                                    {editingContact ? "Upravit kontakt" : "Nový kontakt"}
                                </h2>
                                <button
                                    onClick={() => setIsContactModalOpen(false)}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <form onSubmit={handleContactSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Jméno *</label>
                                <input
                                    type="text"
                                    value={contactForm.jmeno}
                                    onChange={(e) => setContactForm({ ...contactForm, jmeno: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                    placeholder="Jméno a příjmení"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Pozice</label>
                                <input
                                    type="text"
                                    value={contactForm.pozice}
                                    onChange={(e) => setContactForm({ ...contactForm, pozice: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                    placeholder="např. Vedoucí katedry, Proděkan..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Škola</label>
                                <select
                                    value={contactForm.skola_id || ""}
                                    onChange={(e) => setContactForm({ ...contactForm, skola_id: e.target.value ? Number(e.target.value) : null })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white"
                                >
                                    <option value="">— Vyberte školu —</option>
                                    {schools.map((school) => (
                                        <option key={school.id} value={school.id}>
                                            {school.nazev}{school.fakulta ? ` - ${school.fakulta}` : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                                    <input
                                        type="email"
                                        value={contactForm.email}
                                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                        placeholder="email@domena.cz"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefon</label>
                                    <input
                                        type="tel"
                                        value={contactForm.telefon}
                                        onChange={(e) => setContactForm({ ...contactForm, telefon: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                        placeholder="+420 123 456 789"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Poznámka</label>
                                <textarea
                                    value={contactForm.poznamka}
                                    onChange={(e) => setContactForm({ ...contactForm, poznamka: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none"
                                    rows={3}
                                    placeholder="Volitelná poznámka..."
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsContactModalOpen(false)}
                                    className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Zrušit
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors font-medium"
                                >
                                    {editingContact ? "Uložit" : "Vytvořit"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </TeacherLayout>
    );
}
