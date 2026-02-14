import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import Modal from '../../components/ui/modal';
import {
    Loader2,
    Search,
    Trash2,
    Lock,
    Unlock,
    ChevronLeft,
    ChevronRight,
    Edit,
} from 'lucide-react';

const AdminUsersPage = () => {
    const [users, setUsers] = useState([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const pageSize = 20;

    const [deleteModal, setDeleteModal] = useState({ open: false, user: null });
    const [isDeleting, setIsDeleting] = useState(false);
    const [editModal, setEditModal] = useState({ open: false, user: null });
    const [editForm, setEditForm] = useState({ telegram_account_limit: 3, task_limit: 20 });
    const [isSaving, setIsSaving] = useState(false);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = { skip: page * pageSize, limit: pageSize };
            if (search) params.search = search;
            const res = await api.get('/admin/users', { params });
            setUsers(res.data.users);
            setTotal(res.data.total);
        } catch (e) {
            console.error('Failed to fetch users:', e);
        } finally {
            setIsLoading(false);
        }
    }, [page, search]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleToggleActive = async (user) => {
        try {
            await api.patch(`/admin/users/${user._id}`, { is_active: !user.is_active });
            fetchUsers();
        } catch (e) {
            console.error('Failed to toggle user:', e);
        }
    };

    const handleDelete = async () => {
        if (!deleteModal.user) return;
        setIsDeleting(true);
        try {
            await api.delete(`/admin/users/${deleteModal.user._id}`);
            setDeleteModal({ open: false, user: null });
            fetchUsers();
        } catch (e) {
            console.error('Failed to delete user:', e);
        } finally {
            setIsDeleting(false);
        }
    };

    const openEdit = (user) => {
        setEditForm({
            telegram_account_limit: user.telegram_account_limit || 3,
            task_limit: user.task_limit || 20,
        });
        setEditModal({ open: true, user });
    };

    const handleSaveEdit = async () => {
        if (!editModal.user) return;
        setIsSaving(true);
        try {
            await api.patch(`/admin/users/${editModal.user._id}`, editForm);
            setEditModal({ open: false, user: null });
            fetchUsers();
        } catch (e) {
            console.error('Failed to update user:', e);
        } finally {
            setIsSaving(false);
        }
    };

    const totalPages = Math.ceil(total / pageSize);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
                <p className="text-muted-foreground text-sm">Manage all platform users</p>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search by email..."
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(0); }}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
            </div>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : users.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-12">No users found.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border">
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                                        <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                                        <th className="text-center px-4 py-3 font-medium text-muted-foreground">Accounts</th>
                                        <th className="text-center px-4 py-3 font-medium text-muted-foreground">Tasks</th>
                                        <th className="text-center px-4 py-3 font-medium text-muted-foreground">Joined</th>
                                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u._id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 font-medium">{u.email}</td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'admin'
                                                    ? 'bg-amber-500/10 text-amber-500'
                                                    : 'bg-zinc-500/10 text-zinc-400'
                                                    }`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_active
                                                    ? 'bg-emerald-500/10 text-emerald-500'
                                                    : 'bg-red-500/10 text-red-500'
                                                    }`}>
                                                    {u.is_active ? 'Active' : 'Locked'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center font-mono text-xs">{u.accounts_count}</td>
                                            <td className="px-4 py-3 text-center font-mono text-xs">{u.tasks_count}</td>
                                            <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                                                {new Date(u.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' })}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button variant="ghost" size="sm" onClick={() => openEdit(u)} title="Edit Limits">
                                                        <Edit className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => handleToggleActive(u)} title={u.is_active ? 'Lock' : 'Unlock'}>
                                                        {u.is_active ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                                                    </Button>
                                                    <Button variant="ghost" size="sm" onClick={() => setDeleteModal({ open: true, user: u })} className="text-red-500 hover:text-red-400" title="Delete">
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{total} user(s)</p>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm flex items-center px-2">{page + 1} / {totalPages}</span>
                        <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            <Modal isOpen={deleteModal.open} onClose={() => setDeleteModal({ open: false, user: null })} title="Delete User">
                <p className="text-sm text-muted-foreground mb-4">
                    Are you sure you want to delete <strong>{deleteModal.user?.email}</strong>? This will permanently remove all their accounts, tasks, and logs.
                </p>
                <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => setDeleteModal({ open: false, user: null })}>Cancel</Button>
                    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting}>
                        {isDeleting && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                        Delete User
                    </Button>
                </div>
            </Modal>

            {/* Edit Limits Modal */}
            <Modal isOpen={editModal.open} onClose={() => setEditModal({ open: false, user: null })} title="Edit User Limits">
                <div className="space-y-3">
                    <div>
                        <label className="text-xs font-medium mb-1 block">Account Limit</label>
                        <input
                            type="number"
                            min={1}
                            value={editForm.telegram_account_limit}
                            onChange={e => setEditForm(f => ({ ...f, telegram_account_limit: parseInt(e.target.value) || 1 }))}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-medium mb-1 block">Task Limit</label>
                        <input
                            type="number"
                            min={1}
                            value={editForm.task_limit}
                            onChange={e => setEditForm(f => ({ ...f, task_limit: parseInt(e.target.value) || 1 }))}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                        <Button variant="outline" size="sm" onClick={() => setEditModal({ open: false, user: null })}>Cancel</Button>
                        <Button size="sm" onClick={handleSaveEdit} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                            Save
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default AdminUsersPage;
