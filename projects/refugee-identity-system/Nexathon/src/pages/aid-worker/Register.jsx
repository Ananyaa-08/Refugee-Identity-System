import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Check, Camera, Smartphone, QrCode, User,
    Trash2, Plus, Info, Lock, Loader2, Printer, Shield, ArrowRight, ArrowLeft, Eye
} from 'lucide-react';
import { clsx } from 'clsx';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/ui/Common';
import { QRCodeSVG } from 'qrcode.react';
import Webcam from "react-webcam";
<<<<<<< HEAD
import algosdk from 'algosdk';
import CryptoJS from 'crypto-js';
import { RefugeeContractClient } from '../../contracts/RefugeeContractClient';
import { REFUGEE_APP_ID, ALGOD_SERVER, ALGOD_PORT, ALGOD_TOKEN } from '../../contracts/config';
import { useWallet } from '../../context/WalletContext';
=======
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
>>>>>>> 0bf851bc2aefa0f3ec991621755503e19b34e9b9
import { api } from '../../utils/api';

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

// --- Liveness Constants & Helpers ---

const LIVENESS_CHALLENGES = [
    { id: 1, type: 'blink', instruction: 'Blink your eyes naturally' },
    { id: 2, type: 'turnLeft', instruction: 'Turn your head to the LEFT' },
    { id: 3, type: 'blink', instruction: 'Blink your eyes naturally' },
    { id: 4, type: 'turnRight', instruction: 'Turn your head to the RIGHT' },
    { id: 5, type: 'blink', instruction: 'Final blink to confirm' }
];

const calculateDistance = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

const calculateEAR = (landmarks) => {
    // left eye: 159, 145 (vert) & 33, 133 (horiz)
    const leftV = calculateDistance(landmarks[159], landmarks[145]);
    const leftH = calculateDistance(landmarks[33], landmarks[133]);
    const leftEAR = leftV / leftH;

    // right eye: 386, 374 (vert) & 362, 263 (horiz)
    const rightV = calculateDistance(landmarks[386], landmarks[374]);
    const rightH = calculateDistance(landmarks[362], landmarks[263]);
    const rightEAR = rightV / rightH;

    return (leftEAR + rightEAR) / 2.0;
};



