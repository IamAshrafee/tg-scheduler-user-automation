/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react';
import Modal from '../ui/modal';
import { Button } from '../ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../ui/select';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import {
    Loader2,
    Check,
    Sticker,
    MessageSquare,
    Image,
    Video,
    FileText,
    Forward,
    CalendarOff,
} from 'lucide-react';
import api from '../../services/api';
import TargetSelectionList from '../common/TargetSelectionList';
import { format24to12 } from '../../lib/time';

// --- Constants ---
const ACTION_TYPES = [
    { value: 'send_sticker', label: 'Send Sticker', icon: Sticker, desc: 'Send a sticker from your packs', color: 'text-yellow-500' },
    { value: 'send_text', label: 'Send Text', icon: MessageSquare, desc: 'Send a text message', color: 'text-blue-500' },
    { value: 'send_photo', label: 'Send Photo', icon: Image, desc: 'Send a photo with optional caption', color: 'text-emerald-500' },
    { value: 'send_video', label: 'Send Video', icon: Video, desc: 'Send a video file', color: 'text-purple-500' },
    { value: 'send_document', label: 'Send Document', icon: FileText, desc: 'Send a document/file', color: 'text-orange-500' },
    { value: 'forward_message', label: 'Forward Message', icon: Forward, desc: 'Forward from another chat', color: 'text-indigo-500' },
];

const SCHEDULE_TYPES = [
    { value: 'daily', label: 'Daily', desc: 'Every day at a specific time' },
    { value: 'weekly', label: 'Weekly', desc: 'On selected days of the week' },
    { value: 'monthly', label: 'Monthly', desc: 'On selected days of the month' },
    { value: 'interval', label: 'Interval', desc: 'Repeat every N hours/minutes' },
    { value: 'custom_days', label: 'Custom Days', desc: 'Choose specific weekdays' },
    { value: 'specific_dates', label: 'Specific Dates', desc: 'One-time on specific dates' },
];

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TABS = [
    { key: 'details', label: 'Details' },
    { key: 'target', label: 'Target' },
    { key: 'action', label: 'Action' },
    { key: 'schedule', label: 'Schedule' },
    { key: 'safety', label: 'Safety' },
];

