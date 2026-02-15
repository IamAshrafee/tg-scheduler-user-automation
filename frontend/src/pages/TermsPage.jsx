import React from 'react';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const TermsPage = () => {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            <header className="container py-6 flex items-center justify-between border-b">
                <div className="flex items-center gap-2 font-bold text-xl">
                    TG Automator
                </div>
                <Link to="/login">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Login
                    </Button>
                </Link>
            </header>

            <main className="container flex-1 py-12 max-w-3xl">
                <h1 className="text-3xl font-bold tracking-tight mb-2">Terms of Service</h1>
                <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

                <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8">
                    <section>
                        <h2 className="text-xl font-semibold mb-4">1. Acceptance of Terms</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            By accessing and using TG Automator ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-4">2. Use License</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            We grant you a limited, non-exclusive, non-transferable license to use the Service for your personal or internal business purposes, subject to these Terms.
                        </p>
                        <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
                            <li>You must not use the Service for any illegal or unauthorized purpose.</li>
                            <li>You must not violate any laws in your jurisdiction.</li>
                            <li>You are responsible for maintaining the security of your account.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-4">3. Telegram Automation & Compliance</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            This Service automates actions on the Telegram platform. You are solely responsible for ensuring that your use of the Service complies with Telegram's Terms of Service and Anti-Spam policies. We are not responsible for any account bans or restrictions imposed by Telegram resulting from your use of this Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-4">4. Disclaimer of Warranties</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            The Service is provided "as is" and "as available" without any warranties of any kind, either express or implied, including but not limited to the implied warranties of merchantability, fitness for a particular purpose, or non-infringement.
                        </p>
                    </section>
                </div>
            </main>

            <footer className="border-t py-6 bg-muted/30">
                <div className="container text-center text-sm text-muted-foreground">
                    &copy; {new Date().getFullYear()} TG Automator. All rights reserved.
                </div>
            </footer>
        </div>
    );
};

export default TermsPage;
