import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, HardHat, User, ArrowRight, X } from 'lucide-react';
import { MOCK_STATS } from '../utils/mockData';
import { useToast } from '../context/ToastContext';
import { api } from '../utils/api';

const LoginCard = ({ icon: Icon, title, description, badgeColor, buttonColor, onEnter }) => {
    return (
        <div
            onClick={onEnter}
            className="bg-[#0f1e38] border border-[#1a2d4a] rounded-xl p-8 cursor-pointer hover:border-[#00c9b1] hover:shadow-[0_0_20px_rgba(0,201,177,0.1)] hover:-translate-y-1 transition-all duration-300 group flex flex-col items-center text-center"
        >
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 ${badgeColor}`}>
                <Icon size={32} />
            </div>
            <h2 className="text-[#e2eaf8] text-xl font-bold mb-2 transition-colors duration-300 group-hover:text-[#e2eaf8]">{title}</h2>
            <p className="text-[#7a94bb] text-sm mb-8 leading-relaxed">{description}</p>

            <button
                className={`w-full py-3 px-6 rounded-lg font-bold text-sm tracking-widest flex items-center justify-center gap-2 transition-all duration-200 active:scale-95 ${buttonColor}`}
            >
                ENTER PORTAL <ArrowRight size={16} />
            </button>
        </div>
    );
};

const LoginPage = () => {
    const navigate = useNavigate();
    const { showToast } = useToast();

    // Aid Worker State
    const [showWorkerForm, setShowWorkerForm] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [workerName, setWorkerName] = useState('');
    const [workerId, setWorkerId] = useState('');
    const [workerPass, setWorkerPass] = useState('');

    // Refugee login is ID-only and must be verified via backend (no manual wallet entry).
    const [showRefugeeForm, setShowRefugeeForm] = useState(false);
    const [refugeeId, setRefugeeId] = useState('');
    const [isVerifyingRefugee, setIsVerifyingRefugee] = useState(false);

    const handleRefugeeLogin = async (e) => {
        if (e) e.preventDefault();
        const id = refugeeId.trim();
        if (!id) {
            showToast('error', 'Missing ID', 'Please enter your refugee ID.');
            return;
        }
        setIsVerifyingRefugee(true);
        try {
            await api.verifyIdentity(id);
            localStorage.setItem('refugee_identity_id', id);
            setShowRefugeeForm(false);
            navigate('/refugee/dashboard');
        } catch (err) {
            showToast('error', 'Access denied', err.message || 'Invalid or unregistered ID.');
        } finally {
            setIsVerifyingRefugee(false);
        }
    };

    /* ... existing code ... */
    // Aid Worker Registration Logic
    const handleWorkerRegister = (e) => {
        try {
            e.preventDefault();
            const existing = JSON.parse(localStorage.getItem('demo_aid_workers') || '[]');

            // Prevent duplicate IDs in demo
            if (existing.find(w => w.id === workerId)) {
                showToast('error', 'Registration Error', 'This ID is already in use.');
                return;
            }

            const newWorker = {
                name: workerName,
                id: workerId,
                password: workerPass,
                status: 'pending'
            };

            existing.push(newWorker);
            localStorage.setItem('demo_aid_workers', JSON.stringify(existing));

            showToast('success', 'Registration Submitted', 'Pending admin approval.');
            setIsRegistering(false);
            setWorkerName('');
            setWorkerId('');
            setWorkerPass('');
        } catch (error) {
            console.error('Registration failed:', error);
            showToast('error', 'Error', 'Failed to register. Please try again.');
        }
    };

    // Aid Worker Login Logic (Role-Based Access)
    const handleWorkerLogin = (e) => {
        try {
            if (e) e.preventDefault();

            // 1. Priority Master Backdoor
            if (workerId === 'admin' && workerPass === '1234') {
                localStorage.setItem('walletAddress', 'AID-WORKER-SESSION');
                navigate('/aid-worker');
                return;
            }

            // 2. Query Local DB
            const workers = JSON.parse(localStorage.getItem('demo_aid_workers') || '[]');
            const user = workers.find(w => w.id === workerId);

            if (!user) {
                showToast('error', 'Error', 'Account not found.');
                return;
            }

            if (user.password !== workerPass) {
                showToast('error', 'Error', 'Invalid password.');
                return;
            }

            if (user.status === 'pending') {
                // Demo: allow pending users to login (admin must approve for production)
                showToast('success', 'Demo Login', 'Logged in as pending staff. Admin can approve from Overview.');
                localStorage.setItem('walletAddress', `OFFICER-${user.id}`);
                navigate('/aid-worker');
                return;
            }

            if (user.status === 'approved') {
                localStorage.setItem('walletAddress', `OFFICER-${user.id}`);
                navigate('/aid-worker');
                return;
            }

            // Fallback: allow login for demo (e.g. status undefined)
            localStorage.setItem('walletAddress', `OFFICER-${user.id}`);
            navigate('/aid-worker');
        } catch (error) {
            console.error('Login failed:', error);
            showToast('error', 'Error', 'Login failed. Please try again.');
        }
    };

    return (
        <div className="min-h-screen bg-[#060d1f] flex flex-col items-center justify-center relative overflow-hidden page-enter">
            {/* Animated Grid Background */}
            <div className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(circle, #1e3a5f 1px, transparent 1px)',
                    backgroundSize: '32px 32px',
                    animation: 'pulseOpacity 4s ease-in-out infinite'
                }}
            />

            <div className="max-w-4xl w-full px-6 flex flex-col items-center relative z-10">
                {/* Header Section ... existing content ... */}
                <div className="flex flex-col items-center mb-16 text-center">
                    <div className="w-20 h-20 bg-[#00c9b110] rounded-2xl flex items-center justify-center border border-[#00c9b130] mb-8 animate-bounce shadow-[0_0_30px_rgba(0,201,177,0.1)]">
                        <Shield size={48} className="text-[#00c9b1]" />
                    </div>
                    <h1 className="font-mono text-6xl font-bold text-[#00c9b1] tracking-[0.2em] mb-4">RIMS</h1>
                    <p className="text-[#7a94bb] text-sm font-medium uppercase tracking-[0.3em]">Refugee Identity Management System</p>
                    <div className="h-0.5 w-24 bg-[#1a2d4a] mt-8 rounded-full" />
                </div>

                {/* Role Selection */}
                <div className="grid md:grid-cols-3 gap-8 w-full max-w-5xl relative">
                    <LoginCard
                        icon={HardHat}
                        title="Aid Worker Portal"
                        description="Register refugees, distribute aid resources, and manage verification requests."
                        badgeColor="bg-[#f59e0b20] text-[#f59e0b]"
                        buttonColor="border border-[#f59e0b] text-[#f59e0b] hover:bg-[#f59e0b20]"
                        onEnter={() => setShowWorkerForm(true)}
                    />
                    <LoginCard
                        icon={User}
                        title="Refugee Portal"
                        description="Access your digital identity, manage data consents, and migrate to self-sovereign wallets."
                        badgeColor="bg-[#00c9b120] text-[#00c9b1]"
                        buttonColor="bg-[#00c9b1] text-[#060d1f] hover:bg-[#00e0c5]"
                        onEnter={() => setShowRefugeeForm(true)}
                    />
                    <LoginCard
                        icon={Shield}
                        title="Admin Portal"
                        description="Approve wallet migrations, audit blockchain activity, and manage system health."
                        badgeColor="bg-[#8b5cf620] text-[#8b5cf6]"
                        buttonColor="border border-[#8b5cf6] text-[#8b5cf6] hover:bg-[#8b5cf620]"
                        onEnter={() => navigate('/admin/dashboard')}
                    />
                </div>
            </div>

            {/* Aid Worker Login Form Overlay - FIXED MODAL */}
            {showWorkerForm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#000000dd] backdrop-blur-sm px-6">
                    <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-fadeSlideUp relative">
                        <h3 className="text-[#e2eaf8] text-xl font-bold mb-6 text-center">
                            {isRegistering ? 'Register New Staff' : 'Aid Worker Login'}
                        </h3>

                        <div className="space-y-4 mb-6">
                            {isRegistering && (
                                <input
                                    placeholder="Full Name"
                                    className="w-full bg-[#060d1f] border border-[#1a2d4a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#00c9b1]"
                                    value={workerName} onChange={e => setWorkerName(e.target.value)}
                                />
                            )}
                            <input
                                placeholder="Official ID (e.g. admin)"
                                className="w-full bg-[#060d1f] border border-[#1a2d4a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#00c9b1]"
                                value={workerId} onChange={e => setWorkerId(e.target.value)}
                            />
                            <input
                                type="password" placeholder="Password (e.g. 1234)"
                                className="w-full bg-[#060d1f] border border-[#1a2d4a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#00c9b1]"
                                value={workerPass} onChange={e => setWorkerPass(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={isRegistering ? handleWorkerRegister : handleWorkerLogin}
                                className="w-full bg-[#00c9b1] text-[#060d1f] font-bold py-3 rounded-xl hover:bg-[#00e0c5] transition-all"
                            >
                                {isRegistering ? 'SUBMIT REGISTRATION' : 'LOGIN'}
                            </button>
                            <button
                                onClick={() => setIsRegistering(!isRegistering)}
                                className="text-[#7a94bb] text-xs font-bold uppercase tracking-widest hover:text-white"
                            >
                                {isRegistering ? 'Switch to Login' : 'Register New Account'}
                            </button>
                            <button
                                onClick={() => setShowWorkerForm(false)}
                                className="w-full py-3 bg-[#152342] text-white font-bold rounded-xl border border-[#1a2d4a] hover:bg-[#1a2d4a] transition-all mt-2"
                            >
                                CANCEL
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Refugee ID Login Overlay */}
            {showRefugeeForm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#000000dd] backdrop-blur-sm px-6">
                    <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-fadeSlideUp relative">
                        <button
                            onClick={() => setShowRefugeeForm(false)}
                            className="absolute top-4 right-4 text-[#3d5278] hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <h3 className="text-[#e2eaf8] text-xl font-bold mb-2 text-center">Refugee Portal</h3>
                        <p className="text-[#7a94bb] text-sm text-center mb-6">
                            Enter the refugee ID issued during registration. Wallet entry is not allowed.
                        </p>

                        <form onSubmit={handleRefugeeLogin} className="space-y-4">
                            <input
                                placeholder="Refugee ID"
                                className="w-full bg-[#060d1f] border border-[#1a2d4a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#00c9b1] font-mono"
                                value={refugeeId}
                                onChange={(e) => setRefugeeId(e.target.value)}
                            />
                            <button
                                type="submit"
                                disabled={isVerifyingRefugee}
                                className="w-full py-3 bg-[#00c9b1] text-[#060d1f] text-sm font-bold uppercase tracking-widest rounded-lg hover:bg-[#00e0c5] transition-all disabled:opacity-60"
                            >
                                {isVerifyingRefugee ? 'VERIFYING…' : 'ENTER'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Marquee Footer ... existing content ... */}
            <div className="fixed bottom-0 left-0 right-0 bg-[#0a1428] border-t border-[#1a2d4a] py-4 overflow-hidden">
                <div className="marquee-track whitespace-nowrap flex items-center gap-12">
                    {[...Array(2)].map((_, i) => (
                        <div key={i} className="flex items-center gap-12 shrink-0">
                            <span className="text-[#7a94bb] text-xs font-medium flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#00c9b1]" />
                                {MOCK_STATS.totalRegistered.toLocaleString()} identities secured on Algorand
                            </span>
                            <span className="text-[#7a94bb] text-xs font-medium flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#00c9b1]" />
                                {MOCK_STATS.aidClaimsThisWeek} aid claims verified this week
                            </span>
                            <span className="text-[#7a94bb] text-xs font-medium flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#00c9b1]" />
                                Zero documents required
                            </span>
                            <span className="text-[#7a94bb] text-xs font-medium flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#00c9b1]" />
                                Custodial → Self-Sovereign migration live
                            </span>
                            <span className="text-[#7a94bb] text-xs font-medium flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#00c9b1]" />
                                Biometric liveness detection active
                            </span>
                            <span className="text-[#7a94bb] text-xs font-medium flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#00c9b1]" />
                                {MOCK_STATS.blockedDuplicates} duplicate registrations blocked
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
