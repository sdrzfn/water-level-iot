import { useState, useEffect } from 'react';
import { initialSensorData } from '../data/iotData';
import SensorCard from './SensorCard';
import StatCard from './StatCard';

const Dashboard = () => {
  const [sensors, setSensors] = useState(initialSensorData);
  const [lastUpdate, setLastUpdate] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const interval = setInterval(() => {
      setSensors(prevSensors => {
        const randomIndex = Math.floor(Math.random() * prevSensors.length);
        const newDepth = Math.floor(Math.random() * 40);
        
        let newStatus = "Aman";
        let newColor = "bg-emerald-400";

        if (newDepth >= 20) {
          newStatus = "Bahaya";
          newColor = "bg-red-500";
        } else if (newDepth >= 10) {
          newStatus = "Waspada";
          newColor = "bg-amber-400";
        }

        const newSensors = [...prevSensors];
        newSensors[randomIndex] = { 
          ...newSensors[randomIndex], 
          depth: newDepth, 
          status: newStatus, 
          color: newColor 
        };
        return newSensors;
      });
      setLastUpdate(new Date().toLocaleTimeString());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const stats = {
    aman: sensors.filter(s => s.status === "Aman").length,
    waspada: sensors.filter(s => s.status === "Waspada").length,
    bahaya: sensors.filter(s => s.status === "Bahaya").length,
  };

  return (
    <div className="min-height-screen bg-slate-50 font-inter">
      {/* Header */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl">S</div>
            <h1 className="font-black text-slate-800 text-xl tracking-tight">KOTA <span className="text-blue-600"> SURABAYA</span></h1>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest leading-none mb-1">Update Terakhir</p>
            <p className="text-slate-700 font-mono font-bold">{lastUpdate}</p>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Ringkasan Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatCard label="Titik Aman" count={stats.aman} colorClass="text-emerald-500" />
          <StatCard label="Titik Waspada" count={stats.waspada} colorClass="text-amber-500" />
          <StatCard label="Titik Bahaya" count={stats.bahaya} colorClass="text-red-500" />
        </div>

        {/* Grid Sensor */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {sensors.map(sensor => (
            <SensorCard key={sensor.id} sensor={sensor} />
          ))}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;