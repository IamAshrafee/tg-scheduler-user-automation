import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileBottomNav from './MobileBottomNav';

const AppLayout = () => {
    return (
        <div className="flex h-screen overflow-hidden bg-muted/20">
            <aside className="hidden w-64 md:flex shrink-0">
                <Sidebar />
            </aside>
            <div className="flex flex-1 flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6">
                    <Outlet />
                </main>
            </div>
            <MobileBottomNav />
        </div>
    );
};

export default AppLayout;

