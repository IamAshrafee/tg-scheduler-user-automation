import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
    Loader2,
    Users,
    Smartphone,
    ListChecks,
    Activity,
    TrendingUp,
    XCircle,
    CheckCircle2,
    MinusCircle,
} from 'lucide-react';
import { Skeleton } from '../../components/ui/skeleton';
import { formatLogTime } from '../../lib/time';

const AdminDashboardPage = () => {
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/admin/dashboard/stats');
                setStats(res.data);
            } catch (e) {
                console.error('Failed to fetch admin stats:', e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, []);



    const statCards = [
        { label: 'Total Users', value: isLoading ? <Skeleton className="h-8 w-16" /> : (stats?.total_users || 0), icon: Users, color: 'text-blue-500' },
        { label: 'TG Accounts', value: isLoading ? <Skeleton className="h-8 w-16" /> : (stats?.total_accounts || 0), icon: Smartphone, color: 'text-emerald-500' },
        { label: 'Total Tasks', value: isLoading ? <Skeleton className="h-8 w-16" /> : (stats?.total_tasks || 0), icon: ListChecks, color: 'text-purple-500' },
        { label: 'Active Tasks', value: isLoading ? <Skeleton className="h-8 w-16" /> : (stats?.active_tasks || 0), icon: Activity, color: 'text-amber-500' },
    ];

    const todayCards = [
        { label: 'Executed', value: isLoading ? <Skeleton className="h-6 w-12" /> : (stats?.today?.total || 0), icon: TrendingUp, color: 'text-blue-400' },
        { label: 'Sent', value: isLoading ? <Skeleton className="h-6 w-12" /> : (stats?.today?.sent || 0), icon: CheckCircle2, color: 'text-emerald-400' },
        { label: 'Failed', value: isLoading ? <Skeleton className="h-6 w-12" /> : (stats?.today?.failed || 0), icon: XCircle, color: 'text-red-400' },
        { label: 'Skipped', value: isLoading ? <Skeleton className="h-6 w-12" /> : (stats?.today?.skipped || 0), icon: MinusCircle, color: 'text-zinc-400' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
                <p className="text-muted-foreground text-sm">System-wide overview</p>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map(s => (
                    <Card key={s.label}>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground">{s.label}</p>
                                    <div className="mt-1 text-2xl font-bold">{s.value}</div>
                                </div>
                                <s.icon className={`h-5 w-5 ${s.color}`} />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Today's Execution Stats */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">Today's Executions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {todayCards.map(s => (
                            <div key={s.label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                                <s.icon className={`h-4 w-4 ${s.color}`} />
                                <div>
                                    <div className="text-lg font-semibold">{s.value}</div>
                                    <p className="text-xs text-muted-foreground">{s.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Top Users + Recent Failures */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Top Users */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Top Users by Tasks</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="flex items-center justify-between p-2">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-4 w-16" />
                                    </div>
                                ))}
                            </div>
                        ) : (stats?.top_users || []).length > 0 ? (
                            <div className="space-y-2">
                                {stats.top_users.map((u, i) => (
                                    <div key={u.user_id} className="flex items-center justify-between text-sm p-2 rounded-md bg-muted/30">
                                        <span className="text-muted-foreground">
                                            <span className="font-mono text-xs mr-2">#{i + 1}</span>
                                            {u.email}
                                        </span>
                                        <span className="font-semibold">{u.task_count} tasks</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground">No users yet.</p>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Failures */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Recent Failures</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="p-2 space-y-2">
                                        <div className="flex justify-between">
                                            <Skeleton className="h-4 w-24" />
                                            <Skeleton className="h-3 w-12" />
                                        </div>
                                        <Skeleton className="h-3 w-full" />
                                    </div>
                                ))}
                            </div>
                        ) : (stats?.recent_failures || []).length > 0 ? (
                            <div className="space-y-2">
                                {stats.recent_failures.map(f => (
                                    <div key={f._id} className="text-sm p-2 rounded-md bg-red-500/5 border border-red-500/10">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-red-400">{f.task_name || 'Unknown'}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {formatLogTime(f.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1 truncate">{f.reason || 'No details'}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground">No recent failures 🎉</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AdminDashboardPage;
