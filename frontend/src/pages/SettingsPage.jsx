import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import {
    Loader2,
    Save,
    Key,
    Globe,
    Mail,
    Shield,
    User,
    CalendarOff,
    Plus,
    X,
    Activity,
    CheckCircle2,
    XCircle,
    MinusCircle,
    ChevronLeft,
    ChevronRight,
    Settings,
    Info,
} from 'lucide-react';
import { cn } from '../lib/utils';

const TIMEZONE_OPTIONS = [
    { value: 'UTC', label: 'UTC (GMT+0)' },
    { value: 'Asia/Dhaka', label: 'Asia/Dhaka (GMT+6)' },
    { value: 'Asia/Kolkata', label: 'Asia/Kolkata (GMT+5:30)' },
    { value: 'America/New_York', label: 'America/New_York (EST)' },
    { value: 'America/Chicago', label: 'America/Chicago (CST)' },
    { value: 'America/Denver', label: 'America/Denver (MST)' },
    { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' },
    { value: 'Europe/London', label: 'Europe/London (GMT)' },
    { value: 'Europe/Berlin', label: 'Europe/Berlin (CET)' },
    { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
    { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
    { value: 'Asia/Shanghai', label: 'Asia/Shanghai (CST)' },
    { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
    { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)' },
    { value: 'Australia/Sydney', label: 'Australia/Sydney (AEDT)' },
    { value: 'Pacific/Auckland', label: 'Pacific/Auckland (NZDT)' },
];

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TABS = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'off-days', label: 'Off Days', icon: CalendarOff },
    { id: 'activity', label: 'Activity Log', icon: Activity },
];

// ─── General Tab ─────────────────────────────────────────────────────
const GeneralTab = ({ user }) => {
    const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
    const [isSavingTz, setIsSavingTz] = useState(false);
    const [tzSaved, setTzSaved] = useState(false);

    const [passwordForm, setPasswordForm] = useState({
        current_password: '',
        new_password: '',
        confirm_password: '',
    });
    const [isSavingPw, setIsSavingPw] = useState(false);
    const [pwMessage, setPwMessage] = useState({ type: '', text: '' });

    const handleSaveTimezone = async () => {
        setIsSavingTz(true);
        setTzSaved(false);
        try {
            await api.put('/auth/me', { timezone });
            setTzSaved(true);
            setTimeout(() => setTzSaved(false), 3000);
        } catch (e) {
            console.error('Failed to save timezone:', e);
        } finally {
            setIsSavingTz(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPwMessage({ type: '', text: '' });

        if (passwordForm.new_password !== passwordForm.confirm_password) {
            setPwMessage({ type: 'error', text: 'New passwords do not match.' });
            return;
        }
        if (passwordForm.new_password.length < 6) {
            setPwMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
            return;
        }

        setIsSavingPw(true);
        try {
            await api.put('/auth/me', {
                current_password: passwordForm.current_password,
                new_password: passwordForm.new_password,
            });
            setPwMessage({ type: 'success', text: 'Password changed successfully.' });
            setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
        } catch (e) {
            setPwMessage({ type: 'error', text: e.response?.data?.detail || 'Failed to change password.' });
        } finally {
            setIsSavingPw(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Profile Info */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                        <User className="h-4 w-4" /> Profile
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5" /> Email
                        </span>
                        <span className="font-medium">{user?.email || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-2">
                            <Shield className="h-3.5 w-3.5" /> Role
                        </span>
                        <span className="font-medium capitalize">{user?.role || 'user'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Account Limits</span>
                        <span className="font-medium font-mono text-xs">
                            {user?.telegram_account_limit || 3} accounts · {user?.task_limit || 20} tasks
                        </span>
                    </div>
                </CardContent>
            </Card>

            {/* Timezone */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Globe className="h-4 w-4" /> Default Timezone
                    </CardTitle>
                    <CardDescription>Used as the default timezone for new tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <select
                        value={timezone}
                        onChange={e => setTimezone(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                        {TIMEZONE_OPTIONS.map(tz => (
                            <option key={tz.value} value={tz.value}>{tz.label}</option>
                        ))}
                    </select>
                    <div className="flex items-center gap-3">
                        <Button size="sm" onClick={handleSaveTimezone} disabled={isSavingTz}>
                            {isSavingTz ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Save className="mr-2 h-3 w-3" />}
                            Save
                        </Button>
                        {tzSaved && <span className="text-xs text-emerald-500">✓ Saved</span>}
                    </div>
                </CardContent>
            </Card>

            {/* Change Password */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                        <Key className="h-4 w-4" /> Change Password
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleChangePassword} className="space-y-3">
                        <div>
                            <label className="text-xs font-medium mb-1 block">Current Password</label>
                            <input
                                type="password"
                                value={passwordForm.current_password}
                                onChange={e => setPasswordForm(p => ({ ...p, current_password: e.target.value }))}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium mb-1 block">New Password</label>
                            <input
                                type="password"
                                value={passwordForm.new_password}
                                onChange={e => setPasswordForm(p => ({ ...p, new_password: e.target.value }))}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                minLength={6}
                                required
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium mb-1 block">Confirm New Password</label>
                            <input
                                type="password"
                                value={passwordForm.confirm_password}
                                onChange={e => setPasswordForm(p => ({ ...p, confirm_password: e.target.value }))}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                minLength={6}
                                required
                            />
                        </div>

                        {pwMessage.text && (
                            <div className={`p-3 rounded-lg text-sm ${pwMessage.type === 'success'
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : 'bg-red-500/10 text-red-500 border border-red-500/20'
                                }`}>
                                {pwMessage.text}
                            </div>
                        )}

                        <Button type="submit" size="sm" disabled={isSavingPw}>
                            {isSavingPw && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                            Change Password
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};


// ─── Off Days Tab ────────────────────────────────────────────────────
const OffDaysTab = () => {
    const [offDays, setOffDays] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [newDate, setNewDate] = useState('');
    const [weeklyHolidays, setWeeklyHolidays] = useState([]);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        const fetchOffDays = async () => {
            try {
                const res = await api.get('/off-days');
                setOffDays(res.data);
                setWeeklyHolidays(res.data.weekly_holidays || []);
            } catch (e) {
                console.error('Failed to fetch off days:', e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchOffDays();
    }, []);

    const toggleWeekday = (idx) => {
        const newDays = weeklyHolidays.includes(idx)
            ? weeklyHolidays.filter(d => d !== idx)
            : [...weeklyHolidays, idx];
        setWeeklyHolidays(newDays);
        setHasChanges(true);
    };

    const saveWeeklyHolidays = async () => {
        setIsSaving(true);
        try {
            const res = await api.put('/off-days', { weekly_holidays: weeklyHolidays });
            setOffDays(res.data);
            setHasChanges(false);
        } catch (e) {
            console.error('Failed to save off days:', e);
        } finally {
            setIsSaving(false);
        }
    };

    const addSpecificDate = async () => {
        if (!newDate) return;
        try {
            const res = await api.post('/off-days/dates', { dates: [newDate] });
            setOffDays(res.data);
            setNewDate('');
        } catch (e) {
            console.error('Failed to add date:', e);
        }
    };

    const removeSpecificDate = async (date) => {
        try {
            const res = await api.delete('/off-days/dates', { data: { dates: [date] } });
            setOffDays(res.data);
        } catch (e) {
            console.error('Failed to remove date:', e);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Description Banner */}
            <div className="flex gap-3 p-4 rounded-lg border border-blue-500/20 bg-blue-500/5">
                <Info className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                <div className="text-sm text-blue-300/90 space-y-1">
                    <p className="font-medium text-blue-300">What are Global Off Days?</p>
                    <p>
                        Global off days pause <strong>ALL tasks</strong> across <strong>ALL your Telegram accounts</strong> at
                        once. Use this for vacations, national holidays, or any day you want every automation to stop.
                    </p>
                    <p className="text-blue-400/70 text-xs">
                        Individual tasks can also have their own skip days — configure those when creating or editing a task.
                    </p>
                </div>
            </div>

            {/* Weekly Holidays */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">Weekly Holidays</CardTitle>
                    <CardDescription>Tasks will be skipped on these days every week</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2 flex-wrap">
                        {DAY_NAMES.map((day, idx) => (
                            <button
                                key={idx}
                                onClick={() => toggleWeekday(idx)}
                                className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${weeklyHolidays.includes(idx)
                                    ? 'border-red-500 bg-red-500/10 text-red-500 shadow-sm'
                                    : 'border-border hover:bg-muted hover:border-primary/30'
                                    }`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                    {hasChanges && (
                        <Button size="sm" onClick={saveWeeklyHolidays} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Save className="mr-2 h-3 w-3" />}
                            Save Changes
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* Specific Dates */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">Specific Dates</CardTitle>
                    <CardDescription>One-time off days (e.g., national holidays, vacations)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-3">
                        <input
                            type="date"
                            value={newDate}
                            onChange={e => setNewDate(e.target.value)}
                            className="flex h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                        <Button size="sm" onClick={addSpecificDate} disabled={!newDate}>
                            <Plus className="mr-1 h-3 w-3" /> Add
                        </Button>
                    </div>

                    {(offDays?.specific_dates || []).length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {offDays.specific_dates
                                .sort((a, b) => a.localeCompare(b))
                                .map(date => (
                                    <span
                                        key={date}
                                        className="flex items-center gap-1.5 text-xs bg-red-500/10 text-red-500 border border-red-500/20 px-2.5 py-1 rounded-md"
                                    >
                                        {new Date(date + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                        <button
                                            onClick={() => removeSpecificDate(date)}
                                            className="hover:text-red-300 transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground">No specific off dates configured.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};


// ─── Activity Log Tab ────────────────────────────────────────────────
const ActivityLogTab = () => {
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
        <div className="space-y-4">
            {/* Filter */}
            <div className="flex justify-end">
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


// ─── Main Settings Page ──────────────────────────────────────────────
const SettingsPage = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('general');

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground text-sm">
                    Manage your account, off days, and view activity logs
                </p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px",
                            activeTab === tab.id
                                ? "border-primary text-foreground"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                        )}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'general' && <GeneralTab user={user} />}
            {activeTab === 'off-days' && <OffDaysTab />}
            {activeTab === 'activity' && <ActivityLogTab />}
        </div>
    );
};

export default SettingsPage;
