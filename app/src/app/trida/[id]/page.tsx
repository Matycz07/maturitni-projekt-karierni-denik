"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import TeacherLayout from "../../../components/TeacherLayout";
import InviteTeacherModal from "../../../components/InviteTeacherModal";
import AddStudentModal from "../../../components/AddStudentModal";

interface Student {
    id: number;
    jmeno: string;
    prijmeni: string;
    email: string;
    obrazek_url: string;
}

interface ClassDetail {
    id: number;
    nazev: string;
    predmet: string;
    rocnik: string;
    ucebna: string;
    barva: string;
    isOwner: number; // 1 or 0
    vlastnik_id: number;
}

interface Attachment {
    name: string;
    url: string;
    type: string;
}

interface Option {
    id: number;
    text: string;
    isCorrect: boolean;
    outcomePoints?: Record<string, number>;
}

interface Question {
    id: number;
    text: string;
    points: number;
    options: Option[];
    studentAnswerIds?: number[];
}

interface StudentTask {
    id: number;
    title: string;
    description: string;
    dueDate: string;
    type: 'classic' | 'test' | 'outcome' | 'predefined_test';
    testId: number | null;
    templateType?: string;
    submissionId: number | null;
    status: string | null; // e.g., 'submitted'
    submittedAt: string | null;
    hodnoceni?: string;
    attachments?: Attachment[];
    testResults?: Question[];
    outcomes?: { id: number; nazev: string }[];
}

interface PortfolioFile {
    id: number;
    nazev: string;
    popis: string | null;
    google_file_id: string;
    google_file_url: string;
    mime_type: string;
    velikost: number;
    created_at: string;
}

const getFileIcon = (mimeType: string) => {
    if (mimeType?.includes("pdf")) {
        return (
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
            </div>
        );
    }
    if (mimeType?.includes("image")) {
        return (
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            </div>
        );
    }
    if (mimeType?.includes("word") || mimeType?.includes("document")) {
        return (
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
            </div>
        );
    }
    if (mimeType?.includes("video")) {
        return (
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
            </div>
        );
    }
    return (
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
        </div>
    );
};

const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

