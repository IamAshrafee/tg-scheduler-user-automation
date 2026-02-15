import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import {
    Bell,
    Menu,
    X,
    Shield,
    Users,
    Smartphone,
    ListChecks,
    Cpu,
    LogOut,
} from 'lucide-react';

const adminItems = [
    { name: 'Admin Dashboard', href: '/admin', icon: Shield },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'TG Accounts', href: '/admin/accounts', icon: Smartphone },
    { name: 'All Tasks', href: '/admin/tasks', icon: ListChecks },
    { name: 'System', href: '/admin/system', icon: Cpu },
];

const Header = () => {
    const location = useLocation();
    const { user, logout } = useAuth();
    const [drawerOpen, setDrawerOpen] = useState(false);

    const isAdmin = user?.role === 'admin';

    // Simple breadcrumb logic
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumb = pathSegments.map((segment) =>
        segment.charAt(0).toUpperCase() + segment.slice(1)
    ).join(' / ');

    return (
        <>
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6 shadow-sm">
                <div className="flex flex-1 items-center gap-2">
                    {/* Admin hamburger — mobile only */}
                    {isAdmin && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden text-muted-foreground -ml-1 mr-1"
                            onClick={() => setDrawerOpen(true)}
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                    )}
                    <h1 className="text-lg font-semibold truncate">{breadcrumb || 'Dashboard'}</h1>
                </div>
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="text-muted-foreground">
                        <Bell className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center gap-2">
                        <div className="flex flex-col items-end hidden md:flex">
                            <span className="text-sm font-medium">{user?.email?.split('@')[0]}</span>
                            <span className="text-xs text-muted-foreground">Admin</span>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {user?.email?.[0].toUpperCase()}
                        </div>
                    </div>
                </div>
            </header>

            {/* Admin Slide-Out Drawer — mobile only */}
            {isAdmin && (
                <>
                    {/* Backdrop */}
                    <div
                        className={cn(
                            "fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 md:hidden",
                            drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                        )}
                        onClick={() => setDrawerOpen(false)}
                    />

                    {/* Drawer */}
                    <div
                        className={cn(
                            "fixed top-0 left-0 z-50 w-72 bg-[#09090b] border-r border-[#27272a] shadow-2xl transition-transform duration-300 ease-out md:hidden",
                            "h-[calc(100%-4rem)]",
                            drawerOpen ? "translate-x-0" : "-translate-x-full"
                        )}
                    >
                        {/* Drawer Header */}
                        <div className="flex h-14 items-center justify-between px-4 border-b border-[#27272a]">
                            <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-amber-400" />
                                <span className="font-semibold text-white text-sm">Admin Panel</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-zinc-400 hover:text-white"
                                onClick={() => setDrawerOpen(false)}
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Drawer Nav */}
                        <nav className="p-3 space-y-1">
                            {adminItems.map(item => {
                                const isActive = item.href === '/admin'
                                    ? location.pathname === '/admin'
                                    : location.pathname.startsWith(item.href);

                                return (
                                    <Link
                                        key={item.name}
                                        to={item.href}
                                        onClick={() => setDrawerOpen(false)}
                                        className={cn(
                                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                                            isActive
                                                ? "bg-[#27272a] text-white"
                                                : "text-zinc-400 hover:bg-[#27272a]/50 hover:text-white"
                                        )}
                                    >
                                        <item.icon className="h-4 w-4" />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* Drawer Footer */}
                        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#27272a]">
                            <div className="flex items-center gap-2 mb-3 px-1">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                    {user?.email?.[0].toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{user?.email}</p>
                                    <p className="text-xs text-zinc-500 capitalize">{user?.role}</p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                onClick={() => { setDrawerOpen(false); logout(); }}
                                className="w-full justify-start text-zinc-400 hover:text-white hover:bg-[#27272a]"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Logout
                            </Button>
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

export default Header;
