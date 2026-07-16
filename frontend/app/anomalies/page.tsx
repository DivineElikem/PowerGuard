'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, ShieldCheck, History, Search } from 'lucide-react';
import { energyApi } from '@/services/api';
import { Reading } from '@/types';
import ReactMarkdown from 'react-markdown';


export default function AnomaliesPage() {
    const [selectedDevice, setSelectedDevice] = useState('sockets');
    const [anomalies, setAnomalies] = useState<Reading[]>([]);
    const [loading, setLoading] = useState(true);
    const [threshold, setThreshold] = useState<number>(0);
    const [isEditing, setIsEditing] = useState(false);
    const [editThreshold, setEditThreshold] = useState<number>(0);

    const devices = ['sockets', 'bulb_1', 'bulb_2'];

    const fetchData = async () => {
        setLoading(true);
        try {
            const [anomalyData, thresholdData] = await Promise.all([
                energyApi.getAnomalies(selectedDevice),
                energyApi.getDeviceThreshold(selectedDevice).catch(() => ({ threshold: 2500.0 }))
            ]);
            setAnomalies(anomalyData.anomalies);
            setThreshold(thresholdData.threshold);
            setEditThreshold(thresholdData.threshold);
        } catch (error) {
            console.error('Error fetching anomalies:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        setIsEditing(false); // Reset editing when device changes
    }, [selectedDevice]);

    const handleSaveThreshold = async () => {
        try {
            await energyApi.setDeviceThreshold(selectedDevice, editThreshold);
            setIsEditing(false);
            fetchData();
        } catch (error) {
            console.error('Error updating threshold:', error);
            alert('Failed to update threshold');
        }
    };

    return (
        <div className="space-y-8 pb-12">
            <header>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Anomaly Detection</h1>
                <p className="text-slate-500 font-medium">Identify and review unusual energy consumption patterns.</p>
            </header>

            {/* Device Selection & Controls */}
            <div className="flex flex-col lg:flex-row gap-6 items-start">
                <div className="w-full md:w-64 space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1 flex items-center gap-2">
                        <Search size={14} /> Select Device
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                        {devices.map((device) => (
                            <button
                                key={device}
                                onClick={() => setSelectedDevice(device)}
                                className={`text-left px-4 py-3 rounded-2xl transition-all font-medium ${selectedDevice === device
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
                                    }`}
                            >
                                {device === 'sockets' ? 'Combined Sockets' : device.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 space-y-6">
                    {/* Threshold Summary */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="bg-blue-50 p-3 rounded-2xl text-blue-600">
                                <ShieldCheck size={24} />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active Threshold</p>
                                {isEditing ? (
                                    <div className="flex items-center gap-2 mt-1">
                                        <input
                                            type="number"
                                            value={editThreshold}
                                            onChange={(e) => setEditThreshold(Number(e.target.value))}
                                            className="w-24 px-2 py-1 border border-blue-200 rounded-lg text-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <span className="text-slate-500 font-bold">W</span>
                                    </div>
                                ) : (
                                    <h3 className="text-xl font-bold text-slate-900">{threshold} Watts</h3>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {isEditing ? (
                                <>
                                    <button
                                        onClick={handleSaveThreshold}
                                        className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsEditing(false);
                                            setEditThreshold(threshold);
                                        }}
                                        className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors"
                                >
                                    Update Sensitivity
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Anomaly List */}
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-4 md:px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                            <h3 className="font-bold text-slate-900 flex items-center gap-2">
                                <History size={18} className="text-blue-500" /> Recent History
                            </h3>
                            <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">
                                Last 100 Readings
                            </span>
                        </div>

                        {loading ? (
                            <div className="p-20 flex flex-col items-center justify-center gap-4">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                                <p className="text-slate-400 font-medium">Analyzing patterns...</p>
                            </div>
                        ) : anomalies.length === 0 ? (
                            <div className="p-20 text-center">
                                <div className="bg-green-50 w-16 h-16 rounded-3xl flex items-center justify-center text-green-500 mx-auto mb-4">
                                    <ShieldCheck size={32} />
                                </div>
                                <h4 className="text-lg font-bold text-slate-900 mb-1">No Anomalies Detected</h4>
                                <p className="text-slate-500 font-medium">All readings for this device are within safe limits.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="px-4 md:px-8 py-4 text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Time</th>
                                            <th className="px-4 md:px-8 py-4 text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Reading (W)</th>
                                            <th className="px-4 md:px-8 py-4 text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {anomalies.map((reading) => (
                                            <tr key={reading.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-4 md:px-8 py-5 text-sm font-medium text-slate-600 tabular-nums">
                                                    {new Date(reading.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </td>
                                                <td className="px-4 md:px-8 py-5">
                                                    <span className="text-sm font-bold text-slate-900 tabular-nums">
                                                        {(reading.current * reading.voltage).toFixed(1)}
                                                    </span>
                                                </td>
                                                <td className="px-4 md:px-8 py-5 text-right">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-600">
                                                        <AlertCircle size={10} /> High
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Learning Corner */}
            <div className="bg-slate-900 rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10 max-w-2xl">
                    <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                        🔍 Educational Insight: Thresholds
                    </h3>
                    <div className="text-slate-300 font-medium leading-relaxed opacity-90 prose-invert max-w-none">
                        <ReactMarkdown>
                            {"Anomaly detection in this app works by comparing the **Real-time Power (W)** with a **Reference Threshold**.\n\nIf the device uses more power than the threshold you set, our backend flags it as an anomaly! In more advanced systems, AI can even learn the \"normal\" pattern automatically."}
                        </ReactMarkdown>
                    </div>

                </div>
                <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl"></div>
            </div>
        </div>
    );
}
