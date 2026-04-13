import React, { useState, useEffect } from 'react';
import {
    Check, Camera, Smartphone, QrCode, User,
    Trash2, Plus, Info, Lock, Loader2, Printer, Shield
} from 'lucide-react';
import { clsx } from 'clsx';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/ui/Common';
import { QRCodeSVG } from 'qrcode.react';
import Webcam from "react-webcam";

// --- Form Components ---

const Input = ({ label, ...props }) => (
    <div className="w-full">
        <label className="block text-[#7a94bb] text-xs font-medium uppercase tracking-widest mb-2">{label}</label>
        <input
            className="w-full bg-[#060d1f] border border-[#1a2d4a] rounded-lg px-4 py-3 text-[#e2eaf8] text-sm focus:outline-none focus:border-[#00c9b1] focus:ring-1 focus:ring-[#00c9b120] placeholder-[#3d5278] transition-all duration-200"
            {...props}
        />
    </div>
);

const Select = ({ label, options, ...props }) => (
    <div className="w-full">
        <label className="block text-[#7a94bb] text-xs font-medium uppercase tracking-widest mb-2">{label}</label>
        <select
            className="w-full bg-[#060d1f] border border-[#1a2d4a] rounded-lg px-4 py-3 text-[#e2eaf8] text-sm focus:outline-none focus:border-[#00c9b1] cursor-pointer appearance-none transition-all duration-200"
            {...props}
        >
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);

// --- Registration Page ---

