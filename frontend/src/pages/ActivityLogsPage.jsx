import { useState, useEffect } from 'react';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import {
    Loader2,
    Activity,
    CheckCircle2,
    XCircle,
    MinusCircle,
    ChevronLeft,
    ChevronRight,
    Filter,
} from 'lucide-react';

const ActivityLogsPage = () => {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const pageSize = 20;

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const params = {
                limit: pageSize,
                skip: page * pageSize,
            };
            if (filterStatus) params.status = filterStatus;
            const res = await api.get('/activity-logs', { params });
            const data = res.data.logs || [];
            setLogs(data);
            setHasMore(data.length === pageSize);
        } catch (e) {
            console.error('Failed to fetch activity logs:', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page, filterStatus]);

    const getStatusIcon = (status) => {
        switch (status) {
            case 'sent': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
            case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
            default: return <MinusCircle className="h-4 w-4 text-zinc-400" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'sent': return 'text-emerald-500';
            case 'failed': return 'text-red-500';
            default: return 'text-zinc-400';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Activity Log</h1>
                    <p className="text-muted-foreground text-sm">
                        Monitor all task execution history
                    </p>
                </div>
                <select
                    value={filterStatus}
                    onChange={e => { setFilterStatus(e.target.value); setPage(0); }}
                    className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-auto"
                >
                    <option value="">All Status</option>
                    <option value="sent">Sent</option>
                    <option value="failed">Failed</option>
                    <option value="skipped">Skipped</option>
                </select>
            </div>

            {/* Logs Table */}
            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : logs.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/30">
                                        <th className="text-left p-3 font-medium text-muted-foreground text-xs">Status</th>
                                        <th className="text-left p-3 font-medium text-muted-foreground text-xs">Task</th>
                                        <th className="text-left p-3 font-medium text-muted-foreground text-xs hidden md:table-cell">Action</th>
                                        <th className="text-left p-3 font-medium text-muted-foreground text-xs hidden lg:table-cell">Details</th>
                                        <th className="text-right p-3 font-medium text-muted-foreground text-xs">Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map(log => (
                                        <tr key={log._id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    {getStatusIcon(log.status)}
                                                    <span className={`font-medium capitalize text-xs ${getStatusColor(log.status)}`}>
                                                        {log.status}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <p className="font-medium text-sm truncate max-w-[200px]">{log.task_name || '—'}</p>
                                            </td>
                                            <td className="p-3 hidden md:table-cell">
                                                <span className="text-xs bg-secondary px-2 py-0.5 rounded capitalize">
                                                    {(log.action_type || '').replace('send_', '').replace('forward_', 'forward ')}
                                                </span>
                                            </td>
                                            <td className="p-3 hidden lg:table-cell">
                                                <p className="text-xs text-muted-foreground truncate max-w-[250px]">
                                                    {log.error || 'Executed successfully'}
                                                </p>
                                            </td>
                                            <td className="p-3 text-right">
                                                <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                                                    {new Date(log.created_at).toLocaleString([], {
                                                        month: 'short', day: 'numeric',
                                                        hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <Activity className="h-10 w-10 text-muted-foreground opacity-30 mb-3" />
                            <p className="text-muted-foreground text-sm">No activity logs found.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pagination */}
            {(page > 0 || hasMore) && (
                <div className="flex items-center justify-between">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(0, p - 1))}
                        disabled={page === 0}
                    >
                        <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                    </Button>
                    <span className="text-xs text-muted-foreground">Page {page + 1}</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => p + 1)}
                        disabled={!hasMore}
                    >
                        Next <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
};

export default ActivityLogsPage;
