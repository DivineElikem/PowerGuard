'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
    BarChart3,
    AlertTriangle,
    TrendingUp,
    MessageSquare,
    LayoutDashboard,
    Menu,
    X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Anomalies', href: '/anomalies', icon: AlertTriangle },
    { name: 'Forecasting', href: '/forecast', icon: TrendingUp },
    { name: 'AI Chat', href: '/chat', icon: MessageSquare },
];

export default function Navbar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Mobile Header */}
            <header className="fixed top-0 left-0 right-0 h-16 bg-slate-900 flex items-center justify-between px-6 z-40 md:hidden border-b border-slate-800 [padding-top:env(safe-area-inset-top)] [height:calc(4rem+env(safe-area-inset-top))]">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-600 p-1.5 rounded-lg">
                        <BarChart3 size={18} className="text-white" />
                    </div>
                    <h1 className="text-lg font-bold text-white">PowerGuard</h1>
                </div>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                >
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </header>

            {/* Mobile Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Navbar Sidebar */}
            <nav className={`fixed left-0 top-0 h-full w-64 bg-slate-900 text-white p-6 [padding-top:calc(1.5rem+env(safe-area-inset-top))] shadow-xl z-50 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                }`}>
                <div className="flex items-center gap-3 mb-10">
                    <div className="bg-blue-600 p-2 rounded-lg">
                        <BarChart3 size={24} />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">PowerGuard</h1>
                </div>

                <div className="space-y-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                                    ? 'bg-blue-600/20 text-blue-400 border-l-4 border-blue-500'
                                    : 'hover:bg-slate-800 text-slate-400'
                                    }`}
                            >
                                <item.icon size={20} />
                                <span className="font-medium">{item.name}</span>
                            </Link>
                        );
                    })}
                </div>

                <div className="absolute bottom-8 left-6 right-6">
                    <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-2">Learning Note</p>
                        <p className="text-sm text-slate-300 leading-relaxed">
                            This dashboard consumes real-time telemetry from IoT devices processed by ML models.
                        </p>
                    </div>
                </div>
            </nav>
        </>
    );
}
