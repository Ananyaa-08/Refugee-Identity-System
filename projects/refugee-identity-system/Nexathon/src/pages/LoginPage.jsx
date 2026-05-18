import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, HardHat, User, ArrowRight, X } from 'lucide-react';
import { MOCK_STATS } from '../utils/mockData';
import { useToast } from '../context/ToastContext';
import { api } from '../utils/api';
import Portal from '../components/ui/Portal';
import {
    getAidWorkerPasswordChecklist,
    validateAidWorkerPassword,
} from '../utils/passwordValidation';
import {
    setAdminAuthenticated,
    validateAdminCredentials,
} from '../utils/adminAuth';

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
                type="button"
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
    const [workerAlert, setWorkerAlert] = useState(null);

    const passwordChecklist = getAidWorkerPasswordChecklist(workerPass);
    const passwordValid = validateAidWorkerPassword(workerPass).valid;

    // Refugee login is ID-only and must be verified via backend (no manual wallet entry).
    const [showRefugeeForm, setShowRefugeeForm] = useState(false);
    const [refugeeId, setRefugeeId] = useState('');
    const [isVerifyingRefugee, setIsVerifyingRefugee] = useState(false);

    // Admin login — only admin / 123456789
    const [showAdminForm, setShowAdminForm] = useState(false);
    const [adminId, setAdminId] = useState('');
    const [adminPass, setAdminPass] = useState('');
    const [adminAlert, setAdminAlert] = useState(null);

    const handleRefugeeLogin = async (e) => {
        if (e) e.preventDefault();
        const id = refugeeId.trim();
        if (!id) {
            showToast('error', 'Missing ID', 'Please enter your refugee ID.');
            return;
        }
        setIsVerifyingRefugee(true);
        try {
            const res = await api.verifyIdentity(id);
            const canonicalId = res?.data?.identity_id || id;
            localStorage.setItem('refugee_identity_id', canonicalId);
            setShowRefugeeForm(false);
            navigate('/refugee/dashboard');
        } catch (err) {
            showToast('error', 'Access denied', err.message || 'Invalid or unregistered ID.');
        } finally {
            setIsVerifyingRefugee(false);
        }
    };

    /* ... existing code ... */
    const handleAdminLogin = (e) => {
        e.preventDefault();
        const id = adminId.trim();
        const pass = adminPass;

        if (!validateAdminCredentials(id, pass)) {
            setAdminAlert({
                title: 'Access denied',
                message: 'Invalid administrator credentials.',
            });
            return;
        }

        setAdminAuthenticated();
        setShowAdminForm(false);
        setAdminAlert(null);
        setAdminId('');
        setAdminPass('');
        navigate('/admin/dashboard');
    };

    // Aid Worker Registration Logic
    const handleWorkerRegister = (e) => {
        try {
            e.preventDefault();
            const existing = JSON.parse(localStorage.getItem('demo_aid_workers') || '[]');

            const prior = existing.find((w) => w.id === workerId);
            if (prior && prior.status !== 'rejected') {
                setWorkerAlert({
                    type: 'pending',
                    title: 'Registration error',
                    message: 'This ID is already in use.',
                });
                return;
            }

            const { valid, failed } = validateAidWorkerPassword(workerPass);
            if (!valid) {
                setWorkerAlert({
                    type: 'rejected',
                    title: 'Invalid password',
                    message: failed.join(' · '),
                });
                return;
            }

            const newWorker = {
                name: workerName,
                id: workerId,
                password: workerPass,
                status: 'pending',
                registeredAt: new Date().toISOString(),
            };

            const nextWorkers = prior
                ? existing.map((w) => (w.id === workerId ? newWorker : w))
                : [...existing, newWorker];
            localStorage.setItem('demo_aid_workers', JSON.stringify(nextWorkers));

            setWorkerAlert({
                type: 'success',
                title: 'Registration submitted',
                message: 'An administrator must approve your account before you can log in.',
            });
            setIsRegistering(false);
            setWorkerName('');
            setWorkerId('');
            setWorkerPass('');
        } catch (error) {
            console.error('Registration failed:', error);
            setWorkerAlert({
                type: 'rejected',
                title: 'Error',
                message: 'Failed to register. Please try again.',
            });
        }
    };

    // Aid Worker Login Logic (Role-Based Access)
    const handleWorkerLogin = (e) => {
        try {
            if (e) e.preventDefault();

            // Query Local DB
            const workers = JSON.parse(localStorage.getItem('demo_aid_workers') || '[]');
            const user = workers.find(w => w.id === workerId);

            if (!user) {
                setWorkerAlert({
                    type: 'rejected',
                    title: 'Login failed',
                    message: 'Account not found.',
                });
                return;
            }

            if (user.password !== workerPass) {
                setWorkerAlert({
                    type: 'rejected',
                    title: 'Login failed',
                    message: 'Invalid password.',
                });
                return;
            }

            if (user.status === 'rejected') {
                setWorkerAlert({
                    type: 'rejected',
                    title: 'Registration rejected',
                    message:
                        'Your aid worker registration was rejected by an administrator. You cannot access the portal with this account.',
                });
                return;
            }

            if (user.status === 'pending') {
                setWorkerAlert({
                    type: 'pending',
                    title: 'Pending approval',
                    message:
                        'Your registration is awaiting admin approval. You can log in after an administrator approves your account.',
                });
                return;
            }

            if (user.status === 'approved') {
                localStorage.setItem('walletAddress', `OFFICER-${user.id}`);
                navigate('/aid-worker/register');
                return;
            }

            setWorkerAlert({
                type: 'pending',
                title: 'Account not active',
                message: 'Your account is not active yet. Contact an administrator.',
            });
        } catch (error) {
            console.error('Login failed:', error);
            setWorkerAlert({
                type: 'rejected',
                title: 'Error',
                message: 'Login failed. Please try again.',
            });
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
                        buttonColor="bg-[#f59e0b] text-[#060d1f] hover:bg-[#fbbf24] shadow-[0_0_20px_rgba(245,158,11,0.25)]"
                        onEnter={() => {
                            setWorkerAlert(null);
                            setShowWorkerForm(true);
                        }}
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
                        buttonColor="bg-[#8b5cf6] text-white hover:bg-[#7c3aed] shadow-[0_0_20px_rgba(139,92,246,0.25)]"
                        onEnter={() => {
                            setAdminAlert(null);
                            setShowAdminForm(true);
                        }}
                    />
                </div>
            </div>

            {/* Aid Worker Login Form — portaled so alerts stack above backdrop */}
            {showWorkerForm && (
                <Portal>
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#000000dd] backdrop-blur-sm px-6">
                    <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-fadeSlideUp relative">
                        <h3 className="text-[#e2eaf8] text-xl font-bold mb-4 text-center">
                            {isRegistering ? 'Register New Staff' : 'Aid Worker Login'}
                        </h3>

                        {workerAlert && (
                            <div
                                className={`mb-4 rounded-lg border px-4 py-3 text-left ${
                                    workerAlert.type === 'rejected'
                                        ? 'bg-[#ef444412] border-[#ef444440] text-[#fca5a5]'
                                        : workerAlert.type === 'success'
                                          ? 'bg-[#10b98112] border-[#10b98140] text-[#6ee7b7]'
                                          : 'bg-[#f59e0b12] border-[#f59e0b40] text-[#fcd34d]'
                                }`}
                            >
                                <p className="text-sm font-bold text-[#e2eaf8]">{workerAlert.title}</p>
                                <p className="text-xs mt-1 opacity-90">{workerAlert.message}</p>
                            </div>
                        )}

                        <div className="space-y-4 mb-6">
                            {isRegistering && (
                                <input
                                    placeholder="Full Name"
                                    className="w-full bg-[#060d1f] border border-[#1a2d4a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#00c9b1]"
                                    value={workerName} onChange={e => setWorkerName(e.target.value)}
                                />
                            )}
                            <input
                                placeholder="Official ID (e.g. officer01)"
                                className="w-full bg-[#060d1f] border border-[#1a2d4a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#00c9b1]"
                                value={workerId} onChange={e => setWorkerId(e.target.value)}
                            />
                            <div className="space-y-1.5">
                                <input
                                    type="password"
                                    placeholder="Password"
                                    autoComplete={isRegistering ? 'new-password' : 'current-password'}
                                    className="w-full bg-[#060d1f] border border-[#1a2d4a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#00c9b1]"
                                    value={workerPass}
                                    onChange={(e) => setWorkerPass(e.target.value)}
                                />
                                {isRegistering && (
                                    <ul className="text-[10px] leading-snug space-y-0.5 px-1">
                                        {passwordChecklist.map((item) => (
                                            <li
                                                key={item.id}
                                                className={item.met ? 'text-[#00c9b1]' : 'text-[#7a94bb]'}
                                            >
                                                {item.met ? '✓' : '○'} {item.label}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={isRegistering ? handleWorkerRegister : handleWorkerLogin}
                                disabled={isRegistering && !passwordValid}
                                className="w-full bg-[#00c9b1] text-[#060d1f] font-bold py-3 rounded-xl hover:bg-[#00e0c5] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isRegistering ? 'SUBMIT REGISTRATION' : 'LOGIN'}
                            </button>
                            <button
                                onClick={() => {
                                    setIsRegistering(!isRegistering);
                                    setWorkerAlert(null);
                                }}
                                className="text-[#7a94bb] text-xs font-bold uppercase tracking-widest hover:text-white"
                            >
                                {isRegistering ? 'Switch to Login' : 'Register New Account'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowWorkerForm(false);
                                    setWorkerAlert(null);
                                }}
                                className="w-full py-3 bg-[#152342] text-white font-bold rounded-xl border border-[#1a2d4a] hover:bg-[#1a2d4a] transition-all mt-2"
                            >
                                CANCEL
                            </button>
                        </div>
                    </div>
                </div>
                </Portal>
            )}

            {/* Admin Login Form — portaled; only admin / 123456789 */}
            {showAdminForm && (
                <Portal>
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#000000dd] backdrop-blur-sm px-6">
                    <div className="bg-[#0f1e38] border border-[#8b5cf640] rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-fadeSlideUp relative">
                        <h3 className="text-[#e2eaf8] text-xl font-bold mb-4 text-center">Admin Login</h3>

                        {adminAlert && (
                            <div className="mb-4 rounded-lg border px-4 py-3 text-left bg-[#ef444412] border-[#ef444440] text-[#fca5a5]">
                                <p className="text-sm font-bold text-[#e2eaf8]">{adminAlert.title}</p>
                                <p className="text-xs mt-1 opacity-90">{adminAlert.message}</p>
                            </div>
                        )}

                        <form onSubmit={handleAdminLogin} className="space-y-4 mb-6">
                            <input
                                placeholder="User ID"
                                autoComplete="username"
                                className="w-full bg-[#060d1f] border border-[#1a2d4a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#8b5cf6]"
                                value={adminId}
                                onChange={(e) => setAdminId(e.target.value)}
                            />
                            <input
                                type="password"
                                placeholder="Password"
                                autoComplete="current-password"
                                className="w-full bg-[#060d1f] border border-[#1a2d4a] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#8b5cf6]"
                                value={adminPass}
                                onChange={(e) => setAdminPass(e.target.value)}
                            />
                            <button
                                type="submit"
                                className="w-full bg-[#8b5cf6] text-white font-bold py-3 rounded-xl hover:bg-[#7c3aed] transition-all"
                            >
                                LOGIN
                            </button>
                        </form>

                        <button
                            type="button"
                            onClick={() => {
                                setShowAdminForm(false);
                                setAdminAlert(null);
                            }}
                            className="w-full py-3 bg-[#152342] text-white font-bold rounded-xl border border-[#1a2d4a] hover:bg-[#1a2d4a] transition-all"
                        >
                            CANCEL
                        </button>
                    </div>
                </div>
                </Portal>
            )}

            {/* Refugee Login Form — portaled so toasts stack above backdrop */}
            {showRefugeeForm && (
                <Portal>
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#000000dd] backdrop-blur-sm px-6">
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
                </Portal>
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
