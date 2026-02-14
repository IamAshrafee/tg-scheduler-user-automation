import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '../services/api';
import Modal from './ui/modal';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

const phoneSchema = z.object({
    phone: z.string().min(10, 'Phone number is required'),
});

const codeSchema = z.object({
    code: z.string().length(5, 'Code must be 5 digits'),
});

const passwordSchema = z.object({
    password: z.string().min(1, 'Password is required'),
});

const AddAccountDialog = ({ isOpen, onClose, onSuccess }) => {
    const [step, setStep] = useState(1); // 1: Phone, 2: Code, 3: Password (if needed)
    const [isLoading, setIsLoading] = useState(false);
    const [phoneHash, setPhoneHash] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');

    const {
        register: registerPhone,
        handleSubmit: handleSubmitPhone,
        formState: { errors: phoneErrors },
    } = useForm({
        resolver: zodResolver(phoneSchema),
    });

    const {
        register: registerCode,
        handleSubmit: handleSubmitCode,
        formState: { errors: codeErrors },
    } = useForm({
        resolver: zodResolver(codeSchema),
    });

    const {
        register: registerPassword,
        handleSubmit: handleSubmitPassword,
        formState: { errors: passwordErrors },
    } = useForm({
        resolver: zodResolver(passwordSchema),
    });

    const onPhoneSubmit = async (data) => {
        setIsLoading(true);
        try {
            const response = await api.post('/telegram-accounts/send-code', { phone_number: data.phone });
            setPhoneHash(response.data.phone_code_hash);
            setPhoneNumber(data.phone);
            setStep(2);
            toast.success('Code sent to your Telegram app');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to send code');
        } finally {
            setIsLoading(false);
        }
    };

    const onCodeSubmit = async (data) => {
        setIsLoading(true);
        try {
            await api.post('/telegram-accounts/verify-code', {
                phone_number: phoneNumber,
                phone_code_hash: phoneHash,
                code: data.code,
            });
            toast.success('Account connected successfully!');
            onSuccess();
            handleClose();
        } catch (error) {
            if (error.response?.data?.detail === 'SESSION_PASSWORD_NEEDED') {
                setStep(3);
                toast('Two-factor authentication enabled. Please enter your password.', { icon: '🔐' });
            } else {
                toast.error(error.response?.data?.detail || 'Failed to verify code');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const onPasswordSubmit = async (data) => {
        setIsLoading(true);
        try {
            await api.post('/telegram-accounts/verify-password', {
                phone_number: phoneNumber,
                phone_code_hash: phoneHash,
                password: data.password,
            });
            toast.success('Account connected successfully!');
            onSuccess();
            handleClose();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to verify password');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setStep(1);
        setPhoneNumber('');
        setPhoneHash('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Connect Telegram Account">
            {step === 1 && (
                <form onSubmit={handleSubmitPhone(onPhoneSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                            id="phone"
                            placeholder="+1234567890"
                            {...registerPhone('phone')}
                            className={phoneErrors.phone ? 'border-red-500' : ''}
                            disabled={isLoading}
                        />
                        {phoneErrors.phone && (
                            <p className="text-sm text-red-500">{phoneErrors.phone.message}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Enter number in international format (e.g., +1234567890)
                        </p>
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Code
                    </Button>
                </form>
            )}

            {step === 2 && (
                <form onSubmit={handleSubmitCode(onCodeSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="code">Verification Code</Label>
                        <Input
                            id="code"
                            placeholder="12345"
                            {...registerCode('code')}
                            className={codeErrors.code ? 'border-red-500' : ''}
                            disabled={isLoading}
                            autoFocus
                        />
                        {codeErrors.code && (
                            <p className="text-sm text-red-500">{codeErrors.code.message}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Check your Telegram app for the code (not SMS).
                        </p>
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Verify Code
                    </Button>
                </form>
            )}

            {step === 3 && (
                <form onSubmit={handleSubmitPassword(onPasswordSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="password">2FA Password</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="Enter your 2FA password"
                            {...registerPassword('password')}
                            className={passwordErrors.password ? 'border-red-500' : ''}
                            disabled={isLoading}
                            autoFocus
                        />
                        {passwordErrors.password && (
                            <p className="text-sm text-red-500">{passwordErrors.password.message}</p>
                        )}
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Unlock Account
                    </Button>
                </form>
            )}
        </Modal>
    );
};

export default AddAccountDialog;
