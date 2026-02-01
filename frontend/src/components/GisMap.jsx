import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix icon marker default leaflet
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const GisMap = ({ sensors }) => {
    const surabayaCenter = [-7.2575, 112.7521];
    const [selectedSensor, setSelectedSensor] = useState(null);

    // Statistik untuk Dashboard
    const stats = {
        total: sensors.length,
        danger: sensors.filter(s => s.status === "Bahaya").length,
        warning: sensors.filter(s => s.status === "Waspada").length,
        safe: sensors.filter(s => s.status === "Aman").length,
    };

    const dangerousRoads = sensors.filter(s => s.status === "Bahaya");

    return (
        <div className="flex flex-col w-full h-screen max-h-[800px] bg-slate-50 rounded-3xl overflow-hidden shadow-2xl border border-slate-200">
            
            {/* 1. TOP HEADER / STATS BAR */}
            <div className="bg-white border-b border-slate-200 p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex flex-col">
                    <h2 className="text-xl font-bold text-slate-800">Monitoring Genangan</h2>
                    <p className="text-sm text-slate-500">Kota Surabaya - Realtime</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-700">Total Sensor</span>
                    <span className="text-2xl font-bold text-blue-800">{stats.total}</span>
                </div>
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 flex justify-between items-center">
                    <span className="text-sm font-medium text-amber-700">Waspada</span>
                    <span className="text-2xl font-bold text-amber-800">{stats.warning}</span>
                </div>
                <div className="bg-red-50 p-3 rounded-xl border border-red-100 flex justify-between items-center">
                    <span className="text-sm font-medium text-red-700">Bahaya (Banjir)</span>
                    <span className="text-2xl font-bold text-red-800">{stats.danger}</span>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* 2. SIDEBAR INFO */}
                <div className="w-80 md:w-96 bg-white border-r border-slate-200 overflow-y-auto p-5 hidden md:block">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-700 italic">Daftar Titik Pantau</h3>
                        <span className="px-2 py-1 bg-slate-100 text-[10px] rounded uppercase font-bold text-slate-500">Terupdate</span>
                    </div>

                    <div className="space-y-3">
                        {sensors.length > 0 ? (
                            sensors.map(sensor => (
                                <button 
                                    key={sensor.id}
                                    onClick={() => setSelectedSensor(sensor)}
                                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                                        sensor.status === 'Bahaya' 
                                        ? 'bg-red-50 border-red-200 hover:bg-red-100' 
                                        : 'bg-white border-slate-100 hover:border-blue-300 shadow-sm'
                                    }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                            sensor.status === 'Bahaya' ? 'bg-red-500 text-white' : 
                                            sensor.status === 'Waspada' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
                                        }`}>
                                            {sensor.status}
                                        </span>
                                        <span className="text-xs text-slate-400 font-mono">{sensor.depth} cm</span>
                                    </div>
                                    <h4 className="font-bold text-slate-800 mt-2 leading-tight">{sensor.location}</h4>
                                    <p className="text-[11px] text-slate-500 mt-1">{sensor.name}</p>
                                </button>
                            ))
                        ) : (
                            <p className="text-center text-slate-400 py-10">Data tidak ditemukan</p>
                        )}
                    </div>
                </div>

                {/* 3. MAP VIEW */}
                <div className="flex-1 relative">
                    <MapContainer center={surabayaCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; OpenStreetMap'
                        />

                        {sensors.map(sensor => (
                            <div key={sensor.id}>
                                <Marker position={[sensor.lat, sensor.lng]}>
                                    <Popup>
                                        <div className="p-1">
                                            <h4 className="font-bold text-blue-700">{sensor.location}</h4>
                                            <p className="text-xs text-slate-600 mb-2">{sensor.name}</p>
                                            <div className="grid grid-cols-2 gap-2 border-t pt-2">
                                                <div>
                                                    <p className="text-[10px] uppercase text-slate-400">Status</p>
                                                    <p className="font-bold text-sm">{sensor.status}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase text-slate-400">Ketinggian</p>
                                                    <p className="font-bold text-sm">{sensor.depth} cm</p>
                                                </div>
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>

                                <Circle
                                    center={[sensor.lat, sensor.lng]}
                                    radius={500}
                                    pathOptions={{
                                        color: sensor.status === 'Bahaya' ? '#ef4444' : sensor.status === 'Waspada' ? '#f59e0b' : 'transparent',
                                        fillColor: sensor.status === 'Bahaya' ? '#ef4444' : sensor.status === 'Waspada' ? '#f59e0b' : 'transparent',
                                        fillOpacity: 0.15,
                                        weight: 2
                                    }}
                                />
                            </div>
                        ))}
                    </MapContainer>

                    {/* Legend Overlay on Map */}
                    <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur-md p-3 rounded-lg shadow-xl z-[1000] border border-white/20 text-[11px]">
                        <p className="font-bold mb-2 text-slate-700">Keterangan Radius:</p>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="w-3 h-3 rounded-full bg-red-500"></span> <span style={{color: "darkred"}}>Bahaya (&gt; 30cm)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-amber-500"></span> <span style={{color: "darkorange"}}>Waspada (10-30cm)</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GisMap;