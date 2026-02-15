import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { ShieldAlert, LogOut, Mail, ExternalLink } from 'lucide-react';
import PageTransition from '../components/common/PageTransition';

const LockedAccountPage = () => {
    const { logout } = useAuth();

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <PageTransition className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-xl border border-red-100 overflow-hidden text-center">
                    {/* Header with Icon */}
                    <div className="bg-red-50 py-10 flex justify-center">
                        <div className="bg-white p-4 rounded-full shadow-inner">
                            <ShieldAlert className="h-16 w-16 text-red-500 animate-pulse" />
                        </div>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="space-y-2">
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Account Locked</h1>
                            <p className="text-slate-500">
                                Your access to the platform has been temporarily suspended by an administrator.
                            </p>
                        </div>

                        {/* Info Boxes */}
                        <div className="grid gap-3 text-left">
                            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <Mail className="h-5 w-5 text-slate-400 mt-0.5" />
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold text-slate-700">Need Help?</p>
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        Please contact your system administrator or support team to resolve this issue.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-3 pt-2">
                            <Button
                                variant="destructive"
                                className="w-full shadow-lg shadow-red-200 h-11"
                                onClick={() => window.open('mailto:support@example.com', '_blank')}
                            >
                                Contact Support
                                <ExternalLink className="ml-2 h-4 w-4" />
                            </Button>

                            <Button
                                variant="ghost"
                                className="w-full h-11 text-slate-500 hover:text-slate-700"
                                onClick={logout}
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Logout
                            </Button>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-slate-50 py-4 border-t border-slate-100">
                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
                            TG Scheduler • Automated Security
                        </p>
                    </div>
                </div>
            </PageTransition>
        </div>
    );
};

export default LockedAccountPage;
