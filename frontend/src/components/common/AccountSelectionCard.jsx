/* eslint-disable react/prop-types */
import { Check } from 'lucide-react';

const AccountSelectionCard = ({ account, isSelected, onClick }) => {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-4 p-4 rounded-lg border text-left transition-all w-full ${isSelected
                ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                : 'border-border hover:border-primary/40 hover:bg-muted/50'
                }`}
        >
            <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${account.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                {account.first_name?.[0] || '?'}
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{account.first_name} {account.username ? `(@${account.username})` : ''}</p>
                <p className="text-xs text-muted-foreground">{account.phone_number}</p>
            </div>
            <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${account.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border'}`}>
                    {account.status}
                </span>
                {isSelected && <Check className="h-4 w-4 text-primary" />}
            </div>
        </button>
    );
};

export default AccountSelectionCard;
