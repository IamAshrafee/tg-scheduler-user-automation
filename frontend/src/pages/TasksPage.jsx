import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import Modal from '../components/ui/modal';
import {
    Plus,
    Loader2,
    CalendarClock,
    Sticker,
    MessageSquare,
    Image,
    Video,
    FileText,
    Forward,
    ToggleLeft,
    ToggleRight,
    Trash2,
    Eye,
    Pencil,
    Filter,
    Search,
} from 'lucide-react';
import PageTransition from '../components/common/PageTransition';
import { SkeletonCard } from '../components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select';

const ACTION_ICONS = {
    send_sticker: Sticker,
    send_text: MessageSquare,
    send_photo: Image,
    send_video: Video,
    send_document: FileText,
    forward_message: Forward,
};

const ACTION_LABELS = {
    send_sticker: 'Sticker',
    send_text: 'Text',
    send_photo: 'Photo',
    send_video: 'Video',
    send_document: 'Document',
    forward_message: 'Forward',
};

const STATUS_STYLES = {
    active: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    paused: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    error: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const TasksPage = () => {
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterAction, setFilterAction] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [togglingId, setTogglingId] = useState(null);

    const fetchTasks = async () => {
        try {
            const params = {};
            if (filterStatus) params.status = filterStatus;
            if (filterAction) params.action_type = filterAction;
            const res = await api.get('/tasks', { params });
            setTasks(res.data.tasks || []);
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
    }, [filterStatus, filterAction]);

    const handleToggle = async (taskId) => {
        setTogglingId(taskId);
        try {
            const res = await api.patch(`/tasks/${taskId}/toggle`);
            setTasks(prev => prev.map(t => t._id === taskId ? res.data : t));
        } catch (error) {
            console.error('Failed to toggle task:', error);
        } finally {
            setTogglingId(null);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await api.delete(`/tasks/${deleteTarget}`);
            setTasks(prev => prev.filter(t => t._id !== deleteTarget));
            setDeleteTarget(null);
        } catch (error) {
            console.error('Failed to delete task:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredTasks = tasks.filter(task => {
        if (!searchQuery) return true;
        return task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            task.target?.chat_title?.toLowerCase().includes(searchQuery.toLowerCase());
    });



    return (
        <PageTransition className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
                    <p className="text-muted-foreground text-sm">
                        Manage your automated Telegram tasks
                    </p>
                </div>
                <Link to="/tasks/create">
                    <Button className="gap-2">
                        <Plus className="h-4 w-4" /> New Task
                    </Button>
                </Link>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                </div>
                <Select
                    value={filterStatus}
                    onValueChange={setFilterStatus}
                >
                    <SelectTrigger className="w-full sm:w-[150px]">
                        <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                </Select>
                <Select
                    value={filterAction}
                    onValueChange={setFilterAction}
                >
                    <SelectTrigger className="w-full sm:w-[150px]">
                        <SelectValue placeholder="All Actions" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Actions</SelectItem>
                        <SelectItem value="send_sticker">Sticker</SelectItem>
                        <SelectItem value="send_text">Text</SelectItem>
                        <SelectItem value="send_photo">Photo</SelectItem>
                        <SelectItem value="send_video">Video</SelectItem>
                        <SelectItem value="send_document">Document</SelectItem>
                        <SelectItem value="forward_message">Forward</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Tasks Grid */}
            {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <SkeletonCard key={i} />
                    ))}
                </div>
            ) : filteredTasks.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredTasks.map(task => {
                        const ActionIcon = ACTION_ICONS[task.action_type] || CalendarClock;
                        const isToggling = togglingId === task._id;
                        return (
                            <Card key={task._id} className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 hover:border-primary/20">
                                {/* Status indicator strip */}
                                <div className={`absolute top-0 left-0 right-0 h-0.5 ${task.is_enabled ? 'bg-emerald-500' : 'bg-zinc-600'}`} />

                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${task.is_enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                                <ActionIcon className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-semibold text-sm truncate">{task.name}</h3>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {task.target?.chat_title || `Chat ${task.target?.chat_id}`}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${STATUS_STYLES[task.status] || STATUS_STYLES.active}`}>
                                            {task.status}
                                        </span>
                                    </div>

                                    {/* Details */}
                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">Action</span>
                                            <span className="font-medium">{ACTION_LABELS[task.action_type]}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">Schedule</span>
                                            <span className="font-medium capitalize">{task.schedule?.type} at {task.schedule?.time}</span>
                                        </div>
                                        {task.next_execution && (
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-muted-foreground">Next run</span>
                                                <span className="font-mono text-[11px]">
                                                    {new Date(task.next_execution).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 pt-3 border-t">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleToggle(task._id)}
                                            disabled={isToggling}
                                            className={`text-xs gap-1.5 ${task.is_enabled ? 'text-emerald-500 hover:text-emerald-400' : 'text-muted-foreground'}`}
                                        >
                                            {isToggling ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : task.is_enabled ? (
                                                <ToggleRight className="h-3.5 w-3.5" />
                                            ) : (
                                                <ToggleLeft className="h-3.5 w-3.5" />
                                            )}
                                            {task.is_enabled ? 'On' : 'Off'}
                                        </Button>
                                        <Link to={`/tasks/${task._id}`} className="ml-auto">
                                            <Button variant="ghost" size="sm" className="text-xs gap-1.5">
                                                <Eye className="h-3.5 w-3.5" /> View
                                            </Button>
                                        </Link>
                                        <Link to={`/tasks/${task._id}/edit`}>
                                            <Button variant="ghost" size="sm" className="text-xs gap-1.5">
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                        </Link>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setDeleteTarget(task._id)}
                                            className="text-xs text-destructive hover:text-destructive gap-1.5"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted mb-4">
                        <CalendarClock className="h-10 w-10 text-muted-foreground opacity-50" />
                    </div>
                    <h3 className="text-lg font-semibold mb-1">No tasks yet</h3>
                    <p className="text-muted-foreground text-sm mb-4 max-w-sm">
                        Create your first automated task to start scheduling Telegram actions.
                    </p>
                    <Link to="/tasks/create">
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" /> Create First Task
                        </Button>
                    </Link>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                title="Delete Task"
            >
                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to delete this task? This action cannot be undone.
                        The task will be removed from the scheduler immediately.
                    </p>
                    <div className="flex justify-end gap-3">
                        <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                            Delete
                        </Button>
                    </div>
                </div>
            </Modal>
        </PageTransition>
    );
};

export default TasksPage;
