import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Loader2, Command } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthFeatureShowcase from '../components/auth/AuthFeatureShowcase';

const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

const RegisterPage = () => {
    const { register: registerUser } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(registerSchema),
    });

    const onSubmit = async (data) => {
        setIsLoading(true);
        try {
            await registerUser({ email: data.email, password: data.password });
            toast.success('Account created successfully');
            navigate('/login');
        } catch (error) {
            // Error handled in AuthContext or api interceptor usually, but toast here for safety
            if (error.response?.data?.detail) {
                toast.error(error.response.data.detail);
            } else {
                toast.error('Failed to create account');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container relative h-[100vh] flex flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
            <div className="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex overflow-hidden">
                <div className="absolute inset-0 bg-stone-950" />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/50 to-zinc-900/10" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-zinc-900/0 to-transparent" />

                <div className="relative z-20 flex items-center text-lg font-medium tracking-tight">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-sm">
                            <Command className="h-5 w-5" />
                        </div>
                        <span className="font-semibold">TG Automator</span>
                    </div>
                </div>

                <div className="relative z-10 flex-1 flex items-center justify-center">
                    <AuthFeatureShowcase />
                </div>

                <div className="relative z-20 mt-auto">
                    <blockquote className="space-y-2 max-w-lg">
                        <p className="text-xl font-light leading-relaxed">
                            &ldquo;The best decision we made was to automate. It's secure, reliable, and honestly? It's kind of magical.&rdquo;
                        </p>
                        <footer className="text-sm font-medium text-zinc-400 mt-4 flex items-center gap-2">
                            <div className="h-0.5 w-4 bg-zinc-600"></div>
                            Alex Chen, Founder
                        </footer>
                    </blockquote>
                </div>
            </div>
            <div className="lg:p-8">
                <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px] animate-in fade-in slide-in-from-bottom-8 duration-500 ease-out">
                    <div className="flex flex-col space-y-2 text-center">
                        <h1 className="text-3xl font-bold tracking-tighter">
                            Create an account
                        </h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            Join thousands of users automating their workflow today.
                        </p>
                    </div>
                    <div className="grid gap-6">
                        <form onSubmit={handleSubmit(onSubmit)}>
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="email" className="font-medium text-xs uppercase tracking-wide text-zinc-500">Email Address</Label>
                                    <Input
                                        id="email"
                                        placeholder="name@example.com"
                                        type="email"
                                        autoCapitalize="none"
                                        autoComplete="email"
                                        autoCorrect="off"
                                        disabled={isLoading}
                                        {...register('email')}
                                        className={`h-11 ${errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                    />
                                    {errors.email && (
                                        <p className="text-xs text-red-500 animate-in slide-in-from-top-1">{errors.email.message}</p>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="password" className="font-medium text-xs uppercase tracking-wide text-zinc-500">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        disabled={isLoading}
                                        {...register('password')}
                                        className={`h-11 ${errors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                    />
                                    {errors.password && (
                                        <p className="text-xs text-red-500 animate-in slide-in-from-top-1">{errors.password.message}</p>
                                    )}
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="confirmPassword" className="font-medium text-xs uppercase tracking-wide text-zinc-500">Confirm Password</Label>
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="••••••••"
                                        disabled={isLoading}
                                        {...register('confirmPassword')}
                                        className={`h-11 ${errors.confirmPassword ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                                    />
                                    {errors.confirmPassword && (
                                        <p className="text-xs text-red-500 animate-in slide-in-from-top-1">{errors.confirmPassword.message}</p>
                                    )}
                                </div>
                                <Button
                                    disabled={isLoading}
                                    className="h-11 font-medium text-md shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40 hover:bg-primary/90 text-primary-foreground"
                                >
                                    {isLoading && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    Create Account
                                </Button>
                            </div>
                        </form>
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-zinc-200 dark:border-zinc-800" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-zinc-500">
                                    Already have an account?
                                </span>
                            </div>
                        </div>
                        <Link to="/login">
                            <Button
                                variant="outline"
                                type="button"
                                disabled={isLoading}
                                className="w-full h-11 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-50"
                            >
                                Login
                            </Button>
                        </Link>
                    </div>
                    <p className="px-8 text-center text-xs text-zinc-500">
                        By clicking continue, you agree to our{" "}
                        <Link
                            to="/terms"
                            className="underline underline-offset-4 hover:text-primary transition-colors"
                        >
                            Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link
                            to="/privacy"
                            className="underline underline-offset-4 hover:text-primary transition-colors"
                        >
                            Privacy Policy
                        </Link>
                        .
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
