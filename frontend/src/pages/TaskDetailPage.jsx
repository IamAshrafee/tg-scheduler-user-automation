import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import Modal from '../components/ui/modal';
import TaskEditorDialog from '../components/tasks/TaskEditorDialog';
import toast from 'react-hot-toast';
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
    Hash,
    Megaphone,
    Zap,
} from 'lucide-react';
import { formatDateTime, formatTime, formatLogTime, getTaskTimezone, format24to12 } from '../lib/time';

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

    // Quick Edit state
    const [quickEditOpen, setQuickEditOpen] = useState(false);
    const [quickEditTab, setQuickEditTab] = useState('general');

    // Sticker preview state
    const [stickerPreview, setStickerPreview] = useState(null);
    const [loadingStickerPreview, setLoadingStickerPreview] = useState(false);

    useEffect(() => {
        fetchData();
    }, [id]);

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

    // Load sticker preview thumbnail
    useEffect(() => {
        if (task && task.action_type === 'send_sticker' && task.action_content?.sticker_set_id && task.action_content?.sticker_id) {
            loadStickerPreview();
        }
    }, [task?.action_content?.sticker_id]);

    const loadStickerPreview = async () => {
        if (!task?.telegram_account_id || !task?.action_content?.sticker_set_id) return;
        setLoadingStickerPreview(true);
        try {
            const res = await api.get(`/telegram-accounts/${task.telegram_account_id}/sticker-sets/${task.action_content.sticker_set_id}/stickers`);
            const stickers = res.data.stickers || res.data || [];
            const match = stickers.find(s => String(s.id) === String(task.action_content.sticker_id));
            if (match?.thumbnail) {
                setStickerPreview(match.thumbnail);
            }
        } catch (e) {
            console.error('Failed to load sticker preview:', e);
        } finally {
            setLoadingStickerPreview(false);
        }
    };

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

    // Quick Edit handlers
    const openQuickEdit = (tab) => {
        setQuickEditTab(tab);
        setQuickEditOpen(true);
    };

    const handleQuickEditSave = async (updatedForm) => {
        try {
            const payload = {
                name: updatedForm.name,
                description: updatedForm.description,
                telegram_account_id: updatedForm.telegram_account_id || task.telegram_account_id,
                target: updatedForm.target,
                action_type: updatedForm.action_type,
                action_content: updatedForm.action_content,
                schedule: updatedForm.schedule,
                simulate_typing: updatedForm.simulate_typing,
                skip_days: updatedForm.skip_days,
            };
            const res = await api.put(`/tasks/${id}`, payload);
            setTask(res.data);
            toast.success('Task updated successfully!');
            // Re-fetch to get latest data (next_execution, etc.)
            fetchData();
        } catch (e) {
            console.error('Failed to update task:', e);
            toast.error(e.response?.data?.detail || 'Failed to update task');
        }
    };

    // Quick edit pencil button
    const QuickEditButton = ({ tab, className = '' }) => (
        <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 text-muted-foreground hover:text-foreground ${className}`}
            onClick={() => openQuickEdit(tab)}
            title={`Quick edit`}
        >
            <Pencil className="h-3.5 w-3.5" />
        </Button>
    );

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
    const TargetIcon = task.target?.type === 'channel' ? Megaphone : Hash;

    // --- Content Preview Renderer ---
    const renderContentPreview = () => {
        const { action_type, action_content } = task;
        if (!action_content || Object.keys(action_content).length === 0) {
            return <p className="text-sm text-muted-foreground italic">No content configured</p>;
        }

        switch (action_type) {
            case 'send_text':
                return (
                    <div className="space-y-2">
                        <div className="p-3 rounded-lg bg-muted/50 border border-border">
                            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{action_content.text || 'No text set'}</p>
                        </div>
                        {action_content.parse_mode && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 font-medium">
                                {action_content.parse_mode}
                            </span>
                        )}
                    </div>
                );

            case 'send_sticker':
                return (
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-lg border bg-muted/50 flex items-center justify-center overflow-hidden shrink-0">
                            {loadingStickerPreview ? (
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            ) : stickerPreview ? (
                                <img src={stickerPreview} alt="Sticker" className="w-16 h-16 object-contain" />
                            ) : (
                                <span className="text-3xl">{action_content.sticker_emoji || '🎭'}</span>
                            )}
                        </div>
                        <div className="space-y-1">
                            {action_content.sticker_emoji && (
                                <p className="text-sm">Emoji: <span className="text-lg">{action_content.sticker_emoji}</span></p>
                            )}
                            {action_content.sticker_set_id && (
                                <p className="text-xs text-muted-foreground">Pack: <span className="font-mono">{action_content.sticker_set_id}</span></p>
                            )}
                            <p className="text-[10px] text-muted-foreground font-mono">ID: {action_content.sticker_id}</p>
                        </div>
                    </div>
                );

            case 'send_photo':
            case 'send_video':
            case 'send_document': {
                const typeLabel = action_type.replace('send_', '');
                const TypeIcon = ACTION_ICONS[action_type];
                return (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                            <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center shrink-0">
                                <TypeIcon className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-medium capitalize">{typeLabel} file</p>
                                <p className="text-xs text-muted-foreground truncate">{action_content.file_path || 'No file uploaded'}</p>
                            </div>
                        </div>
                        {action_content.caption && (
                            <div className="pl-3 border-l-2 border-primary/30">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Caption</p>
                                <p className="text-sm">{action_content.caption}</p>
                            </div>
                        )}
                    </div>
                );
            }

            case 'forward_message':
                return (
                    <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Source Chat</span>
                            <span className="font-mono font-medium">{action_content.source_chat_id || 'Not set'}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Message ID</span>
                            <span className="font-mono font-medium">{action_content.source_message_id || 'Not set'}</span>
                        </div>
                    </div>
                );

            default:
                return <p className="text-sm text-muted-foreground italic">Unknown action type</p>;
        }
    };

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
                            <Pencil className="mr-1.5 h-4 w-4" /> Full Edit
                        </Button>
                    </Link>
                    <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}>
                        <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                    </Button>
                </div>
            </div>

            {/* Config Summary + Schedule */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Task Configuration */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">Task Configuration</CardTitle>
                            <QuickEditButton tab="details" />
                        </div>
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
                            <div className="flex items-center gap-1.5">
                                <TargetIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="font-medium">{task.target?.chat_title || `Chat ${task.target?.chat_id}`}</span>
                                <QuickEditButton tab="target" className="ml-1" />
                            </div>
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
                        {task.use_native_schedule && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Native pre-scheduling</span>
                                <span className="text-blue-500 font-medium flex items-center gap-1">
                                    <Zap className="h-3.5 w-3.5" /> Active
                                </span>
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

                {/* Schedule */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">Schedule</CardTitle>
                            <QuickEditButton tab="schedule" />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Type</span>
                            <span className="font-medium capitalize">{task.schedule?.type === 'interval' ? `Interval (${task.schedule.interval_hours || 0}h ${task.schedule.interval_minutes || 0}m)` : task.schedule?.type}</span>
                        </div>
                        {task.schedule?.type !== 'interval' && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Time</span>
                                <span className="font-mono font-medium">{format24to12(task.schedule?.time)}</span>
                            </div>
                        )}
                        {(task.schedule?.times || []).length > 0 && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Extra times</span>
                                <span className="font-mono text-xs">{task.schedule.times.map(t => format24to12(t)).join(', ')}</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Timezone</span>
                            <span className="font-medium">{task.schedule?.timezone || 'UTC'}</span>
                        </div>
                        {task.schedule?.type === 'weekly' && (task.schedule?.repeat_every_n_weeks || 1) > 1 && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Repeat</span>
                                <span className="font-medium">Every {task.schedule.repeat_every_n_weeks} weeks</span>
                            </div>
                        )}
                        {(task.schedule?.start_date || task.schedule?.end_date) && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Date range</span>
                                <span className="font-medium text-xs">{task.schedule.start_date || '—'} → {task.schedule.end_date || '∞'}</span>
                            </div>
                        )}
                        {task.next_execution && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Next run</span>
                                <span className="font-mono text-xs">{formatDateTime(task.next_execution, getTaskTimezone(task))}</span>
                            </div>
                        )}
                        {task.last_execution && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Last run</span>
                                <span className="font-mono text-xs">{formatDateTime(task.last_execution, getTaskTimezone(task))}</span>
                            </div>
                        )}
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Executions</span>
                            <span className="font-medium">
                                {task.execution_count || 0}{task.max_executions ? ` / ${task.max_executions}` : ''}
                                {task.status === 'completed' && <span className="ml-1 text-xs text-emerald-500">(completed)</span>}
                            </span>
                        </div>
                        {task.schedule?.random_delay_minutes > 0 && (
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Random delay</span>
                                <span className="font-medium">Up to {task.schedule.random_delay_minutes} min</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Content Preview */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">Content Preview</CardTitle>
                        <QuickEditButton tab="action" />
                    </div>
                </CardHeader>
                <CardContent>
                    {renderContentPreview()}
                </CardContent>
            </Card>

            {/* Skip Days */}
            {((task.skip_days?.weekly_holidays?.length > 0) || (task.skip_days?.specific_dates?.length > 0) || (task.skip_days?.this_month_only && task.skip_days?.monthly_skip_days?.length > 0)) && (
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">Skip Days</CardTitle>
                            <QuickEditButton tab="safety" />
                        </div>
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
                                                {formatLogTime(log.created_at, getTaskTimezone(task))}
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

            {/* Quick Edit Dialog */}
            <TaskEditorDialog
                isOpen={quickEditOpen}
                onClose={() => setQuickEditOpen(false)}
                task={task}
                onSave={handleQuickEditSave}
                accountId={task.telegram_account_id}
                initialTab={quickEditTab}
            />
        </div>
    );
};

export default TaskDetailPage;
