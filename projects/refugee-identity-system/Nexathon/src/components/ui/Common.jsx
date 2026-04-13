import React from 'react';
import { clsx } from 'clsx';
import { TrendingUp, TrendingDown } from 'lucide-react';

export const StatCard = ({ icon: Icon, label, value, change, changeType, accentColor, className }) => {
    return (
        <div className={clsx(
            "bg-[#0f1e38] border border-[#1a2d4a] rounded-xl p-6 hover:border-[#1e3a5f] transition-all duration-200 relative overflow-hidden",
            className
        )}>
            <div
                className="absolute left-0 top-0 bottom-0 w-1"
                style={{ backgroundColor: accentColor }}
            />

            <div className="flex justify-between items-start mb-4">
                <label className="block text-[#7a94bb] text-[10px] font-bold uppercase tracking-widest">
                    {label}
                </label>
                <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${accentColor}15`, color: accentColor }}
                >
                    <Icon size={20} />
                </div>
            </div>

            <div className="flex items-end gap-3">
                <h3 className="text-3xl font-bold text-[#e2eaf8] leading-none">{value}</h3>
                {change && (
                    <div className={clsx(
                        "flex items-center gap-1 text-xs font-semibold pb-1",
                        changeType === 'up' ? "text-[#10b981]" : "text-[#ef4444]"
                    )}>
                        {changeType === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {change}
                    </div>
                )}
            </div>
        </div>
    );
};

export const LoadingSpinner = ({ size = 'md', label }) => {
    const sizes = {
        sm: 'w-4 h-4 border-2',
        md: 'w-8 h-8 border-[3px]',
        lg: 'w-12 h-12 border-4'
    };

    return (
        <div className="flex flex-col items-center justify-center gap-3">
            <div className={clsx(
                "border-[#1a2d4a] border-t-[#00c9b1] rounded-full spin",
                sizes[size]
            )} />
            {label && (
                <p className="text-[#7a94bb] text-sm font-medium animate-pulse">{label}</p>
            )}
        </div>
    );
};
