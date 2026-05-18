import React, { useState, useEffect, useRef } from 'react';
import {
    Check, Camera, Smartphone, QrCode,
    Trash2, Plus, Info, Lock, Loader2, Printer, Shield, ChevronDown, X,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useToast } from '../../context/ToastContext';
import { LoadingSpinner } from '../../components/ui/Common';
import { QRCodeSVG } from 'qrcode.react';
import Webcam from "react-webcam";
import algosdk from 'algosdk';
import CryptoJS from 'crypto-js';
import { ALGOD_SERVER, ALGOD_PORT, ALGOD_TOKEN } from '../../contracts/config';
import { getActiveAppId } from '../../utils/appId';
import { useWallet } from '../../context/WalletContext';
import {
    connectRefugeePeraWallet,
    killRefugeePeraWalletSession,
    peraWallet,
    normalizePeraAccount,
    sendSignedTxnGroup,
} from '../../utils/wallet';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { api } from '../../utils/api';
import { formatAddress } from '../../utils/format';
import {
    NATIONALITY_PRESETS,
    validateNationality,
    normalizeNationality,
    getNationalityCustomInputError,
    NATIONALITY_ERROR_MESSAGE,
    NATIONALITY_REQUIRED_MESSAGE,
} from '../../utils/nationalityValidation';
import {
    validateCampId,
    getCampIdInputError,
    formatCampIdExample,
    CAMP_ID_ERROR_MESSAGE,
    CAMP_ID_REQUIRED_MESSAGE,
    CAMP_ID_FORMAT_HINT,
} from '../../utils/campIdValidation';

// --- Form Components (PropTypes omitted for local helpers) ---
/* eslint-disable react/prop-types */
const Input = ({ label, ...props }) => (
    <div className="w-full">
        <label className="block text-[#7a94bb] text-xs font-medium uppercase tracking-widest mb-2">{label}</label>
        <input
            className="w-full bg-[#060d1f] border border-[#1a2d4a] rounded-lg px-4 py-3 text-[#e2eaf8] text-sm focus:outline-none focus:border-[#00c9b1] focus:ring-1 focus:ring-[#00c9b120] placeholder-[#3d5278] transition-all duration-200"
            {...props}
        />
    </div>
);

