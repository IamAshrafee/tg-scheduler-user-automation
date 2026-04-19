import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../components/ui/card';
import AddAccountDialog from '../components/AddAccountDialog';
import KeepOnlineDialog from '../components/KeepOnlineDialog';
import PageTransition from '../components/common/PageTransition';
import { SkeletonCard } from '../components/ui/skeleton';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const TelegramAccountsPage = () => {
    const [accounts, setAccounts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    
    // Keep Online Dialog State
    const [keepOnlineOpen, setKeepOnlineOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState(null);

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
        const loadingToast = toast.loading('Verifying session...');
        try {
            const response = await api.post(`/telegram-accounts/${accountId}/reconnect`);
            toast.dismiss(loadingToast);
            if (response.data.status === 'active') {
                toast.success('Account is connected and active');
            } else {
                toast.error('Session expired. Please re-add the account.');
            }
            fetchAccounts();
        } catch (error) {
            toast.dismiss(loadingToast);
            toast.error('Failed to verify session');
        }
    };



    return (
        <PageTransition className="space-y-8">
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
                {isLoading ? (
                    <div className="col-span-full grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {[1, 2, 3, 4].map(i => (
                            <SkeletonCard key={i} />
                        ))}
                    </div>
                ) : accounts.map((account) => (
                    <Card key={account._id} className="overflow-hidden transition-all hover:shadow-md border-muted">
                        <div className={`h-2 w-full ${account.status === 'active' ? 'bg-emerald-500' :
                            account.status === 'disconnected' ? 'bg-red-500' : 'bg-amber-500'
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
                                <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${account.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                    account.status === 'disconnected' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
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
                        <CardFooter className="flex items-center justify-between gap-2 bg-muted/40 p-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-blue-500 hover:text-blue-400 hover:bg-blue-500/10"
                                onClick={() => {
                                    setSelectedAccount(account);
                                    setKeepOnlineOpen(true);
                                }}
                            >
                                <Activity className="mr-2 h-3 w-3" /> Status Rules
                            </Button>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs"
                                    onClick={() => handleReconnect(account._id)}
                                >
                                    <RefreshCw className="mr-2 h-3 w-3" />
                                    {account.status === 'active' ? 'Verify' : 'Reconnect'}
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDisconnect(account._id)}>
                                    <LogOut className="mr-2 h-3 w-3" />
                                </Button>
                            </div>
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

            <KeepOnlineDialog
                isOpen={keepOnlineOpen}
                onClose={() => setKeepOnlineOpen(false)}
                accountId={selectedAccount?._id}
                accountName={selectedAccount?.first_name || 'Account'}
            />
        </PageTransition>
    );
};

export default TelegramAccountsPage;
