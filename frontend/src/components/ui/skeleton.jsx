import { cn } from '../../lib/utils';

const Skeleton = ({ className, ...props }) => (
    <div className={cn('skeleton', className)} {...props} />
);

const SkeletonCard = ({ className }) => (
    <div className={cn('rounded-xl border bg-card p-5 space-y-4', className)}>
        <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
            </div>
        </div>
        <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
        </div>
    </div>
);

const SkeletonLine = ({ className, width = 'w-full' }) => (
    <Skeleton className={cn('h-4', width, className)} />
);

const SkeletonCircle = ({ className, size = 'h-10 w-10' }) => (
    <Skeleton className={cn('rounded-full', size, className)} />
);

const SkeletonStatsGrid = () => (
    <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map(i => (
            <div key={i} className="rounded-xl border bg-card p-6 space-y-3">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-4 rounded" />
                </div>
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-3 w-32" />
            </div>
        ))}
    </div>
);

export { Skeleton, SkeletonCard, SkeletonLine, SkeletonCircle, SkeletonStatsGrid };