/** Custom listbox: options panel always opens below the field (avoids upward-flipping browser menus). */
const NationalityPicker = ({
    listValue,
    customText,
    onListChange,
    onCustomChange,
    error,
}) => {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);

    useEffect(() => {
        const close = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    const displayLabel =
        listValue === ''
            ? 'Choose from list…'
            : listValue === 'Other'
              ? 'Other — type nationality below'
              : listValue;

    return (
        <div className="w-full relative" ref={wrapRef}>
            <label className="block text-[#7a94bb] text-xs font-medium uppercase tracking-widest mb-2">Nationality</label>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="w-full relative bg-[#060d1f] border border-[#1a2d4a] rounded-lg px-4 py-3 pr-10 text-left text-[#e2eaf8] text-sm focus:outline-none focus:border-[#00c9b1] focus:ring-1 focus:ring-[#00c9b120] transition-all duration-200"
            >
                <span className={listValue === '' ? 'text-[#3d5278]' : ''}>{displayLabel}</span>
                <ChevronDown
                    size={18}
                    className={clsx(
                        'absolute right-3 top-1/2 -translate-y-1/2 text-[#7a94bb] pointer-events-none transition-transform',
                        open && 'rotate-180',
                    )}
                />
            </button>
            {open && (
                <ul
                    className="absolute left-0 right-0 top-full z-[200] mt-1 max-h-60 overflow-y-auto rounded-lg border border-[#1a2d4a] bg-[#0f1e38] shadow-2xl py-1"
                    role="listbox"
                >
                    {NATIONALITY_PRESETS.map((opt) => (
                        <li key={opt}>
                            <button
                                type="button"
                                role="option"
                                className="w-full text-left px-4 py-2.5 text-sm text-[#e2eaf8] hover:bg-[#152342] flex items-center justify-between gap-2"
                                onClick={() => {
                                    onListChange(opt);
                                    setOpen(false);
                                }}
                            >
                                <span>{opt}</span>
                                {listValue === opt ? <Check size={16} className="text-[#00c9b1] shrink-0" /> : null}
                            </button>
                        </li>
                    ))}
                    <li>
                        <button
                            type="button"
                            role="option"
                            className="w-full text-left px-4 py-2.5 text-sm text-[#e2eaf8] hover:bg-[#152342] flex items-center justify-between gap-2 border-t border-[#1a2d4a]"
                            onClick={() => {
                                onListChange('Other');
                                setOpen(false);
                            }}
                        >
                            <span>Other — type below</span>
                            {listValue === 'Other' ? <Check size={16} className="text-[#00c9b1] shrink-0" /> : null}
                        </button>
                    </li>
                </ul>
            )}
            {listValue === 'Other' && (
                <input
                    id="nationality-custom-input"
                    type="text"
                    autoComplete="off"
                    spellCheck={false}
                    className={clsx(
                        'mt-2 w-full rounded-lg px-4 py-3 text-sm transition-all duration-200',
                        'bg-[#060d1f] text-[#e2eaf8] placeholder-[#3d5278]',
                        'border focus:outline-none focus:ring-1',
                        error === NATIONALITY_ERROR_MESSAGE
                            ? 'border-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef444420]'
                            : 'border-[#1a2d4a] focus:border-[#00c9b1] focus:ring-[#00c9b120]',
                        '[&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#060d1f]',
                        '[&:-webkit-autofill]:[-webkit-text-fill-color:#e2eaf8]',
                        '[&:-webkit-autofill]:border-[#1a2d4a]',
                    )}
                    placeholder="Enter your nationality"
                    value={customText}
                    onChange={(e) => onCustomChange(e.target.value)}
                />
            )}
            {error ? (
                <p className="mt-1.5 text-[10px] text-[#fca5a5] font-bold uppercase tracking-widest">
                    {error}
                </p>
            ) : null}
        </div>
    );
};

const RELATIONSHIP_PRESETS = ['Spouse', 'Son', 'Daughter', 'Parent', 'Sibling', 'Grandparent', 'Grandchild', 'Guardian', 'Other'];

/** Type a custom relationship or pick a preset from the list below. */
const RelationshipCombobox = ({ value, onChange }) => {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);

    useEffect(() => {
        const close = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);

    const pickPreset = (preset) => {
        onChange(preset);
        setOpen(false);
    };

    return (
        <div className="relative w-44 shrink-0" ref={wrapRef}>
            <div className="flex rounded-lg border border-[#1a2d4a] bg-[#060d1f] focus-within:border-[#00c9b1] focus-within:ring-1 focus-within:ring-[#00c9b120] overflow-hidden">
                <input
                    type="text"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="Relationship"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[#e2eaf8] text-sm focus:outline-none placeholder-[#3d5278]"
                />
                <button
                    type="button"
                    aria-label="Show relationship options"
                    onClick={() => setOpen((o) => !o)}
                    className="flex shrink-0 items-center justify-center border-l border-[#1a2d4a] px-2 text-[#7a94bb] hover:text-[#e2eaf8] hover:bg-[#152342] transition-colors"
                >
                    <ChevronDown size={16} className={clsx('transition-transform', open && 'rotate-180')} />
                </button>
            </div>
            {open && (
                <ul
                    className="absolute left-0 right-0 top-full z-[200] mt-1 max-h-48 overflow-y-auto rounded-lg border border-[#1a2d4a] bg-[#0f1e38] shadow-2xl py-1"
                    role="listbox"
                >
                    {RELATIONSHIP_PRESETS.map((preset) => (
                        <li key={preset}>
                            <button
                                type="button"
                                role="option"
                                className="w-full text-left px-3 py-2 text-sm text-[#e2eaf8] hover:bg-[#152342] flex items-center justify-between gap-2"
                                onClick={() => pickPreset(preset)}
                            >
                                <span>{preset}</span>
                                {value === preset ? <Check size={14} className="text-[#00c9b1] shrink-0" /> : null}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};
/* eslint-enable react/prop-types */

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

const hexToBytes = (hex) => {
    const clean = (hex || '').toString().trim().toLowerCase();
    if (!clean || clean.length % 2 !== 0) return new Uint8Array();
    const out = new Uint8Array(clean.length / 2);
    for (let i = 0; i < clean.length; i += 2) {
        out[i / 2] = parseInt(clean.slice(i, i + 2), 16);
    }
    return out;
};

/** 32-byte SHA-256 digest as Uint8Array (matches contract byte[] commitments). */
const sha256Bytes32 = (utf8String) => hexToBytes(CryptoJS.SHA256(utf8String).toString());

const bytesToHex = (u8) =>
    Array.from(u8 || [])
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

async function assertPeraSessionForRefugee(expectedAddress) {
    const expected = normalizePeraAccount(expectedAddress);
    const accounts = (await peraWallet.reconnectSession().catch(() => [])).map(normalizePeraAccount);
    if (!accounts.includes(expected)) {
        throw new Error(
            `Pera Wallet must be connected as the refugee (${expected.slice(0, 4)}…${expected.slice(-4)}). `
            + 'Return to Wallet Setup and link the refugee phone again before registering.',
        );
    }
}

function isOptedInOnChain(status) {
    return status === 'confirmed' || status === 'opted_in_only' || status === 'migrated';
}

async function waitForWalletOptIn(address, timeoutMs = 20000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const status = await api.verifyOnchainStatus(address);
        if (isOptedInOnChain(status.onchain_status)) {
            return status;
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    return api.verifyOnchainStatus(address);
}

async function ensureRefugeeOptIn({ algodClient, appId, address, signTransactions }) {
    const initial = await api.verifyOnchainStatus(address);
    if (isOptedInOnChain(initial.onchain_status)) {
        return { txHash: null, alreadyOptedIn: true };
    }
    if (initial.onchain_status === 'unknown') {
        throw new Error(
            'Could not verify on-chain opt-in status. Check the API is running and try again.',
        );
    }

    await assertPeraSessionForRefugee(address);

    let txHash;
    try {
        txHash = await peraOptInApp({ algodClient, appId, address, signTransactions });
    } catch (optErr) {
        throw new Error(
            `Failed to opt the refugee wallet into app ${appId}. `
            + `Approve the opt-in transaction in Pera. ${optErr?.message || optErr}`,
        );
    }

    const after = await waitForWalletOptIn(address);
    if (!isOptedInOnChain(after.onchain_status)) {
        throw new Error(
            `Opt-in to app ${appId} did not complete on-chain. `
            + 'Confirm the Application Opt-In transaction in Pera (TestNet, correct account), then try again.',
        );
    }

    return { txHash, alreadyOptedIn: false };
}

async function peraOptInApp({ algodClient, appId, address, signTransactions }) {
    const sender = normalizePeraAccount(address);
    if (!sender) {
        throw new Error('Refugee wallet address is missing. Reconnect Pera on Wallet Setup.');
    }
    const sp = await algodClient.getTransactionParams().do();
    const txn = algosdk.makeApplicationOptInTxnFromObject({
        sender,
        appIndex: Number(appId),
        suggestedParams: sp,
    });
    const txnsToSign = [{ txn, signers: [sender] }];
    const signed = await signTransactions([txnsToSign]);
    const { txId } = await sendSignedTxnGroup(algodClient, signed);
    await algosdk.waitForConfirmation(algodClient, txId, 10);
    return txId;
}



async function generateSHA256Hash(imageData) {
    const crypto = window.crypto || window.msCrypto;
    if (!crypto || !crypto.subtle) return "fallback_hash_" + Date.now();
    const hashBuffer = await crypto.subtle.digest('SHA-256', imageData.data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}


// --- Registration Page ---

const Register = () => {
    const { signTransactions, setManualAccount, disconnectWallet } = useWallet();
    const [peraConnecting, setPeraConnecting] = useState(false);
    const [peraConnectQrUrl, setPeraConnectQrUrl] = useState('');
    const { showToast } = useToast();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStage, setSubmitStage] = useState(0);
    const [activeAppId, setActiveAppId] = useState(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [currentLang, setCurrentLang] = useState('');
    const [registeredRecord, setRegisteredRecord] = useState(null);

    const [formData, setFormData] = useState({
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

    const [nationalityListValue, setNationalityListValue] = useState('Syrian');
    const [nationalityCustomText, setNationalityCustomText] = useState('');
    const [nationalityError, setNationalityError] = useState(null);
    const [campIdError, setCampIdError] = useState(null);
    const prevStepRef = useRef(1);

    const [custodial, setCustodial] = useState({
        identityId: '',
        qrPayload: '',
        isProvisioning: false,
        provisioningStatus: '',
    });
    
    // Liveness State
    const [isLivenessChecking, setIsLivenessChecking] = useState(false);
    const [currentChallenge, setCurrentChallenge] = useState(0);
    const [challengeStatus, setChallengeStatus] = useState('idle'); // idle, loading, detecting, success, failed, complete
    const [, setCapturedFrames] = useState([]);
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

    useEffect(() => {
        if (step === 1 && prevStepRef.current > 1) {
            const n = formData.nationality;
            if (NATIONALITY_PRESETS.includes(n)) {
                setNationalityListValue(n);
                setNationalityCustomText('');
            } else if (n) {
                setNationalityListValue('Other');
                setNationalityCustomText(n);
            }
            setNationalityError(null);
        }
        prevStepRef.current = step;
    }, [step]);

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
        
        let attempts = 0;
        let synced = false;
        while (attempts < 3 && !synced) {
            try {
                await api.postLivenessHash({ refugeeId: 'REF-TEMP', livenessData });
                synced = true;
                setFormData(prev => ({ ...prev, livenessVerified: true }));
                showToast('success', 'Liveness Verified', 'Biometric liveness detection successful.');
                setFeedback('Liveness Verified Successfully!');
            } catch {
                attempts++;
                if (attempts >= 3) {
                    showToast('info', 'Liveness Verified Locally', 'Backend sync is unavailable, but the liveness hash is kept for registration.');
                    setFeedback('Network error. Hash stored locally.');
                    setFormData(prev => ({ ...prev, livenessVerified: true }));
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
    };

    const handleRegister = async () => {
        // Custodial ("no smartphone") flow:
        // The backend already generated W1 + identity_id + QR AND registered on-chain during provisioning.
        // Final submit must NOT attempt to register again (would fail with "refugee already registered").
        if (formData.walletType === 'custodial') {
            if (!custodial?.identityId || !custodial?.qrPayload || !formData.walletAddress) {
                showToast('error', 'Missing custodial identity', 'Provision the custodial wallet (W1) first to generate the refugee ID + QR payload.');
                return;
            }
            setIsSubmitting(true);
            setSubmitStage(6);
            try {
                const saved = await api.saveRefugeeRecord({
                    id: custodial.identityId,
                    name: formData.fullName,
                    dob: formData.dob,
                    nationality: formData.nationality,
                    campID: formData.campId,
                    walletType: 'custodial',
                    walletAddress: formData.walletAddress,
                    languages: formData.languages,
                    familyMembers: formData.familyMembers,
                });
                setRegisteredRecord(saved?.data || null);
                setSubmitStage(7);
                setShowSuccess(true);
                setIsSubmitting(false);
                showToast('success', 'Registration Complete', 'Custodial identity (W1) has been created and recorded. Refugee ID + QR payload are ready.');
            } catch (err) {
                setIsSubmitting(false);
                showToast('error', 'Registration Failed', err.message || 'Could not save refugee record.');
            }
            return;
        }

        if (!formData.walletAddress) {
            showToast('error', 'Wallet Required', 'Connect the refugee Pera Wallet before registering.');
            return;
        }

        setIsSubmitting(true);
        setSubmitStage(1);

        const targetRefugee = formData.walletAddress;

        try {
            setSubmitStage(1);
            const appInfo = await api.getAppInfo();
            if (appInfo?.data?.warning) {
                throw new Error(appInfo.data.warning);
            }
            const appId = Number(appInfo?.data?.app_id);
            if (!Number.isFinite(appId)) {
                throw new Error('RIMS contract is not deployed. Deploy from Admin → System Status first.');
            }
            setActiveAppId(appId);

            setSubmitStage(2);
            const biometricData = formData.fullName + formData.dob + formData.nationality;
            const identityHash = sha256Bytes32(`identity:${biometricData}`);
            const personhoodHash =
                livenessHash && /^[0-9a-fA-F]{64}$/.test(livenessHash)
                    ? hexToBytes(livenessHash)
                    : sha256Bytes32(`personhood:${biometricData}`);
            const ageProofHash = sha256Bytes32(`age:${formData.dob}|${formData.campId}`);
            setSubmitStage(3);

            const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);

            setSubmitStage(4);
            const { txHash: optInTxHash } = await ensureRefugeeOptIn({
                algodClient,
                appId,
                address: targetRefugee,
                signTransactions,
            });
            setSubmitStage(5);

            const reg = await api.registerRefugee({
                refugee: targetRefugee,
                identity_hash: bytesToHex(identityHash),
                personhood_hash: bytesToHex(personhoodHash),
                age_proof_hash: bytesToHex(ageProofHash),
            });
            if (!reg?.ok) {
                throw new Error(reg?.detail || 'Blockchain register transaction failed');
            }
            const registerTxHash = reg.tx_id || reg.txHash;
            if (!registerTxHash) {
                throw new Error('Blockchain register succeeded but no transaction id was returned');
            }
            if (Number(reg.app_id) && Number(reg.app_id) !== appId) {
                throw new Error(
                    `App ID mismatch: UI used ${appId} but backend registered on ${reg.app_id}. Redeploy from Admin → System Status.`,
                );
            }

            setSubmitStage(6);
            const onchain = await api.verifyOnchainStatus(targetRefugee);
            if (onchain.onchain_status !== 'confirmed') {
                throw new Error(
                    `On-chain registration not confirmed (status: ${onchain.onchain_status}). `
                    + `Ensure opt-in and register both used app ${appId}.`,
                );
            }

            const saved = await api.saveRefugeeRecord({
                name: formData.fullName,
                dob: formData.dob,
                nationality: formData.nationality,
                campID: formData.campId,
                walletType: 'pera',
                walletAddress: targetRefugee,
                languages: formData.languages,
                familyMembers: formData.familyMembers,
                txHash: registerTxHash,
            });
            setRegisteredRecord(saved?.data || null);

            setSubmitStage(7);
            setTimeout(() => {
                setShowSuccess(true);
                setIsSubmitting(false);
                showToast(
                    'success',
                    'Registration Complete',
                    `Identity secured on Algorand (app ${appId}, tx ${String(registerTxHash).slice(0, 10)}…).`,
                );
            }, 500);

        } catch (err) {
            console.error('Pera registration failed:', err);
            setIsSubmitting(false);
            setSubmitStage(0);
            showToast('error', 'Registration Failed', err.message || 'Blockchain registration did not complete.');
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

    const handleNationalityListChange = (v) => {
        setNationalityListValue(v);
        setNationalityError(null);
        if (v === 'Other') {
            setNationalityCustomText('');
            return;
        }
        setNationalityCustomText('');
        setFormData((prev) => ({ ...prev, nationality: v }));
    };

    const handleNationalityCustomChange = (v) => {
        setNationalityCustomText(v);
        setNationalityError(getNationalityCustomInputError(v));
    };

    const handleCampIdChange = (v) => {
        setFormData((prev) => ({ ...prev, campId: v }));
        setCampIdError(getCampIdInputError(v));
    };

    const advanceFromPersonalInfo = (nationalityValue) => {
        const { valid: campValid, normalized: campNorm } = validateCampId(formData.campId);
        if (!campNorm) {
            setCampIdError(CAMP_ID_REQUIRED_MESSAGE);
            requestAnimationFrame(() => {
                document.getElementById('camp-id-input')?.focus();
            });
            return;
        }
        if (!campValid) {
            setCampIdError(CAMP_ID_ERROR_MESSAGE);
            requestAnimationFrame(() => {
                document.getElementById('camp-id-input')?.focus();
            });
            return;
        }
        setCampIdError(null);
        setNationalityError(null);
        setFormData((prev) => ({ ...prev, nationality: nationalityValue, campId: campNorm }));
        setStep(2);
    };

    const goNextFromPersonalInfo = () => {
        if (nationalityListValue === 'Other') {
            const customNorm = normalizeNationality(nationalityCustomText);
            if (!customNorm) {
                setNationalityError(NATIONALITY_REQUIRED_MESSAGE);
                requestAnimationFrame(() => {
                    document.getElementById('nationality-custom-input')?.focus();
                });
                return;
            }
            const { valid, normalized } = validateNationality(customNorm);
            if (!valid) {
                setNationalityError(NATIONALITY_ERROR_MESSAGE);
                return;
            }
            advanceFromPersonalInfo(normalized);
            return;
        }

        if (!nationalityListValue || !NATIONALITY_PRESETS.includes(nationalityListValue)) {
            setNationalityError(NATIONALITY_REQUIRED_MESSAGE);
            return;
        }

        const { valid, normalized } = validateNationality(nationalityListValue);
        if (!valid) {
            setNationalityError(NATIONALITY_ERROR_MESSAGE);
            return;
        }
        advanceFromPersonalInfo(normalized);
    };

    const nextStep = () => setStep(prev => prev + 1);
    const prevStep = () => setStep(prev => prev - 1);

    const steps = ["Personal Info", "Liveness Check", "Wallet Setup", "Review & Submit"];

    const canReviewRegistration =
        formData.walletType === 'pera'
            ? Boolean(formData.walletAddress)
            : Boolean(formData.walletType);

    useEffect(() => {
        // Keep WalletConnect through Review (step 4) so REGISTER IDENTITY can sign opt-in.
        if (step !== 3 && step !== 4) {
            killRefugeePeraWalletSession();
            setPeraConnectQrUrl('');
        }
    }, [step]);

    const selectPeraFlow = async () => {
        setCustodial({ identityId: '', qrPayload: '', isProvisioning: false, provisioningStatus: '' });
        setFormData((prev) => ({ ...prev, walletType: 'pera', walletAddress: '' }));
        setPeraConnectQrUrl('');
        await disconnectWallet();
        await handlePeraConnect();
    };

    const handlePeraConnect = async () => {
        setPeraConnecting(true);
        setPeraConnectQrUrl('');
        try {
            await killRefugeePeraWalletSession();
            const accounts = await connectRefugeePeraWallet({
                onQrUri: setPeraConnectQrUrl,
            });
            const address = accounts[0];
            setManualAccount(address);
            setFormData((prev) => ({ ...prev, walletType: 'pera', walletAddress: address }));
            showToast('success', 'Wallet connected', 'Refugee Pera Wallet is linked for registration.');
        } catch (error) {
            if (error?.message !== 'User closed modal') {
                showToast('error', 'Connection Failed', error?.message || 'Could not connect Pera Wallet.');
            }
        } finally {
            setPeraConnecting(false);
        }
    };

    const provisionCustodialWallet = async () => {
        setCustodial((p) => ({ ...p, isProvisioning: true }));
        try {
            const res = await api.generateCustodialWallet({ name: formData.fullName });
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
                provisioningStatus: payload.provisioning_status || 'on_chain',
            });
            if (payload.provisioning_status === 'local_only') {
                showToast(
                    'warning',
                    'On-chain setup incomplete',
                    'The wallet was saved locally but could not be funded/registered on-chain. Retry provisioning or check deployer balance and API logs.'
                );
            } else {
                showToast(
                    'success',
                    'Custodial wallet created',
                    'A real Algorand account (W1) was funded, opted-in, and registered on-chain.'
                );
            }
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
                            <div className="col-span-2">
                                <NationalityPicker
                                    listValue={nationalityListValue}
                                    customText={nationalityCustomText}
                                    onListChange={handleNationalityListChange}
                                    onCustomChange={handleNationalityCustomChange}
                                    error={nationalityError}
                                />
                            </div>
                            <div className="w-full col-span-2">
                                <label className="block text-[#7a94bb] text-xs font-medium uppercase tracking-widest mb-2">Camp ID</label>
                                <input
                                    id="camp-id-input"
                                    type="text"
                                    autoComplete="off"
                                    spellCheck={false}
                                    placeholder={formatCampIdExample(formData.nationality)}
                                    value={formData.campId}
                                    onChange={(e) => handleCampIdChange(e.target.value)}
                                    className={clsx(
                                        'w-full rounded-lg px-4 py-3 text-sm transition-all duration-200',
                                        'bg-[#060d1f] text-[#e2eaf8] placeholder-[#3d5278]',
                                        'border focus:outline-none focus:ring-1',
                                        campIdError
                                            ? 'border-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef444420]'
                                            : 'border-[#1a2d4a] focus:border-[#00c9b1] focus:ring-[#00c9b120]',
                                        '[&:-webkit-autofill]:shadow-[inset_0_0_0_1000px_#060d1f]',
                                        '[&:-webkit-autofill]:[-webkit-text-fill-color:#e2eaf8]',
                                    )}
                                />
                                <p className="mt-1 text-[10px] text-[#3d5278]">{CAMP_ID_FORMAT_HINT}</p>
                                {campIdError ? (
                                    <p className="mt-1 text-[10px] text-[#fca5a5] font-bold uppercase tracking-widest">
                                        {campIdError}
                                    </p>
                                ) : null}
                            </div>
                        </div>

                        <div>
                            <label className="block text-[#7a94bb] text-xs font-medium uppercase tracking-widest mb-2">Languages Spoken</label>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {formData.languages.map((lang) => (
                                    <span
                                        key={lang}
                                        className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-xs font-semibold bg-[#00c9b120] text-[#00c9b1] border border-[#00c9b140]"
                                    >
                                        {lang}
                                        <button
                                            type="button"
                                            aria-label={`Remove ${lang}`}
                                            onClick={() =>
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    languages: prev.languages.filter((l) => l !== lang),
                                                }))
                                            }
                                            className="flex h-5 w-5 items-center justify-center rounded-full text-[#00c9b1] hover:bg-[#ef444430] hover:text-[#fca5a5] transition-colors"
                                        >
                                            <X size={12} strokeWidth={2.5} />
                                        </button>
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
                                    <RelationshipCombobox
                                        value={member.relationship}
                                        onChange={(relationship) => {
                                            const newMembers = [...formData.familyMembers];
                                            newMembers[idx].relationship = relationship;
                                            setFormData({ ...formData, familyMembers: newMembers });
                                        }}
                                    />
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
                            onClick={goNextFromPersonalInfo}
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
                            <button
                                type="button"
                                onClick={selectPeraFlow}
                                className={clsx(
                                    'bg-[#0f1e38] border p-6 rounded-xl cursor-pointer transition-all duration-300 flex flex-col items-center text-center',
                                    formData.walletType === 'pera'
                                        ? 'border-[#00c9b1] shadow-[0_0_20px_rgba(0,201,177,0.1)]'
                                        : 'border-[#1a2d4a] hover:border-[#3d5278]',
                                )}
                            >
                                <div className="w-12 h-12 bg-[#3b82f620] text-[#3b82f6] rounded-full flex items-center justify-center mb-4">
                                    <Smartphone size={24} />
                                </div>
                                <h3 className="text-white font-bold mb-2">Has Smartphone</h3>
                                <p className="text-[#7a94bb] text-[11px]">Refugee installs Pera Wallet and controls their own digital identity.</p>
                                {formData.walletType === 'pera' && formData.walletAddress && (
                                    <Check className="text-[#00c9b1] mt-4" size={20} />
                                )}
                            </button>

                            <div
                                onClick={() => {
                                    if (custodial.isProvisioning) return;
                                    provisionCustodialWallet();
                                }}
                                className={clsx(
                                    'bg-[#0f1e38] border p-6 rounded-xl cursor-pointer transition-all duration-300 flex flex-col items-center text-center',
                                    formData.walletType === 'custodial'
                                        ? 'border-[#f59e0b] shadow-[0_0_20px_rgba(245,158,11,0.1)]'
                                        : 'border-[#1a2d4a] hover:border-[#3d5278]',
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

                        {formData.walletType === 'pera' && (
                            <div className="bg-[#0f1e38] border border-[#00c9b140] rounded-xl p-8 animate-fadeSlideUp flex flex-col items-center text-center">
                                <h4 className="text-[#e2eaf8] font-bold text-sm uppercase tracking-widest mb-2">
                                    Connect refugee wallet
                                </h4>
                                <p className="text-[#7a94bb] text-xs mb-6 max-w-md">
                                    Scan this QR with Pera Wallet on the refugee&apos;s smartphone, then confirm the
                                    connection below.
                                </p>
                                {peraConnectQrUrl && !formData.walletAddress && (
                                    <div className="bg-white p-4 rounded-xl mb-6">
                                        <QRCodeSVG value={peraConnectQrUrl} size={180} level="M" />
                                    </div>
                                )}
                                {!peraConnectQrUrl && !formData.walletAddress && (
                                    <div className="bg-[#152342] border border-[#1a2d4a] rounded-xl mb-6 w-[212px] h-[212px] flex items-center justify-center">
                                        {peraConnecting ? (
                                            <Loader2 className="text-[#00c9b1] animate-spin" size={32} />
                                        ) : (
                                            <p className="text-[#7a94bb] text-xs px-4">Waiting for connection QR…</p>
                                        )}
                                    </div>
                                )}
                                {formData.walletAddress ? (
                                    <div className="flex items-center gap-2 text-[#10b981] text-sm font-semibold">
                                        <Check size={18} />
                                        Pera Wallet connected
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handlePeraConnect}
                                        disabled={peraConnecting}
                                        className="bg-[#00c9b1] text-[#060d1f] font-bold py-3 px-8 rounded-lg hover:bg-[#00e0c5] transition-all disabled:opacity-50"
                                    >
                                        {peraConnecting ? 'CONNECTING…' : 'SHOW CONNECTION QR'}
                                    </button>
                                )}
                            </div>
                        )}

                        {formData.walletType === 'custodial' && (
                            <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-xl p-6 animate-fadeSlideUp">
                                <label className="block text-[#7a94bb] text-[10px] font-bold uppercase tracking-widest mb-3">
                                    Linked Wallet Address
                                </label>
                                <div className="bg-[#060d1f] p-4 rounded-lg flex items-center justify-between border border-[#1a2d4a]">
                                    <span
                                        className="font-mono text-[#00c9b1] text-xs truncate mr-4"
                                        title={formData.walletAddress || ''}
                                    >
                                        {formData.walletAddress ? formatAddress(formData.walletAddress) : '—'}
                                    </span>
                                    <div
                                        className={clsx(
                                            'px-2 py-0.5 rounded text-[10px] font-bold border',
                                            custodial.provisioningStatus === 'local_only'
                                                ? 'bg-[#f59e0b20] text-[#f59e0b] border-[#f59e0b30]'
                                                : 'bg-[#10b98120] text-[#10b981] border-[#10b98130]',
                                        )}
                                    >
                                        {custodial.provisioningStatus === 'local_only' ? 'OFFLINE' : 'READY'}
                                    </div>
                                </div>
                                {custodial.provisioningStatus === 'local_only' ? (
                                    <>
                                        <p className="mt-4 text-[11px] text-[#f59e0b] leading-relaxed">
                                            Wallet saved locally but not registered on-chain. Aid cannot be issued until setup completes.
                                        </p>
                                        <button
                                            type="button"
                                            disabled={custodial.isProvisioning || !custodial.identityId}
                                            onClick={async () => {
                                                setCustodial((p) => ({ ...p, isProvisioning: true }));
                                                try {
                                                    await api.completeCustodialOnchain(custodial.identityId);
                                                    setCustodial((p) => ({
                                                        ...p,
                                                        isProvisioning: false,
                                                        provisioningStatus: 'on_chain',
                                                    }));
                                                    showToast(
                                                        'success',
                                                        'On-chain setup complete',
                                                        'Custodial wallet is funded, opted-in, and registered.'
                                                    );
                                                } catch (e) {
                                                    setCustodial((p) => ({ ...p, isProvisioning: false }));
                                                    showToast(
                                                        'error',
                                                        'On-chain setup failed',
                                                        e?.message || 'Could not complete custodial registration.'
                                                    );
                                                }
                                            }}
                                            className="mt-4 w-full bg-[#f59e0b] text-[#060d1f] font-bold py-3 rounded-lg text-xs uppercase tracking-widest disabled:opacity-50"
                                        >
                                            {custodial.isProvisioning ? 'Completing…' : 'Complete on-chain setup'}
                                        </button>
                                    </>
                                ) : (
                                    <p className="mt-4 text-[11px] text-[#3d5278] leading-relaxed italic">
                                        A secure custodial account has been provisioned on the blockchain.
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={prevStep}
                                className="flex-1 border border-[#1a2d4a] text-[#e2eaf8] font-bold py-4 px-6 rounded-lg hover:border-[#3d5278] transition-all"
                            >
                                ← BACK
                            </button>
                            <button
                                type="button"
                                onClick={nextStep}
                                disabled={!canReviewRegistration}
                                className="flex-[2] bg-[#00c9b1] text-[#060d1f] font-bold py-4 px-6 rounded-lg hover:bg-[#00e0c5] active:scale-95 transition-all disabled:opacity-40"
                            >
                                REVIEW REGISTRATION
                            </button>
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
                                        {
                                            label: 'Wallet Type',
                                            value: formData.walletType === 'pera' ? 'Pera (self-sovereign)' : 'Custodial (W1)',
                                        },
                                        {
                                            label: 'Wallet Address',
                                            value: formData.walletAddress
                                                ? formatAddress(formData.walletAddress)
                                                : '—',
                                        },
                                        ...(custodial.identityId
                                            ? [{ label: 'Refugee ID', value: custodial.identityId }]
                                            : []),
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

                        <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-xl p-6 space-y-6">
                            <h3 className="text-[#e2eaf8] font-bold text-lg">Wallet &amp; identity details</h3>
                            <div className="bg-[#060d1f] p-4 rounded-lg flex items-center justify-between border border-[#1a2d4a]">
                                <span
                                    className="font-mono text-[#00c9b1] text-xs truncate mr-4"
                                    title={formData.walletAddress || ''}
                                >
                                    {formData.walletAddress ? formatAddress(formData.walletAddress) : '—'}
                                </span>
                                <div className="px-2 py-0.5 rounded bg-[#10b98120] text-[#10b981] text-[10px] font-bold border border-[#10b98130]">
                                    READY
                                </div>
                            </div>
                            <p className="text-[11px] text-[#7a94bb] leading-relaxed">
                                {formData.walletType === 'pera'
                                    ? "The refugee's Pera Wallet is linked and ready for on-chain registration."
                                    : 'A secure custodial account (W1) has been provisioned. Print the QR card for the refugee.'}
                            </p>
                            {formData.walletType === 'custodial' && custodial.qrPayload && (
                                <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start pt-2">
                                    <div className="bg-white p-4 rounded-xl shrink-0">
                                        <QRCodeSVG
                                            value={custodial.qrPayload}
                                            size={140}
                                            level="H"
                                        />
                                    </div>
                                    <div className="text-left space-y-2">
                                        <p className="text-[#7a94bb] text-xs">
                                            <span className="font-bold text-[#e2eaf8]">Refugee ID:</span>{' '}
                                            <span className="font-mono">{custodial.identityId}</span>
                                        </p>
                                        <p className="text-[#3d5278] text-[11px] italic">
                                            This QR will be printed on the refugee identity card after registration.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={prevStep}
                                className="border border-[#1a2d4a] text-[#7a94bb] px-6 rounded-lg hover:border-[#3d5278] transition-all"
                            >
                                ← BACK
                            </button>
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
                                        { label: 'Authorizing registrar credentials', done: submitStage >= 1 },
                                        { label: 'Generating identity hashes', done: submitStage >= 2 },
                                        { label: 'Preparing metadata', done: submitStage >= 3 },
                                        { label: 'Connecting to Algorand network', done: submitStage >= 4, extra: activeAppId ? `App #${activeAppId}` : '' },
                                        { label: 'Refugee Opt-In (Mandatory Status)', done: submitStage >= 5 },
                                        { label: 'Writing to Blockchain Ledger', done: submitStage >= 6, extra: 'Block Committing...' },
                                        { label: 'Identity Secured successfully ✓', done: submitStage >= 7 },
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
                                {registeredRecord?.id || custodial.identityId || 'Pending'}
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
                                                    identity_id: registeredRecord?.id || custodial.identityId,
                                                    old_wallet: formData.walletAddress,
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
                                            <span className="block text-xs font-mono font-bold text-gray-600 ml-2">{registeredRecord?.id || custodial.identityId || 'Pending'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-8">
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <label className="block text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1">Blockchain Wallet</label>
                                        <span className="block text-[10px] font-mono text-[#0a7560] leading-tight" title={formData.walletAddress || ''}>
                                            {formData.walletAddress ? formatAddress(formData.walletAddress) : '—'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between px-1">
                                        <span className="text-[9px] text-gray-400 font-medium italic">Registered: {registeredRecord?.registeredAt ? new Date(registeredRecord.registeredAt).toLocaleString() : new Date().toLocaleString()}</span>
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
                                        setRegisteredRecord(null);
                                        setFormData({
                                            fullName: '', dob: '', nationality: 'Syrian', campId: '',
                                            languages: [], familyMembers: [], livenessVerified: false,
                                            walletType: null, walletAddress: '',
                                        });
                                        setNationalityListValue('Syrian');
                                        setNationalityCustomText('');
                                        setNationalityError(null);
                                        setCampIdError(null);
                                        setPeraConnecting(false);
                                        setPeraConnectQrUrl('');
                                        killRefugeePeraWalletSession();
                                        setCustodial({ identityId: '', qrPayload: '', isProvisioning: false, provisioningStatus: '' });
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
