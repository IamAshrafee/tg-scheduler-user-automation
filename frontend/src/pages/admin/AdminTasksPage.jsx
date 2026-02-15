import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../../components/ui/select';
import { Card, CardContent } from '../../components/ui/card';
import {
    Loader2,
    Search,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';

const ACTION_LABELS = {
    send_sticker: '🔷 Sticker',
    send_text: '💬 Text',
    send_photo: '📷 Photo',
    send_video: '🎬 Video',
    send_document: '📄 Document',
    forward_message: '↩️ Forward',
};

const AdminTasksPage = () => {
    const [tasks, setTasks] = useState([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(0);
    const pageSize = 20;

    const fetchTasks = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = { skip: page * pageSize, limit: pageSize };
            if (search) params.search = search;
            if (statusFilter) params.status = statusFilter;
            const res = await api.get('/admin/tasks', { params });
            setTasks(res.data.tasks);
            setTotal(res.data.total);
        } catch (e) {
            console.error('Failed to fetch tasks:', e);
        } finally {
            setIsLoading(false);
        }
    }, [page, search, statusFilter]);

    useEffect(() => { fetchTasks(); }, [fetchTasks]);

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Task Monitoring</h1>
                <p className="text-muted-foreground text-sm">View all tasks across all users</p>
            </div>

            <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                    <Input
                        type="text"
                        placeholder="Search by task name..."
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(0); }}
                        className="pl-9"
                    />
                </div>
                <Select
                    value={statusFilter}
                    onValueChange={(val) => { setStatusFilter(val === "all" ? "" : val); setPage(0); }}
                >
                    <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : tasks.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-12">No tasks found.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Owner</th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Action</th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Target</th>
                                        <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Next Run</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tasks.map(t => (
                                        <tr key={t._id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 font-medium">{t.name}</td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">{t.owner_email}</td>
                                            <td className="px-4 py-3 text-xs">{ACTION_LABELS[t.action_type] || t.action_type}</td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[150px]">{t.target?.chat_title || '—'}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${t.is_enabled
                                                    ? 'bg-emerald-500/10 text-emerald-500'
                                                    : 'bg-zinc-500/10 text-zinc-400'
                                                    }`}>
                                                    {t.is_enabled ? 'Active' : 'Paused'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground">
                                                {t.next_execution
                                                    ? new Date(t.next_execution).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                                    : '—'}
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
                    <p className="text-xs text-muted-foreground">{total} task(s)</p>
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

export default AdminTasksPage;