export default function ClassDetailPage() {
    const { user, loading } = useAuth();
    const params = useParams();
    const classId = params.id;

    const [classData, setClassData] = useState<ClassDetail | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [studentTasks, setStudentTasks] = useState<StudentTask[]>([]);
    const [isLoadingTasks, setIsLoadingTasks] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [isResultsFullscreen, setIsResultsFullscreen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
    const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
    const [studentSearchTerm, setStudentSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState<"tasks" | "portfolio">("tasks");
    const [portfolioFiles, setPortfolioFiles] = useState<PortfolioFile[]>([]);
    const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(false);

    const fetchClassDetails = useCallback(async () => {
        try {
            const res = await fetch(`/api/teacher/classes/${classId}`);
            if (res.ok) {
                const data = await res.json();
                setClassData(data);
            } else {
                setError("Třída nenalezena");
            }
        } catch (err) {
            console.error(err);
            setError("Chyba při načítání třídy");
        }
    }, [classId]);

    const fetchStudents = useCallback(async () => {
        try {
            const res = await fetch(`/api/teacher/classes/${classId}/students`);
            if (res.ok) {
                const data = await res.json();
                setStudents(data);
            }
        } catch (err) {
            console.error(err);
        }
    }, [classId]);

    const fetchStudentTasks = useCallback(async (studentId: number) => {
        setIsLoadingTasks(true);
        try {
            const res = await fetch(`/api/teacher/classes/${classId}/students/${studentId}/tasks`);
            if (res.ok) {
                const data = await res.json();
                setStudentTasks(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoadingTasks(false);
        }
    }, [classId]);

    const fetchStudentPortfolio = useCallback(async (studentId: number) => {
        setIsLoadingPortfolio(true);
        try {
            const res = await fetch(`/api/teacher/classes/${classId}/students/${studentId}/portfolio`);
            if (res.ok) {
                const data = await res.json();
                setPortfolioFiles(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoadingPortfolio(false);
        }
    }, [classId]);

    useEffect(() => {
        if (user && classId) {
            fetchClassDetails();
            fetchStudents();
        }
    }, [user, classId, fetchClassDetails, fetchStudents]);

    useEffect(() => {
        if (selectedStudent) {
            fetchStudentTasks(selectedStudent.id);
            fetchStudentPortfolio(selectedStudent.id);
            setActiveTab("tasks");
        } else {
            setStudentTasks([]);
            setPortfolioFiles([]);
        }
    }, [selectedStudent, fetchStudentTasks, fetchStudentPortfolio]);

    const handleResetSubmission = async (submissionId: number) => {
        if (!confirm("Opravdu chcete smazat odevzdání tohoto studenta? Student bude moci úkol odevzdat znovu.")) return;

        try {
            const res = await fetch(`/api/teacher/submissions/${submissionId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                if (selectedStudent) {
                    fetchStudentTasks(selectedStudent.id);
                }
            } else {
                alert("Chyba při mazání odevzdání");
            }
        } catch (err) {
            console.error(err);
            alert("Chyba sítě");
        }
    };

    const handleRemoveStudent = async (studentId: number) => {
        if (!confirm("Opravdu chcete odebrat tohoto studenta ze třídy?")) return;

        try {
            const res = await fetch(`/api/teacher/classes/${classId}/students/${studentId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                setStudents(students.filter((s) => s.id !== studentId));
                if (selectedStudent?.id === studentId) {
                    setSelectedStudent(null);
                }
            }
        } catch (err) {
            console.error(err);
            alert("Chyba při odebírání studenta");
        }
    };

    const toggleTaskExpansion = (taskId: number) => {
        setExpandedTasks(prev => {
            const newSet = new Set(prev);
            if (newSet.has(taskId)) {
                newSet.delete(taskId);
            } else {
                newSet.add(taskId);
            }
            return newSet;
        });
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen">Načítání...</div>;
    if (!user) return null;

    if (error && !classData) {
        return (
            <div className="flex items-center justify-center min-h-screen flex-col gap-4">
                <h1 className="text-2xl font-bold text-red-600">{error}</h1>
                <Link href="/ucitel" className="text-emerald-600 hover:underline">Zpět na přehled</Link>
            </div>
        );
    }

    return (
        <TeacherLayout>
            <div className="max-w-7xl mx-auto">
                {/* Page Header */}
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <Link href="/ucitel" className="text-gray-400 hover:text-gray-600 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M19 12H5m7 7-7-7 7-7" />
                                    </svg>
                                </Link>
                                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                                    {classData?.predmet || classData?.nazev}
                                </h1>
                            </div>
                            <p className="text-gray-500 mt-1">
                                {classData?.rocnik} • {classData?.ucebna}
                            </p>
                        </div>
                        {classData?.isOwner === 1 && (
                            <button
                                onClick={() => setIsInviteModalOpen(true)}
                                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 hover:shadow-xl hover:shadow-emerald-200 font-medium"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="8.5" cy="7" r="4"></circle>
                                    <line x1="20" y1="8" x2="20" y2="14"></line>
                                    <line x1="23" y1="11" x2="17" y2="11"></line>
                                </svg>
                                <span>Spravovat učitele</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Panel: Student List */}
                    <div className={`lg:col-span-4 ${selectedStudent ? "hidden lg:block" : "block"}`}>
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-[calc(100vh-180px)] flex flex-col">
                            <div className="p-5 border-b border-gray-100">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-gray-900">Studenti ({students.length})</h3>
                                    <button
                                        onClick={() => setIsAddStudentModalOpen(true)}
                                        className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <line x1="12" y1="5" x2="12" y2="19"></line>
                                            <line x1="5" y1="12" x2="19" y2="12"></line>
                                        </svg>
                                        Přidat
                                    </button>
                                </div>
                            </div>

                            {/* Search Students */}
                            {students.length > 0 && (
                                <div className="px-3 pb-2">
                                    <div className="relative">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="11" cy="11" r="8"></circle>
                                            <path d="M21 21l-4.35-4.35"></path>
                                        </svg>
                                        <input
                                            type="text"
                                            placeholder="Hledat studenty..."
                                            value={studentSearchTerm}
                                            onChange={(e) => setStudentSearchTerm(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto p-3 space-y-1">
                                {students.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400 text-sm">
                                        Žádní studenti ve třídě
                                    </div>
                                ) : (
                                    students
                                        .filter(s => !studentSearchTerm ||
                                            `${s.jmeno} ${s.prijmeni}`.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
                                            s.email?.toLowerCase().includes(studentSearchTerm.toLowerCase())
                                        )
                                        .map((student) => (
                                            <div
                                                key={student.id}
                                                onClick={() => setSelectedStudent(student)}
                                                className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${selectedStudent?.id === student.id
                                                    ? "bg-emerald-50 border border-emerald-100 ring-1 ring-emerald-200"
                                                    : "hover:bg-gray-50 border border-transparent hover:border-gray-100"
                                                    }`}
                                            >
                                                <div className="relative">
                                                    {student.obrazek_url ? (
                                                        <Image
                                                            src={student.obrazek_url}
                                                            alt={student.jmeno}
                                                            width={40}
                                                            height={40}
                                                            className="rounded-full object-cover border border-gray-200"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold border border-emerald-200">
                                                            {student.jmeno[0]}{student.prijmeni[0]}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-medium truncate ${selectedStudent?.id === student.id ? "text-emerald-900" : "text-gray-900"}`}>
                                                        {student.jmeno} {student.prijmeni}
                                                    </p>
                                                    <p className="text-xs text-gray-500 truncate">{student.email}</p>
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRemoveStudent(student.id);
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Odebrat studenta"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M18 6 6 18"></path>
                                                        <path d="m6 6 12 12"></path>
                                                    </svg>
                                                </button>
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Main Content: Student Detail */}
                    <div className={`lg:col-span-8 ${selectedStudent ? "block" : "hidden lg:block"}`}>
                        {selectedStudent ? (
                            <div className="space-y-6">
                                {/* Student Info Card */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setSelectedStudent(null)}
                                                className="lg:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M19 12H5m7 7-7-7 7-7" />
                                                </svg>
                                            </button>
                                            <h2 className="text-xl font-bold text-gray-900">Detail studenta</h2>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right hidden sm:block">
                                                <p className="text-sm font-bold text-gray-900">{selectedStudent.jmeno} {selectedStudent.prijmeni}</p>
                                                <p className="text-xs text-gray-500">{selectedStudent.email}</p>
                                            </div>
                                            <div className="relative w-10 h-10">
                                                {selectedStudent.obrazek_url ? (
                                                    <Image
                                                        src={selectedStudent.obrazek_url}
                                                        alt={selectedStudent.jmeno}
                                                        fill
                                                        className="rounded-full object-cover border border-gray-200"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold border border-emerald-200">
                                                        {selectedStudent.jmeno[0]}{selectedStudent.prijmeni[0]}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Tab Switcher */}
                                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                    <div className="flex border-b border-gray-100">
                                        <button
                                            onClick={() => setActiveTab("tasks")}
                                            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold transition-all relative ${activeTab === "tasks"
                                                    ? "text-emerald-700 bg-emerald-50/50"
                                                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                                }`}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M9 11l3 3L22 4"></path>
                                                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                                            </svg>
                                            Úkoly a výsledky
                                            {activeTab === "tasks" && (
                                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full"></div>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => setActiveTab("portfolio")}
                                            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold transition-all relative ${activeTab === "portfolio"
                                                    ? "text-emerald-700 bg-emerald-50/50"
                                                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                                }`}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                                            </svg>
                                            Portfolio
                                            {portfolioFiles.length > 0 && (
                                                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full">
                                                    {portfolioFiles.length}
                                                </span>
                                            )}
                                            {activeTab === "portfolio" && (
                                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full"></div>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Tasks Tab Content */}
                                {activeTab === "tasks" && (
                                    <div className={`${isResultsFullscreen
                                        ? "fixed left-0 lg:left-72 right-0 bottom-0 top-0 z-[40] bg-white p-8 flex flex-col overflow-y-auto"
                                        : "bg-white rounded-2xl border border-gray-100 shadow-sm p-6 relative"
                                        }`}>
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-lg font-bold text-gray-900">Odevzdané úkoly a výsledky</h3>
                                            <button
                                                onClick={() => setIsResultsFullscreen(!isResultsFullscreen)}
                                                className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                title={isResultsFullscreen ? "Ukončit celou obrazovku" : "Celá obrazovka"}
                                            >
                                                {isResultsFullscreen ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M8 3v3a2 2 0 0 1-2 2H3"></path>
                                                        <path d="M21 8h-3a2 2 0 0 1-2-2V3"></path>
                                                        <path d="M3 16h3a2 2 0 0 1 2 2v3"></path>
                                                        <path d="M16 21v-3a2 2 0 0 1 2-2h3"></path>
                                                    </svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M15 3h6v6"></path>
                                                        <path d="M9 21H3v-6"></path>
                                                        <path d="M21 3l-7 7"></path>
                                                        <path d="M3 21l7-7"></path>
                                                    </svg>
                                                )}
                                            </button>
                                        </div>

                                        {isLoadingTasks ? (
                                            <div className="flex justify-center py-10">
                                                <span className="text-gray-500">Načítání výsledků...</span>
                                            </div>
                                        ) : studentTasks.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                                <h3 className="text-lg font-medium text-gray-900 mb-1">Zatím žádné úkoly</h3>
                                                <p className="text-gray-500">Tento student zatím nemá žádné úkoly ani výsledky.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {studentTasks.map((task, taskIndex) => {
                                                    const isLate = task.submissionId && task.dueDate && task.submittedAt && new Date(task.submittedAt) > new Date(task.dueDate);
                                                    const isExpanded = expandedTasks.has(task.id);
                                                    const hasDetails = (task.submissionId && task.attachments && task.attachments.length > 0) || (task.submissionId && task.testResults && task.testResults.length > 0);

                                                    return (
                                                        <div key={task.id} className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-emerald-200 hover:shadow-md transition-all">
                                                            <div className="flex justify-between items-start mb-3">
                                                                <div className="flex-1">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${(task.type === 'test' || (task.type === 'predefined_test' && task.templateType !== 'outcome')) ? 'bg-amber-100 text-amber-700' : (task.type === 'outcome' || (task.type === 'predefined_test' && task.templateType === 'outcome')) ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                            {(task.type === 'test' || (task.type === 'predefined_test' && task.templateType !== 'outcome')) ? 'TEST' : (task.type === 'outcome' || (task.type === 'predefined_test' && task.templateType === 'outcome')) ? 'KVÍZ' : 'ÚKOL'}
                                                                        </span>
                                                                        <span className="text-xs text-gray-500">
                                                                            Termín: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Neurčeno'}
                                                                        </span>
                                                                    </div>
                                                                    <h4 className="font-semibold text-gray-900 text-lg">{task.title}</h4>
                                                                    <p className="text-sm text-gray-600 line-clamp-1 mt-1">{task.description}</p>
                                                                </div>
                                                                <div className="flex items-center gap-2 ml-4">
                                                                    {task.submissionId && (task.status === 'submitted' || task.status === 'graded') ? (
                                                                        <div className="flex flex-col items-end gap-2">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className={`px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1 ${isLate ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                                                    {isLate ? `Pozdní odevzdání` : `Odevzdáno`}
                                                                                </span>
                                                                                <button
                                                                                    onClick={() => handleResetSubmission(task.submissionId!)}
                                                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                                    title="Smazat odevzdání (resetovat)"
                                                                                >
                                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                                                </button>
                                                                            </div>
                                                                            {task.hodnoceni && (
                                                                                <div className="text-sm font-black text-emerald-600 px-3 py-1 bg-emerald-50 rounded-lg border border-emerald-100 shadow-sm">
                                                                                    {task.hodnoceni}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="px-2.5 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded-lg">
                                                                            Neodevzdáno
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Toggle button for details */}
                                                            {hasDetails && (
                                                                <button
                                                                    onClick={() => toggleTaskExpansion(task.id)}
                                                                    className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium rounded-xl transition-colors border border-gray-200"
                                                                >
                                                                    {isExpanded ? (
                                                                        <>
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                                <polyline points="18 15 12 9 6 15"></polyline>
                                                                            </svg>
                                                                            Skrýt detaily
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                                <polyline points="6 9 12 15 18 9"></polyline>
                                                                            </svg>
                                                                            Zobrazit detaily
                                                                        </>
                                                                    )}
                                                                </button>
                                                            )}

                                                            {/* Show attachments if submitted or draft */}
                                                            {isExpanded && task.submissionId && task.attachments && task.attachments.length > 0 && (
                                                                <div className="mt-4 pt-4 border-t border-gray-100">
                                                                    <p className="text-xs font-medium text-gray-500 mb-2">
                                                                        {task.status === 'draft' ? 'Nahrané soubory (neodevzdáno):' : 'Odevzdané soubory:'}
                                                                    </p>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {task.attachments.map((att, i) => (
                                                                            <a
                                                                                key={i}
                                                                                href={att.url}
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-emerald-600 hover:bg-gray-100 hover:text-emerald-700 transition-colors"
                                                                            >
                                                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                                                                {att.name}
                                                                            </a>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Show Test Results */}
                                                            {isExpanded && task.submissionId && task.testResults && task.testResults.length > 0 && (
                                                                <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
                                                                    {(() => {
                                                                        const isOutcome = task.type === 'outcome' || !!task.outcomes?.length;

                                                                        if (isOutcome) {
                                                                            const scores: Record<string, number> = {};
                                                                            task.outcomes?.forEach(o => scores[o.nazev] = 0);
                                                                            task.testResults?.forEach(q => {
                                                                                const selected = q.studentAnswerIds || [];
                                                                                q.options.forEach(opt => {
                                                                                    if (selected.includes(opt.id) && opt.outcomePoints) {
                                                                                        Object.entries(opt.outcomePoints).forEach(([name, pts]) => {
                                                                                            scores[name] = (scores[name] || 0) + pts;
                                                                                        });
                                                                                    }
                                                                                });
                                                                            });
                                                                            const maxScore = Math.max(...Object.values(scores), 1);
                                                                            const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);

                                                                            return (
                                                                                <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 space-y-4">
                                                                                    <div className="flex justify-between items-center mb-2">
                                                                                        <h5 className="font-bold text-emerald-900">Výsledky kvízu (Body za výsledky):</h5>
                                                                                        <span className="text-xs font-black px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full uppercase tracking-wider">
                                                                                            Vítěz: {sorted[0]?.[0] || '-'}
                                                                                        </span>
                                                                                    </div>
                                                                                    <div className="space-y-3">
                                                                                        {sorted.map(([name, score], idx) => (
                                                                                            <div key={name} className="space-y-1">
                                                                                                <div className="flex justify-between text-[11px] font-bold">
                                                                                                    <span className={idx === 0 ? 'text-emerald-700' : 'text-gray-500'}>{name}</span>
                                                                                                    <span className="text-gray-400">{score.toFixed(1)} b.</span>
                                                                                                </div>
                                                                                                <div className="h-1.5 w-full bg-white rounded-full overflow-hidden border border-emerald-50">
                                                                                                    <div
                                                                                                        className={`h-full rounded-full transition-all duration-1000 ${idx === 0 ? 'bg-emerald-500' : 'bg-emerald-200'}`}
                                                                                                        style={{ width: `${(score / maxScore) * 100}%` }}
                                                                                                    ></div>
                                                                                                </div>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        } else {
                                                                            let totalScore = 0;
                                                                            let maxPossible = 0;
                                                                            task.testResults?.forEach(q => {
                                                                                maxPossible += q.points;
                                                                                const correctIds = q.options.filter(o => o.isCorrect).map(o => o.id);
                                                                                const incorrectIds = q.options.filter(o => !o.isCorrect).map(o => o.id);
                                                                                const selected = q.studentAnswerIds || [];
                                                                                const c = selected.filter(id => correctIds.includes(id)).length;
                                                                                const w = selected.filter(id => incorrectIds.includes(id)).length;
                                                                                const qScore = Math.max(0, (c - w) / (correctIds.length || 1));
                                                                                totalScore += qScore * q.points;
                                                                            });
                                                                            const percentage = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0;
                                                                            return (
                                                                                <div className="flex justify-between items-center bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                                                                                    <h5 className="font-bold text-emerald-900">Výsledky testu:</h5>
                                                                                    <div className="flex gap-4 text-sm">
                                                                                        <>
                                                                                            <span className="font-medium text-emerald-700">Body: <span className="font-black">{totalScore.toFixed(1)} / {maxPossible}</span></span>
                                                                                            <span className="font-medium text-emerald-700">Procenta: <span className="font-black">{percentage}%</span></span>
                                                                                        </>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        }
                                                                    })()}

                                                                    {task.testResults.map((q, idx) => {
                                                                        const isOutcome = task.type === 'outcome' || !!task.outcomes?.length;
                                                                        const correctIds = q.options.filter(o => o.isCorrect).map(o => o.id);
                                                                        const incorrectIds = q.options.filter(o => !o.isCorrect).map(o => o.id);
                                                                        const selected = q.studentAnswerIds || [];
                                                                        const c = selected.filter(id => correctIds.includes(id)).length;
                                                                        const w = selected.filter(id => incorrectIds.includes(id)).length;
                                                                        const qScore = isOutcome ? q.points : (Math.max(0, (c - w) / (correctIds.length || 1)) * q.points);

                                                                        return (
                                                                            <div key={q.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-200 shadow-sm transition-all hover:border-emerald-200">
                                                                                <div className="flex justify-between items-start mb-4">
                                                                                    <p className="font-bold text-gray-900">{idx + 1}. {q.text}</p>
                                                                                    {!isOutcome && (
                                                                                        <span className="text-xs font-black px-2.5 py-1 bg-white border border-gray-100 rounded-full text-emerald-600 shadow-sm">
                                                                                            {qScore.toFixed(1)} / {q.points} b.
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="space-y-2">
                                                                                    {q.options.map(opt => {
                                                                                        const isSelected = q.studentAnswerIds?.includes(opt.id);
                                                                                        let optionClass = "text-sm p-3 rounded-xl border transition-all flex justify-between items-center ";

                                                                                        if (isOutcome) {
                                                                                            optionClass += isSelected ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-white border-gray-100 text-gray-600";
                                                                                        } else {
                                                                                            if (opt.isCorrect) {
                                                                                                optionClass += "bg-emerald-50 border-emerald-200 text-emerald-800";
                                                                                            } else if (isSelected && !opt.isCorrect) {
                                                                                                optionClass += "bg-red-50 border-red-200 text-red-800";
                                                                                            } else {
                                                                                                optionClass += "bg-white border-gray-100 text-gray-600";
                                                                                            }
                                                                                        }

                                                                                        return (
                                                                                            <div key={opt.id} className={optionClass}>
                                                                                                <div className="flex items-center gap-3">
                                                                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? (isOutcome ? 'border-emerald-500' : (opt.isCorrect ? 'border-emerald-500' : 'border-red-500')) : 'border-gray-200'
                                                                                                        }`}>
                                                                                                        {isSelected && <div className={`w-2.5 h-2.5 rounded-full ${isOutcome ? 'bg-emerald-500' : (opt.isCorrect ? 'bg-emerald-500' : 'bg-red-500')}`}></div>}
                                                                                                    </div>
                                                                                                    <span className="font-medium">{opt.text}</span>
                                                                                                </div>
                                                                                                <div className="flex items-center gap-2">
                                                                                                    {isOutcome && isSelected && opt.outcomePoints && (
                                                                                                        <div className="flex flex-wrap gap-1">
                                                                                                            {Object.entries(opt.outcomePoints).map(([name, pts]) => pts > 0 && (
                                                                                                                <span key={name} className="text-[9px] font-black bg-white px-1.5 py-0.5 rounded border border-emerald-100 text-emerald-500">
                                                                                                                    +{pts} ({name})
                                                                                                                </span>
                                                                                                            ))}
                                                                                                        </div>
                                                                                                    )}
                                                                                                    {!isOutcome && opt.isCorrect && <span className="text-[10px] font-black text-emerald-600 bg-white px-2 py-0.5 rounded border border-emerald-100 uppercase">Správně</span>}
                                                                                                    {!isOutcome && isSelected && !opt.isCorrect && <span className="text-[10px] font-black text-red-600 bg-white px-2 py-0.5 rounded border border-red-100 uppercase">Vybráno</span>}
                                                                                                </div>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            </div>
                                                                        )
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Portfolio Tab Content */}
                                {activeTab === "portfolio" && (
                                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-lg font-bold text-gray-900">Portfolio studenta</h3>
                                            <span className="text-sm text-gray-500">
                                                {portfolioFiles.length} {portfolioFiles.length === 1 ? "soubor" : portfolioFiles.length < 5 ? "soubory" : "souborů"}
                                            </span>
                                        </div>

                                        {isLoadingPortfolio ? (
                                            <div className="flex justify-center py-10">
                                                <span className="text-gray-500">Načítání portfolia...</span>
                                            </div>
                                        ) : portfolioFiles.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                                                    </svg>
                                                </div>
                                                <h3 className="text-lg font-medium text-gray-900 mb-1">Žádné soubory v portfoliu</h3>
                                                <p className="text-gray-500">Tento student zatím nenahrál žádné soubory do portfolia.</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {portfolioFiles.map((file) => (
                                                    <div
                                                        key={file.id}
                                                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-white hover:shadow-sm transition-all group"
                                                    >
                                                        {getFileIcon(file.mime_type)}
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-semibold text-gray-900 truncate text-sm">{file.nazev}</h4>
                                                            {file.popis && (
                                                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{file.popis}</p>
                                                            )}
                                                            <div className="flex items-center gap-3 mt-1">
                                                                <span className="text-[11px] text-gray-400">
                                                                    {formatFileSize(file.velikost)}
                                                                </span>
                                                                <span className="text-[11px] text-gray-300">•</span>
                                                                <span className="text-[11px] text-gray-400">
                                                                    {new Date(file.created_at).toLocaleDateString("cs-CZ")}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <a
                                                                href={file.google_file_url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                                title="Otevřít soubor"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                                                    <polyline points="15 3 21 3 21 9"></polyline>
                                                                    <line x1="10" y1="14" x2="21" y2="3"></line>
                                                                </svg>
                                                                Otevřít
                                                            </a>
                                                            <a
                                                                href={`https://drive.google.com/uc?export=download&id=${file.google_file_id}`}
                                                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                                                title="Stáhnout soubor"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                                    <polyline points="7 10 12 15 17 10"></polyline>
                                                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                                                </svg>
                                                                Stáhnout
                                                            </a>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 flex flex-col items-center justify-center text-center h-[calc(100vh-180px)]">
                                <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-6">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900">Vyberte studenta</h2>
                                <p className="text-gray-500 max-w-md mt-2">
                                    Vyberte studenta ze seznamu vlevo pro zobrazení jeho detailů a odevzdaných úkolů.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {classData && (
                <InviteTeacherModal
                    isOpen={isInviteModalOpen}
                    onClose={() => setIsInviteModalOpen(false)}
                    classId={classData.id}
                    ownerId={classData.vlastnik_id}
                />
            )}

            {classData && (
                <AddStudentModal
                    isOpen={isAddStudentModalOpen}
                    onClose={() => setIsAddStudentModalOpen(false)}
                    classId={classData.id}
                    currentStudents={students}
                    onStudentAdded={() => {
                        fetchStudents();
                        setIsAddStudentModalOpen(false);
                    }}
                />
            )}
        </TeacherLayout>
    );
}
