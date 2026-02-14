import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import {
    LayoutDashboard,
    Users,
    CalendarClock,
    Files,
    Settings,
    LogOut,
    Command,
    Activity,
    PlusCircle,
    CalendarOff,
} from 'lucide-react';
import { Button } from '../ui/button';

const Sidebar = () => {
    const location = useLocation();
    const { logout } = useAuth();

    const navItems = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Accounts', href: '/accounts', icon: Users },
        { name: 'Tasks', href: '/tasks', icon: CalendarClock },
        { name: 'Templates', href: '/templates', icon: Files },
        { name: 'Activity Log', href: '/activity', icon: Activity },
        { name: 'Off Days', href: '/off-days', icon: CalendarOff },
        { name: 'Settings', href: '/settings', icon: Settings },
    ];

    return (
        <div className="flex h-full w-64 flex-col bg-[#09090b] text-white border-r border-[#27272a]">
            <div className="flex h-14 items-center px-4 border-b border-[#27272a]">
                <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-black">
                        <Command className="h-4 w-4" />
                    </div>
                    <span>TG Automator</span>
                </Link>
            </div>

            <div className="flex-1 overflow-auto py-4">
                <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                    {navItems.map((item) => {
                        const isActive = location.pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-md px-3 py-2 transition-all hover:text-white",
                                    isActive
                                        ? "bg-[#27272a] text-white"
                                        : "text-zinc-400 hover:bg-[#27272a]/50"
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="mt-auto p-4 border-t border-[#27272a]">
                <div className="mb-4">
                    <Link to="/tasks/create">
                        <Button variant="secondary" className="w-full justify-start text-zinc-900 bg-white hover:bg-zinc-200">
                            <PlusCircle className="nr-2 h-4 w-4 mr-2" />
                            New Task
                        </Button>
                    </Link>
                </div>
                <Button
                    variant="ghost"
                    onClick={logout}
                    className="w-full justify-start text-zinc-400 hover:text-white hover:bg-[#27272a]"
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                </Button>
            </div>
        </div>
    );
};

export default Sidebar;
