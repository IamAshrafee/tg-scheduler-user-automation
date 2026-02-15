import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import {
    LayoutDashboard,
    Users,
    CalendarClock,
    Files,
    Settings,
} from 'lucide-react';

const navItems = [
    { name: 'Home', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Accounts', href: '/accounts', icon: Users },
    { name: 'Tasks', href: '/tasks', icon: CalendarClock },
    { name: 'Templates', href: '/templates', icon: Files },
    { name: 'Settings', href: '/settings', icon: Settings },
];

const MobileBottomNav = () => {
    const location = useLocation();

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
            <div className="flex items-center justify-around h-16 px-1 pb-safe">
                {navItems.map(item => {
                    const isActive = item.href === '/dashboard'
                        ? location.pathname === '/dashboard' || location.pathname === '/'
                        : location.pathname.startsWith(item.href);

                    return (
                        <Link
                            key={item.name}
                            to={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 rounded-lg transition-colors",
                                "active:scale-95 transition-transform duration-100",
                                isActive
                                    ? "text-primary"
                                    : "text-muted-foreground"
                            )}
                        >
                            <item.icon className={cn(
                                "h-5 w-5 transition-all",
                                isActive && "scale-110"
                            )} />
                            <span className={cn(
                                "text-[10px] font-medium leading-none",
                                isActive && "font-semibold"
                            )}>
                                {item.name}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};

export default MobileBottomNav;
