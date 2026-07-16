'use client';

import { useEffect, useState } from 'react';
import {
  Zap,
  Activity,
  AlertTriangle,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import StatCard from '@/components/StatCard';
import DeviceCard from '@/components/DeviceCard';
import DeviceControl from '@/components/DeviceControl';
import { energyApi } from '@/services/api';
import { Reading, DailySummary, Device } from '@/types';
import ReactMarkdown from 'react-markdown';


export default function Home() {
  const [latestReadings, setLatestReadings] = useState<Reading[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [readings, summary, deviceList] = await Promise.all([
          energyApi.getLatestReadings(),
          energyApi.getDailySummary(new Date().toISOString().split('T')[0]),
          energyApi.getAllDevices()
        ]);
        setLatestReadings(readings);
        setDailySummary(summary);
        setDevices(deviceList);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const liveReadings = latestReadings.filter(r => !r.device.startsWith('socket_'));

  const totalCurrentPower = liveReadings.reduce((sum, r) => sum + (r.current * r.voltage), 0);

  // Calculate anomalies dynamically
  const activeAnomaliesCount = liveReadings.filter(r => {
    const deviceConfig = devices.find(d => d.id === r.device);
    const threshold = deviceConfig ? deviceConfig.threshold : 2500.0;
    return (r.current * r.voltage) > threshold;
  }).length;


  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Energy Overview</h1>
          <p className="text-slate-500 font-medium">Monitoring {liveReadings.length} active devices</p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100">
          <Clock size={16} className="text-blue-500" />
          <span className="text-sm font-bold text-slate-700">
            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Current Power Draw"
          value={totalCurrentPower.toFixed(1)}
          unit="W"
          icon={Zap}
          color="bg-blue-500"
          trend={{
            value: Math.abs(dailySummary?.power_trend || 0),
            isUp: (dailySummary?.power_trend || 0) > 0
          }}
        />
        <StatCard
          title="Energy Today"
          value={dailySummary?.total_energy?.toFixed(3) || "0.000"}
          unit="kWh"
          icon={Activity}
          color="bg-purple-500"
        />
        <StatCard
          title="Active Anomalies"
          value={activeAnomaliesCount}
          icon={AlertTriangle}
          color="bg-red-500"
        />
        <StatCard
          title="Estimated Daily Cost"
          value={((dailySummary?.total_energy || 0) * 2.20).toFixed(2)}
          unit="GHC"
          icon={Zap}
          color="bg-green-500"
        />
      </div>

      {/* Device Control Section */}
      <DeviceControl />

      {/* Device Grid */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Connected Appliances</h2>
          <button className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">
            Manage All
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {liveReadings.length === 0 ? (
            <div className="col-span-full bg-white p-8 rounded-2xl border border-slate-100 text-center">
              <p className="text-slate-500 font-medium whitespace-pre-wrap">{"No live data received yet.\nCheck if the Firebase sync is running and connected."}</p>
            </div>
          ) : (
            liveReadings.map((reading) => {
              const deviceConfig = devices.find(d => d.id === reading.device);
              const threshold = deviceConfig ? deviceConfig.threshold : 2500.0;
              const isAnomaly = (reading.current * reading.voltage) > threshold;
              const displayName = reading.device === 'sockets' ? 'Combined Sockets' : reading.device.replace('_', ' ');

              return (
                <DeviceCard
                  key={reading.device}
                  name={displayName}
                  status={isAnomaly ? 'anomaly' : 'normal'}
                  currentPower={reading.current * reading.voltage}
                  threshold={threshold}
                  energyToday={dailySummary?.device_breakdown?.find(d => d.device === reading.device)?.total_energy || 0}
                  lastUpdate={new Date(reading.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                />
              );
            })
          )}
        </div>
      </section>

      {/* Learning Corner */}
      <div className="bg-blue-600 rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 text-white shadow-xl shadow-blue-200 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
            💡 Student Learning Corner
          </h3>
          <div className="text-blue-50 font-medium leading-relaxed opacity-90 prose-invert max-w-none">
            <ReactMarkdown>
              {"How does this dashboard work? The frontend uses a process called **polling** to request the latest readings from our backend every 10 seconds.\n\nEach card calculates **Power (Watts)** by multiplying **Voltage (Volts)** and **Current (Amps)** based on real sensor data!"}
            </ReactMarkdown>
          </div>

        </div>
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      </div>
    </div>
  );
}

