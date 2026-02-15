import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import {
    ArrowLeft,
    ArrowRight,
    Check,
    Loader2,
    Sticker,
    MessageSquare,
    Image,
    Video,
    FileText,
    Forward,
    Play,
    Save,
    Users,
    Hash,
    Clock,
    Calendar,
    Shield,
} from 'lucide-react';

const STEPS = [
    { title: 'Account', icon: Users, desc: 'Select Telegram account' },
    { title: 'Target', icon: Hash, desc: 'Choose group or channel' },
    { title: 'Action', icon: Play, desc: 'Pick action type' },
    { title: 'Content', icon: MessageSquare, desc: 'Configure content' },
    { title: 'Schedule', icon: Clock, desc: 'Set timing' },
    { title: 'Options', icon: Shield, desc: 'Skip days & anti-ban' },
    { title: 'Review', icon: Check, desc: 'Review & save' },
];

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
    { value: 'custom_days', label: 'Custom Days', desc: 'Choose specific weekdays' },
    { value: 'specific_dates', label: 'Specific Dates', desc: 'One-time on specific dates' },
];

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const CreateTaskPage = () => {
    const navigate = useNavigate();
    const { id: editId } = useParams();
    const { user } = useAuth();
    const isEdit = !!editId;

    const [step, setStep] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    // Data
    const [accounts, setAccounts] = useState([]);
    const [groups, setGroups] = useState([]);
    const [stickerSets, setStickerSets] = useState([]);
    const [stickers, setStickers] = useState([]);
    const [selectedStickerSet, setSelectedStickerSet] = useState('');
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [loadingStickers, setLoadingStickers] = useState(false);

    // Form state
    const [form, setForm] = useState({
        name: '',
        description: '',
        telegram_account_id: '',
        target: { type: 'group', chat_id: 0, chat_title: '' },
        action_type: '',
        action_content: {},
        schedule: {
            type: 'daily',
            time: '09:00',
            timezone: user?.timezone || 'UTC',
            days_of_week: [],
            days_of_month: [],
            specific_dates: [],
            random_delay_minutes: 0,
        },
        simulate_typing: false,
        skip_days: { weekly_holidays: [], specific_dates: [] },
    });

    // Load accounts on mount
    useEffect(() => {
        const loadAccounts = async () => {
            try {
                const res = await api.get('/telegram-accounts');
                setAccounts(res.data || []);
            } catch (e) {
                console.error('Failed to load accounts:', e);
            }
        };
        loadAccounts();
    }, []);

    // Load existing task for edit mode
    useEffect(() => {
        if (!editId) return;
        const loadTask = async () => {
            setIsLoading(true);
            try {
                const res = await api.get(`/tasks/${editId}`);
                const task = res.data;
                setForm({
                    name: task.name || '',
                    description: task.description || '',
                    telegram_account_id: task.telegram_account_id,
                    target: task.target,
                    action_type: task.action_type,
                    action_content: task.action_content || {},
                    schedule: { ...task.schedule, random_delay_minutes: task.schedule?.random_delay_minutes || 0 },
                    simulate_typing: task.simulate_typing || false,
                    skip_days: task.skip_days || { weekly_holidays: [], specific_dates: [] },
                });
            } catch (e) {
                setError('Failed to load task for editing');
            } finally {
                setIsLoading(false);
            }
        };
        loadTask();
    }, [editId]);

    // Load groups when account is selected
    const loadGroups = async (accountId) => {
        setLoadingGroups(true);
        try {
            const res = await api.get(`/telegram-accounts/${accountId}/groups`);
            setGroups(res.data.groups || res.data || []);
        } catch (e) {
            console.error('Failed to load groups:', e);
            setGroups([]);
        } finally {
            setLoadingGroups(false);
        }
    };

    // Load sticker sets
    const loadStickerSets = async (accountId) => {
        setLoadingStickers(true);
        try {
            const res = await api.get(`/telegram-accounts/${accountId}/sticker-sets`);
            setStickerSets(res.data.sticker_sets || res.data || []);
        } catch (e) {
            console.error('Failed to load sticker sets:', e);
        } finally {
            setLoadingStickers(false);
        }
    };

    // Load stickers from a pack
    const loadStickers = async (setName) => {
        if (!form.telegram_account_id) return;
        setLoadingStickers(true);
        setSelectedStickerSet(setName);
        try {
            const res = await api.get(`/telegram-accounts/${form.telegram_account_id}/sticker-sets/${setName}/stickers`);
            setStickers(res.data.stickers || res.data || []);
        } catch (e) {
            console.error('Failed to load stickers:', e);
        } finally {
            setLoadingStickers(false);
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

    const canProceed = () => {
        switch (step) {
            case 0: return !!form.telegram_account_id;
            case 1: return !!form.target.chat_id;
            case 2: return !!form.action_type;
            case 3: {
                if (form.action_type === 'send_text') return !!form.action_content.text;
                if (form.action_type === 'send_sticker') return !!form.action_content.sticker_id;
                if (['send_photo', 'send_video', 'send_document'].includes(form.action_type)) return !!form.action_content.file_path;
                if (form.action_type === 'forward_message') return !!form.action_content.source_chat_id && !!form.action_content.source_message_id;
                return false;
            }
            case 4: return !!form.schedule.time;
            case 5: return true;
            case 6: return !!form.name;
            default: return false;
        }
    };

    const handleNext = () => {
        if (step < STEPS.length - 1) setStep(step + 1);
    };

    const handleBack = () => {
        if (step > 0) setStep(step - 1);
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError('');
        try {
            const payload = {
                telegram_account_id: form.telegram_account_id,
                name: form.name,
                description: form.description,
                target: form.target,
                action_type: form.action_type,
                action_content: form.action_content,
                schedule: form.schedule,
                simulate_typing: form.simulate_typing,
                skip_days: form.skip_days,
            };

            if (isEdit) {
                await api.put(`/tasks/${editId}`, payload);
            } else {
                await api.post('/tasks', payload);
            }
            navigate('/tasks');
        } catch (e) {
            setError(e.response?.data?.detail || 'Failed to save task');
        } finally {
            setIsSaving(false);
        }
    };

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
            setError(e.response?.data?.detail || 'Failed to upload file');
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // --- Step renderers ---
    const renderAccountStep = () => (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Select the Telegram account that will execute this task.</p>
            {accounts.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-muted-foreground mb-3">No Telegram accounts connected.</p>
                    <Button variant="outline" onClick={() => navigate('/accounts')}>Connect Account</Button>
                </div>
            ) : (
                <div className="grid gap-3">
                    {accounts.map(acc => (
                        <button
                            key={acc._id}
                            onClick={() => {
                                updateForm('telegram_account_id', acc._id);
                                loadGroups(acc._id);
                                if (form.action_type === 'send_sticker') loadStickerSets(acc._id);
                            }}
                            className={`flex items-center gap-4 p-4 rounded-lg border text-left transition-all ${form.telegram_account_id === acc._id
                                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                : 'border-border hover:border-primary/40 hover:bg-muted/50'
                                }`}
                        >
                            <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${acc.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                                {acc.first_name?.[0] || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{acc.first_name} {acc.username ? `(@${acc.username})` : ''}</p>
                                <p className="text-xs text-muted-foreground">{acc.phone_number}</p>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${acc.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border'}`}>
                                {acc.status}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );

    const renderTargetStep = () => (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Choose the group or channel where this action will be executed.</p>
            {loadingGroups ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Loading groups...</span>
                </div>
            ) : groups.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-muted-foreground">No groups found. Make sure the account has joined groups.</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => loadGroups(form.telegram_account_id)}>
                        Retry
                    </Button>
                </div>
            ) : (
                <div className="grid gap-2 max-h-[400px] overflow-y-auto pr-1">
                    {groups.map(group => (
                        <button
                            key={group.id}
                            onClick={() => updateForm('target', {
                                type: group.type || 'group',
                                chat_id: group.id,
                                chat_title: group.title,
                                access_hash: group.access_hash,
                            })}
                            className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${form.target.chat_id === group.id
                                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                : 'border-border hover:border-primary/40 hover:bg-muted/50'
                                }`}
                        >
                            <div className="flex h-8 w-8 items-center justify-center rounded bg-muted text-xs font-medium">
                                {group.title?.[0] || '#'}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">{group.title}</p>
                                <p className="text-[11px] text-muted-foreground">{group.type || 'group'}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );

    const renderActionStep = () => (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">What type of action should this task perform?</p>
            <div className="grid gap-3 sm:grid-cols-2">
                {ACTION_TYPES.map(action => {
                    const Icon = action.icon;
                    return (
                        <button
                            key={action.value}
                            onClick={() => {
                                updateForm('action_type', action.value);
                                updateForm('action_content', {});
                                if (action.value === 'send_sticker' && form.telegram_account_id) {
                                    loadStickerSets(form.telegram_account_id);
                                }
                            }}
                            className={`flex items-start gap-3 p-4 rounded-lg border text-left transition-all ${form.action_type === action.value
                                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                : 'border-border hover:border-primary/40 hover:bg-muted/50'
                                }`}
                        >
                            <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${action.color}`} />
                            <div>
                                <p className="text-sm font-medium">{action.label}</p>
                                <p className="text-xs text-muted-foreground">{action.desc}</p>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );

    const renderContentStep = () => {
        switch (form.action_type) {
            case 'send_text':
                return (
                    <div className="space-y-4">
                        <Label className="text-sm font-medium">Message Text</Label>
                        <Textarea
                            value={form.action_content.text || ''}
                            onChange={e => updateForm('action_content', { ...form.action_content, text: e.target.value })}
                            placeholder="Type your message here..."
                            rows={6}
                            className="resize-none"
                        />
                        <div className="flex gap-3">
                            <Label className="text-xs text-muted-foreground pt-1">Parse Mode:</Label>
                            {['none', 'markdown', 'html'].map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => updateForm('action_content', { ...form.action_content, parse_mode: mode === 'none' ? null : mode })}
                                    className={`text-xs px-2 py-1 rounded border ${(form.action_content.parse_mode || null) === (mode === 'none' ? null : mode)
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-border hover:bg-muted'
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
                        <p className="text-sm text-muted-foreground">Select a sticker to send.</p>
                        {loadingStickers ? (
                            <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : stickers.length > 0 ? (
                            <>
                                <Button variant="outline" size="sm" onClick={() => setStickers([])}>
                                    ← Back to packs
                                </Button>
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
                                                : 'border-border hover:bg-muted'
                                                }`}
                                        >
                                            {sticker.thumbnail ? (
                                                <img src={sticker.thumbnail} alt={sticker.emoji || 'sticker'} className="h-12 w-12 object-contain" />
                                            ) : (
                                                <span className="text-2xl">{sticker.emoji || '🎭'}</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="grid gap-2 max-h-[300px] overflow-y-auto">
                                {stickerSets.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-4">No sticker packs found.</p>
                                ) : (
                                    stickerSets.map((pack, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => loadStickers(pack.short_name || pack.name)}
                                            className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted text-left transition-all"
                                        >
                                            <span className="text-xl">{pack.emoji || '🎭'}</span>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">{pack.title || pack.name}</p>
                                                <p className="text-[11px] text-muted-foreground">{pack.count || '?'} stickers</p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                );

            case 'send_photo':
            case 'send_video':
            case 'send_document':
                return (
                    <div className="space-y-4">
                        <Label className="text-sm font-medium">
                            Upload a {form.action_type.replace('send_', '')} file (max 50MB).
                        </Label>
                        <div className="flex flex-col items-center gap-3 p-8 border-2 border-dashed border-border rounded-lg bg-muted/10">
                            {form.action_content.file_path ? (
                                <div className="text-center">
                                    <Check className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                                    <p className="text-sm font-medium">File uploaded</p>
                                    <p className="text-xs text-muted-foreground">{form.action_content.file_path}</p>
                                    <Button variant="outline" size="sm" className="mt-2" onClick={() => updateForm('action_content', { ...form.action_content, file_path: null })}>
                                        Replace
                                    </Button>
                                </div>
                            ) : (
                                <>
                                    <Input
                                        type="file"
                                        onChange={e => {
                                            if (e.target.files[0]) handleFileUpload(e.target.files[0]);
                                        }}
                                        className="max-w-xs"
                                    />
                                </>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Caption (Optional)</Label>
                            <Input
                                value={form.action_content.caption || ''}
                                onChange={e => updateForm('action_content', { ...form.action_content, caption: e.target.value })}
                                placeholder="Optional caption..."
                            />
                        </div>
                    </div>
                );

            case 'forward_message':
                return (
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">Enter the source chat and message to forward.</p>
                        <div className="space-y-3">
                            <div>
                                <Label className="text-xs font-medium mb-1 block">Source Chat ID</Label>
                                <Input
                                    type="number"
                                    value={form.action_content.source_chat_id || ''}
                                    onChange={e => updateForm('action_content', { ...form.action_content, source_chat_id: parseInt(e.target.value) || 0 })}
                                    placeholder="Enter chat ID..."
                                />
                            </div>
                            <div>
                                <Label className="text-xs font-medium mb-1 block">Message ID</Label>
                                <Input
                                    type="number"
                                    value={form.action_content.source_message_id || ''}
                                    onChange={e => updateForm('action_content', { ...form.action_content, source_message_id: parseInt(e.target.value) || 0 })}
                                    placeholder="Enter message ID..."
                                />
                            </div>
                        </div>
                    </div>
                );

            default:
                return <p className="text-sm text-muted-foreground">Select an action type first.</p>;
        }
    };

    const renderScheduleStep = () => (
        <div className="space-y-5">
            <p className="text-sm text-muted-foreground">Configure when this task should execute.</p>

            {/* Schedule Type */}
            <div className="space-y-2">
                <Label className="text-xs font-medium">Schedule Type</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                    {SCHEDULE_TYPES.map(st => (
                        <button
                            key={st.value}
                            onClick={() => updateNested('schedule', 'type', st.value)}
                            className={`p-3 rounded-lg border text-left transition-all ${form.schedule.type === st.value
                                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                                : 'border-border hover:bg-muted/50'
                                }`}
                        >
                            <p className="text-sm font-medium">{st.label}</p>
                            <p className="text-[11px] text-muted-foreground">{st.desc}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Time */}
            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <Label className="text-xs font-medium mb-1 block">Time</Label>
                    <Input
                        type="time"
                        value={form.schedule.time}
                        onChange={e => updateNested('schedule', 'time', e.target.value)}
                        className="text-lg py-2 h-12"
                    />
                </div>
                <div>
                    <Label className="text-xs font-medium mb-1 block">Timezone</Label>
                    <Select
                        value={form.schedule.timezone || user?.timezone || 'UTC'}
                        onValueChange={value => updateNested('schedule', 'timezone', value)}
                    >
                        <SelectTrigger className="w-full h-12">
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

            {/* Weekly days */}
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
                                className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-all ${(form.schedule.days_of_week || []).includes(idx)
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-border hover:bg-muted'
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
                                    : 'border-border hover:bg-muted'
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

            {/* Random delay */}
            <div>
                <Label className="text-xs font-medium mb-1 block">Random Delay (anti-ban): {form.schedule.random_delay_minutes} min</Label>
                <input
                    type="range"
                    min="0"
                    max="15"
                    value={form.schedule.random_delay_minutes}
                    onChange={e => updateNested('schedule', 'random_delay_minutes', parseInt(e.target.value))}
                    className="w-full"
                />
                <p className="text-[11px] text-muted-foreground">Adds a random delay (0 to {form.schedule.random_delay_minutes} minutes) before execution to avoid detection.</p>
            </div>
        </div>
    );

    const renderOptionsStep = () => (
        <div className="space-y-6">
            <p className="text-sm text-muted-foreground">Configure skip days and anti-ban settings.</p>

            {/* Simulate Typing */}
            <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                    <Label className="text-sm font-medium">Simulate Typing</Label>
                    <p className="text-xs text-muted-foreground">Show "typing..." indicator before sending (more human-like)</p>
                </div>
                <Switch
                    checked={form.simulate_typing}
                    onCheckedChange={(checked) => updateForm('simulate_typing', checked)}
                />
            </div>

            {/* Skip Weekly Days */}
            <div>
                <Label className="text-xs font-medium mb-2 block">Skip Days (task won't run on these days)</Label>
                <div className="flex gap-2 flex-wrap">
                    {DAY_NAMES.map((day, idx) => (
                        <button
                            key={idx}
                            onClick={() => {
                                const days = form.skip_days.weekly_holidays || [];
                                const newDays = days.includes(idx) ? days.filter(d => d !== idx) : [...days, idx];
                                updateForm('skip_days', { ...form.skip_days, weekly_holidays: newDays });
                            }}
                            className={`px-3 py-1.5 rounded-md border text-xs font-medium transition-all ${(form.skip_days.weekly_holidays || []).includes(idx)
                                ? 'border-red-500 bg-red-500/10 text-red-500'
                                : 'border-border hover:bg-muted'
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
        </div>
    );

    const renderReviewStep = () => {
        const selectedAccount = accounts.find(a => a._id === form.telegram_account_id);
        return (
            <div className="space-y-5">
                <p className="text-sm text-muted-foreground">Review your task configuration and give it a name.</p>

                {/* Task name */}
                <div>
                    <Label className="text-xs font-medium mb-1 block">Task Name *</Label>
                    <Input
                        value={form.name}
                        onChange={e => updateForm('name', e.target.value)}
                        placeholder="e.g., Morning Attendance, Daily Post..."
                    />
                </div>
                <div>
                    <Label className="text-xs font-medium mb-1 block">Description (optional)</Label>
                    <Input
                        value={form.description}
                        onChange={e => updateForm('description', e.target.value)}
                        placeholder="Brief description..."
                    />
                </div>

                {/* Summary */}
                <div className="grid gap-3 p-4 rounded-lg border bg-muted/30">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Account</span>
                        <span className="font-medium">{selectedAccount?.first_name || '—'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Target</span>
                        <span className="font-medium">{form.target.chat_title || '—'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Action</span>
                        <span className="font-medium capitalize">{form.action_type.replace('send_', '').replace('forward_', 'Forward ')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Schedule</span>
                        <span className="font-medium capitalize">{form.schedule.type} at {form.schedule.time}</span>
                    </div>
                    {form.simulate_typing && (
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Anti-ban</span>
                            <span className="font-medium text-emerald-500">Typing simulation on</span>
                        </div>
                    )}
                    {form.schedule.random_delay_minutes > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Random delay</span>
                            <span className="font-medium">Up to {form.schedule.random_delay_minutes} min</span>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                        {error}
                    </div>
                )}
            </div>
        );
    };

    const stepRenderers = [
        renderAccountStep,
        renderTargetStep,
        renderActionStep,
        renderContentStep,
        renderScheduleStep,
        renderOptionsStep,
        renderReviewStep,
    ];

    return (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/tasks')}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{isEdit ? 'Edit Task' : 'Create Task'}</h1>
                    <p className="text-muted-foreground text-sm">
                        Step {step + 1} of {STEPS.length}: {STEPS[step].desc}
                    </p>
                </div>
            </div>

            {/* Progress bar */}
            <div className="flex gap-1">
                {STEPS.map((s, idx) => (
                    <div
                        key={idx}
                        className={`h-1 flex-1 rounded-full transition-colors ${idx <= step ? 'bg-primary' : 'bg-muted'}`}
                    />
                ))}
            </div>

            {/* Step labels */}
            <div className="hidden sm:flex justify-between px-1">
                {STEPS.map((s, idx) => {
                    const Icon = s.icon;
                    return (
                        <button
                            key={idx}
                            onClick={() => idx < step && setStep(idx)}
                            disabled={idx > step}
                            className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${idx === step ? 'text-primary' : idx < step ? 'text-muted-foreground hover:text-foreground cursor-pointer' : 'text-muted-foreground/40'}`}
                        >
                            <Icon className="h-3 w-3" />
                            {s.title}
                        </button>
                    );
                })}
            </div>

            {/* Step Content */}
            <Card>
                <CardHeader>
                    <CardTitle>{STEPS[step].title}</CardTitle>
                    <CardDescription>{STEPS[step].desc}</CardDescription>
                </CardHeader>
                <CardContent>
                    {stepRenderers[step]()}
                </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex items-center justify-between">
                <Button variant="outline" onClick={handleBack} disabled={step === 0}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <div className="flex gap-3">
                    {step === STEPS.length - 1 ? (
                        <Button onClick={handleSave} disabled={!canProceed() || isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            {isEdit ? 'Update Task' : 'Save Task'}
                        </Button>
                    ) : (
                        <Button onClick={handleNext} disabled={!canProceed()}>
                            Next <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreateTaskPage;
