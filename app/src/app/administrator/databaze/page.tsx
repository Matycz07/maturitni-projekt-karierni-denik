"use client";
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

interface ColumnInfo {
    name: string;
    type: string;
}

export default function DatabasePage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [tables, setTables] = useState<string[]>([]);
    const [selectedTable, setSelectedTable] = useState<string>('');
    const [tableData, setTableData] = useState<Record<string, unknown>[]>([]);
    const [columns, setColumns] = useState<ColumnInfo[]>([]);
    const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null);
    const [editValues, setEditValues] = useState<Record<string, unknown>>({});
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [creating, setCreating] = useState(false);
    const [newRowValues, setNewRowValues] = useState<Record<string, unknown>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | number | null>(null);
    const [detailRow, setDetailRow] = useState<Record<string, unknown> | null>(null);

    const tableIcons: Record<string, string> = {
        'ucty': '👤',
        'trida': '📚',
        'ukoly': '📝',
        'odevzdani': '✅',
        'otazky': '❓',
        'moznosti': '🔘',
        'opravneni': '🛡️',
        'testy_sablony': '📋',
        'notisek_topics': '📌',
        'notisek_cards': '🗂️',
        'form': '📄',
        'soubory': '📁',
        'trida_zaci': '👥',
        'trida_ucitele': '👨‍🏫',
    };

    const startCreating = () => {
        setCreating(true);
        setNewRowValues({});
    };

    const cancelCreating = () => {
        setCreating(false);
        setNewRowValues({});
    };

    const saveNewRow = async () => {
        try {
            const res = await fetch(`/api/admin/tables/${selectedTable}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newRowValues),
            });
            const json = await res.json();
            if (json.success) {
                setSuccess('Záznam byl úspěšně vytvořen.');
                fetchTableData(selectedTable);
                cancelCreating();
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(json.error || 'Chyba při ukládání záznamu.');
            }
        } catch {
            setError('Chyba při komunikaci se serverem.');
        }
    };

    useEffect(() => {
        if (!loading && user && user.role !== 2) {
            router.push('/');
        }
    }, [user, loading, router]);

    useEffect(() => {
        if (user?.role === 2) {
            fetchTables();
        }
    }, [user]);

    useEffect(() => {
        const fetchTableSchema = async (tableName: string) => {
            try {
                const res = await fetch(`/api/admin/tables/${tableName}/schema`);
                if (res.ok) {
                    const schema = await res.json();
                    if (Array.isArray(schema)) {
                        setColumns(schema.map((col: { name: string; type: string }) => ({
                            name: col.name,
                            type: col.type || 'TEXT'
                        })));
                    }
                }
            } catch (e) {
                console.error('Failed to fetch schema', e);
            }
        };

        if (selectedTable) {
            fetchTableData(selectedTable);
            fetchTableSchema(selectedTable);
        } else {
            setTableData([]);
            setColumns([]);
        }
    }, [selectedTable]);

    const fetchTables = async () => {
        try {
            const data = await fetch('/api/admin/tables').then(r => r.json());
            if (Array.isArray(data)) {
                setTables(data);
            }
        } catch (e) {
            console.error(e);
            setError('Nepodařilo se načíst tabulky.');
        }
    };

    const fetchTableData = async (tableName: string) => {
        try {
            const data = await fetch(`/api/admin/tables/${tableName}`).then(r => r.json());
            if (Array.isArray(data)) {
                setTableData(data);
                if (data.length > 0 && columns.length === 0) {
                    setColumns(Object.keys(data[0]).map(name => ({ name, type: 'TEXT' })));
                }
            } else if (data.error) {
                setError(data.error);
            }
        } catch (e) {
            console.error(e);
            setError('Nepodařilo se načíst data.');
        }
    };

    const handleDownload = () => {
        window.open('/api/admin/database/download', '_blank');
    };

    const handleDelete = async (id: string | number) => {
        try {
            const res = await fetch(`/api/admin/tables/${selectedTable}/${id}`, {
                method: 'DELETE',
            });
            const json = await res.json();
            if (json.success) {
                setSuccess('Záznam byl úspěšně smazán.');
                fetchTableData(selectedTable);
                setDeleteConfirmId(null);
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(json.error || 'Chyba při mazání záznamu.');
            }
        } catch {
            setError('Chyba při komunikaci se serverem.');
        }
    };

    const startEdit = (row: Record<string, unknown>) => {
        setEditingRow(row);
        setEditValues({ ...row });
    };

    const cancelEdit = () => {
        setEditingRow(null);
        setEditValues({});
    };

    const saveEdit = async () => {
        if (!editingRow) return;
        try {
            const updates: Record<string, unknown> = {};
            columns.forEach(col => {
                if (col.name !== 'id' && editValues[col.name] !== editingRow[col.name]) {
                    updates[col.name] = editValues[col.name];
                }
            });

            if (Object.keys(updates).length === 0) {
                cancelEdit();
                return;
            }

            const res = await fetch(`/api/admin/tables/${selectedTable}/${editingRow.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });

            const json = await res.json();
            if (json.success) {
                setSuccess('Záznam byl úspěšně aktualizován.');
                fetchTableData(selectedTable);
                cancelEdit();
                setTimeout(() => setSuccess(''), 3000);
            } else {
                setError(json.error || 'Chyba při ukládání záznamu.');
            }
        } catch {
            setError('Chyba při komunikaci se serverem.');
        }
    };

    const filteredData = tableData.filter(row => {
        if (!searchTerm) return true;
        return Object.values(row).some(val =>
            String(val).toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    const formatValue = (value: unknown, colName: string): React.ReactNode => {
        if (value === null || value === undefined) {
            return <span className="text-slate-300 italic text-xs">NULL</span>;
        }

        const strVal = String(value);

        // ID column - special styling
        if (colName === 'id') {
            return (
                <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-mono text-xs font-bold">
                    {strVal}
                </span>
            );
        }

        // URL or image
        if (strVal.startsWith('http')) {
            if (strVal.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                return (
                    <img src={strVal} alt="" className="w-8 h-8 rounded-lg object-cover" />
                );
            }
            return (
                <a href={strVal} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:text-amber-700 underline text-xs">
                    🔗 odkaz
                </a>
            );
        }

        // Boolean-like
        if (strVal === '0' || strVal === '1') {
            return strVal === '1' ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Ano
                </span>
            ) : (
                <span className="inline-flex items-center gap-1 text-slate-400 text-xs font-medium">
                    <span className="w-2 h-2 bg-slate-300 rounded-full"></span> Ne
                </span>
            );
        }

        // Date-like
        if (strVal.match(/^\d{4}-\d{2}-\d{2}/)) {
            const date = new Date(strVal);
            if (!isNaN(date.getTime())) {
                return (
                    <span className="text-xs text-slate-600">
                        {date.toLocaleDateString('cs-CZ')} {date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                );
            }
        }

        // Long text - truncate
        if (strVal.length > 50) {
            return (
                <span title={strVal} className="cursor-help">
                    {strVal.substring(0, 50)}...
                </span>
            );
        }

        return strVal;
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent"></div>
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
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg shadow-amber-200">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">Správa databáze</h1>
                            <p className="text-slate-500">Prohlížení a úprava dat v tabulkách</p>
                        </div>
                    </div>
                    <button
                        onClick={handleDownload}
                        className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg shadow-amber-200 font-medium"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Stáhnout zálohu
                    </button>
                </div>
            </header>

            {/* Alerts */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 flex items-center justify-between animate-in slide-in-from-top duration-300">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="15" y1="9" x2="9" y2="15"></line>
                                <line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                        </div>
                        <span>{error}</span>
                    </div>
                    <button onClick={() => setError('')} className="p-2 hover:bg-red-100 rounded-lg transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            )}
            {success && (
                <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 flex items-center gap-3 animate-in slide-in-from-top duration-300">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                    </div>
                    <span>{success}</span>
                </div>
            )}

            {/* Table Selector */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-6 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Vyberte tabulku</p>
                    <div className="flex flex-wrap gap-2">
                        {tables.map(t => (
                            <button
                                key={t}
                                onClick={() => setSelectedTable(t)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${selectedTable === t
                                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-200'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                <span className="text-base">{tableIcons[t] || '📊'}</span>
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {selectedTable && (
                    <div className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-slate-100">
                        <div className="relative w-full sm:max-w-md">
                            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="M21 21l-4.35-4.35"></path>
                            </svg>
                            <input
                                type="text"
                                placeholder="Hledat v záznamech..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-slate-500">
                                {filteredData.length} z {tableData.length} záznamů
                            </span>
                            {!creating && (
                                <button
                                    onClick={startCreating}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-medium shadow-sm"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                    Nový záznam
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Create New Row Form */}
            {creating && (
                <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm mb-6 overflow-hidden animate-in slide-in-from-top duration-300">
                    <div className="p-4 bg-gradient-to-r from-emerald-50 to-white border-b border-emerald-100 flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800">Vytvořit nový záznam</h3>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                            {columns.filter(col => col.name !== 'id').map(col => (
                                <div key={col.name}>
                                    <label className="block text-sm font-medium text-slate-600 mb-1.5">{col.name}</label>
                                    <input
                                        value={String(newRowValues[col.name] || '')}
                                        onChange={(e) => setNewRowValues({ ...newRowValues, [col.name]: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-slate-50"
                                        placeholder={`Zadejte ${col.name}...`}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={cancelCreating}
                                className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                            >
                                Zrušit
                            </button>
                            <button
                                onClick={saveNewRow}
                                className="px-5 py-2.5 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors font-medium shadow-sm"
                            >
                                Vytvořit záznam
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Data Cards */}
            {selectedTable && (
                <div className="grid gap-4">
                    {filteredData.map((row, index) => {
                        // Create a unique row key for tables without 'id' column
                        const rowKey = row.id !== undefined && row.id !== null
                            ? String(row.id)
                            : `row-${index}`;
                        const hasId = row.id !== undefined && row.id !== null;

                        // Compare using rowKey for editing state
                        const isEditing = editingRow !== null && (
                            hasId
                                ? editingRow.id === row.id
                                : JSON.stringify(editingRow) === JSON.stringify(row)
                        );

                        const primaryCols = columns.filter(c => ['id', 'nazev', 'jmeno', 'email', 'title', 'text', 'predmet'].includes(c.name));
                        const otherCols = columns.filter(c => !['id', 'nazev', 'jmeno', 'email', 'title', 'text', 'predmet'].includes(c.name));

                        // For tables without traditional primary cols, show all as "other"
                        const displayPrimaryCols = primaryCols.length > 0 ? primaryCols : [];
                        const displayOtherCols = primaryCols.length > 0 ? otherCols : columns;

                        // Get first identifiable value for display
                        const firstValue = columns.length > 0 ? row[columns[0].name] : null;
                        const secondValue = columns.length > 1 ? row[columns[1].name] : null;

                        return (
                            <div
                                key={rowKey}
                                className={`bg-white rounded-2xl border shadow-sm transition-all duration-300 overflow-hidden ${isEditing ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-100 hover:shadow-md hover:border-slate-200'
                                    }`}
                            >
                                <div className="p-4 flex flex-col lg:flex-row gap-4">
                                    {/* Primary Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                                <span className="text-lg">{tableIcons[selectedTable] || '📊'}</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                {isEditing ? (
                                                    <div className="space-y-3">
                                                        {displayPrimaryCols.map(col => (
                                                            <div key={col.name}>
                                                                <label className="text-xs font-medium text-slate-400 uppercase">{col.name}</label>
                                                                {col.name === 'id' ? (
                                                                    <p className="font-mono text-sm text-slate-500">#{String(row.id)}</p>
                                                                ) : (
                                                                    <input
                                                                        value={String(editValues[col.name] ?? '')}
                                                                        onChange={(e) => setEditValues({ ...editValues, [col.name]: e.target.value })}
                                                                        className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50 text-sm"
                                                                    />
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            {hasId ? (
                                                                formatValue(row.id, 'id')
                                                            ) : (
                                                                <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-mono text-xs font-bold">
                                                                    #{index + 1}
                                                                </span>
                                                            )}
                                                            <h3 className="font-semibold text-slate-900 truncate">
                                                                {hasId
                                                                    ? String(row.nazev || row.jmeno || row.title || row.text || row.email || row.predmet || `Záznam #${row.id}`)
                                                                    : `${columns[0]?.name}: ${firstValue}${secondValue !== null ? ` → ${columns[1]?.name}: ${secondValue}` : ''}`
                                                                }
                                                            </h3>
                                                        </div>
                                                        {(row.email || row.popis) && (
                                                            <p className="text-sm text-slate-500 truncate">
                                                                {String(row.email || row.popis || '')}
                                                            </p>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Secondary Info Grid */}
                                    <div className="flex-1">
                                        {isEditing ? (
                                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                                {displayOtherCols.map(col => (
                                                    <div key={col.name}>
                                                        <label className="text-xs font-medium text-slate-400 uppercase block mb-1">{col.name}</label>
                                                        <input
                                                            value={String(editValues[col.name] ?? '')}
                                                            onChange={(e) => setEditValues({ ...editValues, [col.name]: e.target.value })}
                                                            className="w-full px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-amber-50 text-sm"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                {displayOtherCols.slice(0, 5).map(col => (
                                                    <div
                                                        key={col.name}
                                                        className="px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100"
                                                    >
                                                        <span className="text-[10px] font-medium text-slate-400 uppercase block">{col.name}</span>
                                                        <span className="text-sm text-slate-700">{formatValue(row[col.name], col.name)}</span>
                                                    </div>
                                                ))}
                                                {displayOtherCols.length > 5 && (
                                                    <button
                                                        onClick={() => setDetailRow(row)}
                                                        className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-sm hover:bg-slate-200 transition-colors"
                                                    >
                                                        +{displayOtherCols.length - 5} více
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {isEditing ? (
                                            <>
                                                <button
                                                    onClick={saveEdit}
                                                    className="px-4 py-2 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors text-sm font-medium"
                                                >
                                                    Uložit
                                                </button>
                                                <button
                                                    onClick={cancelEdit}
                                                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors text-sm font-medium"
                                                >
                                                    Zrušit
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => setDetailRow(row)}
                                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                    title="Zobrazit detail"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                        <circle cx="12" cy="12" r="3"></circle>
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => startEdit(row)}
                                                    className="p-2 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                    title="Upravit"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirmId(row.id as string | number)}
                                                    className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Smazat"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <polyline points="3 6 5 6 21 6"></polyline>
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                    </svg>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {filteredData.length === 0 && (
                        <div className="text-center py-16">
                            <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                                </svg>
                            </div>
                            <p className="text-lg font-medium text-slate-600">Žádná data</p>
                            <p className="text-sm text-slate-400 mt-1">
                                {searchTerm ? 'Zkuste upravit vyhledávání' : 'Tabulka je prázdná'}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {!selectedTable && (
                <div className="text-center py-16">
                    <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                        </svg>
                    </div>
                    <p className="text-lg font-medium text-slate-600">Vyberte tabulku</p>
                    <p className="text-sm text-slate-400 mt-1">Klikněte na některou z tabulek výše</p>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirmId !== null && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in duration-200">
                        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 text-center mb-2">Smazat záznam?</h3>
                        <p className="text-slate-500 text-center mb-6">
                            Opravdu chcete smazat záznam #{deleteConfirmId}? Tuto akci nelze vrátit zpět.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                            >
                                Zrušit
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirmId)}
                                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium shadow-lg shadow-red-200"
                            >
                                Smazat
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {detailRow && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden animate-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl flex items-center justify-center">
                                    <span className="text-xl">{tableIcons[selectedTable] || '📊'}</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900">Detail záznamu</h3>
                                    <p className="text-sm text-slate-500">{selectedTable} #{String(detailRow.id)}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setDetailRow(null)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[60vh]">
                            <div className="grid gap-4">
                                {columns.map(col => (
                                    <div key={col.name} className="p-4 bg-slate-50 rounded-xl">
                                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{col.name}</label>
                                        <div className="mt-1 text-slate-800 break-all">
                                            {detailRow[col.name] !== null && detailRow[col.name] !== undefined
                                                ? String(detailRow[col.name])
                                                : <span className="text-slate-300 italic">NULL</span>
                                            }
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setDetailRow(null);
                                    startEdit(detailRow);
                                }}
                                className="px-4 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors font-medium"
                            >
                                Upravit
                            </button>
                            <button
                                onClick={() => setDetailRow(null)}
                                className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors font-medium"
                            >
                                Zavřít
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
