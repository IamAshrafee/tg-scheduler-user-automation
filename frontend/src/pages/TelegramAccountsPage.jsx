import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../components/ui/card';
import { Loader2, Plus, LogOut, RefreshCw, Smartphone, Shield, Activity, Calendar } from 'lucide-react';
import AddAccountDialog from '../components/AddAccountDialog';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const TelegramAccountsPage = () => {
    const [accounts, setAccounts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

    const fetchAccounts = useCallback(async () => {
        try {
            const response = await api.get('/telegram-accounts');
            setAccounts(response.data);
        } catch (error) {
            toast.error('Failed to load accounts');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    const handleDisconnect = async (accountId) => {
        if (!window.confirm('Are you sure you want to disconnect this account? Scheduled tasks may fail.')) return;

        try {
            await api.delete(`/telegram-accounts/${accountId}`);
            toast.success('Account disconnected');
            fetchAccounts();
        } catch (error) {
            toast.error('Failed to disconnect account');
        }
    };

    const handleReconnect = async (accountId) => {
        try {
            await api.post(`/telegram-accounts/${accountId}/reconnect`);
            toast.success('Reconnection attempt started');
            fetchAccounts();
        } catch (error) {
            toast.error('Failed to reconnect. Please try adding the account again.');
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">Telegram Accounts</h2>
                    <p className="text-muted-foreground">Manage your connected sessions and monitor their status.</p>
                </div>
                <Button onClick={() => setIsAddDialogOpen(true)} className="shadow-lg">
                    <Plus className="mr-2 h-4 w-4" /> Connect Account
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {accounts.map((account) => (
                    <Card key={account._id} className="overflow-hidden transition-all hover:shadow-md border-muted">
                        <div className={`h-2 w-full ${account.status === 'active' ? 'bg-green-500' :
                                account.status === 'disconnected' ? 'bg-red-500' : 'bg-yellow-500'
                            }`} />
                        <CardHeader className="pb-3 pt-5">
                            <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                        {account.first_name || 'Unknown'}
                                        {account.is_premium && <Shield className="h-3 w-3 text-blue-500 fill-blue-500" />}
                                    </CardTitle>
                                    <CardDescription className="flex items-center gap-1">
                                        <Smartphone className="h-3 w-3" />
                                        {account.phone_number}
                                    </CardDescription>
                                </div>
                                <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${account.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                                        account.status === 'disconnected' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                    }`}>
                                    {account.status}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="grid gap-4 py-3">
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center text-muted-foreground">
                                    <Activity className="mr-2 h-3 w-3" /> Tasks
                                </div>
                                <span className="font-medium">{account.active_tasks_count || 0} active</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center text-muted-foreground">
                                    <Calendar className="mr-2 h-3 w-3" /> Last Active
                                </div>
                                <span className="text-xs">
                                    {account.last_activity ? formatDistanceToNow(new Date(account.last_activity), { addSuffix: true }) : 'Never'}
                                </span>
                            </div>
                        </CardContent>
                        <CardFooter className="flex items-center justify-end gap-2 bg-muted/40 p-4">
                            {account.status === 'disconnected' && (
                                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleReconnect(account._id)}>
                                    <RefreshCw className="mr-2 h-3 w-3" /> Reconnect
                                </Button>
                            )}
                            <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDisconnect(account._id)}>
                                <LogOut className="mr-2 h-3 w-3" /> Disconnect
                            </Button>
                        </CardFooter>
                    </Card>
                ))}

                {accounts.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-dashed p-10 text-center animate-in fade-in-50 bg-muted/20">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                            <Smartphone className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="mt-6 text-xl font-semibold">No accounts connected</h3>
                        <p className="mb-6 mt-2 text-muted-foreground max-w-sm">
                            Connect a Telegram account to start automating your tasks. You can manage multiple accounts here.
                        </p>
                        <Button onClick={() => setIsAddDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" /> Connect First Account
                        </Button>
                    </div>
                )}
            </div>

            <AddAccountDialog
                isOpen={isAddDialogOpen}
                onClose={() => setIsAddDialogOpen(false)}
                onSuccess={fetchAccounts}
            />
        </div>
    );
};

export default TelegramAccountsPage;