const Register = () => {
    const { showToast } = useToast();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        fullName: '',
        dob: '',
        nationality: 'Syrian',
        campId: '',
        languages: [],
        familyMembers: [],
        livenessVerified: false,
        walletType: null, // 'pera' | 'custodial'
        walletAddress: '',
    });

    const [currentLang, setCurrentLang] = useState('');
    const [isLivenessChecking, setIsLivenessChecking] = useState(false);
    const [livenessStage, setLivenessStage] = useState(0); // 0: idle, 1: detecting, 2: blink, 3: head turn, 4: complete
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStage, setSubmitStage] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);

    // Liveness simulation
    const startLiveness = () => {
        setIsLivenessChecking(true);
        setLivenessStage(1);

        setTimeout(() => setLivenessStage(2), 1000);
        setTimeout(() => setLivenessStage(3), 2000);
        setTimeout(() => {
            setLivenessStage(4);
            setFormData(prev => ({ ...prev, livenessVerified: true }));
            setIsLivenessChecking(false);
            showToast('success', 'Liveness Verified', 'Biometric liveness detection successful.');
        }, 3000);
    };

    const handleRegister = () => {
        setIsSubmitting(true);
        setSubmitStage(1);

        setTimeout(() => setSubmitStage(2), 600);
        setTimeout(() => setSubmitStage(3), 900);
        setTimeout(() => setSubmitStage(4), 1200);
        setTimeout(() => setSubmitStage(5), 2000);
        setTimeout(() => {
            setSubmitStage(6);
            setTimeout(() => {
                setShowSuccess(true);
                setIsSubmitting(false);
                showToast('success', 'Registration Complete', 'Refugee identity has been permanently recorded.');
            }, 500);
        }, 3000);
    };

    const addLanguage = (e) => {
        if (e.key === 'Enter' && currentLang.trim()) {
            e.preventDefault();
            if (!formData.languages.includes(currentLang.trim())) {
                setFormData(prev => ({ ...prev, languages: [...prev.languages, currentLang.trim()] }));
            }
            setCurrentLang('');
        }
    };

    const addFamilyMember = () => {
        setFormData(prev => ({
            ...prev,
            familyMembers: [...prev.familyMembers, { name: '', relationship: 'Spouse' }]
        }));
    };

    const nextStep = () => setStep(prev => prev + 1);
    const prevStep = () => setStep(prev => prev - 1);

    // --- Step Indicator ---
    const steps = ["Personal Info", "Liveness Check", "Wallet Setup", "Review & Submit"];

    return (
        <div className="page-enter pb-20">
            {/* Step Indicator */}
            <div className="bg-[#0a1428] border border-[#1a2d4a] rounded-2xl px-12 py-8 mb-8">
                <div className="flex items-center justify-between relative">
                    <div className="absolute top-4 left-0 right-0 h-0.5 bg-[#1a2d4a] z-0" />
                    {steps.map((s, i) => {
                        const num = i + 1;
                        const isCompleted = step > num || showSuccess;
                        const isActive = step === num && !showSuccess;
                        return (
                            <div key={s} className="relative z-10 flex flex-col items-center gap-3">
                                <div className={clsx(
                                    "w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                                    isCompleted ? "bg-[#00c9b1] border-[#00c9b1] text-[#060d1f]" :
                                        isActive ? "bg-[#060d1f] border-[#00c9b1] text-[#00c9b1]" :
                                            "bg-[#152342] border-[#1a2d4a] text-[#3d5278]"
                                )}>
                                    {isCompleted ? <Check size={18} strokeWidth={3} /> : <span className="text-xs font-bold">{num}</span>}
                                </div>
                                <span className={clsx(
                                    "text-[10px] uppercase font-bold tracking-widest",
                                    isActive || isCompleted ? "text-[#e2eaf8]" : "text-[#3d5278]"
                                )}>{s}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="max-w-2xl mx-auto">
                {step === 1 && (
                    <div className="space-y-8 animate-fadeIn">
                        <div className="grid grid-cols-2 gap-6">
                            <Input label="Full Name" placeholder="e.g. Ahmad Saadi" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} />
                            <Input label="Date of Birth" type="date" value={formData.dob} onChange={e => setFormData({ ...formData, dob: e.target.value })} />
                            <Select label="Nationality" options={['Syrian', 'Afghan', 'South Sudanese', 'Myanmar', 'Somali', 'Ukrainian', 'Ethiopian', 'Congolese', 'Sudanese', 'Venezuelan', 'Other']} value={formData.nationality} onChange={e => setFormData({ ...formData, nationality: e.target.value })} />
                            <Input label="Camp ID" placeholder="e.g. CAMP-01" value={formData.campId} onChange={e => setFormData({ ...formData, campId: e.target.value })} />
                        </div>

                        <div>
                            <label className="block text-[#7a94bb] text-xs font-medium uppercase tracking-widest mb-2">Languages Spoken</label>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {formData.languages.map(lang => (
                                    <span key={lang} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#00c9b120] text-[#00c9b1] border border-[#00c9b140]">
                                        {lang}
                                        <button onClick={() => setFormData(prev => ({ ...prev, languages: prev.languages.filter(l => l !== lang) }))}><Check size={12} /></button>
                                    </span>
                                ))}
                            </div>
                            <input
                                className="w-full bg-[#060d1f] border border-[#1a2d4a] rounded-lg px-4 py-3 text-[#e2eaf8] text-sm focus:outline-none focus:border-[#00c9b1] placeholder-[#3d5278]"
                                placeholder="Type and press Enter to add..."
                                value={currentLang}
                                onChange={e => setCurrentLang(e.target.value)}
                                onKeyDown={addLanguage}
                            />
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="block text-[#7a94bb] text-xs font-medium uppercase tracking-widest">Family Members</label>
                                <button onClick={addFamilyMember} className="text-[#00c9b1] text-xs font-bold flex items-center gap-1 hover:underline">
                                    <Plus size={14} /> ADD MEMBER
                                </button>
                            </div>
                            {formData.familyMembers.length === 0 && (
                                <div className="text-center py-6 border-2 border-dashed border-[#1a2d4a] rounded-xl text-[#3d5278] text-sm italic">
                                    No family members added
                                </div>
                            )}
                            {formData.familyMembers.map((member, idx) => (
                                <div key={idx} className="flex gap-3 animate-[fadeSlideUp_0.3s_ease-out]">
                                    <div className="flex-1">
                                        <input
                                            placeholder="Name"
                                            className="w-full bg-[#060d1f] border border-[#1a2d4a] rounded-lg px-4 py-2 text-[#e2eaf8] text-sm"
                                            value={member.name}
                                            onChange={e => {
                                                const newMembers = [...formData.familyMembers];
                                                newMembers[idx].name = e.target.value;
                                                setFormData({ ...formData, familyMembers: newMembers });
                                            }}
                                        />
                                    </div>
                                    <div className="w-40">
                                        <select
                                            className="w-full bg-[#060d1f] border border-[#1a2d4a] rounded-lg px-4 py-2 text-[#e2eaf8] text-sm"
                                            value={member.relationship}
                                            onChange={e => {
                                                const newMembers = [...formData.familyMembers];
                                                newMembers[idx].relationship = e.target.value;
                                                setFormData({ ...formData, familyMembers: newMembers });
                                            }}
                                        >
                                            <option>Spouse</option>
                                            <option>Son</option>
                                            <option>Daughter</option>
                                            <option>Parent</option>
                                            <option>Sibling</option>
                                        </select>
                                    </div>
                                    <button
                                        onClick={() => setFormData(prev => ({ ...prev, familyMembers: prev.familyMembers.filter((_, i) => i !== idx) }))}
                                        className="p-2 text-[#ef4444] hover:bg-[#ef444410] rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={nextStep}
                            disabled={!formData.fullName || !formData.dob}
                            className="bg-[#00c9b1] text-[#060d1f] font-bold py-4 px-6 rounded-lg hover:bg-[#00e0c5] active:scale-95 transition-all w-full disabled:opacity-40"
                        >
                            NEXT STEP: LIVENESS CHECK
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-8 animate-fadeIn">
                        <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-10 flex flex-col items-center">
                            <div className={clsx(
                                "w-full aspect-video rounded-xl border-2 relative overflow-hidden flex flex-col items-center justify-center transition-all duration-500",
                                livenessStage === 4 ? "border-[#10b981] bg-[#10b98105]" :
                                    isLivenessChecking ? "border-[#00c9b1] bg-[#00c9b105]" : "border-[#1a2d4a] bg-[#060d1f]"
                            )}>
                                {livenessStage === 0 && (
                                    <div className="w-full h-full relative overflow-hidden rounded-xl">
                                        <Webcam
                                            audio={false}
                                            className="w-full h-full object-cover opacity-60 grayscale"
                                        />
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
                                            <Camera size={48} className="text-white mb-2 drop-shadow-lg" />
                                            <p className="text-white font-bold text-[10px] uppercase tracking-widest bg-black/60 px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
                                                Ready for Liveness Scan
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {isLivenessChecking && (
                                    <>
                                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#00c9b1] shadow-[0_0_10px_#00c9b1] animate-scanLine z-20" />
                                        <div className="text-center space-y-2 z-10">
                                            <div className="flex items-center justify-center gap-2 text-[#00c9b1] font-mono text-xs animate-pulse">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#00c9b1]" />
                                                {livenessStage === 1 && "DETECTING FACE..."}
                                                {livenessStage === 2 && "BLINK DETECTED"}
                                                {livenessStage === 3 && "HEAD TURN VERIFIED"}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {livenessStage === 4 && (
                                    <div className="flex flex-col items-center animate-bounce">
                                        <div className="w-20 h-20 bg-[#10b98120] rounded-full flex items-center justify-center mb-4">
                                            <Check size={48} className="text-[#10b981]" />
                                        </div>
                                        <span className="text-[#10b981] font-bold text-lg tracking-widest uppercase">Liveness Verified</span>
                                    </div>
                                )}
                            </div>

                            {!isLivenessChecking && livenessStage === 0 && (
                                <button
                                    onClick={startLiveness}
                                    className="mt-8 bg-[#f59e0b] text-[#060d1f] font-bold py-3 px-10 rounded-lg hover:bg-[#ffb533] active:scale-95 transition-all"
                                >
                                    START LIVENESS CHECK
                                </button>
                            )}

                            {livenessStage === 4 && (
                                <div className="w-full mt-8 p-4 bg-[#060d1f] border border-[#1a2d4a] rounded-xl">
                                    <label className="block text-[#7a94bb] text-[10px] font-bold uppercase tracking-widest mb-2">Personhood Hash</label>
                                    <div className="font-mono text-[#00c9b1] text-xs break-all leading-relaxed">
                                        b7e2d5f0c8a1345678901234567890ab8291...
                                    </div>
                                </div>
                            )}

                            <p className="mt-8 text-[11px] text-[#3d5278] text-center leading-relaxed">
                                Liveness detection ensures a physical person is present and prevents fake mass registrations. Camera data is processed locally; only a cryptographic hash is stored.
                            </p>
                        </div>

                        <div className="flex gap-4">
                            <button onClick={prevStep} className="flex-1 border border-[#1a2d4a] text-[#e2eaf8] font-bold py-4 px-6 rounded-lg hover:border-[#3d5278] transition-all">← BACK</button>
                            <button onClick={nextStep} disabled={!formData.livenessVerified} className="flex-[2] bg-[#00c9b1] text-[#060d1f] font-bold py-4 px-6 rounded-lg hover:bg-[#00e0c5] active:scale-95 transition-all disabled:opacity-40">NEXT: WALLET SETUP</button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-8 animate-fadeIn">
                        <div className="grid grid-cols-2 gap-4">
                            <div
                                onClick={() => setFormData({ ...formData, walletType: 'pera', walletAddress: 'PERA7J3KLMN8QRS2TUVA4WXY5ZAB6CDSPUB' })}
                                className={clsx(
                                    "bg-[#0f1e38] border p-6 rounded-xl cursor-pointer transition-all duration-300 flex flex-col items-center text-center",
                                    formData.walletType === 'pera' ? "border-[#00c9b1] shadow-[0_0_20px_rgba(0,201,177,0.1)]" : "border-[#1a2d4a] hover:border-[#3d5278]"
                                )}
                            >
                                <div className="w-12 h-12 bg-[#3b82f620] text-[#3b82f6] rounded-full flex items-center justify-center mb-4">
                                    <Smartphone size={24} />
                                </div>
                                <h3 className="text-white font-bold mb-2">Has Smartphone</h3>
                                <p className="text-[#7a94bb] text-[11px]">Refugee installs Pera Wallet and controls their own digital identity.</p>
                                {formData.walletType === 'pera' && <Check className="text-[#00c9b1] mt-4" size={20} />}
                            </div>

                            <div
                                onClick={() => setFormData({ ...formData, walletType: 'custodial', walletAddress: 'CUST9K4LMNO5PQRT6UVWX7YZA8BCDE1F2GH' })}
                                className={clsx(
                                    "bg-[#0f1e38] border p-6 rounded-xl cursor-pointer transition-all duration-300 flex flex-col items-center text-center",
                                    formData.walletType === 'custodial' ? "border-[#f59e0b] shadow-[0_0_20px_rgba(245,158,11,0.1)]" : "border-[#1a2d4a] hover:border-[#3d5278]"
                                )}
                            >
                                <div className="w-12 h-12 bg-[#f59e0b20] text-[#f59e0b] rounded-full flex items-center justify-center mb-4">
                                    <QrCode size={24} />
                                </div>
                                <h3 className="text-white font-bold mb-2">No Smartphone</h3>
                                <p className="text-[#7a94bb] text-[11px]">System generates custodial wallet. Refugee receives a printed QR card.</p>
                                {formData.walletType === 'custodial' && <Check className="text-[#f59e0b] mt-4" size={20} />}
                            </div>
                        </div>

                        {formData.walletType && (
                            <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-xl p-6 animate-fadeSlideUp">
                                <label className="block text-[#7a94bb] text-[10px] font-bold uppercase tracking-widest mb-3">Linked Wallet Address</label>
                                <div className="bg-[#060d1f] p-4 rounded-lg flex items-center justify-between border border-[#1a2d4a]">
                                    <span className="font-mono text-[#00c9b1] text-xs truncate mr-4">{formData.walletAddress}</span>
                                    <div className="px-2 py-0.5 rounded bg-[#10b98120] text-[#10b981] text-[10px] font-bold border border-[#10b98130]">READY</div>
                                </div>
                                <p className="mt-4 text-[11px] text-[#3d5278] leading-relaxed italic">
                                    {formData.walletType === 'pera' ? "The refugee's device has been verified and linked." : "A secure custodial account has been provisioned on the blockchain."}
                                </p>
                            </div>
                        )}

                        <div className="flex gap-4">
                            <button onClick={prevStep} className="flex-1 border border-[#1a2d4a] text-[#e2eaf8] font-bold py-4 px-6 rounded-lg hover:border-[#3d5278] transition-all">← BACK</button>
                            <button onClick={nextStep} disabled={!formData.walletType} className="flex-[2] bg-[#00c9b1] text-[#060d1f] font-bold py-4 px-6 rounded-lg hover:bg-[#00e0c5] active:scale-95 transition-all disabled:opacity-40">REVIEW REGISTRATION</button>
                        </div>
                    </div>
                )}

                {step === 4 && !showSuccess && (
                    <div className="space-y-8 animate-fadeIn">
                        <div className="grid md:grid-cols-5 gap-8">
                            <div className="md:col-span-3 space-y-6">
                                <h3 className="text-[#e2eaf8] font-bold text-lg">Registration Summary</h3>
                                <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-xl overflow-hidden">
                                    {[
                                        { label: 'Full Name', value: formData.fullName },
                                        { label: 'DOB', value: formData.dob },
                                        { label: 'Nationality', value: formData.nationality },
                                        { label: 'Camp ID', value: formData.campId || 'Not set' },
                                        { label: 'Languages', value: formData.languages.join(', ') || 'None' },
                                        { label: 'Family Members', value: `${formData.familyMembers.length} member(s)` },
                                    ].map((row, i) => (
                                        <div key={i} className="flex justify-between items-center py-4 px-6 border-b border-[#1a2d4a] last:border-0 hover:bg-[#152342] transition-colors">
                                            <span className="text-[#7a94bb] text-xs font-bold uppercase tracking-wider">{row.label}</span>
                                            <span className="text-[#e2eaf8] text-sm font-semibold">{row.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="md:col-span-2 space-y-6">
                                <div className="bg-[#00c9b105] border border-[#00c9b120] rounded-xl p-6">
                                    <div className="flex items-center gap-3 text-[#00c9b1] mb-4">
                                        <Info size={20} />
                                        <h4 className="font-bold text-sm uppercase tracking-wide">Identity Creation</h4>
                                    </div>
                                    <p className="text-[#7a94bb] text-xs leading-relaxed mb-4">
                                        A unique wallet address will be permanently linked. Cryptographic hashes will be recorded on the Algorand blockchain.
                                    </p>
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#00c9b110] border border-[#00c9b120]">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                                        <span className="text-[#00c9b1] font-mono text-[10px] uppercase font-bold">Liveness Verified</span>
                                    </div>
                                </div>

                                <div className="bg-[#f59e0b05] border border-[#f59e0b20] rounded-xl p-6">
                                    <div className="flex items-center gap-3 text-[#f59e0b] mb-4">
                                        <Lock size={20} />
                                        <h4 className="font-bold text-sm uppercase tracking-wide">Data Privacy</h4>
                                    </div>
                                    <p className="text-[#7a94bb] text-xs leading-relaxed">
                                        Personal data is encrypted and stored securely. No identifiers are exposed publicly on the blockchain.
                                    </p>
                                </div>

                                <button
                                    onClick={handleRegister}
                                    className="w-full bg-[#00c9b1] text-[#060d1f] font-bold py-4 px-6 rounded-lg hover:bg-[#00e0c5] shadow-[0_0_30px_rgba(0,201,177,0.2)] active:scale-95 transition-all text-sm tracking-widest uppercase"
                                >
                                    REGISTER IDENTITY
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button onClick={prevStep} className="border border-[#1a2d4a] text-[#7a94bb] px-6 rounded-lg hover:border-[#3d5278] transition-all">← BACK</button>
                        </div>
                    </div>
                )}

                {/* Processing Modal */}
                {isSubmitting && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000bb] backdrop-blur-sm px-6">
                        <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-10 max-w-sm w-full shadow-2xl animate-fadeSlideUp">
                            <div className="flex flex-col items-center text-center">
                                <LoadingSpinner size="lg" className="mb-6" />
                                <h3 className="text-[#e2eaf8] text-xl font-bold mb-8">Processing Registration</h3>

                                <div className="w-full space-y-4">
                                    {[
                                        { label: 'Validating form data', done: submitStage >= 1 },
                                        { label: 'Generating identity hashes', done: submitStage >= 2, extra: 'a3f8c...4321' },
                                        { label: 'Liveness verification confirmed', done: submitStage >= 3 },
                                        { label: 'Linking wallet address', done: submitStage >= 4, extra: 'PERA7...SPUB' },
                                        { label: 'Writing to Algorand blockchain', done: submitStage >= 5, extra: 'Block #4521893' },
                                        { label: 'Registration complete ✓', done: submitStage >= 6 },
                                    ].map((s, i) => (
                                        <div key={i} className="flex items-center justify-between text-left">
                                            <div className="flex items-center gap-3">
                                                {s.done ? <Check size={14} className="text-[#00c9b1]" /> : <div className="w-3.5 h-3.5 rounded-full border border-[#1a2d4a] animate-pulse" />}
                                                <span className={clsx("text-xs font-medium", s.done ? "text-[#e2eaf8]" : "text-[#3d5278]")}>{s.label}</span>
                                            </div>
                                            {s.done && s.extra && <span className="font-mono text-[9px] text-[#00c9b1]/60">{s.extra}</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Success State */}
                {showSuccess && (
                    <div className="animate-fadeIn pb-12">
                        <div className="flex flex-col items-center text-center max-w-lg mx-auto py-12">
                            <div className="w-24 h-24 bg-[#00c9b110] rounded-full flex items-center justify-center mb-6 animate-[bounce_1s_infinite]">
                                <Check size={64} className="text-[#00c9b1]" strokeWidth={3} />
                            </div>
                            <h2 className="text-[#00c9b1] text-4xl font-bold mb-4">Registration Successful</h2>
                            <p className="text-[#7a94bb] mb-12">The digital identity has been permanently secured on the blockchain network.</p>

                            <div className="font-mono text-[#e2eaf8] text-2xl font-bold tracking-[0.2em] mb-12 p-4 bg-[#152342] rounded-xl border border-[#1a2d4a]">
                                REF-2024-004
                            </div>

                            {/* QR Card Preview */}
                            <div id="print-card" className="bg-white text-gray-800 rounded-2xl p-8 w-full max-w-sm shadow-2xl relative overflow-hidden text-left mb-12">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-2">
                                        <Shield size={20} className="text-[#060d1f]" />
                                        <span className="font-mono text-[10px] font-bold tracking-tighter text-gray-500 uppercase">RIMS • ALGORAND</span>
                                    </div>
                                    <div className="bg-[#10b981] text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase">Active</div>
                                </div>

                                <div className="flex gap-6 mb-6">
                                    <div className="w-24 h-24 bg-gray-50 border border-gray-100 rounded-lg p-2 shrink-0">
                                        <QRCodeSVG
                                            value={JSON.stringify({ id: "REF-2024-004", name: formData.fullName, address: formData.walletAddress })}
                                            size={100}
                                            level={"H"}
                                            className="w-full h-full"
                                        />
                                    </div>
                                    <div className="flex-1 space-y-4">
                                        <div>
                                            <label className="block text-[9px] text-gray-400 font-bold uppercase tracking-widest border-l border-gray-100 pl-2">Full Name</label>
                                            <span className="block text-sm font-bold ml-2">{formData.fullName}</span>
                                        </div>
                                        <div>
                                            <label className="block text-[9px] text-gray-400 font-bold uppercase tracking-widest border-l border-gray-100 pl-2">Refugee ID</label>
                                            <span className="block text-xs font-mono font-bold text-gray-600 ml-2">REF-2024-004</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-8">
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <label className="block text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1">Blockchain Wallet</label>
                                        <span className="block text-[10px] font-mono text-[#0a7560] break-all leading-tight">{formData.walletAddress}</span>
                                    </div>
                                    <div className="flex justify-between px-1">
                                        <span className="text-[9px] text-gray-400 font-medium italic">Registered: Feb 12, 2024 14:22 GMT</span>
                                        <span className="text-[9px] text-gray-400 font-medium">Camp: {formData.campId || 'CAMP-01'}</span>
                                    </div>
                                </div>

                                <div className="bg-red-600 text-white p-2 rounded-lg text-center font-bold text-[9px] tracking-widest uppercase">
                                    ⚠ KEEP SECURE • NEVER SHARE
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 w-full">
                                <button
                                    onClick={() => window.print()}
                                    className="flex items-center justify-center gap-2 border border-[#1a2d4a] text-[#e2eaf8] font-bold py-4 rounded-xl hover:bg-[#152342] transition-all"
                                >
                                    <Printer size={18} /> PRINT QR CARD
                                </button>
                                <button
                                    onClick={() => {
                                        setStep(1);
                                        setShowSuccess(false);
                                        setFormData({
                                            fullName: '',
                                            dob: '',
                                            nationality: 'Syrian',
                                            campId: '',
                                            languages: [],
                                            familyMembers: [],
                                            livenessVerified: false,
                                            walletType: null,
                                            walletAddress: '',
                                        });
                                    }}
                                    className="bg-[#00c9b1] text-[#060d1f] font-bold py-4 rounded-xl hover:bg-[#00e0c5] transition-all"
                                >
                                    REGISTER ANOTHER
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Register;