import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import Modal from '../components/ui/modal';
import {
    ArrowLeft,
    Loader2,
    Pencil,
    Trash2,
    Play,
    ToggleLeft,
    ToggleRight,
    CheckCircle2,
    XCircle,
    MinusCircle,
    Clock,
    Sticker,
    MessageSquare,
    Image,
    Video,
    FileText,
    Forward,
    CalendarOff,
} from 'lucide-react';

const ACTION_LABELS = {
    send_sticker: 'Send Sticker',
    send_text: 'Send Text',
    send_photo: 'Send Photo',
    send_video: 'Send Video',
    send_document: 'Send Document',
    forward_message: 'Forward Message',
};

const ACTION_ICONS = {
    send_sticker: Sticker,
    send_text: MessageSquare,
    send_photo: Image,
    send_video: Video,
    send_document: FileText,
    forward_message: Forward,
};

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TaskDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [task, setTask] = useState(null);
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isToggling, setIsToggling] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState(null);
    const [showDelete, setShowDelete] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [taskRes, historyRes] = await Promise.all([
                    api.get(`/tasks/${id}`),
                    api.get(`/tasks/${id}/history?limit=20`),
                ]);
                setTask(taskRes.data);
                setHistory(historyRes.data.logs || []);
            } catch (e) {
                console.error('Failed to load task:', e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleToggle = async () => {
        setIsToggling(true);
        try {
            const res = await api.patch(`/tasks/${id}/toggle`);
            setTask(res.data);
        } catch (e) {
            console.error('Failed to toggle task:', e);
        } finally {
            setIsToggling(false);
        }
    };

    const handleTest = async () => {
        setIsTesting(true);
        setTestResult(null);
        try {
            const res = await api.post(`/tasks/${id}/test`);
            setTestResult({ success: true, message: res.data.message });
        } catch (e) {
            setTestResult({ success: false, message: e.response?.data?.detail || 'Test failed' });
        } finally {
            setIsTesting(false);
        }
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await api.delete(`/tasks/${id}`);
            navigate('/tasks');
        } catch (e) {
            console.error('Failed to delete task:', e);
        } finally {
            setIsDeleting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!task) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <p className="text-muted-foreground mb-4">Task not found.</p>
                <Button variant="outline" onClick={() => navigate('/tasks')}>Back to Tasks</Button>
            </div>
        );
    }

    const ActionIcon = ACTION_ICONS[task.action_type] || Clock;

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/tasks')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-tight">{task.name}</h1>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${task.is_enabled
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                : task.status === 'expired'
                                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                    : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                                }`}>
                                {task.status === 'expired' ? 'Expired' : task.is_enabled ? 'Enabled' : 'Disabled'}
                            </span>
                        </div>
                        <p className="text-muted-foreground text-sm">{task.description || 'No description'}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleToggle} disabled={isToggling}>
                        {isToggling ? <Loader2 className="h-4 w-4 animate-spin" /> : task.is_enabled ? <ToggleRight className="mr-1.5 h-4 w-4" /> : <ToggleLeft className="mr-1.5 h-4 w-4" />}
                        {task.is_enabled ? 'Disable' : 'Enable'}
                    </Button>
                    <Link to={`/tasks/${id}/edit`}>
                        <Button variant="outline" size="sm">
                            <Pencil className="mr-1.5 h-4 w-4" /> Edit
                        </Button>
                    </Link>
                    <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}>
                        <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                    </Button>
                </div>
            </div>

            {/* Config Summary */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Task Configuration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Action</span>
                            <div className="flex items-center gap-1.5">
                                <ActionIcon className="h-4 w-4" />
                                <span className="font-medium">{ACTION_LABELS[task.action_type]}</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Target</span>
                            <span className="font-medium">{task.target?.chat_title || `Chat ${task.target?.chat_id}`}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Status</span>
                            <span className={`font-medium capitalize ${task.status === 'active' ? 'text-emerald-500' : task.status === 'error' ? 'text-red-500' : 'text-amber-500'}`}>
                                {task.status}
                            </span>
                        </div>
                        {task.simulate_typing && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Typing Simulation</span>
                                <span className="text-emerald-500 font-medium">Active</span>
                            </div>
                        )}
                        {task.skip_days?.this_month_only && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground flex items-center gap-1.5">
                                    <CalendarOff className="h-3.5 w-3.5" /> Monthly Only
                                </span>
                                <span className="font-medium text-amber-500">
                                    {task.skip_days.active_month && task.skip_days.active_year
                                        ? new Date(task.skip_days.active_year, task.skip_days.active_month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })
                                        : 'Active'}
                                </span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Schedule</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Type</span>
                            <span className="font-medium capitalize">{task.schedule?.type}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Time</span>
                            <span className="font-mono font-medium">{task.schedule?.time}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Timezone</span>
                            <span className="font-medium">{task.schedule?.timezone || 'UTC'}</span>
                        </div>
                        {task.next_execution && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Next run</span>
                                <span className="font-mono text-xs">{new Date(task.next_execution).toLocaleString()}</span>
                            </div>
                        )}
                        {task.last_execution && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Last run</span>
                                <span className="font-mono text-xs">{new Date(task.last_execution).toLocaleString()}</span>
                            </div>
                        )}
                        {task.schedule?.random_delay_minutes > 0 && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Random delay</span>
                                <span className="font-medium">Up to {task.schedule.random_delay_minutes} min</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Skip Days */}
            {((task.skip_days?.weekly_holidays?.length > 0) || (task.skip_days?.specific_dates?.length > 0) || (task.skip_days?.this_month_only && task.skip_days?.monthly_skip_days?.length > 0)) && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Skip Days</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {(task.skip_days.weekly_holidays || []).map(d => (
                                <span key={d} className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-500 border border-red-500/20">
                                    {DAY_NAMES[d]}
                                </span>
                            ))}
                            {(task.skip_days.specific_dates || []).map(d => (
                                <span key={d} className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-500 border border-red-500/20">
                                    {d}
                                </span>
                            ))}
                            {task.skip_days?.this_month_only && (task.skip_days.monthly_skip_days || []).length > 0 && (
                                <>
                                    <span className="text-xs px-2 py-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">
                                        Monthly skip:
                                    </span>
                                    {task.skip_days.monthly_skip_days.sort((a, b) => a - b).map(d => (
                                        <span key={`m-${d}`} className="text-xs px-2 py-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                            {d}
                                        </span>
                                    ))}
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Dry Run */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Test Execution</CardTitle>
                    <CardDescription>Run this task once immediately to verify it works.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" onClick={handleTest} disabled={isTesting}>
                            {isTesting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Play className="mr-1.5 h-4 w-4" />}
                            Test Now
                        </Button>
                        {testResult && (
                            <span className={`text-sm ${testResult.success ? 'text-emerald-500' : 'text-red-500'}`}>
                                {testResult.message}
                            </span>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Execution History */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">Execution History</CardTitle>
                    <CardDescription>Recent execution logs for this task</CardDescription>
                </CardHeader>
                <CardContent>
                    {history.length > 0 ? (
                        <div className="space-y-3">
                            {history.map(log => (
                                <div key={log._id} className="flex items-start gap-3 text-sm">
                                    {log.status === 'sent' ? (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                                    ) : log.status === 'failed' ? (
                                        <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                                    ) : (
                                        <MinusCircle className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className={`font-medium capitalize ${log.status === 'sent' ? 'text-emerald-500' : log.status === 'failed' ? 'text-red-500' : 'text-zinc-400'}`}>
                                                {log.status}
                                            </span>
                                            <span className="text-xs text-muted-foreground font-mono">
                                                {new Date(log.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        {log.error && <p className="text-xs text-muted-foreground mt-0.5">{log.error}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No execution history yet.</p>
                    )}
                </CardContent>
            </Card>

            {/* Delete Modal */}
            <Modal isOpen={showDelete} onClose={() => setShowDelete(false)} title="Delete Task">
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to delete <strong>{task.name}</strong>? This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" size="sm" onClick={() => setShowDelete(false)}>Cancel</Button>
                        <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                            Delete
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default TaskDetailPage;
