import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/card';
import { Link } from 'react-router-dom';
import { Plus, Users, CalendarClock, Activity, Loader2, ArrowRight } from 'lucide-react';

const DashboardPage = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalAccounts: 0,
        activeTasks: 0,
        executedToday: 0
    });
    const [upcomingTasks, setUpcomingTasks] = useState([]);
    const [recentLogs, setRecentLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch accounts for count
                const accountsRes = await api.get('/telegram-accounts');
                const accounts = accountsRes.data;

                // Fetch tasks for count and upcoming
                const tasksRes = await api.get('/tasks');
                const tasks = tasksRes.data.tasks || [];
                const activeTasks = tasks.filter(t => t.is_enabled);

                // Sort tasks by next_execution for upcoming widget
                const sortedTasks = tasks
                    .filter(t => t.next_execution && new Date(t.next_execution) > new Date())
                    .sort((a, b) => new Date(a.next_execution) - new Date(b.next_execution))
                    .slice(0, 5);

                // Fetch activity logs
                const logsRes = await api.get('/activity-logs?limit=5');
                const logs = logsRes.data.logs || (Array.isArray(logsRes.data) ? logsRes.data : []);

                setStats({
                    totalAccounts: accounts.length,
                    activeTasks: activeTasks.length,
                    executedToday: logs.filter(l => {
                        const logDate = new Date(l.created_at);
                        const today = new Date();
                        return logDate.getDate() === today.getDate() &&
                            logDate.getMonth() === today.getMonth() &&
                            logDate.getFullYear() === today.getFullYear();
                    }).length
                });

                setUpcomingTasks(sortedTasks);
                setRecentLogs(logs.slice(0, 5));
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    // Get greeting based on time
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Welcome Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 p-8 text-white shadow-xl">
                <div className="relative z-10 space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">{greeting}, {user?.email?.split('@')[0]}</h2>
                    <p className="max-w-[600px] text-violet-100">
                        Your automation hub is running smoothly. detailed executing logs and manage your telegram empire from here.
                    </p>
                    <div className="pt-4 flex gap-3">
                        <Link to="/tasks/create">
                            <Button variant="secondary" className="bg-white text-violet-600 hover:bg-violet-50 border-0">
                                <Plus className="mr-2 h-4 w-4" /> Create Task
                            </Button>
                        </Link>
                        <Link to="/accounts">
                            <Button variant="outline" className="bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white">
                                Manage Accounts
                            </Button>
                        </Link>
                    </div>
                </div>
                {/* Decorative circles */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute bottom-0 right-20 -mb-10 h-40 w-40 rounded-full bg-black/10 blur-2xl" />
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Connected Accounts</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalAccounts}</div>
                        <p className="text-xs text-muted-foreground">Telegram accounts active</p>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
                        <CalendarClock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.activeTasks}</div>
                        <p className="text-xs text-muted-foreground">Scheduled for automation</p>
                    </CardContent>
                </Card>
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Executed Today</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.executedToday}</div>
                        <p className="text-xs text-muted-foreground">Actions performed so far</p>
                    </CardContent>
                </Card>
            </div>

            {/* Content Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 shadow-sm">
                    <CardHeader>
                        <CardTitle>Upcoming Actions</CardTitle>
                        <CardDescription>Tasks scheduled for the next 24 hours</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {upcomingTasks.length > 0 ? (
                            <div className="space-y-6">
                                {upcomingTasks.map((task) => (
                                    <div key={task._id} className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-none">{task.name}</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                                                    {task.action_type.replace('send_', '')}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    to {task.target.chat_title || task.target.chat_id}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-sm text-muted-foreground font-mono bg-muted px-2 py-1 rounded text-xs">
                                            {new Date(task.next_execution).toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                                <CalendarClock className="h-10 w-10 opacity-20 mb-2" />
                                <p>No upcoming tasks scheduled.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="col-span-3 shadow-sm">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>Latest execution logs</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {recentLogs.length > 0 ? (
                            <div className="space-y-6">
                                {recentLogs.map((log) => (
                                    <div key={log._id} className="flex items-start gap-4">
                                        <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${log.status === 'sent' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' :
                                                log.status === 'failed' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 'bg-gray-400'
                                            }`} />
                                        <div className="grid gap-1">
                                            <p className="text-sm font-medium leading-none">
                                                {log.task_name}
                                                <span className="ml-2 text-xs font-normal text-muted-foreground">
                                                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </p>
                                            <p className="text-xs text-muted-foreground line-clamp-1">
                                                {log.error || "Executed successfully"}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                <Button variant="ghost" className="w-full text-xs" asChild>
                                    <Link to="/activity">View all activity <ArrowRight className="ml-2 h-3 w-3" /></Link>
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                                <Activity className="h-10 w-10 opacity-20 mb-2" />
                                <p>No recent activity.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default DashboardPage;
