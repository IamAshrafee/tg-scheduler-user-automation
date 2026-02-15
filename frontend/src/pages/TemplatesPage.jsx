import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import TemplateInstantiationDialog from '../components/templates/TemplateInstantiationDialog';
import {
    Loader2,
    Sparkles,
    Briefcase,
    Megaphone,
    Users,
    BookOpen,
} from 'lucide-react';

const CATEGORY_CONFIG = {
    work: { icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    content: { icon: Megaphone, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    community: { icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    personal: { icon: BookOpen, color: 'text-orange-500', bg: 'bg-orange-500/10' },
};

const TemplatesPage = () => {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const res = await api.get('/templates');
                setTemplates(res.data.templates || []);
            } catch (e) {
                console.error('Failed to fetch templates:', e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTemplates();
    }, []);

    const handleApply = (template) => {
        setSelectedTemplate(template);
        setIsDialogOpen(true);
    };

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
                <p className="text-muted-foreground text-sm">
                    Pre-built automation templates to get started quickly
                </p>
            </div>

            {/* Templates Grid */}
            {templates.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {templates.map(template => {
                        const cat = CATEGORY_CONFIG[template.category] || CATEGORY_CONFIG.work;
                        const CatIcon = cat.icon;

                        return (
                            <Card key={template._id} className="group hover:shadow-lg transition-all duration-300 hover:border-primary/20 overflow-hidden">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-3xl">{template.icon || '📋'}</span>
                                            <div>
                                                <CardTitle className="text-base">{template.name}</CardTitle>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${cat.bg} ${cat.color}`}>
                                                        <CatIcon className="h-3 w-3" />
                                                        {template.category}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {template.tasks?.length || 0} task{(template.tasks?.length || 0) !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <CardDescription className="text-xs line-clamp-2">
                                        {template.description}
                                    </CardDescription>

                                    {/* Task preview */}
                                    {template.tasks && template.tasks.length > 0 && (
                                        <div className="space-y-1.5">
                                            {template.tasks.slice(0, 3).map((task, idx) => (
                                                <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <div className="h-1 w-1 rounded-full bg-muted-foreground/50" />
                                                    <span className="truncate">{task.name}</span>
                                                    <span className="ml-auto font-mono text-[10px] shrink-0">{task.default_time}</span>
                                                </div>
                                            ))}
                                            {template.tasks.length > 3 && (
                                                <p className="text-[10px] text-muted-foreground">+{template.tasks.length - 3} more</p>
                                            )}
                                        </div>
                                    )}

                                    <Button
                                        className="w-full gap-2"
                                        size="sm"
                                        onClick={() => handleApply(template)}
                                    >
                                        <Sparkles className="h-3.5 w-3.5" />
                                        Use Template
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted mb-4">
                        <Sparkles className="h-10 w-10 text-muted-foreground opacity-50" />
                    </div>
                    <h3 className="text-lg font-semibold mb-1">No templates available</h3>
                    <p className="text-muted-foreground text-sm max-w-sm">
                        Templates will appear here once they're configured in the system.
                    </p>
                </div>
            )}

            <TemplateInstantiationDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                template={selectedTemplate}
                onSuccess={() => navigate('/tasks')}
            />
        </div>
    );
};

export default TemplatesPage;
