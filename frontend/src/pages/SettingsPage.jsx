import { useState } from 'react';
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
} from 'lucide-react';

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

const SettingsPage = () => {
    const { user } = useAuth();
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
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground text-sm">
                    Manage your account preferences
                </p>
            </div>

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

export default SettingsPage;
