/* eslint-disable react/prop-types */
import { Loader2, Hash, Megaphone } from 'lucide-react';
import { Button } from '../ui/button';

const TargetSelectionList = ({ groups, selectedTargetId, onSelect, isLoading, onRetry }) => {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading groups...</span>
            </div>
        );
    }

    if (!groups || groups.length === 0) {
        return (
            <div className="text-center py-8">
                <p className="text-muted-foreground">No groups found. Make sure the account has joined groups.</p>
                {onRetry && (
                    <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
                        Retry
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div className="grid gap-2 max-h-[400px] overflow-y-auto pr-1">
            {groups.map(group => {
                const isSelected = selectedTargetId === group.id;
                const Icon = group.type === 'channel' ? Megaphone : Hash;
                return (
                    <button
                        key={group.id}
                        onClick={() => onSelect(group)}
                        className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all w-full ${isSelected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                            : 'border-border hover:border-primary/40 hover:bg-muted/50'
                            }`}
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-muted text-xs font-medium text-muted-foreground">
                            <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{group.title}</p>
                            <p className="text-[11px] text-muted-foreground capitalize">{group.type || 'group'}</p>
                        </div>
                    </button>
                );
            })}
        </div>
    );
};

export default TargetSelectionList;
