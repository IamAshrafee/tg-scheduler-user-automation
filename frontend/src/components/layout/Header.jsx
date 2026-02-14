import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Bell } from 'lucide-react';
import { Button } from '../ui/button';

const Header = () => {
    const location = useLocation();
    const { user } = useAuth();

    // Simple breadcrumb logic
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumb = pathSegments.map((segment) =>
        segment.charAt(0).toUpperCase() + segment.slice(1)
    ).join(' / ');

    return (
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-6 shadow-sm">
            <div className="flex flex-1 items-center gap-2">
                <h1 className="text-lg font-semibold">{breadcrumb || 'Dashboard'}</h1>
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
    );
};

export default Header;
