import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    Eye,
    EyeOff,
    Mail,
    Lock,
    ArrowRight,
    ShoppingCart,
    Boxes,
    BarChart3
} from 'lucide-react';

import { authApi } from '../features/auth/authApi';
import { useAuthStore } from '../store/authStore';
import { useCompanySettings } from '../features/settings/useSettings';

export default function LoginPage() {
    const navigate = useNavigate();
    const { login, isAuthenticated } = useAuthStore();
    const { data: settingsRes } = useCompanySettings();

    const companySettings = settingsRes?.data || {};
    const companyName = companySettings.companyName || 'AsipBook';
    const tagline = companySettings.tagline || 'BUSINESS MANAGEMENT SYSTEM';
    const subtitle = companySettings.systemSubtitle || 'Smart wholesale inventory, POS, and financial management.';
    const logoUrl = companySettings.logoUrl || '/asipbook-logo.png';

    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    // Update browser title
    useEffect(() => {
        if (companyName) {
            document.title = `${companyName} ERP System - Sign In`;
        }
    }, [companyName]);

    // Login Mutation
    const loginMutation = useMutation({
        mutationFn: authApi.login,
        onSuccess: (response) => {
            const { token, ...user } = response.data;
            login(user, token);
            toast.success(`Welcome back, ${user.firstName || user.fullName || 'User'}!`);
            if (user.role === 'customer') {
                navigate('/price-checker');
            } else {
                navigate('/dashboard');
            }
        },
        onError: (error) => {
            const message = error.response?.data?.message || 'Login failed. Please check your credentials.';
            toast.error(message);
        },
    });

    // If already logged in with valid user session, redirect
    const currentUser = useAuthStore((s) => s.user);
    if (isAuthenticated && currentUser) {
        return <Navigate to={currentUser?.role === 'customer' ? '/price-checker' : '/dashboard'} replace />;
    }

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleLoginSubmit = (e) => {
        e.preventDefault();
        if (!formData.email || !formData.password) {
            toast.error('Please enter both email and password');
            return;
        }
        loginMutation.mutate({
            email: formData.email.trim(),
            password: formData.password,
        });
    };

    const companyDomain = companyName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'company';

    return (
        <div className="relative min-h-screen w-full bg-[#f8f9ff] text-gray-800 flex items-center justify-center p-4 md:p-8 lg:p-12 overflow-hidden selection:bg-purple-500 selection:text-white">
            {/* Background Ambient Glow & Organic Blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-purple-200/35 via-indigo-200/25 to-transparent blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-fuchsia-200/35 via-pink-100/25 to-transparent blur-3xl pointer-events-none" />
            <div className="absolute bottom-[5%] left-[20%] w-[450px] h-[450px] rounded-full bg-gradient-to-tr from-blue-100/35 via-purple-100/20 to-transparent blur-2xl pointer-events-none" />

            {/* Subtle background circles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-35">
                <svg className="w-full h-full" viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="200" cy="450" r="320" stroke="url(#paint0_radial)" strokeWidth="1.2" strokeDasharray="5 5" />
                    <circle cx="200" cy="450" r="480" stroke="url(#paint1_radial)" strokeWidth="1" />
                    <circle cx="1200" cy="700" r="400" stroke="url(#paint2_radial)" strokeWidth="1.2" />
                    <defs>
                        <radialGradient id="paint0_radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(200 450) scale(320)">
                            <stop stopColor="#a855f7" stopOpacity="0.35" />
                            <stop offset="1" stopColor="#6366f1" stopOpacity="0" />
                        </radialGradient>
                        <radialGradient id="paint1_radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(200 450) scale(480)">
                            <stop stopColor="#c084fc" stopOpacity="0.2" />
                            <stop offset="1" stopColor="#ec4899" stopOpacity="0" />
                        </radialGradient>
                        <radialGradient id="paint2_radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(1200 700) scale(400)">
                            <stop stopColor="#818cf8" stopOpacity="0.25" />
                            <stop offset="1" stopColor="#d946ef" stopOpacity="0" />
                        </radialGradient>
                    </defs>
                </svg>
            </div>

            {/* Main Content Container */}
            <div className="relative z-10 w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
                
                {/* ── LEFT HERO COLUMN ── */}
                <div className="lg:col-span-6 flex flex-col justify-center space-y-7 pr-0 lg:pr-4 text-left">
                    
                    {/* Brand Lockup */}
                    <div className="flex items-center gap-3">
                        {logoUrl ? (
                            <div className="h-14 max-w-[260px] flex items-center justify-start">
                                <img
                                    src={logoUrl}
                                    alt={companyName}
                                    className="max-h-14 max-w-full object-contain filter drop-shadow-sm"
                                />
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-cyan-400 via-indigo-600 to-fuchsia-500 p-0.5 shadow-md shadow-purple-500/15 flex items-center justify-center">
                                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                                        <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-fuchsia-600 bg-clip-text text-transparent">
                                            {companyName.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight leading-tight">
                                        {companyName}
                                    </h2>
                                    <p className="text-[10px] font-medium text-fuchsia-600 tracking-wider uppercase">
                                        {tagline}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ERP Heading & Tagline */}
                    <div className="space-y-2.5">
                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight leading-snug">
                            <span>{companyName} </span>
                            <span className="bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent">
                                ERP System
                            </span>
                        </h1>
                        <p className="text-gray-500 text-sm md:text-base max-w-md font-normal leading-relaxed">
                            {subtitle}
                        </p>
                    </div>

                    {/* 3 Core Feature Pills */}
                    <div className="grid grid-cols-3 gap-3 pt-1">
                        {/* 1. Real-Time POS */}
                        <div className="flex flex-col items-center text-center group cursor-default">
                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-fuchsia-50/90 border border-fuchsia-100 flex items-center justify-center text-fuchsia-600 shadow-sm transition transform group-hover:scale-105 mb-2">
                                <ShoppingCart className="w-5 h-5 md:w-6 md:h-6 stroke-[1.8]" />
                            </div>
                            <span className="text-xs md:text-sm font-medium text-gray-700 leading-tight">
                                Real-Time POS
                            </span>
                        </div>

                        {/* 2. Multi-Warehouse Stock */}
                        <div className="flex flex-col items-center text-center group cursor-default">
                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-blue-50/90 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm transition transform group-hover:scale-105 mb-2">
                                <Boxes className="w-5 h-5 md:w-6 md:h-6 stroke-[1.8]" />
                            </div>
                            <span className="text-xs md:text-sm font-medium text-gray-700 leading-tight">
                                Multi-Warehouse<br className="hidden md:inline" /> Stock
                            </span>
                        </div>

                        {/* 3. Integrated Finance */}
                        <div className="flex flex-col items-center text-center group cursor-default">
                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-purple-50/90 border border-purple-100 flex items-center justify-center text-purple-600 shadow-sm transition transform group-hover:scale-105 mb-2">
                                <BarChart3 className="w-5 h-5 md:w-6 md:h-6 stroke-[1.8]" />
                            </div>
                            <span className="text-xs md:text-sm font-medium text-gray-700 leading-tight">
                                Integrated Finance
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── RIGHT AUTH CARD COLUMN (Sign In Only) ── */}
                <div className="lg:col-span-6 w-full max-w-md mx-auto">
                    <div className="bg-white/95 backdrop-blur-xl rounded-2xl md:rounded-3xl border border-purple-100/80 shadow-[0_15px_40px_rgba(147,51,234,0.06)] p-6 md:p-9 transition-all">
                        
                        {/* Title and Subtitle */}
                        <div className="mb-6">
                            <h2 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
                                Sign In
                            </h2>
                            <p className="text-xs md:text-sm text-gray-500 mt-1 font-normal">
                                Enter your credentials to access your {companyName} account.
                            </p>
                        </div>

                        {/* ── SIGN IN FORM ── */}
                        <form onSubmit={handleLoginSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                        <Mail size={17} strokeWidth={1.8} />
                                    </div>
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder={`admin@${companyDomain}.com`}
                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-normal focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 transition text-gray-900 placeholder-gray-400"
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="block text-xs font-medium text-gray-700">
                                        Password
                                    </label>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                        <Lock size={17} strokeWidth={1.8} />
                                    </div>
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        name="password"
                                        required
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="Enter your password"
                                        className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-normal focus:outline-none focus:ring-2 focus:ring-purple-500/25 focus:border-purple-500 transition text-gray-900 placeholder-gray-400"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition"
                                    >
                                        {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loginMutation.isPending}
                                className="w-full mt-2 py-3 px-6 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 text-white font-medium text-sm shadow-md shadow-purple-500/20 hover:opacity-95 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {loginMutation.isPending ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span>Sign In</span>
                                        <ArrowRight size={17} />
                                    </>
                                )}
                            </button>

                            <div className="pt-2 text-center">
                                <p className="text-xs text-gray-400 font-normal">
                                    Protected system • Contact administrator for account access
                                </p>
                            </div>
                        </form>

                    </div>
                </div>

            </div>
        </div>
    );
}
