import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, User, MapPin, Globe, CheckCircle, Loader2, X } from 'lucide-react';
import { api } from '../../utils/api';
import { clsx } from 'clsx';

const SearchRefugee = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('All');
    const [refugees, setRefugees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRefugee, setSelectedRefugee] = useState(null);

    const fetchRefugees = async () => {
        setLoading(true);
        try {
            const res = await api.getRefugees();
            if (res.success && Array.isArray(res.data)) {
                setRefugees(res.data);
            }
        } catch {
            setRefugees([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRefugees();
    }, []);

    const filters = ['All', ...new Set(refugees.flatMap(r => [r.campID, r.nationality].filter(Boolean)))].filter(f => f && f !== 'N/A');

    const filteredRefugees = refugees.filter(r => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = !term || (r.name || '').toLowerCase().includes(term) || (r.id || '').toLowerCase().includes(term) || (r.walletAddress || '').toLowerCase().includes(term);
        const matchesFilter = activeFilter === 'All' || r.campID === activeFilter || r.nationality === activeFilter;
        return matchesSearch && matchesFilter;
    });

    return (
        <div className="page-enter space-y-8 pb-20">
            <div>
                <h2 className="text-3xl font-bold text-[#e2eaf8] mb-2 font-sans tracking-tight">Identity Registry</h2>
                <p className="text-[#7a94bb] text-sm">Search and manage registered refugee identities within the system.</p>
            </div>

            {/* Search & Filter Bar */}
            <div className="space-y-6">
                <div className="flex gap-4">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#3d5278]">
                            <Search size={20} />
                        </div>
                        <input
                            className="w-full bg-[#0f1e38] border border-[#1a2d4a] rounded-xl pl-12 pr-4 py-4 text-[#e2eaf8] text-sm focus:outline-none focus:border-[#00c9b1] placeholder-[#3d5278] transition-all"
                            placeholder="Search by name, ID, or wallet address..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={fetchRefugees}
                        className="bg-[#00c9b1] text-[#060d1f] font-bold px-8 rounded-xl hover:bg-[#00e0c5] transition-all flex items-center gap-2"
                    >
                        <Search size={18} />
                        <span>SEARCH</span>
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-[#3d5278] text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 whitespace-nowrap">
                        <Filter size={14} /> Recommended Filters:
                    </span>
                    <div className="flex flex-wrap gap-2">
                        {filters.map(filter => (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter)}
                                className={clsx(
                                    "px-4 py-2 rounded-full text-xs font-semibold transition-all border",
                                    activeFilter === filter
                                        ? "bg-[#00c9b120] text-[#00c9b1] border-[#00c9b140]"
                                        : "bg-[#0f1e38] text-[#7a94bb] border-[#1a2d4a] hover:border-[#3d5278]"
                                )}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Results Grid */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 size={48} className="text-[#00c9b1] animate-spin mb-4" />
                    <p className="text-[#7a94bb] text-sm">Loading registry...</p>
                </div>
            ) : (
            <div className="grid md:grid-cols-2 gap-6">
                {filteredRefugees.map((refugee, i) => (
                    <div
                        key={refugee.id}
                        style={{ animationDelay: `${i * 100}ms` }}
                        className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-6 cursor-pointer hover:border-[#00c9b1] hover:shadow-[0_0_30px_rgba(0,201,177,0.1)] hover:-translate-y-1 transition-all group animate-[fadeSlideUp_0.4s_ease-out_both]"
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-[#152342] border border-[#1a2d4a] rounded-xl flex items-center justify-center font-bold text-[#e2eaf8] transition-colors group-hover:border-[#00c9b1/40]">
                                    {(refugee.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                                </div>
                                <div>
                                    <h3 className="text-[#e2eaf8] font-bold text-lg leading-none mb-1.5">{refugee.name}</h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-mono font-bold text-[#00c9b1] bg-[#00c9b105] px-1.5 py-0.5 rounded border border-[#00c9b115]">{refugee.id}</span>
                                    </div>
                                </div>
                            </div>
                            <div className={clsx(
                                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter border",
                                refugee.aidClaimed
                                    ? "bg-[#10b98120] text-[#10b981] border-[#10b98140]"
                                    : "bg-[#f59e0b20] text-[#f59e0b] border-[#f59e0b40]"
                            )}>
                                {refugee.aidClaimed ? (
                                    <><CheckCircle size={12} /> Aid Issued</>
                                ) : 'Awaiting Aid'}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6 mb-8">
                            <div className="space-y-1">
                                <label className="text-[10px] text-[#3d5278] font-bold uppercase tracking-widest pl-2 border-l border-[#1a2d4a]">Location</label>
                                <div className="flex items-center gap-1.5 text-xs text-[#7a94bb]">
                                    <MapPin size={14} /> {refugee.campID}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-[#3d5278] font-bold uppercase tracking-widest pl-2 border-l border-[#1a2d4a]">Origin</label>
                                <div className="flex items-center gap-1.5 text-xs text-[#7a94bb]">
                                    <Globe size={14} /> {refugee.nationality}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-[#3d5278] font-bold uppercase tracking-widest pl-2 border-l border-[#1a2d4a]">System ID</label>
                                <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#e2eaf8]">
                                    {refugee.walletAddress ? `${refugee.walletAddress.slice(0, 10)}...${refugee.walletAddress.slice(-4)}` : '—'}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-[#3d5278] font-bold uppercase tracking-widest pl-2 border-l border-[#1a2d4a]">Type</label>
                                <div className="flex items-center gap-1.5 text-xs text-[#00c9b1] font-semibold">
                                    <User size={14} /> {refugee.walletType === 'pera' ? 'Self-Sovereign' : 'Managed'}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-[#1a2d4a] group-hover:border-[#00c9b1/20]">
                            <span className="text-[#3d5278] text-[10px] italic">Registered on {new Date(refugee.registeredAt).toLocaleDateString()}</span>
                            <button
                                onClick={() => setSelectedRefugee(refugee)}
                                className="flex items-center gap-2 text-[#00c9b1] font-bold text-xs hover:text-[#00e0c5] transition-colors"
                            >
                                VIEW PROFILE <Eye size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            )}

            {!loading && filteredRefugees.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Search size={48} className="text-[#1a2d4a] mb-4" />
                    <h3 className="text-[#e2eaf8] text-xl font-bold">No results found</h3>
                    <p className="text-[#7a94bb] text-sm mt-2">Try adjusting your search terms or filters.</p>
                </div>
            )}

            {/* Full Wallet Address Modal - aid worker only sees origin, location, system-id; click to reveal full address */}
            {selectedRefugee && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    onClick={() => setSelectedRefugee(null)}
                >
                    <div
                        className="bg-[#0f1e38] border border-[#1a2d4a] rounded-2xl p-8 max-w-md w-full shadow-2xl animate-[fadeSlideUp_0.3s_ease-out]"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-lg font-bold text-[#e2eaf8]">System ID / Wallet Address</h3>
                            <button
                                onClick={() => setSelectedRefugee(null)}
                                className="p-2 text-[#3d5278] hover:text-[#e2eaf8] hover:bg-[#152342] rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <p className="text-[#00c9b1] font-mono text-sm break-all p-4 bg-[#060d1f] rounded-lg border border-[#1a2d4a]">
                            {selectedRefugee.walletAddress || '—'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchRefugee;