async function generateSHA256Hash(imageData) {
    const crypto = window.crypto || window.msCrypto;
    if (!crypto || !crypto.subtle) return "fallback_hash_" + Date.now();
    const hashBuffer = await crypto.subtle.digest('SHA-256', imageData.data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}


// --- Registration Page ---

const Register = () => {
    const { account, signTransactions, connectWallet } = useWallet();
    const { showToast } = useToast();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStage, setSubmitStage] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);
    const [currentLang, setCurrentLang] = useState('');
    const [isLivenessChecking, setIsLivenessChecking] = useState(false);
    const [livenessStage, setLivenessStage] = useState(0);

    const [formData, setFormData] = useState({
        fullName: '',
        dob: '',
        nationality: 'Syrian',
        campId: '',
        languages: [],
        familyMembers: [],
        livenessVerified: false,
<<<<<<< HEAD
        walletType: null,
        walletAddress: '',
    });

    const startLiveness = () => {
        setIsLivenessChecking(true);
        setLivenessStage(1);
        setTimeout(() => setLivenessStage(2), 1500);
        setTimeout(() => setLivenessStage(3), 3000);
        setTimeout(() => {
            setLivenessStage(4);
            setIsLivenessChecking(false);
            setFormData(prev => ({ ...prev, livenessVerified: true }));
        }, 4500);
=======
        walletType: null, 
        walletAddress: '',
    });

    const [custodial, setCustodial] = useState({
        identityId: '',
        qrPayload: '',
        isProvisioning: false,
    });

    const [currentLang, setCurrentLang] = useState('');
    
    // Liveness State
    const [isLivenessChecking, setIsLivenessChecking] = useState(false);
    const [currentChallenge, setCurrentChallenge] = useState(0);
    const [challengeStatus, setChallengeStatus] = useState('idle'); // idle, loading, detecting, success, failed, complete
    const [capturedFrames, setCapturedFrames] = useState([]);
    const [livenessHash, setLivenessHash] = useState(null);
    const [feedback, setFeedback] = useState('Loading Models...');
    const [confidence, setConfidence] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);

    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const faceLandmarkerRef = useRef(null);
    const requestRef = useRef(null);
    
    // Refs for real-time tracking in loops without stale closures
    const stateRef = useRef({
        challengeIndex: 0,
        status: 'idle',
        blinkStart: 0,
        isEyesClosed: false,
        initialNoseX: null,
        isTransitioning: false,
        challengeStartTime: 0,
        sequenceStart: 0,
        frames: [],
        confidenceScores: [],
        challengesCompleted: []
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStage, setSubmitStage] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);

    // Initialize FaceLandmarker
    useEffect(() => {
        let isMounted = true;
        const initializeModels = async () => {
            try {
                const filesetResolver = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
                );
                
                faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(filesetResolver, {
                    baseOptions: {
                        modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                        delegate: "GPU"
                    },
                    outputFaceBlendshapes: true,
                    runningMode: "VIDEO",
                    numFaces: 1
                });
                
                if (isMounted) setFeedback('Ready. Center your face and start.');
            } catch (err) {
                console.error(err);
                if (isMounted) setFeedback('Error loading face detection models.');
            }
        };

        if (step === 2) {
            initializeModels();
        }

        return () => {
            isMounted = false;
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            if (faceLandmarkerRef.current) faceLandmarkerRef.current.close();
        };
    }, [step]);

    const captureAndHashFrame = async (challengeKey) => {
        const crypto = window.crypto || window.msCrypto;
        const dataStr = JSON.stringify({
            stage: challengeKey,
            timestamp: Date.now(),
            uuid: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36)
        });
        const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(dataStr));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        stateRef.current.frames.push({ stage: challengeKey, hash });
        setCapturedFrames([...stateRef.current.frames]);
    };

    const processFrame = async () => {
        if (!faceLandmarkerRef.current || !webcamRef.current || !webcamRef.current.video || stateRef.current.status !== 'detecting') {
            if (stateRef.current.status === 'detecting') {
                requestRef.current = requestAnimationFrame(processFrame);
            }
            return;
        }

        const video = webcamRef.current.video;
        if (video.readyState !== 4) {
            requestRef.current = requestAnimationFrame(processFrame);
            return;
        }

        if (stateRef.current.isTransitioning) {
            requestRef.current = requestAnimationFrame(processFrame);
            return;
        }

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let startTimeMs = performance.now();
        const results = faceLandmarkerRef.current.detectForVideo(video, startTimeMs);

        // Draw mesh and process rules
        if (results.faceLandmarks && results.faceLandmarks.length > 0) {
            const landmarks = results.faceLandmarks[0];
            setConfidence(100);

            // Draw Landmarks (dots only for non-intrusiveness)
            ctx.fillStyle = '#00c9b1';
            for (const lm of landmarks) {
                ctx.beginPath();
                ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 1, 0, 2 * Math.PI);
                ctx.fill();
            }

            // Challenge Evaluation Logic
            const challenge = LIVENESS_CHALLENGES[stateRef.current.challengeIndex];
            const now = Date.now();
            let timeElapsed = (now - stateRef.current.challengeStartTime) / 1000;
            setTimeLeft(Math.max(0, Math.ceil((challenge.type === 'blink' ? 10 : 15) - timeElapsed)));

            if (timeElapsed > (challenge.type === 'blink' ? 10 : 15)) {
                failChallenge("Timeout: Challenge not completed in time.");
                return;
            }

            if (challenge.type === 'blink') {
                const ear = calculateEAR(landmarks);
                if (ear < 0.20) {
                    if (!stateRef.current.isEyesClosed) {
                        stateRef.current.isEyesClosed = true;
                        setFeedback('Eyes closed... now open them.');
                    }
                } else if (ear > 0.20) {
                    if (stateRef.current.isEyesClosed) {
                        stateRef.current.isEyesClosed = false;
                        advanceChallenge(challenge.type);
                    } else {
                        setFeedback('Waiting for blink...');
                    }
                }
            } 
            else if (challenge.type === 'turnLeft' || challenge.type === 'turnRight') {
                const noseX = landmarks[1].x;
                const targetLeft = challenge.type === 'turnLeft';

                if (stateRef.current.initialNoseX === null) {
                    stateRef.current.initialNoseX = noseX;
                    setFeedback(`Turn head ${targetLeft ? 'left' : 'right'}...`);
                } else {
                    const diff = Math.abs(noseX - stateRef.current.initialNoseX);
                    if (diff > 0.06) {
                        advanceChallenge(challenge.type);
                    } else {
                        setFeedback(`Turn head ${targetLeft ? 'left' : 'right'}...`);
                    }
                }
            }
        } else {
            setConfidence(0);
            setFeedback('No face detected. Please center your face.');
        }

        if (stateRef.current.status === 'detecting') {
            requestRef.current = requestAnimationFrame(processFrame);
        }
    };

    const advanceChallenge = async (type) => {
        await captureAndHashFrame(type + '_success');
        
        stateRef.current.challengesCompleted.push(type);
        stateRef.current.confidenceScores.push(1.0);
        stateRef.current.isEyesClosed = false;
        stateRef.current.initialNoseX = null;
        
        if (stateRef.current.challengeIndex + 1 >= LIVENESS_CHALLENGES.length) {
            stateRef.current.challengeIndex += 1;
            completeLivenessCheck();
        } else {
            setChallengeStatus('success');
            stateRef.current.isTransitioning = true;
            setFeedback('Success! Next challenge starting...');
            
            setTimeout(() => {
                stateRef.current.challengeIndex += 1;
                setCurrentChallenge(stateRef.current.challengeIndex);
                stateRef.current.challengeStartTime = Date.now();
                stateRef.current.isTransitioning = false;
                setChallengeStatus('detecting');
                stateRef.current.status = 'detecting';
            }, 1500);
        }
    };

    const failChallenge = (msg) => {
        setChallengeStatus('failed');
        stateRef.current.status = 'failed';
        setFeedback(msg);
        showToast('error', 'Liveness Failed', msg);
    };

    const completeLivenessCheck = async () => {
        setChallengeStatus('complete');
        stateRef.current.status = 'complete';
        setIsLivenessChecking(false);
        setFeedback('Liveness Verified Successfully! Syncing...');
        
        // Generate Composite final hash
        const frameHashes = stateRef.current.frames.map(f => f.hash);
        const allHashesStr = frameHashes.join('');
        const compositeHash = await generateSHA256Hash({ data: new TextEncoder().encode(allHashesStr) });
        
        const timestamp = new Date().toISOString();
        const totalDuration = Date.now() - stateRef.current.sequenceStart;
        
        const livenessData = {
            timestamp,
            frameHashes,
            compositeHash,
            metadata: {
                challengesCompleted: stateRef.current.challengesCompleted,
                totalDuration,
                confidenceScores: stateRef.current.confidenceScores
            }
        };

        setLivenessHash(compositeHash);
        
        console.log("FINAL LIVENESS PAYLOAD FOR BACKEND:", JSON.stringify({ refugeeId: 'REF-TEMP', livenessData }, null, 2));

        let attempts = 0;
        let synced = false;
        while (attempts < 3 && !synced) {
            try {
                const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/refugee/liveness-hash`, {
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refugeeId: 'REF-TEMP', livenessData })
                });
                if (res.ok) {
                    synced = true;
                    setFormData(prev => ({ ...prev, livenessVerified: true }));
                    showToast('success', 'Liveness Verified', 'Biometric liveness detection successful.');
                    setFeedback('Liveness Verified Successfully!');
                } else {
                    throw new Error('Invalid response');
                }
            } catch (e) {
                attempts++;
                if (attempts >= 3) {
                    showToast('error', 'Sync Failed', 'Network error tracking hash. Please check connection.');
                    setFeedback('Network error. Hash stored locally.');
                    setFormData(prev => ({ ...prev, livenessVerified: true })); // Fail open for the prototype to proceed
                }
            }
        }
    };

    const startLiveness = async () => {
        if (!faceLandmarkerRef.current) {
            showToast('error', 'Not Ready', 'Face Detection models are still loading.');
            return;
        }
        
        await captureAndHashFrame('initial_face');
        
        setIsLivenessChecking(true);
        stateRef.current = {
            challengeIndex: 0,
            status: 'detecting',
            blinkStart: 0,
            isEyesClosed: false,
            initialNoseX: null,
            isTransitioning: false,
            challengeStartTime: Date.now(),
            sequenceStart: Date.now(),
            frames: [],
            confidenceScores: [],
            challengesCompleted: []
        };
        setCurrentChallenge(0);
        setChallengeStatus('detecting');
        setFeedback('Detecting face...');
        
        requestRef.current = requestAnimationFrame(processFrame);
>>>>>>> 0bf851bc2aefa0f3ec991621755503e19b34e9b9
    };

    const handleRegister = async () => {
        if (!account) {
            showToast('info', 'Wallet Required', 'Please connect your Pera Wallet first.');
            await connectWallet();
            return;
        }

        setIsSubmitting(true);
        setSubmitStage(1);

        try {
            // 1. Authorize current wallet as a registrar (via Backend/Admin)
            // This ensures the demo works regardless of which wallet you connect
            setSubmitStage(1);
            try {
                await api.addRegistrar(account);
            } catch (authErr) {
                console.warn("Authorization might have failed or already exist:", authErr);
                // Continue anyway, it might already be authorized
            }

            // 2. Generate Biometric DID & Hash
            setSubmitStage(2);
            const biometricData = formData.fullName + formData.dob + formData.nationality;
            const didHash = CryptoJS.SHA256(biometricData).toString();
            // Convert SHA256 hex string to Uint8Array for the contract
            const biometricBin = new Uint8Array(Buffer.from(didHash, 'hex'));
            
            // 3. Simulated IPFS CID
            setSubmitStage(3);
            const mockCid = "ba" + CryptoJS.MD5(didHash).toString();
            
            // 4. Initialize Contract Client
            setSubmitStage(4);
            const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);
            const appClient = new RefugeeContractClient({
                resolveBy: 'id',
                id: Number(REFUGEE_APP_ID),
                algod: algodClient,
            });

            // 5. Mandatory Opt-In for Refugee Account
            // Refugees must be opted-in to store local state on-chain
            const targetRefugee = formData.walletAddress || account;
            setSubmitStage(5);
            try {
                await appClient.optIn.bare({
                    sender: {
                        addr: targetRefugee,
                        signer: async (txnGroup, indexesToSign) => {
                            const txnsToSign = txnGroup.map((txn, i) => ({
                                txn,
                                signers: indexesToSign.includes(i) ? [targetRefugee] : [],
                            }));
                            const signed = await signTransactions([txnsToSign]);
                            return signed.map(s => s.blob);
                        }
                    }
                });
            } catch (optErr) {
                console.log("Already opted in or opt-in skipped:", optErr);
            }

            // 6. Send Registration Transaction
            setSubmitStage(6);
            await appClient.register({
                refugee: targetRefugee,
                did: didHash.substring(0, 32),
                ipfsCid: mockCid,
                biometricHash: biometricBin
            }, {
                sender: {
                    addr: account,
                    signer: async (txnGroup, indexesToSign) => {
                        const txnsToSign = txnGroup.map((txn, i) => ({
                            txn,
                            signers: indexesToSign.includes(i) ? [account] : [],
                        }));
                        const signed = await signTransactions([txnsToSign]);
                        return signed.map(s => s.blob);
                    }
                }
            });

            // 7. Success
            setSubmitStage(7);
            setTimeout(() => {
                setShowSuccess(true);
                setIsSubmitting(false);
                showToast('success', 'Registration Complete', 'Refugee identity has been permanently recorded on Algorand.');
            }, 500);

        } catch (err) {
            console.error(err);
            setIsSubmitting(false);
            showToast('error', 'Registration Failed', err.message || 'Check console for details');
        }
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

    const steps = ["Personal Info", "Liveness Check", "Wallet Setup", "Review & Submit"];

    const provisionCustodialWallet = async () => {
        setCustodial((p) => ({ ...p, isProvisioning: true }));
        try {
            const res = await api.generateCustodialWallet();
            const payload = res?.data;
            if (!payload?.address || !payload?.identity_id || !payload?.qr_payload) {
                throw new Error('Backend did not return custodial wallet details.');
            }
            setFormData((p) => ({
                ...p,
                walletType: 'custodial',
                walletAddress: payload.address,
            }));
            setCustodial({
                identityId: payload.identity_id,
                qrPayload: payload.qr_payload,
                isProvisioning: false,
            });
            showToast('success', 'Custodial wallet created', 'A real Algorand account (W1) was funded, opted-in, and registered on-chain.');
        } catch (e) {
            setCustodial((p) => ({ ...p, isProvisioning: false }));
            showToast('error', 'Custodial wallet failed', e?.message || 'Could not provision custodial wallet (W1).');
        }
    };

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
                            {formData.familyMembers.length === 0 && ( /* Empty State */
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
                    <div className="space-y-6 animate-fadeIn">
                        
                        {/* Status Header */}
                        {isLivenessChecking && challengeStatus !== 'complete' && (
                            <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-xl p-6 flex justify-between items-center transition-all">
                                <div>
                                    <h3 className="text-[#00c9b1] text-[10px] font-bold uppercase tracking-widest mb-1">
                                        Step {currentChallenge + 1} of {LIVENESS_CHALLENGES.length}
                                    </h3>
                                    <p className="text-xl font-bold text-white tracking-wide">
                                        {LIVENESS_CHALLENGES[currentChallenge]?.instruction}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-4xl font-mono font-light text-[#ef4444]">{timeLeft}s</div>
                                </div>
                            </div>
                        )}

                        <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-8 flex flex-col items-center">
                            <div className={clsx(
                                "w-full aspect-video rounded-xl border-2 relative overflow-hidden flex flex-col items-center justify-center transition-all duration-500",
                                challengeStatus === 'complete' ? "border-[#10b981] shadow-[0_0_30px_rgba(16,185,129,0.2)]" :
                                challengeStatus === 'failed' ? "border-[#ef4444] shadow-[0_0_30px_rgba(239,68,68,0.2)]" :
                                challengeStatus === 'success' ? "border-[#f59e0b] shadow-[0_0_30px_rgba(245,158,11,0.2)]" :
                                isLivenessChecking ? "border-[#00c9b1] shadow-[0_0_30px_rgba(0,201,177,0.2)]" : "border-[#1a2d4a] bg-[#060d1f]"
                            )}>
                                
                                <div className="absolute inset-0 z-0">
                                    <Webcam
                                        ref={webcamRef}
                                        audio={false}
                                        videoConstraints={{ width: 640, height: 480, facingMode: "user" }}
                                        className={clsx(
                                            "w-full h-full object-cover transition-opacity duration-500",
                                            !isLivenessChecking && challengeStatus !== 'complete' ? "opacity-30 grayscale" : "opacity-100 grayscale hover:grayscale-0",
                                            challengeStatus === 'complete' && "blur-sm opacity-50"
                                        )}
                                    />
                                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none" />
                                </div>

                                {/* Overlays */}
                                {!isLivenessChecking && challengeStatus === 'idle' && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
                                        <Camera size={48} className="text-white mb-2 drop-shadow-lg" />
                                        <p className="text-white font-bold text-[10px] uppercase tracking-widest bg-black/60 px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
                                            Face Detection Online
                                        </p>
                                    </div>
                                )}

                                {isLivenessChecking && challengeStatus === 'detecting' && (
                                    <div className="absolute inset-0 pointer-events-none z-20">
                                        {/* Guide Box */}
                                        <div className="absolute inset-y-12 inset-x-20 border-2 border-dashed border-[#00c9b140] rounded-[40px]" />
                                    </div>
                                )}

                                {challengeStatus === 'complete' && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none bg-black/40 backdrop-blur-sm animate-fadeIn">
                                        <div className="w-20 h-20 bg-[#10b98120] rounded-full flex items-center justify-center mb-4 border border-[#10b98140]">
                                            <Shield size={48} className="text-[#10b981]" />
                                        </div>
                                        <span className="text-[#10b981] font-bold text-xl tracking-widest uppercase">Verified Secure</span>
                                    </div>
                                )}
                            </div>

                            {/* Info Bar */}
                            <div className="w-full mt-6 grid grid-cols-2 gap-4">
                                <div className="bg-[#060d1f] border border-[#1a2d4a] rounded-xl p-4 flex items-center justify-between">
                                    <span className="text-[#7a94bb] text-[10px] uppercase font-bold tracking-widest">Feedback Log</span>
                                    <span className={clsx(
                                        "text-xs font-semibold max-w-[150px] truncate",
                                        challengeStatus === 'failed' ? "text-[#ef4444]" :
                                        challengeStatus === 'success' ? "text-[#f59e0b]" :
                                        challengeStatus === 'complete' ? "text-[#10b981]" : "text-[#00c9b1]"
                                    )}>{feedback}</span>
                                </div>
                                <div className="bg-[#060d1f] border border-[#1a2d4a] rounded-xl p-4 flex items-center justify-between">
                                    <span className="text-[#7a94bb] text-[10px] uppercase font-bold tracking-widest">Confidence</span>
                                    <div className="flex items-center gap-2">
                                        <div className="w-16 h-1.5 bg-[#1a2d4a] rounded-full overflow-hidden">
                                            <div className="h-full bg-[#10b981] transition-all" style={{ width: `${confidence}%` }} />
                                        </div>
                                        <span className="text-[#e2eaf8] text-xs font-mono">{confidence}%</span>
                                    </div>
                                </div>
                            </div>

                            {!isLivenessChecking && challengeStatus === 'idle' && (
                                <button
                                    onClick={startLiveness}
                                    className="mt-8 bg-[#f59e0b] text-[#060d1f] font-bold py-4 px-12 rounded-xl hover:bg-[#ffb533] active:scale-95 transition-all shadow-[0_0_20px_#f59e0b40] w-full max-w-sm"
                                >
                                    START BIOMETRIC SCAN
                                </button>
                            )}

                            {challengeStatus === 'failed' && (
                                <button
                                    onClick={startLiveness}
                                    className="mt-8 bg-[#ef4444] text-white font-bold py-4 px-12 rounded-xl hover:bg-[#f87171] active:scale-95 transition-all shadow-[0_0_20px_#ef444440] w-full max-w-sm"
                                >
                                    RETRY SCAN
                                </button>
                            )}



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
                                onClick={() => {
                                    setCustodial({ identityId: '', qrPayload: '', isProvisioning: false });
                                    setFormData({ ...formData, walletType: 'pera', walletAddress: 'PERA7J3KLMN8QRS2TUVA4WXY5ZAB6CDSPUB' });
                                }}
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
                                onClick={() => {
                                    if (custodial.isProvisioning) return;
                                    provisionCustodialWallet();
                                }}
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
                                {custodial.isProvisioning ? (
                                    <Loader2 className="text-[#f59e0b] mt-4 animate-spin" size={20} />
                                ) : (
                                    formData.walletType === 'custodial' && <Check className="text-[#f59e0b] mt-4" size={20} />
                                )}
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
<<<<<<< HEAD
                                        { label: 'Authorizing registrar credentials', done: submitStage >= 1 },
                                        { label: 'Generating identity hashes', done: submitStage >= 2 },
                                        { label: 'Preparing metadata', done: submitStage >= 3 },
                                        { label: 'Connecting to Algorand Testnet', done: submitStage >= 4, extra: 'App #758854828' },
                                        { label: 'Refugee Opt-In (Mandatory Status)', done: submitStage >= 5 },
                                        { label: 'Writing to Blockchain Ledger', done: submitStage >= 6, extra: 'Block Committing...' },
                                        { label: 'Identity Secured successfully ✓', done: submitStage >= 7 },
=======
                                        { label: 'Validating form data', done: submitStage >= 1 },
                                        { label: 'Generating identity hashes', done: submitStage >= 2, extra: livenessHash ? livenessHash.substring(0, 10) + '...' : 'a3f8c...' },
                                        { label: 'Liveness verification confirmed', done: submitStage >= 3 },
                                        { label: 'Linking wallet address', done: submitStage >= 4, extra: 'PERA7...SPUB' },
                                        { label: 'Writing to Algorand blockchain', done: submitStage >= 5, extra: 'Block #4521893' },
                                        { label: 'Registration complete ✓', done: submitStage >= 6 },
>>>>>>> 0bf851bc2aefa0f3ec991621755503e19b34e9b9
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
                                            value={
                                                custodial.qrPayload ||
                                                JSON.stringify({
                                                    identity_id: "REF-2024-004",
                                                    old_wallet: formData.walletAddress,
                                                    name: formData.fullName,
                                                })
                                            }
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
                                            <span className="block text-xs font-mono font-bold text-gray-600 ml-2">{custodial.identityId || 'REF-2024-004'}</span>
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
                                            fullName: '', dob: '', nationality: 'Syrian', campId: '',
                                            languages: [], familyMembers: [], livenessVerified: false,
                                            walletType: null, walletAddress: '',
                                        });
                                        setCustodial({ identityId: '', qrPayload: '', isProvisioning: false });
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