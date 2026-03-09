/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react';
import Modal from '../ui/modal';
import { Button } from '../ui/button';
import {
    Loader2,
    ArrowRight,
    ArrowLeft,
    Plus,
    Trash2,
    Copy,
    Pencil,
    Clock,
    Check
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { format24to12 } from '../../lib/time';

import AccountSelectionCard from '../common/AccountSelectionCard';
import TargetSelectionList from '../common/TargetSelectionList';
import TaskEditorDialog from '../tasks/TaskEditorDialog';

export default function TemplateInstantiationDialog({ isOpen, onClose, template, onSuccess }) {
    const [step, setStep] = useState(1);
    const [accounts, setAccounts] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState('');
    const [groups, setGroups] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [error, setError] = useState(null);
    const [tasks, setTasks] = useState([]);

    // Task Editing State
    const [editingTaskIndex, setEditingTaskIndex] = useState(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    // Reset state on open
    useEffect(() => {
        if (isOpen && template) {
            setStep(1);
            setSelectedAccount('');
            setSelectedGroup(null);
            setGroups([]);
            setError(null);
            loadAccounts();
            // Initialize tasks from template
            const initialTasks = template.tasks?.map(t => ({
                ...t,
                action_content: t.action_content || {},
                schedule: t.schedule || {
                    type: t.schedule_type || 'daily',
                    time: t.default_time || '09:00',
                    timezone: 'UTC', // Default
                    days_of_week: [],
                    days_of_month: [],
                    specific_dates: [],
                    random_delay_minutes: 0,
                },
                simulate_typing: false,
                skip_days: t.skip_days || { weekly_holidays: [], specific_dates: [] },
            })) || [];
            setTasks(initialTasks);
        }
    }, [isOpen, template]);

    const loadAccounts = async () => {
        try {
            const res = await api.get('/telegram-accounts');
            setAccounts(res.data || []);
        } catch (e) {
            console.error('Failed to load accounts:', e);
            setError('Failed to load Telegram accounts.');
        }
    };

    const loadGroups = async (accountId) => {
        if (!accountId) return;
        setLoadingGroups(true);
        setError(null);
        try {
            const res = await api.get(`/telegram-accounts/${accountId}/groups?limit=100`);
            setGroups(res.data?.groups || []);
        } catch (e) {
            console.error('Failed to load groups:', e);
            setError('Failed to load groups. Please try again.');
        } finally {
            setLoadingGroups(false);
        }
    };

    const handleAccountSelect = (accountId) => {
        setSelectedAccount(accountId);
        if (accountId) {
            loadGroups(accountId);
            setStep(2); // Auto-advance to Target selection
        }
    };

    const handleTargetSelect = (group) => {
        setSelectedGroup(group);
        setStep(3); // Auto-advance to Tasks
    };

    // --- Task Manipulation ---
    const handleEditTask = (index) => {
        setEditingTaskIndex(index);
        setIsEditorOpen(true);
    };

    const handleSaveTask = (updatedTask) => {
        if (editingTaskIndex !== null) {
            const newTasks = [...tasks];
            newTasks[editingTaskIndex] = updatedTask;
            setTasks(newTasks);
        } else {
            // New task
            setTasks([...tasks, updatedTask]);
        }
    };

    const handleAddTask = () => {
        setEditingTaskIndex(null); // Indicates new task
        setIsEditorOpen(true);
    };

    const handleDeleteTask = (index) => {
        const newTasks = tasks.filter((_, i) => i !== index);
        setTasks(newTasks);
    };

    const handleDuplicateTask = (index) => {
        const taskToCopy = { ...tasks[index], name: `${tasks[index].name} (Copy)` };
        const newTasks = [...tasks];
        newTasks.splice(index + 1, 0, taskToCopy);
        setTasks(newTasks);
    };

    const handleCreate = async () => {
        if (!selectedAccount || !selectedGroup || !template) return;
        if (tasks.length === 0) {
            toast.error("Please add at least one task.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const res = await api.post(`/templates/${template._id}/instantiate`, {
                telegram_account_id: selectedAccount,
                target_chat_id: selectedGroup.id,
                target_chat_title: selectedGroup.title,
                target_access_hash: String(selectedGroup.access_hash || ''),
                tasks: tasks,
            });

            toast.success(res.data.message || 'Tasks created successfully!');
            onSuccess?.();
            onClose();
        } catch (e) {
            console.error('Failed to instantiate template:', e);
            setError(e.response?.data?.detail || 'Failed to create tasks.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !template) return null;

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title={`Use Template: ${template.name}`}
                className="max-w-4xl h-[80vh] flex flex-col"
            >
                <div className="flex flex-col h-full">
                    {/* Stepper */}
                    <div className="flex items-center justify-between mb-6 px-4">
                        {[
                            { num: 1, label: 'Account' },
                            { num: 2, label: 'Target' },
                            { num: 3, label: 'Customize' }
                        ].map((s) => (
                            <div key={s.num} className={`flex items-center gap-2 ${step >= s.num ? 'text-primary' : 'text-muted-foreground'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border ${step >= s.num ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-muted'}`}>
                                    {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                                </div>
                                <span className="font-medium text-sm hidden sm:inline">{s.label}</span>
                                {s.num < 3 && <div className="w-12 h-[1px] bg-border mx-2 hidden sm:block" />}
                            </div>
                        ))}
                    </div>

                    <div className="flex-1 overflow-y-auto px-1 min-h-0">
                        {step === 1 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                                <h3 className="text-lg font-medium">Select Execution Account</h3>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {accounts.map(acc => (
                                        <AccountSelectionCard
                                            key={acc._id}
                                            account={acc}
                                            isSelected={selectedAccount === acc._id}
                                            onClick={() => handleAccountSelect(acc._id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-medium">Select Target Group/Channel</h3>
                                    <Button variant="ghost" size="sm" onClick={() => loadGroups(selectedAccount)}>
                                        Refresh
                                    </Button>
                                </div>
                                <TargetSelectionList
                                    groups={groups}
                                    selectedTargetId={selectedGroup?.id}
                                    onSelect={handleTargetSelect}
                                    isLoading={loadingGroups}
                                    onRetry={() => loadGroups(selectedAccount)}
                                />
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-lg font-medium">Customize Tasks ({tasks.length})</h3>
                                    <Button size="sm" variant="outline" onClick={handleAddTask}>
                                        <Plus className="h-4 w-4 mr-2" /> Add Task
                                    </Button>
                                </div>

                                <div className="grid gap-3">
                                    {tasks.map((task, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:shadow-sm transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                    <span className="text-xs font-bold">{idx + 1}</span>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-medium">{task.name || 'Untitled Task'}</h4>
                                                        <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded capitalize">
                                                            {task.action_type?.replace('send_', '') || 'Action'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                                        <div className="flex items-center gap-1">
                                                            <Clock className="h-3 w-3" />
                                                            {task.schedule?.type === 'daily' ? `Daily at ${format24to12(task.schedule.time)}` : 'Scheduled'}
                                                        </div>
                                                        {task.simulate_typing && (
                                                            <span className="text-blue-500">Typing enabled</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                <Button size="icon" variant="ghost" onClick={() => handleEditTask(idx)} title="Edit">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" onClick={() => handleDuplicateTask(idx)} title="Duplicate">
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDeleteTask(idx)} title="Delete">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}

                                    {tasks.length === 0 && (
                                        <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
                                            <p>No tasks in this batch.</p>
                                            <Button variant="link" onClick={handleAddTask}>Add your first task</Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="pt-4 border-t mt-4 flex justify-between">
                        <Button variant="ghost" onClick={step === 1 ? onClose : () => setStep(step - 1)} disabled={loading}>
                            {step === 1 ? 'Cancel' : <><ArrowLeft className="mr-2 h-4 w-4" /> Back</>}
                        </Button>

                        {step === 3 && (
                            <Button onClick={handleCreate} disabled={loading || tasks.length === 0}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Tasks
                            </Button>
                        )}
                        {step < 3 && (
                            <Button variant="ghost" disabled>
                                Select option to proceed
                            </Button>
                        )}
                    </div>
                </div>
            </Modal>

            <TaskEditorDialog
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                task={editingTaskIndex !== null ? tasks[editingTaskIndex] : {
                    name: `New Task ${tasks.length + 1}`,
                    description: '',
                    action_type: 'send_text',
                    action_content: {},
                    schedule: { type: 'daily', time: '09:00', timezone: 'UTC', days_of_week: [], days_of_month: [], specific_dates: [], random_delay_minutes: 0 },
                    simulate_typing: false,
                    skip_days: { weekly_holidays: [], specific_dates: [] }
                }}
                onSave={handleSaveTask}
                accountId={selectedAccount}
            />
        </>
    );
}
