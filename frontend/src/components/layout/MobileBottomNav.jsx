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
        <div className="md:hidden fixed bottom-6 left-4 right-4 z-50">
            {/* Glassmorphism Container */}
            <div className="absolute inset-0 bg-background/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl" />

            <div className="relative flex justify-between items-center h-16 px-2">
                {navItems.map(item => {
                    const isActive = item.href === '/dashboard'
                        ? location.pathname === '/dashboard' || location.pathname === '/'
                        : location.pathname.startsWith(item.href);

                    return (
                        <Link
                            key={item.name}
                            to={item.href}
                            className={cn(
                                "relative flex flex-col items-center justify-center flex-1 h-full transition-all duration-300",
                                isActive ? "text-primary" : "text-muted-foreground hover:text-primary/70"
                            )}
                        >
                            {/* Active Indicator Background */}
                            {isActive && (
                                <div className="absolute inset-x-3 top-2 bottom-2 bg-primary/10 rounded-xl -z-10 animate-in fade-in zoom-in duration-300" />
                            )}

                            <item.icon className={cn(
                                "h-5 w-5 transition-all duration-300",
                                isActive ? "scale-110 translate-y-[-2px]" : "scale-100"
                            )} />

                            <span className={cn(
                                "text-[10px] font-medium transition-all duration-300 mt-1",
                                isActive ? "opacity-100 translate-y-[-2px] font-semibold" : "opacity-0 hidden"
                            )}>
                                {item.name}
                            </span>

                            {/* Active Indicator Dot (Optional addition for extra style) */}
                            {isActive && (
                                <div className="absolute bottom-1.5 w-1 h-1 bg-primary rounded-full animate-in fade-in duration-300" />
                            )}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
};

export default MobileBottomNav;
