/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react';
import Modal from '../ui/modal';
import { Button } from '../ui/button';
import {
    Loader2,
    Check,
    Sticker,
    MessageSquare,
    Image,
    Video,
    FileText,
    Forward,
} from 'lucide-react';
import api from '../../services/api';

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
    { value: 'custom_days', label: 'Custom Days', desc: 'Choose specific weekdays' },
    { value: 'specific_dates', label: 'Specific Dates', desc: 'One-time on specific dates' },
];

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TaskEditorDialog = ({ isOpen, onClose, task, onSave, accountId }) => {
    const [form, setForm] = useState(null);
    const [stickerSets, setStickerSets] = useState([]);
    const [stickers, setStickers] = useState([]);
    const [selectedStickerSet, setSelectedStickerSet] = useState('');
    const [loadingStickers, setLoadingStickers] = useState(false);
    const [activeTab, setActiveTab] = useState("general");

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
                simulate_typing: task.simulate_typing || false,
                skip_days: task.skip_days || { weekly_holidays: [], specific_dates: [] },
            });
            setActiveTab("general");
        }
    }, [task, isOpen]);

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
    const renderContentTab = () => {
        switch (form.action_type) {
            case 'send_text':
                return (
                    <div className="space-y-4">
                        <textarea
                            value={form.action_content.text || ''}
                            onChange={e => updateForm('action_content', { ...form.action_content, text: e.target.value })}
                            placeholder="Type your message here..."
                            rows={6}
                            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
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
                                <input type="file" onChange={e => e.target.files[0] && handleFileUpload(e.target.files[0])} className="text-sm" />
                            )}
                        </div>
                        <input
                            value={form.action_content.caption || ''}
                            onChange={e => updateForm('action_content', { ...form.action_content, caption: e.target.value })}
                            placeholder="Optional caption..."
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                    </div>
                );

            case 'forward_message':
                return (
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs font-medium mb-1 block">Source Chat ID</label>
                            <input
                                type="number"
                                value={form.action_content.source_chat_id || ''}
                                onChange={e => updateForm('action_content', { ...form.action_content, source_chat_id: parseInt(e.target.value) || 0 })}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium mb-1 block">Message ID</label>
                            <input
                                type="number"
                                value={form.action_content.source_message_id || ''}
                                onChange={e => updateForm('action_content', { ...form.action_content, source_message_id: parseInt(e.target.value) || 0 })}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                        </div>
                    </div>
                );
            default: return <p className="text-sm text-muted-foreground">Select an action type first.</p>;
        }
    };

    const renderScheduleTab = () => (
        <div className="space-y-5">
            <div className="space-y-2">
                <label className="text-xs font-medium">Schedule Type</label>
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
                    <label className="text-xs font-medium mb-1 block">Time</label>
                    <input
                        type="time"
                        value={form.schedule.time}
                        onChange={e => updateNested('schedule', 'time', e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium mb-1 block">Timezone</label>
                    <select
                        value={form.schedule.timezone || 'UTC'}
                        onChange={e => updateNested('schedule', 'timezone', e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                        <option value="UTC">UTC</option>
                        <option value="Asia/Dhaka">Asia/Dhaka (GMT+6)</option>
                        <option value="Asia/Kolkata">Asia/Kolkata (GMT+5:30)</option>
                        <option value="America/New_York">America/New_York (EST)</option>
                        <option value="Europe/London">Europe/London (GMT)</option>
                    </select>
                </div>
            </div>

            {(form.schedule.type === 'weekly' || form.schedule.type === 'custom_days') && (
                <div>
                    <label className="text-xs font-medium mb-2 block">Days of Week</label>
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
                    <label className="text-xs font-medium mb-2 block">Days of Month</label>
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
                    <label className="text-xs font-medium mb-1 block">Specific Dates</label>
                    <input
                        type="date"
                        onChange={e => {
                            if (e.target.value) {
                                const dates = form.schedule.specific_dates || [];
                                if (!dates.includes(e.target.value)) {
                                    updateNested('schedule', 'specific_dates', [...dates, e.target.value]);
                                }
                            }
                        }}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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

            <div>
                <label className="text-xs font-medium mb-1 block">Random Delay: {form.schedule.random_delay_minutes} min</label>
                <input
                    type="range" min="0" max="15"
                    value={form.schedule.random_delay_minutes}
                    onChange={e => updateNested('schedule', 'random_delay_minutes', parseInt(e.target.value))}
                    className="w-full"
                />
                <p className="text-[11px] text-muted-foreground">Adds a random delay (0 to {form.schedule.random_delay_minutes} minutes) before execution to avoid detection.</p>
            </div>
        </div>
    );

    const renderOptionsTab = () => (
        <div className="space-y-6">
            <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                    <p className="text-sm font-medium">Simulate Typing</p>
                    <p className="text-xs text-muted-foreground">Show "typing..." indicator before sending</p>
                </div>
                <button
                    onClick={() => updateForm('simulate_typing', !form.simulate_typing)}
                    className={`relative w-11 h-6 rounded-full transition-colors ${form.simulate_typing ? 'bg-primary' : 'bg-muted'}`}
                >
                    <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform shadow ${form.simulate_typing ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
            </div>
            <div>
                <label className="text-xs font-medium mb-2 block">Skip Days (Safe Mode)</label>
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
                <label className="text-xs font-medium mb-1 block">Skip Specific Dates</label>
                <input
                    type="date"
                    onChange={e => {
                        if (e.target.value) {
                            const dates = form.skip_days.specific_dates || [];
                            if (!dates.includes(e.target.value)) {
                                updateForm('skip_days', { ...form.skip_days, specific_dates: [...dates, e.target.value] });
                            }
                        }
                    }}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Edit Task"
            className="max-w-3xl"
        >
            <div className="flex flex-col h-[70vh]">
                <div className="flex bg-muted p-1 rounded-lg mb-4 shrink-0">
                    {['general', 'content', 'schedule', 'options'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === tab
                                    ? 'bg-background shadow text-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto pr-2 pb-4">
                    {activeTab === 'general' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Task Name</label>
                                <input
                                    value={form.name}
                                    onChange={e => updateForm('name', e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Description</label>
                                <input
                                    value={form.description}
                                    onChange={e => updateForm('description', e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                            </div>
                            <div className="pt-4">
                                <label className="text-sm font-medium mb-2 block">Action Type</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {ACTION_TYPES.map(type => (
                                        <button
                                            key={type.value}
                                            onClick={() => {
                                                updateForm('action_type', type.value);
                                                updateForm('action_content', {});
                                            }}
                                            className={`flex items-center gap-2 p-2 rounded border text-left text-xs transition-colors ${form.action_type === type.value
                                                ? 'border-primary bg-primary/10 ring-1 ring-primary/20'
                                                : 'hover:bg-muted'
                                                }`}
                                        >
                                            <type.icon className={`h-4 w-4 ${type.color}`} />
                                            <span>{type.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'content' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2">
                            {renderContentTab()}
                        </div>
                    )}

                    {activeTab === 'schedule' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2">
                            {renderScheduleTab()}
                        </div>
                    )}

                    {activeTab === 'options' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2">
                            {renderOptionsTab()}
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