const TaskEditorDialog = ({ isOpen, onClose, task, onSave, accountId, initialTab }) => {
    const [form, setForm] = useState(null);
    const [stickerSets, setStickerSets] = useState([]);
    const [stickers, setStickers] = useState([]);
    const [selectedStickerSet, setSelectedStickerSet] = useState('');
    const [loadingStickers, setLoadingStickers] = useState(false);
    const [activeTab, setActiveTab] = useState('general');

    // Target selection state
    const [groups, setGroups] = useState([]);
    const [loadingGroups, setLoadingGroups] = useState(false);

    // Initialize form
    useEffect(() => {
        if (task && isOpen) {
            setForm({
                ...task,
                action_content: task.action_content || {},
                schedule: task.schedule || {
                    type: task.schedule_type || 'daily',
                    time: task.default_time || '09:00',
                    timezone: 'UTC',
                    days_of_week: [],
                    days_of_month: [],
                    specific_dates: [],
                    random_delay_minutes: 0,
                },
                target: task.target || { type: 'group', chat_id: 0, chat_title: '' },
                simulate_typing: task.simulate_typing || false,
                skip_days: {
                    weekly_holidays: task.skip_days?.weekly_holidays || [],
                    specific_dates: task.skip_days?.specific_dates || [],
                    this_month_only: task.skip_days?.this_month_only || false,
                    monthly_skip_days: task.skip_days?.monthly_skip_days || [],
                },
            });
            setActiveTab(initialTab || 'general');
            setStickers([]);
            setSelectedStickerSet('');
        }
    }, [task, isOpen, initialTab]);

    // Load sticker sets
    useEffect(() => {
        if (isOpen && accountId && !stickerSets.length) {
            loadStickerSets();
        }
    }, [isOpen, accountId]);

    const loadStickerSets = async () => {
        if (!accountId) return;
        try {
            const res = await api.get(`/telegram-accounts/${accountId}/sticker-sets`);
            setStickerSets(res.data.sticker_sets || res.data || []);
        } catch (e) {
            console.error('Failed to load sticker sets:', e);
        }
    };

    const loadStickers = async (setName) => {
        if (!accountId) return;
        setLoadingStickers(true);
        setSelectedStickerSet(setName);
        try {
            const res = await api.get(`/telegram-accounts/${accountId}/sticker-sets/${setName}/stickers`);
            setStickers(res.data.stickers || res.data || []);
        } catch (e) {
            console.error('Failed to load stickers:', e);
        } finally {
            setLoadingStickers(false);
        }
    };

    const loadGroups = async () => {
        if (!accountId) return;
        setLoadingGroups(true);
        try {
            const res = await api.get(`/telegram-accounts/${accountId}/groups?limit=100`);
            setGroups(res.data?.groups || res.data || []);
        } catch (e) {
            console.error('Failed to load groups:', e);
        } finally {
            setLoadingGroups(false);
        }
    };

    // Load groups when target tab is opened
    useEffect(() => {
        if (activeTab === 'target' && groups.length === 0 && accountId) {
            loadGroups();
        }
    }, [activeTab, accountId]);

    const handleFileUpload = async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await api.post('/tasks/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            updateForm('action_content', {
                ...form.action_content,
                file_path: res.data.file_path,
            });
        } catch (e) {
            console.error('Upload failed:', e);
        }
    };

    const updateForm = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const updateNested = (parent, field, value) => {
        setForm(prev => ({
            ...prev,
            [parent]: { ...prev[parent], [field]: value }
        }));
    };

    const handleSave = () => {
        onSave(form);
        onClose();
    };

    if (!form) return null;

    // --- Renderers ---

    const renderDetailsTab = () => (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div>
                <Label className="text-sm font-medium mb-1 block">Task Name</Label>
                <Input
                    value={form.name}
                    onChange={e => updateForm('name', e.target.value)}
                    placeholder="e.g., Morning duty report"
                />
            </div>
            <div>
                <Label className="text-sm font-medium mb-1 block">Description</Label>
                <Textarea
                    value={form.description || ''}
                    onChange={e => updateForm('description', e.target.value)}
                    placeholder="Brief description of what this task does..."
                    rows={3}
                    className="resize-none"
                />
            </div>
        </div>
    );

    const renderTargetTab = () => (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            {form.target?.chat_title && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 mb-2">
                    <p className="text-xs text-muted-foreground">Current target:</p>
                    <p className="text-sm font-medium">{form.target.chat_title}</p>
                </div>
            )}
            <TargetSelectionList
                groups={groups}
                selectedTargetId={form.target?.chat_id}
                onSelect={(group) => updateForm('target', {
                    type: group.type || 'group',
                    chat_id: group.id,
                    chat_title: group.title,
                    access_hash: group.access_hash,
                })}
                isLoading={loadingGroups}
                onRetry={loadGroups}
            />
        </div>
    );

    const renderContentEditor = () => {
        switch (form.action_type) {
            case 'send_text':
                return (
                    <div className="space-y-4">
                        <Textarea
                            value={form.action_content.text || ''}
                            onChange={e => updateForm('action_content', { ...form.action_content, text: e.target.value })}
                            placeholder="Type your message here..."
                            rows={6}
                            className="resize-none"
                        />
                        <div className="flex gap-3">
                            <span className="text-xs text-muted-foreground pt-1">Parse Mode:</span>
                            {['none', 'markdown', 'html'].map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => updateForm('action_content', { ...form.action_content, parse_mode: mode === 'none' ? null : mode })}
                                    className={`text-xs px-2 py-1 rounded border transition-colors ${(form.action_content.parse_mode || null) === (mode === 'none' ? null : mode)
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'hover:bg-muted'
                                        }`}
                                >
                                    {mode}
                                </button>
                            ))}
                        </div>
                    </div>
                );

            case 'send_sticker':
                return (
                    <div className="space-y-4">
                        {loadingStickers ? (
                            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                        ) : stickers.length > 0 ? (
                            <>
                                <Button variant="outline" size="sm" onClick={() => setStickers([])}>← Back to packs</Button>
                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[300px] overflow-y-auto">
                                    {stickers.map((sticker, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => updateForm('action_content', {
                                                sticker_id: String(sticker.id),
                                                sticker_access_hash: sticker.access_hash,
                                                sticker_emoji: sticker.emoji || '',
                                                sticker_set_id: selectedStickerSet,
                                            })}
                                            className={`p-2 rounded-lg border h-16 flex items-center justify-center transition-all ${form.action_content.sticker_id === String(sticker.id)
                                                ? 'border-primary bg-primary/10 ring-1 ring-primary/20'
                                                : 'hover:bg-muted'
                                                }`}
                                        >
                                            {sticker.thumbnail ? (
                                                <img src={sticker.thumbnail} alt={sticker.emoji} className="h-12 w-12 object-contain" />
                                            ) : <span className="text-2xl">{sticker.emoji || '🎭'}</span>}
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="grid gap-2 max-h-[300px] overflow-y-auto">
                                {stickerSets.length === 0 ? <p className="text-sm text-center py-4">No sticker packs found.</p> :
                                    stickerSets.map((pack, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => loadStickers(pack.short_name || pack.name)}
                                            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted text-left"
                                        >
                                            <span className="text-xl">{pack.emoji || '🎭'}</span>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">{pack.title || pack.name}</p>
                                                <p className="text-[11px] text-muted-foreground">{pack.count || '?'} stickers</p>
                                            </div>
                                        </button>
                                    ))
                                }
                            </div>
                        )}
                    </div>
                );

            case 'send_photo':
            case 'send_video':
            case 'send_document':
                return (
                    <div className="space-y-4">
                        <div className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-border rounded-lg">
                            {form.action_content.file_path ? (
                                <div className="text-center">
                                    <Check className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                                    <p className="text-sm font-medium">File uploaded</p>
                                    <p className="text-xs text-muted-foreground">{form.action_content.file_path}</p>
                                    <Button variant="outline" size="sm" className="mt-2" onClick={() => updateForm('action_content', { ...form.action_content, file_path: null })}>Replace</Button>
                                </div>
                            ) : (
                                <Input type="file" onChange={e => e.target.files[0] && handleFileUpload(e.target.files[0])} className="text-sm file:text-foreground" />
                            )}
                        </div>
                        <Input
                            value={form.action_content.caption || ''}
                            onChange={e => updateForm('action_content', { ...form.action_content, caption: e.target.value })}
                            placeholder="Optional caption..."
                        />
                    </div>
                );

            case 'forward_message':
                return (
                    <div className="space-y-3">
                        <div>
                            <Label className="text-xs font-medium mb-1 block">Source Chat ID</Label>
                            <Input
                                type="number"
                                value={form.action_content.source_chat_id || ''}
                                onChange={e => updateForm('action_content', { ...form.action_content, source_chat_id: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div>
                            <Label className="text-xs font-medium mb-1 block">Message ID</Label>
                            <Input
                                type="number"
                                value={form.action_content.source_message_id || ''}
                                onChange={e => updateForm('action_content', { ...form.action_content, source_message_id: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                    </div>
                );
            default: return <p className="text-sm text-muted-foreground">Select an action type first.</p>;
        }
    };

    const renderActionTab = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            {/* Action Type Picker */}
            <div>
                <Label className="text-sm font-medium mb-2 block">Action Type</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ACTION_TYPES.map(type => (
                        <button
                            key={type.value}
                            onClick={() => {
                                updateForm('action_type', type.value);
                                updateForm('action_content', {});
                            }}
                            className={`flex items-center gap-2 p-2.5 rounded-lg border text-left text-xs transition-all ${form.action_type === type.value
                                ? 'border-primary bg-primary/10 ring-1 ring-primary/20'
                                : 'hover:bg-muted/50'
                                }`}
                        >
                            <type.icon className={`h-4 w-4 shrink-0 ${type.color}`} />
                            <div className="min-w-0">
                                <p className="font-medium">{type.label}</p>
                                <p className="text-[10px] text-muted-foreground truncate">{type.desc}</p>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Editor — directly below action type */}
            <div className="pt-2 border-t border-border">
                <Label className="text-sm font-medium mb-3 block">Content</Label>
                {renderContentEditor()}
            </div>
        </div>
    );

    const renderScheduleTab = () => (
        <div className="space-y-5">
            <div className="space-y-2">
                <Label className="text-xs font-medium">Schedule Type</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                    {SCHEDULE_TYPES.map(st => (
                        <button
                            key={st.value}
                            onClick={() => updateNested('schedule', 'type', st.value)}
                            className={`p-3 rounded-lg border text-left transition-all ${form.schedule.type === st.value
                                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                : 'hover:bg-muted/50'
                                }`}
                        >
                            <p className="text-sm font-medium">{st.label}</p>
                            <p className="text-[11px] text-muted-foreground">{st.desc}</p>
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <Label className="text-xs font-medium mb-1 block">Time</Label>
                    <Input
                        type="time"
                        value={form.schedule.time}
                        onChange={e => updateNested('schedule', 'time', e.target.value)}
                    />
                </div>
                <div>
                    <Label className="text-xs font-medium mb-1 block">Timezone</Label>
                    <Select
                        value={form.schedule.timezone || 'UTC'}
                        onValueChange={value => updateNested('schedule', 'timezone', value)}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="UTC">UTC</SelectItem>
                            <SelectItem value="Asia/Dhaka">Asia/Dhaka (GMT+6)</SelectItem>
                            <SelectItem value="Asia/Kolkata">Asia/Kolkata (GMT+5:30)</SelectItem>
                            <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                            <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                            <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                            <SelectItem value="Europe/Berlin">Europe/Berlin (CET)</SelectItem>
                            <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                            <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                            <SelectItem value="Australia/Sydney">Australia/Sydney (AEDT)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {(form.schedule.type === 'weekly' || form.schedule.type === 'custom_days') && (
                <div>
                    <Label className="text-xs font-medium mb-2 block">Days of Week</Label>
                    <div className="flex gap-2 flex-wrap">
                        {DAY_NAMES.map((day, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    const days = form.schedule.days_of_week || [];
                                    const newDays = days.includes(idx) ? days.filter(d => d !== idx) : [...days, idx];
                                    updateNested('schedule', 'days_of_week', newDays);
                                }}
                                className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${(form.schedule.days_of_week || []).includes(idx)
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'hover:bg-muted'
                                    }`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Monthly days */}
            {form.schedule.type === 'monthly' && (
                <div>
                    <Label className="text-xs font-medium mb-2 block">Days of Month</Label>
                    <div className="flex gap-1.5 flex-wrap">
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                            <button
                                key={day}
                                onClick={() => {
                                    const days = form.schedule.days_of_month || [];
                                    const newDays = days.includes(day) ? days.filter(d => d !== day) : [...days, day];
                                    updateNested('schedule', 'days_of_month', newDays);
                                }}
                                className={`w-8 h-8 rounded border text-xs font-medium transition-all ${(form.schedule.days_of_month || []).includes(day)
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'hover:bg-muted'
                                    }`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Specific dates */}
            {form.schedule.type === 'specific_dates' && (
                <div>
                    <Label className="text-xs font-medium mb-1 block">Specific Dates</Label>
                    <Input
                        type="date"
                        onChange={e => {
                            if (e.target.value) {
                                const dates = form.schedule.specific_dates || [];
                                if (!dates.includes(e.target.value)) {
                                    updateNested('schedule', 'specific_dates', [...dates, e.target.value]);
                                }
                            }
                        }}
                    />
                    {(form.schedule.specific_dates || []).length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                            {form.schedule.specific_dates.map(date => (
                                <span key={date} className="flex items-center gap-1 text-xs bg-secondary px-2 py-1 rounded">
                                    {date}
                                    <button onClick={() => updateNested('schedule', 'specific_dates', form.schedule.specific_dates.filter(d => d !== date))} className="hover:text-destructive">×</button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Interval config */}
            {form.schedule.type === 'interval' && (
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <Label className="text-xs font-medium mb-1 block">Every N Hours</Label>
                        <Input
                            type="number" min="0" max="168"
                            value={form.schedule.interval_hours || 0}
                            onChange={e => updateNested('schedule', 'interval_hours', parseInt(e.target.value) || 0)}
                        />
                    </div>
                    <div>
                        <Label className="text-xs font-medium mb-1 block">And N Minutes</Label>
                        <Input
                            type="number" min="0" max="59"
                            value={form.schedule.interval_minutes || 0}
                            onChange={e => updateNested('schedule', 'interval_minutes', parseInt(e.target.value) || 0)}
                        />
                    </div>
                    <p className="text-[11px] text-muted-foreground sm:col-span-2">
                        Task will repeat every {form.schedule.interval_hours || 0}h {form.schedule.interval_minutes || 0}m.
                    </p>
                </div>
            )}

            {/* Multiple times per day */}
            {['daily', 'weekly', 'monthly'].includes(form.schedule.type) && (
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs font-medium">Multiple Times Per Day</Label>
                        <button
                            onClick={() => {
                                const times = form.schedule.times || [];
                                updateNested('schedule', 'times', [...times, '12:00']);
                            }}
                            className="text-xs text-primary hover:underline"
                        >+ Add time slot</button>
                    </div>
                    {(form.schedule.times || []).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {form.schedule.times.map((t, i) => (
                                <div key={i} className="flex items-center gap-1 bg-secondary rounded-md px-2 py-1">
                                    <input
                                        type="time" value={t}
                                        onChange={e => {
                                            const newTimes = [...form.schedule.times];
                                            newTimes[i] = e.target.value;
                                            updateNested('schedule', 'times', newTimes);
                                        }}
                                        className="bg-transparent text-sm border-none outline-none w-24"
                                    />
                                    <button
                                        onClick={() => updateNested('schedule', 'times', form.schedule.times.filter((_, idx) => idx !== i))}
                                        className="text-muted-foreground hover:text-destructive text-sm"
                                    >×</button>
                                </div>
                            ))}
                        </div>
                    )}
                    {(form.schedule.times || []).length > 0 && (
                        <p className="text-[11px] text-muted-foreground mt-1">
                            Primary ({format24to12(form.schedule.time)}) + {form.schedule.times.length} extra slot(s).
                        </p>
                    )}
                </div>
            )}

            {/* Bi-weekly selector */}
            {form.schedule.type === 'weekly' && (
                <div>
                    <Label className="text-xs font-medium mb-1 block">Repeat Every</Label>
                    <Select
                        value={String(form.schedule.repeat_every_n_weeks || 1)}
                        onValueChange={value => updateNested('schedule', 'repeat_every_n_weeks', parseInt(value))}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">Every week</SelectItem>
                            <SelectItem value="2">Every 2 weeks</SelectItem>
                            <SelectItem value="3">Every 3 weeks</SelectItem>
                            <SelectItem value="4">Every 4 weeks</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Start / End Date */}
            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <Label className="text-xs font-medium mb-1 block">Start Date (optional)</Label>
                    <Input
                        type="date"
                        value={form.schedule.start_date || ''}
                        onChange={e => updateNested('schedule', 'start_date', e.target.value || '')}
                    />
                    <p className="text-[11px] text-muted-foreground mt-0.5">Won't run before this date</p>
                </div>
                <div>
                    <Label className="text-xs font-medium mb-1 block">End Date (optional)</Label>
                    <Input
                        type="date"
                        value={form.schedule.end_date || ''}
                        onChange={e => updateNested('schedule', 'end_date', e.target.value || '')}
                    />
                    <p className="text-[11px] text-muted-foreground mt-0.5">Auto-completes after this date</p>
                </div>
            </div>

            <div>
                <Label className="text-xs font-medium mb-1 block">Random Delay: {form.schedule.random_delay_minutes} min</Label>
                <Input
                    type="range" min="0" max="15"
                    value={form.schedule.random_delay_minutes}
                    onChange={e => updateNested('schedule', 'random_delay_minutes', parseInt(e.target.value))}
                    className="w-full"
                />
                <p className="text-[11px] text-muted-foreground">Adds a random delay (0 to {form.schedule.random_delay_minutes} minutes) before execution to avoid detection.</p>
            </div>
        </div>
    );

    const renderSafetyTab = () => (
        <div className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                    <p className="text-sm font-medium">Simulate Typing</p>
                    <p className="text-xs text-muted-foreground">Show "typing..." indicator before sending</p>
                </div>
                <Switch
                    checked={form.simulate_typing}
                    onCheckedChange={(checked) => updateForm('simulate_typing', checked)}
                />
            </div>

            {/* Max Executions */}
            <div className="p-4 rounded-lg border">
                <Label className="text-xs font-medium mb-1 block">Execution Limit (optional)</Label>
                <Input
                    type="number" min="0" placeholder="Unlimited"
                    value={form.max_executions || ''}
                    onChange={e => updateForm('max_executions', parseInt(e.target.value) || null)}
                />
                <p className="text-[11px] text-muted-foreground mt-1">Auto-completes after this many executions. Leave empty for unlimited.</p>
            </div>
            <div>
                <Label className="text-xs font-medium mb-2 block">Skip Days (Safe Mode)</Label>
                <div className="flex gap-2 flex-wrap">
                    {DAY_NAMES.map((day, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                const days = form.skip_days.weekly_holidays || [];
                                const newDays = days.includes(idx) ? days.filter(d => d !== idx) : [...days, idx];
                                updateForm('skip_days', { ...form.skip_days, weekly_holidays: newDays });
                            }}
                            className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${(form.skip_days.weekly_holidays || []).includes(idx)
                                ? 'border-red-500 bg-red-500/10 text-red-500'
                                : 'hover:bg-muted'
                                }`}
                        >
                            {day}
                        </button>
                    ))}
                </div>
            </div>

            {/* Skip Specific Dates */}
            <div>
                <Label className="text-xs font-medium mb-1 block">Skip Specific Dates</Label>
                <Input
                    type="date"
                    onChange={e => {
                        if (e.target.value) {
                            const dates = form.skip_days.specific_dates || [];
                            if (!dates.includes(e.target.value)) {
                                updateForm('skip_days', { ...form.skip_days, specific_dates: [...dates, e.target.value] });
                            }
                        }
                    }}
                />
                {(form.skip_days.specific_dates || []).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {form.skip_days.specific_dates.map(date => (
                            <span key={date} className="flex items-center gap-1 text-xs bg-red-500/10 text-red-500 px-2 py-1 rounded">
                                {date}
                                <button onClick={() => updateForm('skip_days', { ...form.skip_days, specific_dates: form.skip_days.specific_dates.filter(d => d !== date) })} className="hover:text-red-400">×</button>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Only This Month */}
            <div className="space-y-4 pt-2 border-t border-border">
                <div className="flex items-center justify-between p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
                    <div className="flex items-start gap-3">
                        <CalendarOff className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-medium">Only This Month</p>
                            <p className="text-xs text-muted-foreground">Task will auto-deactivate when the current month ends</p>
                        </div>
                    </div>
                    <Switch
                        checked={form.skip_days.this_month_only || false}
                        onCheckedChange={(checked) => updateForm('skip_days', {
                            ...form.skip_days,
                            this_month_only: checked,
                            monthly_skip_days: checked ? form.skip_days.monthly_skip_days || [] : [],
                        })}
                    />
                </div>

                {form.skip_days.this_month_only && (
                    <div className="space-y-3">
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                                📅 This task will only run during <strong>{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</strong>.
                                When the month ends, it will be automatically deactivated.
                            </p>
                        </div>
                        <div>
                            <Label className="text-xs font-medium mb-2 block">Skip Days of Month</Label>
                            <div className="flex gap-1.5 flex-wrap">
                                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                    <button
                                        key={day}
                                        onClick={() => {
                                            const days = form.skip_days.monthly_skip_days || [];
                                            const newDays = days.includes(day) ? days.filter(d => d !== day) : [...days, day];
                                            updateForm('skip_days', { ...form.skip_days, monthly_skip_days: newDays });
                                        }}
                                        className={`w-8 h-8 rounded border text-xs font-medium transition-all ${(form.skip_days.monthly_skip_days || []).includes(day)
                                            ? 'border-amber-500 bg-amber-500/20 text-amber-600 dark:text-amber-400'
                                            : 'border-border hover:bg-muted'
                                            }`}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Edit Task"
            className="max-w-3xl"
        >
            <div className="flex flex-col h-[70vh]">
                <div className="flex bg-muted p-1 rounded-lg mb-4 shrink-0 overflow-x-auto">
                    {TABS.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === tab.key
                                ? 'bg-background shadow text-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto pr-2 pb-4">
                    {activeTab === 'details' && renderDetailsTab()}

                    {activeTab === 'target' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2">
                            {renderTargetTab()}
                        </div>
                    )}

                    {activeTab === 'action' && renderActionTab()}

                    {activeTab === 'schedule' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2">
                            {renderScheduleTab()}
                        </div>
                    )}

                    {activeTab === 'safety' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2">
                            {renderSafetyTab()}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t shrink-0">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save Changes</Button>
                </div>
            </div>
        </Modal>
    );
};

export default TaskEditorDialog;
