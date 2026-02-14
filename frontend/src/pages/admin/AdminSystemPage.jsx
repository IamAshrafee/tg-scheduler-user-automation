import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import {
    Loader2,
    RefreshCw,
    Activity,
    Database,
    Cpu,
    Smartphone,
    Clock,
} from 'lucide-react';

const AdminSystemPage = () => {
    const [health, setHealth] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRestarting, setIsRestarting] = useState(false);
    const [restartMsg, setRestartMsg] = useState('');

    const fetchHealth = async () => {
        try {
            const res = await api.get('/admin/system/health');
            setHealth(res.data);
        } catch (e) {
            console.error('Failed to fetch health:', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchHealth(); }, []);

    const handleRestart = async () => {
        setIsRestarting(true);
        setRestartMsg('');
        try {
            const res = await api.post('/admin/system/restart');
            setRestartMsg(res.data.message || 'Scheduler restarted');
            await fetchHealth();
        } catch (e) {
            setRestartMsg('Failed to restart scheduler');
        } finally {
            setIsRestarting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const statusColor = health?.status === 'healthy' ? 'text-emerald-500' : 'text-amber-500';
    const statusBg = health?.status === 'healthy' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20';

    const healthItems = [
        { label: 'Uptime', value: health?.uptime || '—', icon: Clock },
        { label: 'Database', value: health?.database || '—', icon: Database },
        { label: 'Scheduler', value: health?.scheduler || '—', icon: Cpu },
        { label: 'Scheduled Jobs', value: health?.scheduled_jobs ?? '—', icon: Activity },
        { label: 'Active TG Clients', value: health?.active_telegram_clients ?? '—', icon: Smartphone },
    ];

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">System Controls</h1>
                <p className="text-muted-foreground text-sm">Monitor and manage system health</p>
            </div>

            {/* Overall Status */}
            <div className={`p-4 rounded-lg border ${statusBg}`}>
                <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${health?.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
                    <span className={`font-semibold capitalize ${statusColor}`}>{health?.status || 'Unknown'}</span>
                </div>
            </div>

            {/* Health Details */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">System Health</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {healthItems.map(item => (
                        <div key={item.label} className="flex items-center justify-between text-sm py-2 border-b border-border/50 last:border-0">
                            <span className="text-muted-foreground flex items-center gap-2">
                                <item.icon className="h-4 w-4" />
                                {item.label}
                            </span>
                            <span className="font-medium font-mono text-xs capitalize">{String(item.value)}</span>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Actions */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">Actions</CardTitle>
                    <CardDescription>System management operations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                            <p className="text-sm font-medium">Restart Scheduler</p>
                            <p className="text-xs text-muted-foreground">Stop and restart the APScheduler engine, reloading all tasks</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={handleRestart} disabled={isRestarting}>
                            {isRestarting ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-2 h-3 w-3" />}
                            Restart
                        </Button>
                    </div>
                    {restartMsg && (
                        <p className={`text-xs px-3 py-2 rounded-md ${restartMsg.includes('Failed')
                            ? 'bg-red-500/10 text-red-500'
                            : 'bg-emerald-500/10 text-emerald-500'
                            }`}>
                            {restartMsg}
                        </p>
                    )}

                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                            <p className="text-sm font-medium">Refresh Health</p>
                            <p className="text-xs text-muted-foreground">Re-check system status</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={fetchHealth}>
                            <RefreshCw className="mr-2 h-3 w-3" /> Refresh
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminSystemPage;
