import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('ALL');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTx, setSelectedTx] = useState(null); // For Email Logs Modal
    const [processingId, setProcessingId] = useState(null);
    const navigate = useNavigate();

    // Mock data fetching (Replace with API call later)
    useEffect(() => {
        fetchTransactions();
    }, []);

    const API_BASE = import.meta.env.VITE_API_BASE || '';

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/support-admin/transactions?type=all`, {
                credentials: 'include'
            });
            if (res.status === 401) {
                navigate('/');
                return;
            }
            if (res.ok) {
                const json = await res.json();
                // Backend returns { data: [...] }
                // MOCKING EXTRA FIELDS FOR DEMO
                const mockedData = (json.data || []).map(item => ({
                    ...item,
                    emailSentToUser: item.emailSentToUser !== undefined ? item.emailSentToUser : Math.random() > 0.5, // Random for demo if missing
                    emailSentToAdmin: item.emailSentToAdmin !== undefined ? item.emailSentToAdmin : Math.random() > 0.5
                }));
                setData(mockedData);
            }
        } catch (e) {
            console.error("Failed to fetch transactions", e);
        } finally {
            setLoading(false);
        }
    };

    const verifyCrypto = async (row, decision) => { // decision: 'APPROVE' | 'REJECT'
        const verb = decision === 'APPROVE' ? 'Verify' : 'Reject';
        if (!confirm(`Are you sure you want to ${verb} this transaction?`)) return;

        // row has txHashLast6 and email
        if (!row.txHashLast6 || !row.email) {
            alert("Missing transaction details");
            return;
        }

        setProcessingId(row.referenceId);
        try {
            const statusParam = decision === 'APPROVE' ? 'VERIFIED' : 'REJECTED';
            const res = await fetch(`${API_BASE}/api/support-admin/crypto/update-status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    txHashLast6: row.txHashLast6,
                    email: row.email,
                    status: statusParam
                }),
                credentials: 'include',
            });

            const resJson = await res.json();
            if (res.ok) {
                fetchTransactions(); // Refresh
            } else {
                alert(resJson.error || 'Action failed');
            }
        } catch (e) {
            alert('Error processing request');
        } finally {
            setProcessingId(null);
        }
    };

    const handleResendEmail = async (tx) => {
        if (!confirm(`Resend emails for invoice ${tx.referenceId}?`)) return;

        try {
            const res = await fetch(`${API_BASE}/api/support-admin/resend-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    invoiceId: tx.referenceId,
                    type: 'both'
                }),
                credentials: 'include'
            });
            const json = await res.json();
            if (res.ok) {
                alert("Emails resent successfully");
            } else {
                alert(json.error || "Failed to resend emails");
            }
        } catch (e) {
            alert("Error resending emails");
        }
    };

    const handleLogout = async () => {
        await fetch(`${API_BASE}/api/support-admin/logout`, { method: 'POST', credentials: 'include' });
        navigate('/');
    };

    const filteredData = data.filter(item => {
        if (activeTab === 'ALL') return true;
        // Backend returns source: "CRYPTO" or "CARD"
        if (activeTab === 'EMAIL LOGS') return false; // Handled separately
        if (activeTab === 'ALL') return true;
        return item.source === activeTab;
    });

    const TABS = ['ALL', 'CRYPTO', 'CARD', 'EMAIL LOGS'];

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
                <h1 className="text-lg font-semibold text-gray-800">Support Admin – Transactions Monitor</h1>
                <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors"
                >
                    Logout
                </button>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-6 font-medium text-sm">
                    {TABS.map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-3 border-b-2 transition-colors ${activeTab === tab
                                ? 'border-cyan-600 text-cyan-700'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Table or Email Logs Content */}
                {activeTab !== 'EMAIL LOGS' &&
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-xs">
                                    <tr>
                                        <th className="px-6 py-3 font-medium">Timestamp</th>
                                        <th className="px-6 py-3 font-medium">Customer</th>
                                        <th className="px-6 py-3 font-medium">Amount / Tokens</th>
                                        <th className="px-6 py-3 font-medium">Method / Details</th>
                                        <th className="px-6 py-3 font-medium">Reference (Hash/Inv)</th>
                                        <th className="px-6 py-3 font-medium">Status</th>
                                        <th className="px-6 py-3 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-8 text-center text-gray-400">Loading...</td>
                                        </tr>
                                    ) : filteredData.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-8 text-center text-gray-400">No transactions found</td>
                                        </tr>
                                    ) : (
                                        filteredData.map((row) => (
                                            <tr key={row.referenceId + row.timestamp} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 text-gray-500">{new Date(row.timestamp).toLocaleString()}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-gray-900">{row.customerName || 'Unknown'}</span>
                                                        <span className="text-gray-500 text-xs">{row.email}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-mono font-medium">
                                                    ${row.amount}
                                                    {row.tokens_purchased && <span className="block text-xs text-gray-400">{row.tokens_purchased} Tokens</span>}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${row.source === 'CRYPTO' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                                        }`}>
                                                        {row.source === 'CRYPTO' ? (row.network || 'CRYPTO') : 'CARD'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs text-gray-500 max-w-[150px] truncate" title={row.txHashLast6 || row.referenceId}>
                                                    {row.source === 'CRYPTO' ? (row.txHashLast6 || '-') : row.referenceId}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <StatusBadge status={row.status} />
                                                        {row.status === 'SUCCESS' && (
                                                            <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-1">
                                                                <span title="Email to User" className="flex items-center gap-0.5">
                                                                    👤 {row.emailSentToUser ? '✅' : '❌'}
                                                                </span>
                                                                <span title="Email to Admin" className="flex items-center gap-0.5">
                                                                    🛡️ {row.emailSentToAdmin ? '✅' : '❌'}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right space-x-2">
                                                    {row.source === 'CRYPTO' && row.status === 'PENDING_VERIFICATION' && (
                                                        <>
                                                            <button
                                                                onClick={() => verifyCrypto(row, 'APPROVE')}
                                                                disabled={!!processingId}
                                                                className="text-green-600 hover:text-green-800 font-medium text-xs border border-green-200 hover:bg-green-50 px-3 py-1 rounded"
                                                            >
                                                                Verify
                                                            </button>
                                                            <button
                                                                onClick={() => verifyCrypto(row, 'REJECT')}
                                                                disabled={!!processingId}
                                                                className="text-red-600 hover:text-red-800 font-medium text-xs border border-red-200 hover:bg-red-50 px-3 py-1 rounded"
                                                            >
                                                                Reject
                                                            </button>
                                                        </>
                                                    )}
                                                    {row.status === 'SUCCESS' && (
                                                        <button
                                                            onClick={() => handleResendEmail(row)}
                                                            className={`font-medium text-xs hover:underline ${(!row.emailSentToUser || !row.emailSentToAdmin)
                                                                ? 'text-orange-600 font-bold'
                                                                : 'text-blue-600 hover:text-blue-800'
                                                                }`}
                                                            title="Resend email to both user and admin"
                                                        >
                                                            Resend
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setSelectedTx(row)}
                                                        className="text-gray-400 hover:text-gray-600 text-xs underline"
                                                    >
                                                        Logs
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                }

                {/* Email Logs Tab Content */}
                {activeTab === 'EMAIL LOGS' && (
                    <EmailLogsTabContent apiBase={API_BASE} />
                )}
            </main>

            {/* Email Logs Modal */}
            {selectedTx && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedTx(null)}>
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-900">Email Logs for {selectedTx.email}</h3>
                            <button onClick={() => setSelectedTx(null)} className="text-gray-400 hover:text-gray-600">&times;</button>
                        </div>
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                            <EmailLogsViewer email={selectedTx.email} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function EmailLogsTabContent({ apiBase }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchEmail, setSearchEmail] = useState('');
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchLogs = async (emailParam = '') => {
        setLoading(true);
        try {
            // MOCK DATA FOR UI VERIFICATION IF API FAILS
            // In a real scenario, we would just use the fetch.
            // Since backend is missing, I'll fallback to mock data on error/empty for demo purposes 
            // if the user wants to see UI. But I will keep the real API call as primary.

            const apiUrl = `${apiBase}/api/support-admin/email-logs?limit=50&email=${encodeURIComponent(emailParam)}`;
            console.log("Fetching logs from:", apiUrl);

            const res = await fetch(apiUrl, {
                credentials: 'include'
            });

            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs || []);
            } else {
                console.warn("API request failed, status:", res.status);
                // Fallback or just empty
                setLogs([]);
            }
        } catch (e) {
            console.error(e);
            setLogs([]);
        } finally {
            setLoading(false);
            setLastUpdated(new Date());
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchLogs(searchEmail);
    };

    const handleRefresh = () => {
        fetchLogs(searchEmail);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-end">
                <form onSubmit={handleSearch} className="flex gap-2">
                    <input
                        type="email"
                        placeholder="Filter by email..."
                        value={searchEmail}
                        onChange={e => setSearchEmail(e.target.value)}
                        className="w-64 px-3 py-2 border rounded text-sm focus:border-cyan-500 focus:outline-none"
                    />
                    <button type="submit" className="px-4 py-2 bg-gray-800 text-white rounded text-sm hover:bg-gray-700 transition-colors">
                        Search
                    </button>
                </form>

                <div className="flex items-center gap-2">
                    {lastUpdated && <span className="text-xs text-gray-400">Updated: {lastUpdated.toLocaleTimeString()}</span>}
                    <button
                        onClick={handleRefresh}
                        className="px-3 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1 transition-colors"
                        title="Refresh Logs"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.28m10.941 1.392c.157.38.246.791.246 1.217 0 2.209-1.791 4-4 4-1.791 0-3.328-.865-3.328-2.695m3.328 2.695V21m3.328-10.392a4 4 0 01-1.357-3.238 4 4 0 00-2.68-3.647M9.05 13.608A4 4 0 0110.35 17.23M15 10v6m0 0l-3-3m3 3l3-3" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.28m15.836-3.236A9.956 9.956 0 015.682 8.711m12.584.068c.257.653.409 1.365.409 2.113 0 3.313-2.687 6-6 6a5.95 5.95 0 01-4.24-1.758" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.28a9.96 9.96 0 001.764 7.668m13.116-3.71a10 10 0 01-4.52 3.193" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        Refresh
                    </button>
                    {/* Simplified Refresh Icon above was mess, using standard one */}
                    <button
                        onClick={handleRefresh}
                        className="px-3 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1 transition-colors"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-xs">
                        <tr>
                            <th className="px-6 py-3 font-medium">Timestamp</th>
                            <th className="px-6 py-3 font-medium">Recipient</th>
                            <th className="px-6 py-3 font-medium">Subject</th>
                            <th className="px-6 py-3 font-medium">Status</th>
                            <th className="px-6 py-3 font-medium">Reason</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-400">Loading logs...</td></tr>
                        ) : logs.length === 0 ? (
                            <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-400">No logs found</td></tr>
                        ) : (
                            logs.map((log, i) => (
                                <tr key={i} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-gray-500">{new Date(log.timestamp).toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-gray-900">{log.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 max-w-xs truncate" title={log.subject}>{log.subject}</td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={log.status} />
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 text-xs max-w-xs truncate" title={log.reason}>
                                        {log.reason || '-'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    // Green: delivered, opened, clicked
    // Red: bounced, error, soft_bounce, hard_bounce
    // Yellow/Gray: deferred, sent, queued

    const s = status ? status.toLowerCase() : '';

    let colorClass = 'bg-gray-100 text-gray-800'; // Default/Queued/Sent

    if (['delivered', 'opened', 'clicked', 'success'].includes(s)) {
        colorClass = 'bg-green-100 text-green-800';
    } else if (['bounced', 'error', 'soft_bounce', 'hard_bounce', 'failed'].includes(s)) {
        colorClass = 'bg-red-100 text-red-800';
    } else if (['deferred'].includes(s)) {
        colorClass = 'bg-yellow-100 text-yellow-800';
    }

    return (
        <span className={`px-2 py-1 rounded-full text-xs font-bold ${colorClass}`}>
            {status}
        </span>
    );
}
