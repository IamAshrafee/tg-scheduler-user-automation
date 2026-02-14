import { useState, useEffect } from 'react';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import {
    Loader2,
    CalendarOff,
    Plus,
    X,
    Save,
} from 'lucide-react';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const OffDaysPage = () => {
    const [offDays, setOffDays] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [newDate, setNewDate] = useState('');
    const [weeklyHolidays, setWeeklyHolidays] = useState([]);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        const fetchOffDays = async () => {
            try {
                const res = await api.get('/off-days');
                setOffDays(res.data);
                setWeeklyHolidays(res.data.weekly_holidays || []);
            } catch (e) {
                console.error('Failed to fetch off days:', e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchOffDays();
    }, []);

    const toggleWeekday = (idx) => {
        const newDays = weeklyHolidays.includes(idx)
            ? weeklyHolidays.filter(d => d !== idx)
            : [...weeklyHolidays, idx];
        setWeeklyHolidays(newDays);
        setHasChanges(true);
    };

    const saveWeeklyHolidays = async () => {
        setIsSaving(true);
        try {
            const res = await api.put('/off-days', { weekly_holidays: weeklyHolidays });
            setOffDays(res.data);
            setHasChanges(false);
        } catch (e) {
            console.error('Failed to save off days:', e);
        } finally {
            setIsSaving(false);
        }
    };

    const addSpecificDate = async () => {
        if (!newDate) return;
        try {
            const res = await api.post('/off-days/dates', { dates: [newDate] });
            setOffDays(res.data);
            setNewDate('');
        } catch (e) {
            console.error('Failed to add date:', e);
        }
    };

    const removeSpecificDate = async (date) => {
        try {
            const res = await api.delete('/off-days/dates', { data: { dates: [date] } });
            setOffDays(res.data);
        } catch (e) {
            console.error('Failed to remove date:', e);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Off Days</h1>
                <p className="text-muted-foreground text-sm">
                    Configure global off days — tasks won't execute on these days
                </p>
            </div>

            {/* Weekly Holidays */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">Weekly Holidays</CardTitle>
                    <CardDescription>Tasks will be skipped on these days every week</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2 flex-wrap">
                        {DAY_NAMES.map((day, idx) => (
                            <button
                                key={idx}
                                onClick={() => toggleWeekday(idx)}
                                className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${weeklyHolidays.includes(idx)
                                    ? 'border-red-500 bg-red-500/10 text-red-500 shadow-sm'
                                    : 'border-border hover:bg-muted hover:border-primary/30'
                                    }`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                    {hasChanges && (
                        <Button size="sm" onClick={saveWeeklyHolidays} disabled={isSaving}>
                            {isSaving ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Save className="mr-2 h-3 w-3" />}
                            Save Changes
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* Specific Dates */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">Specific Dates</CardTitle>
                    <CardDescription>One-time off days (e.g., national holidays, vacations)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-3">
                        <input
                            type="date"
                            value={newDate}
                            onChange={e => setNewDate(e.target.value)}
                            className="flex h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                        <Button size="sm" onClick={addSpecificDate} disabled={!newDate}>
                            <Plus className="mr-1 h-3 w-3" /> Add
                        </Button>
                    </div>

                    {(offDays?.specific_dates || []).length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {offDays.specific_dates
                                .sort((a, b) => a.localeCompare(b))
                                .map(date => (
                                    <span
                                        key={date}
                                        className="flex items-center gap-1.5 text-xs bg-red-500/10 text-red-500 border border-red-500/20 px-2.5 py-1 rounded-md"
                                    >
                                        {new Date(date + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                                        <button
                                            onClick={() => removeSpecificDate(date)}
                                            className="hover:text-red-300 transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground">No specific off dates configured.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default OffDaysPage;
