import React from 'react';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const PrivacyPolicyPage = () => {
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
                <h1 className="text-3xl font-bold tracking-tight mb-2">Privacy Policy</h1>
                <p className="text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

                <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8">
                    <section>
                        <h2 className="text-xl font-semibold mb-4">1. Information We Collect</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            We collect information you provide directly to us when using TG Automator, including:
                        </p>
                        <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
                            <li>Account information (email address, password).</li>
                            <li>Telegram account data necessary for automation (session strings, phone numbers).</li>
                            <li>Usage data and logs related to your automation tasks.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-4">2. How We Use Your Information</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            We use the information we collect to:
                        </p>
                        <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
                            <li>Provide, maintain, and improve the Service.</li>
                            <li>Execute the automation tasks you schedule.</li>
                            <li>Communicate with you about updates, security alerts, and support.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-4">3. Data Security</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no internet transmission is completely secure, and we cannot guarantee absolute security.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-4">4. Sharing of Information</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            We do not sell your personal information. We may share information only in the following circumstances:
                        </p>
                        <ul className="list-disc pl-6 mt-4 space-y-2 text-muted-foreground">
                            <li>With your consent or at your direction.</li>
                            <li>To comply with legal obligations or protect our rights.</li>
                        </ul>
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

export default PrivacyPolicyPage;
