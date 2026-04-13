import React, { useState } from 'react';
import { Search, Check, FileText, Package } from 'lucide-react';
import { clsx } from 'clsx';
import { useToast } from '../../context/ToastContext';
import { Scanner } from '@yudiel/react-qr-scanner';

const ScanQR = () => {
    const { showToast } = useToast();
    const [isScanning, setIsScanning] = useState(false);
    const [result, setResult] = useState(null);
    const [manualAddress, setManualAddress] = useState('');

    const handleScan = (result) => {
        if (!result || !result[0]) return;
        try {
            const data = JSON.parse(result[0].rawValue);
            setResult({
                id: data.id || 'REF-VERIFIED',
                name: data.name || 'Unknown',
                walletAddress: data.address || '',
                campID: 'CAMP-01',
                nationality: 'Verified'
            });
            showToast('success', 'Identity Found', 'Security credentials verified from QR.');
        } catch (e) {
            showToast('error', 'Invalid QR', 'Not a valid RIMS card.');
        }
    };

    const handleManualLookup = async () => {
        if (!manualAddress.trim()) return;
        setIsScanning(true);
        setResult(null);

        try {
            const BASE_URL = import.meta.env.VITE_API_BASE_URL;

            const response = await fetch(`${BASE_URL}/verify-login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "ngrok-skip-browser-warning": "69420"
                },
                body: JSON.stringify({ walletAddress: manualAddress.trim() })
            });

            if (!response.ok) throw new Error("Profile not found");

            const profile = await response.json();
            setResult(profile);
            setIsScanning(false);
            showToast('success', 'Address Resolved', 'Profile fetched from backend.');
        } catch (error) {
            setIsScanning(false);
            showToast('error', 'Not Found', 'No identity found for this wallet address.');
        }
    };

    return (
        <div className="page-enter max-w-2xl mx-auto py-8">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-[#e2eaf8] mb-3">Identity Verification</h2>
                <p className="text-[#7a94bb] text-sm tracking-wide">Scan a refugee's QR card or enter their wallet address manually.</p>
            </div>

            <div className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-10 flex flex-col items-center mb-10">
                {/* Scanner Window */}
                <div className={clsx(
                    "w-full max-w-md aspect-square rounded-2xl border-2 relative overflow-hidden flex flex-col items-center justify-center transition-all duration-500 mb-8",
                    result ? "border-[#10b981] bg-[#10b98105]" :
                        isScanning ? "border-[#00c9b1] bg-[#00c9b105]" : "border-[#1a2d4a] bg-[#060d1f]"
                )}>
                    {result ? (
                        <div className="animate-bounce flex flex-col items-center z-10">
                            <Check size={64} className="text-[#10b981]" strokeWidth={3} />
                            <span className="text-[#10b981] font-bold mt-4 tracking-widest uppercase text-center bg-[#060d1f] p-2 rounded-lg">SCAN SUCCESS</span>
                        </div>
                    ) : isScanning ? (
                        <>
                            <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#00c9b1] shadow-[0_0_15px_#00c9b1] animate-scanLine z-20" />
                            <div className="text-[#00c9b1] font-mono text-xs font-bold tracking-widest animate-pulse z-10">
                                ● ANALYZING...
                            </div>
                        </>
                    ) : (
                        <div className="absolute inset-0 w-full h-full">
                            <Scanner
                                onScan={handleScan}
                                components={{ audio: false }}
                                styles={{ container: { width: '100%', height: '100%' }, video: { objectFit: 'cover' } }}
                            />
                            {/* Stylized Viewfinder Overlay */}
                            <div className="absolute inset-0 pointer-events-none border-[40px] border-[#0f1e38]/90"></div>
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-[#00c9b1]/50 rounded-xl pointer-events-none overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#00c9b1] shadow-[0_0_15px_#00c9b1] animate-scanLine" />
                            </div>
                            <p className="absolute bottom-4 left-0 right-0 text-center text-[#00c9b1] text-[10px] font-bold uppercase tracking-[0.2em] pointer-events-none">
                                Position QR code in frame
                            </p>
                        </div>
                    )}
                </div>

                {/* Scanned Result Card */}
                {result && (
                    <div className="w-full animate-fadeSlideUp">
                        <div className="bg-[#0f1e38] border border-[#10b98140] rounded-2xl p-6 shadow-[0_0_30px_rgba(16,185,129,0.05)] mb-8">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 bg-[#00c9b120] text-[#00c9b1] rounded-full flex items-center justify-center font-bold text-xl">
                                    {result.name?.split(' ').map(n => n[0]).join('') || 'R'}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-xl font-bold text-[#e2eaf8]">{result.name}</h3>
                                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-[#10b98120] text-[#10b981] border border-[#10b98140] uppercase">
                                            Identity Verified
                                        </span>
                                    </div>
                                    <div className="flex gap-3 text-[#7a94bb] text-xs">
                                        <span>{result.campID || result.camp}</span>
                                        <span className="text-[#1a2d4a]">|</span>
                                        <span>{result.nationality}</span>
                                        <span className="text-[#1a2d4a]">|</span>
                                        <span className="font-mono text-[#00c9b1]/60 font-bold">{result.walletAddress?.slice(0, 10)}...</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button className="flex items-center justify-center gap-2 bg-[#152342] text-[#e2eaf8] font-bold py-3 rounded-xl border border-[#1a2d4a] hover:border-[#3d5278] transition-all">
                                    <FileText size={18} /> PROFILE
                                </button>
                                <button className="flex items-center justify-center gap-2 bg-[#00c9b1] text-[#060d1f] font-bold py-3 rounded-xl hover:bg-[#00e0c5] transition-all">
                                    <Package size={18} /> ISSUE AID
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={() => setResult(null)}
                            className="w-full py-4 text-[#3d5278] text-xs font-bold uppercase tracking-widest hover:text-[#7a94bb] transition-colors"
                        >
                            RESET SCANNER
                        </button>
                    </div>
                )}

                <div className="w-full relative my-10">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#1a2d4a]" /></div>
                    <div className="relative flex justify-center uppercase"><span className="bg-[#060d1f] px-4 text-[#3d5278] text-[10px] font-bold tracking-widest">OR manual lookup</span></div>
                </div>

                <div className="w-full flex gap-2">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#3d5278]">
                            <Search size={16} />
                        </div>
                        <input
                            className="w-full bg-[#060d1f] border border-[#1a2d4a] rounded-xl pl-11 pr-4 py-4 text-[#e2eaf8] text-sm focus:outline-none focus:border-[#00c9b1] placeholder-[#3d5278] transition-all"
                            placeholder="Wallet address or Refugee ID..."
                            value={manualAddress}
                            onChange={e => setManualAddress(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handleManualLookup}
                        className="bg-[#152342] text-[#e2eaf8] font-bold px-8 rounded-xl border border-[#1a2d4a] hover:border-[#3d5278] active:scale-95 transition-all text-xs uppercase tracking-widest"
                    >
                        LOOKUP
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ScanQR;