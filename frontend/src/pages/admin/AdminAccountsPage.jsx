import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent } from '../../components/ui/card';
import {
    Loader2,
    Search,
    Lock,
    Unlock,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';

const AdminAccountsPage = () => {
    const [accounts, setAccounts] = useState([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const pageSize = 20;

    const fetchAccounts = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = { skip: page * pageSize, limit: pageSize };
            if (search) params.search = search;
            const res = await api.get('/admin/telegram-accounts', { params });
            setAccounts(res.data.accounts);
            setTotal(res.data.total);
        } catch (e) {
            console.error('Failed to fetch accounts:', e);
        } finally {
            setIsLoading(false);
        }
    }, [page, search]);

    useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

    const handleLock = async (id) => {
        try {
            await api.patch(`/admin/telegram-accounts/${id}/lock`);
            fetchAccounts();
        } catch (e) {
            console.error('Failed to lock account:', e);
        }
    };

    const handleUnlock = async (id) => {
        try {
            await api.patch(`/admin/telegram-accounts/${id}/unlock`);
            fetchAccounts();
        } catch (e) {
            console.error('Failed to unlock account:', e);
        }
    };

    const totalPages = Math.ceil(total / pageSize);

    const statusColor = (s) => {
        if (s === 'active') return 'bg-emerald-500/10 text-emerald-500';
        if (s === 'locked') return 'bg-red-500/10 text-red-500';
        return 'bg-zinc-500/10 text-zinc-400';
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">TG Account Control</h1>
                <p className="text-muted-foreground text-sm">Manage all Telegram accounts system-wide</p>
            </div>

            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Input
                    type="text"
                    placeholder="Search by phone or name..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(0); }}
                    className="pl-9"
                />
            </div>

            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : accounts.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-12">No accounts found.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Owner</th>
                                        <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                                        <th className="text-center px-4 py-3 font-medium text-muted-foreground">Active Tasks</th>
                                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {accounts.map(a => (
                                        <tr key={a._id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 font-mono text-xs">{a.phone}</td>
                                            <td className="px-4 py-3">{a.first_name || ''} {a.last_name || ''}</td>
                                            <td className="px-4 py-3 text-muted-foreground text-xs">{a.owner_email}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(a.status)}`}>
                                                    {a.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono text-xs">{a.active_tasks}</td>
                                            <td className="px-4 py-3 text-right">
                                                {a.is_locked_by_admin ? (
                                                    <Button variant="ghost" size="sm" onClick={() => handleUnlock(a._id)} title="Unlock">
                                                        <Unlock className="h-3.5 w-3.5 text-emerald-500" />
                                                    </Button>
                                                ) : (
                                                    <Button variant="ghost" size="sm" onClick={() => handleLock(a._id)} title="Lock">
                                                        <Lock className="h-3.5 w-3.5 text-red-500" />
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{total} account(s)</p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm flex items-center px-2">{page + 1} / {totalPages}</span>
                        <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAccountsPage;
