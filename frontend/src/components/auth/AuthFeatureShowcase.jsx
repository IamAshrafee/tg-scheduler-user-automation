import { useEffect, useState } from 'react';
import { Send, CheckCircle2, Clock, Shield, Zap } from 'lucide-react';

const AuthFeatureShowcase = () => {
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('Scheduled');

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    setStatus('Completed');
                    setTimeout(() => {
                        setProgress(0);
                        setStatus('Scheduled');
                    }, 2000);
                    return 100;
                }
                if (prev < 30) setStatus('Starting...');
                else if (prev < 80) setStatus('Broadcasting...');
                else setStatus('Finalizing...');
                return prev + 1;
            });
        }, 50);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative w-full max-w-sm mx-auto perspective-1000">
            {/* Main Glass Card */}
            <div className="relative z-10 bg-zinc-900/40 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-2xl transform transition-all duration-500 hover:scale-[1.02] hover:-rotate-1">
                {/* Card Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Send className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white text-sm">Daily Announcement</h3>
                            <p className="text-xs text-zinc-400">Target: 3 Channels</p>
                        </div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-[10px] font-medium border ${status === 'Completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                        {status}
                    </div>
                </div>

                {/* Content Mockup */}
                <div className="bg-zinc-950/50 rounded-lg p-3 mb-4 border border-white/5 space-y-2">
                    <div className="h-2 w-3/4 bg-zinc-800 rounded animate-pulse"></div>
                    <div className="h-2 w-1/2 bg-zinc-800 rounded animate-pulse"></div>
                    <div className="h-2 w-5/6 bg-zinc-800 rounded animate-pulse"></div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                        <span className="text-zinc-400">Progress</span>
                        <span className="text-white font-mono">{progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 transition-all duration-100 ease-out relative"
                            style={{ width: `${progress}%` }}
                        >
                            <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 bg-zinc-800/80 backdrop-blur-md p-3 rounded-xl border border-white/10 shadow-xl animate-float-slow">
                <Clock className="h-5 w-5 text-amber-500" />
            </div>

            <div className="absolute -bottom-6 -left-2 bg-zinc-800/80 backdrop-blur-md p-3 rounded-xl border border-white/10 shadow-xl animate-float-slower">
                <Shield className="h-5 w-5 text-emerald-500" />
            </div>

            <div className="absolute top-1/2 -right-8 bg-zinc-800/80 backdrop-blur-md p-3 rounded-xl border border-white/10 shadow-xl animate-float">
                <Zap className="h-5 w-5 text-yellow-500" />
            </div>

            {/* Background Glow */}
            <div className="absolute inset-0 bg-indigo-500/20 blur-[60px] -z-10 rounded-full animate-pulse-slow"></div>
        </div>
    );
};

export default AuthFeatureShowcase;
