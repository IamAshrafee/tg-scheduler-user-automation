import { useState, useEffect } from 'react';
import api from '../services/api';
import Modal from './ui/modal';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Input } from './ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './ui/select';
import { Loader2, Activity } from 'lucide-react';
import { toast } from 'react-hot-toast';

const KeepOnlineDialog = ({ isOpen, onClose, accountId, accountName }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [settings, setSettings] = useState({
        enabled: false,
        mode: 'always',
        start_time: '08:00',
        end_time: '23:00',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    });

    useEffect(() => {
        if (isOpen && accountId) {
            fetchSettings();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, accountId]);

    const fetchSettings = async () => {
        setIsLoading(true);
        try {
            const res = await api.get(`/keep-online/${accountId}`);
            if (res.data) {
                setSettings({
                    enabled: res.data.enabled || false,
                    mode: res.data.mode || 'always',
                    start_time: res.data.start_time || '08:00',
                    end_time: res.data.end_time || '23:00',
                    timezone: res.data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
                });
            }
        } catch (error) {
            // It's normal to get a 404 if settings don't exist yet, we just start with defaults
            if (error.response?.status !== 404) {
                console.error('Failed to fetch keep online settings:', error);
                toast.error('Failed to load settings');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await api.put(`/keep-online/${accountId}`, settings);
            toast.success('Keep online settings updated');
            onClose();
        } catch (error) {
            console.error('Failed to save keep online settings:', error);
            toast.error(error.response?.data?.detail || 'Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Keep Me Online Settings"
        >
            <div className="space-y-6">
                <p className="text-sm text-muted-foreground -mt-2">
                    Configure online presence for <strong>{accountName}</strong>. This forces your account to appear "Online" in Telegram.
                </p>

                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 rounded-lg border border-primary/20 bg-primary/5">
                            <div>
                                <Label className="text-sm font-medium flex items-center gap-2">
                                    <Activity className="h-4 w-4 text-primary" />
                                    Enable Keep Online
                                </Label>
                                <p className="text-xs text-muted-foreground mt-1">
                                    A background job will keep your status active.
                                </p>
                            </div>
                            <Switch
                                checked={settings.enabled}
                                onCheckedChange={(c) => setSettings({ ...settings, enabled: c })}
                            />
                        </div>

                        {settings.enabled && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div>
                                    <Label className="text-xs font-medium mb-1 block">Mode</Label>
                                    <Select
                                        value={settings.mode}
                                        onValueChange={(v) => setSettings({ ...settings, mode: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="always">Always Online</SelectItem>
                                            <SelectItem value="time_range">Specific Time Range</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {settings.mode === 'time_range' && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-xs font-medium mb-1 block">Start Time</Label>
                                            <Input
                                                type="time"
                                                value={settings.start_time}
                                                onChange={(e) => setSettings({ ...settings, start_time: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs font-medium mb-1 block">End Time</Label>
                                            <Input
                                                type="time"
                                                value={settings.end_time}
                                                onChange={(e) => setSettings({ ...settings, end_time: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <Label className="text-xs font-medium mb-1 block">Timezone</Label>
                                            <Select
                                                value={settings.timezone}
                                                onValueChange={(v) => setSettings({ ...settings, timezone: v })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="UTC">UTC</SelectItem>
                                                    <SelectItem value="Asia/Dhaka">Asia/Dhaka</SelectItem>
                                                    <SelectItem value="Asia/Kolkata">Asia/Kolkata</SelectItem>
                                                    <SelectItem value="America/New_York">America/New_York</SelectItem>
                                                    <SelectItem value="Europe/London">Europe/London</SelectItem>
                                                    {/* Add more as needed, usually UI uses a library but we will provide common ones for now */}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4">
                            <Button variant="outline" onClick={onClose} disabled={isSaving}>
                                Cancel
                            </Button>
                            <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Settings
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default KeepOnlineDialog;
