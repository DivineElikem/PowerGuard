'use client';

import { useEffect, useState, use } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';
import {
    ArrowLeft,
    Zap,
    Activity,
    Clock,
    AlertTriangle,
    Info
} from 'lucide-react';
import Link from 'next/link';
import { energyApi } from '@/services/api';
import { Reading, Device } from '@/types';
import ReactMarkdown from 'react-markdown';


export default function DeviceDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const deviceId = resolvedParams.id;

    const [readings, setReadings] = useState<Reading[]>([]);
    const [deviceInfo, setDeviceInfo] = useState<Device | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditingThreshold, setIsEditingThreshold] = useState(false);
    const [newThreshold, setNewThreshold] = useState<number>(0);

    const fetchData = async () => {
        try {
            const [history, info] = await Promise.all([
                energyApi.getDeviceReadings(deviceId, 30),
                energyApi.getDeviceThreshold(deviceId)
            ]);
            // Reverse history for chart (oldest to newest)
            setReadings([...history].reverse());
            setDeviceInfo(info);

            // Set input value only if not currently editing
            if (!isEditingThreshold) {
                setNewThreshold(info.threshold);
            }
        } catch (error) {
            console.error('Error fetching device details:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [deviceId]);

    const handleUpdateThreshold = async () => {
        try {
            await energyApi.setDeviceThreshold(deviceId, newThreshold);
            setIsEditingThreshold(false);
            fetchData();
        } catch (error) {
            console.error('Error updating threshold:', error);
            alert('Failed to update threshold');
        }
    };


    const latestReading = readings[readings.length - 1];
    const currentPower = latestReading ? (latestReading.current * latestReading.voltage) : 0;
    const isAnomaly = deviceInfo && currentPower > deviceInfo.threshold;

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            <Link
                href="/"
                className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold transition-colors group"
            >
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                Back to Dashboard
            </Link>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight capitalize mb-2">
                        {deviceId.replace('_', ' ')}
                    </h1>
                    <div className="flex flex-wrap items-center gap-3">
                        <span className={`px-4 py-1.5 rounded-full text-sm font-black flex items-center gap-2 ${isAnomaly ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                            }`}>
                            <Activity size={14} /> {isAnomaly ? 'Anomaly Detected' : 'Operating Normally'}
                        </span>
                        <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">
                            Live updates every 10s
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                {/* Real-time Stats */}
                <div className="lg:col-span-2 space-y-6 md:space-y-8">
                    <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] p-5 md:p-8 border border-slate-100 shadow-sm relative overflow-hidden">
                        <h3 className="text-lg font-bold text-slate-900 mb-6 md:mb-8 flex items-center gap-2">
                            <Zap size={20} className="text-yellow-500" /> Power Consumption (Watts)
                        </h3>

                        <div className="h-[260px] md:h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={readings.map(r => ({ ...r, power: r.current * r.voltage }))}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="timestamp"
                                        hide
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                                    />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        labelFormatter={(label) => new Date(label).toLocaleTimeString()}
                                        formatter={(value: any) => [`${value.toFixed(1)} W`, 'Power']}
                                    />
                                    {deviceInfo && deviceInfo.threshold > 0 && (
                                        <ReferenceLine
                                            y={deviceInfo.threshold}
                                            stroke="#ef4444"
                                            strokeDasharray="3 3"
                                            label={{ position: 'right', value: 'Threshold', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }}
                                        />
                                    )}
                                    <Line
                                        type="monotone"
                                        dataKey="power"
                                        stroke={isAnomaly ? "#ef4444" : "#3b82f6"}
                                        strokeWidth={4}
                                        dot={false}
                                        animationDuration={1000}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Clock size={14} className="text-blue-500" /> Recent Average Current
                            </p>
                            <div className="flex items-baseline gap-2">
                                <h4 className="text-3xl font-black text-slate-900">
                                    {(readings.reduce((sum, r) => sum + r.current, 0) / readings.length || 0).toFixed(2)}
                                </h4>
                                <span className="text-sm font-bold text-slate-400 italic">Amps</span>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Zap size={14} className="text-yellow-500" /> Voltage Stability
                            </p>
                            <div className="flex items-baseline gap-2">
                                <h4 className="text-3xl font-black text-slate-900">
                                    {(readings.reduce((sum, r) => sum + r.voltage, 0) / readings.length || 0).toFixed(1)}
                                </h4>
                                <span className="text-sm font-bold text-slate-400 italic">Volts</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Controls */}
                <div className="space-y-6">
                    <div className="bg-slate-900 rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-8 text-white shadow-xl relative overflow-hidden group">
                        <div className="relative z-10">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <AlertTriangle size={20} className="text-red-400" /> Sensitivity Settings
                            </h3>
                            <div className="space-y-4">
                                <p className="text-sm text-slate-400 font-medium leading-relaxed">
                                    Set the power threshold for this device. Any reading above this value will be flagged as an anomaly.
                                </p>
                                <div className="bg-white/10 rounded-2xl p-4 border border-white/5 space-y-4">
                                    {isEditingThreshold ? (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">New Threshold (W)</label>
                                                <input
                                                    type="number"
                                                    value={newThreshold}
                                                    onChange={(e) => setNewThreshold(Number(e.target.value))}
                                                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white font-bold focus:outline-none focus:border-blue-500"
                                                    placeholder="Enter Watts"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleUpdateThreshold}
                                                    className="flex-1 py-2 bg-blue-600 rounded-xl font-bold text-xs hover:bg-blue-700 transition-all"
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setIsEditingThreshold(false);
                                                        setNewThreshold(deviceInfo?.threshold || 0);
                                                    }}
                                                    className="flex-1 py-2 bg-white/10 rounded-xl font-bold text-xs hover:bg-white/20 transition-all"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Current Limit</span>
                                            <span className="text-2xl font-black">{deviceInfo?.threshold || 0} Watts</span>
                                            <button
                                                onClick={() => setIsEditingThreshold(true)}
                                                className="w-full mt-4 py-4 bg-blue-600 rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/40"
                                            >
                                                Adjust Threshold
                                            </button>
                                        </>
                                    )}
                                </div>

                            </div>
                        </div>
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <AlertTriangle size={120} />
                        </div>
                    </div>

                    <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-8 border border-slate-100 shadow-sm">
                        <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
                            <Info size={18} className="text-blue-500" /> Student Lab Note
                        </h4>
                        <div className="space-y-4 text-sm font-medium text-slate-600 leading-relaxed max-w-none">
                            <ReactMarkdown>
                                {"Notice how the chart updates? This is called **Real-time Data Visualization**."}
                            </ReactMarkdown>
                            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-xl text-blue-800">
                                <ReactMarkdown>
                                    {"**Formula:** Power (W) = Voltage (V) × Current (A). Try calculating the power for a specific point on the chart!"}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
