import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import StatCard from './StatCard';
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000');
const DANGER_RADIUS = 50;
const WARNING_RADIUS = 25;

const ORS_API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjI1NGE5ZmZlYmE4YzRlYzZhMzMyNGY0OTdlMjFhMzUzIiwiaCI6Im11cm11cjY0In0=';

// Warna dan Marker
const statusColor = (status) => {
  if (status === 'BAHAYA') return '#ef4444';
  if (status === 'SIAGA' || status === 'WASPADA') return '#f59e0b';
  return '#10b981';
};

const createIcon = (color) => L.divIcon({
  className: '',
  html: `<div style="width:28px; height:28px; border-radius:50% 50% 50% 0; background:${color}; border:3px solid white; transform:rotate(-45deg); box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -30],
});

const startIcon = L.divIcon({
  className: '',
  html: `<div style="width:32px;height:32px;border-radius:50%; background:#3b82f6;border:3px solid white; display:flex;align-items:center;justify-content:center; box-shadow:0 2px 10px rgba(59,130,246,0.5); font-size:14px;color:white;font-weight:bold;">A</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const endIcon = L.divIcon({
  className: '',
  html: `<div style="width:32px;height:32px;border-radius:50%; background:#8b5cf6;border:3px solid white; display:flex;align-items:center;justify-content:center; box-shadow:0 2px 10px rgba(139,92,246,0.5); font-size:14px;color:white;font-weight:bold;">B</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Helper peta
function FitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 1) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [60, 60] });
    }
  }, [bounds, map]);
  return null;
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Geocoding via Nominatim
async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', Surabaya')}&format=json&limit=1`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'id' } });
  const data = await res.json();
  if (!data.length) throw new Error(`Lokasi "${query}" tidak ditemukan`);
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), label: data[0].display_name };
}

// Helper untuk membuat zona menghindar
function createAvoidancePolygon(lat, lng, radiusMeter = 200) {
  const degreeOffset = radiusMeter / 111320;
  return [
    [
      [lng - degreeOffset, lat - degreeOffset],
      [lng + degreeOffset, lat - degreeOffset],
      [lng + degreeOffset, lat + degreeOffset],
      [lng - degreeOffset, lat + degreeOffset],
      [lng - degreeOffset, lat - degreeOffset]
    ]
  ];
}

// ORS Routing
async function getRoute(origin, destination, floodPoints = []) {
  const url = `https://api.openrouteservice.org/v2/directions/driving-car/geojson`;
  const activeFloods = floodPoints.filter(p => p.status !== 'AMAN');

  // Filter sensor yang tidak aman untuk dijadikan rintangan
  const avoidPolygons = activeFloods
    .map(p => createAvoidancePolygon(p.lat, p.lng, 50));

  const options = {};
  if (avoidPolygons.length > 0) {
    options.avoid_polygons = {
      type: "MultiPolygon",
      coordinates: avoidPolygons
    };
  }

  const body = {
    coordinates: [[origin.lng, origin.lat], [destination.lng, destination.lat]],
    options: options,
    units: "km",
    language: "id"
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': ORS_API_KEY
    },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  if (!res.ok) {
    if (data.error?.code === 2010) {
      throw new Error('Rute tidak ditemukan. Area tujuan atau asal mungkin terisolasi banjir.');
    }
    throw new Error(data.error?.message || 'Gagal menghitung rute.');
  }

  const feature = data.features[0];
  const routeCoords = feature.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  const steps = feature.properties.segments[0].steps.map(s => s.instruction);

  return {
    coords: routeCoords,
    distance: (feature.properties.summary.distance).toFixed(1),
    duration: Math.round(feature.properties.summary.duration / 60),
    steps: steps.slice(0, 15),
    isSafe: true,
  };
}

const GisMap = () => {
  const [sensors, setSensors] = useState([]);
  const [showNav, setShowNav] = useState(false);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [routeData, setRouteData] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState('');
  const [originCoord, setOriginCoord] = useState(null);
  const [destCoord, setDestCoord] = useState(null);
  const [avoidWarning, setAvoidWarning] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const surabayaCenter = [-7.2575, 112.7521];

  const fetchMapData = async () => {
    try {
      const response = await fetch('http://localhost:4000/app/api/sensor/monitor');
      const devices = await response.json();
      const mapData = devices.map(dev => ({
        id: dev.id,
        name: dev.name,
        location: dev.location?.alamat,
        lat: dev.location?.latitude || -7.2575,
        lng: dev.location?.longitude || 112.7521,
        depth: dev.logs[0]?.height || 0,
        status: dev.logs[0]?.waterStatus || 'AMAN',
      }));
      setSensors(mapData);
    } catch (error) {
      console.error('Gagal memuat data peta:', error);
    }
  };

  useEffect(() => {
    fetchMapData();
    socket.on('update-data', (newData) => {
      setSensors(prev => prev.map(s =>
        s.id === newData.deviceId
          ? { ...s, depth: newData.height, status: newData.status }
          : s
      ));
    });
    return () => socket.off('update-data');
  }, []);

  const stats = {
    total: sensors.length,
    danger: sensors.filter(s => s.status === 'BAHAYA').length,
    warning: sensors.filter(s => ['WASPADA', 'SIAGA'].includes(s.status)).length,
    safe: sensors.filter(s => s.status === 'AMAN').length,
  };

  const dangerSensors = sensors.filter(s =>
    s.status === 'BAHAYA' || s.status === 'SIAGA' || s.status === 'WASPADA'
  );

  const handleRoute = async () => {
    if (!origin.trim() || !destination.trim()) {
      setRouteError('Isi titik asal dan tujuan terlebih dahulu.');
      return;
    }
    setRouteLoading(true);
    setRouteError('');
    setRouteData(null);
    setAvoidWarning(false);
    setActiveStep(0);

    try {
      const [oCoord, dCoord] = await Promise.all([geocode(origin), geocode(destination)]);
      setOriginCoord(oCoord);
      setDestCoord(dCoord);

      const hasNearbyDanger = dangerSensors.some(pt =>
        haversine(oCoord.lat, oCoord.lng, pt.lat, pt.lng) < 3000 ||
        haversine(dCoord.lat, dCoord.lng, pt.lat, pt.lng) < 3000
      );
      if (hasNearbyDanger) setAvoidWarning(true);

      const route = await getRoute(oCoord, dCoord, sensors);
      setRouteData(route);
    } catch (err) {
      let friendlyMessage = err.message;
      if (err.message.includes("Unable to find a route")) {
        friendlyMessage = `Rute tidak ditemukan antara "${origin}" dan "${destination}". Jalur alternatif mungkin sepenuhnya terputus oleh area banjir.`;
      } else if (err.message.includes("Authorization")) {
        friendlyMessage = "Kunci API (API Key) ORS tidak valid atau tidak ditemukan.";
      }
      setRouteError(friendlyMessage);
    } finally {
      setRouteLoading(false);
    }
  };

  const clearRoute = () => {
    setRouteData(null);
    setOriginCoord(null);
    setDestCoord(null);
    setOrigin('');
    setDestination('');
    setRouteError('');
    setAvoidWarning(false);
    setActiveStep(0);
  };

  return (
    <div className="flex flex-col w-full h-screen max-h-[800px] bg-slate-50 rounded-3xl overflow-hidden shadow-2xl border border-slate-200">
      <div className="bg-white border-b border-slate-200 p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-slate-800">Visualisasi Geografis</h2>
          <p className="text-sm text-slate-500">Pemetaan Real-time Kota Surabaya</p>
        </div>
        <StatCard label="Total Sensor" count={stats.total} colorClass="text-blue-600" />
        <StatCard label="Waspada" count={stats.warning} colorClass="text-amber-500" />
        <StatCard label="Bahaya" count={stats.danger} colorClass="text-red-500" />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 z-[1000] md:hidden">
          <button
            onClick={() => { setShowNav(false); setIsPanelOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white shadow-xl rounded-full border border-blue-100 text-blue-600 font-bold text-xs"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            Titik Pantau
          </button>

          <button
            onClick={() => { setShowNav(true); setIsPanelOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white shadow-xl rounded-full border border-violet-100 text-violet-600 font-bold text-xs"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4" />
            </svg>
            Navigasi
          </button>
        </div>

        {/* Sidebar Responsive */}
        <div className={`${isPanelOpen ? 'fixed inset-0 z-[1050] flex' : 'hidden'} md:relative md:flex md:w-80 lg:w-96 bg-white border-r border-slate-200 overflow-y-auto flex-col`}>
          <button
            onClick={() => setIsPanelOpen(false)}
            className="md:hidden absolute top-4 right-4 p-2 bg-slate-100 rounded-full z-10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Tab Navigasi */}
          <div className="flex border-b border-slate-200 flex-shrink-0">
            <button
              onClick={() => setShowNav(false)}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${!showNav ? 'text-blue-600 border-b-2 border-blue-500 bg-blue-50' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Titik Pantau
            </button>
            <button
              onClick={() => setShowNav(true)}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 ${showNav ? 'text-violet-600 border-b-2 border-violet-500 bg-violet-50' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Navigasi
            </button>
          </div>

          {/* Panel Titik Pantau */}
          {!showNav && (
            <div className="p-5 space-y-3 overflow-y-auto flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-slate-700 italic">Daftar Titik Pantau</h3>
                <span className="px-2 py-1 bg-slate-100 text-[10px] rounded uppercase font-bold text-slate-500">Terupdate</span>
              </div>
              {sensors.map(sensor => (
                <div key={sensor.id} className={`p-4 rounded-xl border transition-all ${sensor.status === 'BAHAYA' ? 'bg-red-50 border-red-200' : sensor.status === 'SIAGA' || sensor.status === 'WASPADA' ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100 shadow-sm'}`}>
                  <div className="flex justify-between items-start">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${sensor.status === 'BAHAYA' ? 'bg-red-500 text-white' : sensor.status === 'SIAGA' || sensor.status === 'WASPADA' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'}`}>{sensor.status}</span>
                    <span className="text-xs text-slate-400 font-mono">{sensor.depth} cm</span>
                  </div>
                  <h4 className="font-bold text-slate-800 mt-2 leading-tight text-sm">{sensor.location}</h4>
                  <p className="text-[11px] text-slate-500 mt-1">{sensor.name}</p>
                </div>
              ))}
            </div>
          )}

          {/* Panel Navigasi */}
          {showNav && (
            <div className="p-5 flex-1 overflow-y-auto">
              <div className="mb-4">
                <h3 className="font-bold text-slate-800 text-base">Navigasi Hindari Banjir</h3>
                {/* <p className="text-[11px] text-slate-500 mt-0.5">Rute otomatis menggunakan engine <strong>OpenRouteService</strong></p> */}
              </div>

              {dangerSensors.length > 0 && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-[11px] text-red-600 font-semibold">⚠️ {dangerSensors.length} zona genangan terdeteksi</p>
                </div>
              )}

              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Titik Asal</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] font-bold">A</div>
                    <input type="text" value={origin} onChange={e => setOrigin(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRoute()} placeholder="Contoh: Jl. Basuki Rahmat" className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 bg-slate-50 text-black" />
                  </div>
                </div>

                <div className="flex justify-center">
                  <button onClick={() => { setOrigin(destination); setDestination(origin); }} className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200"><svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg></button>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Titik Tujuan</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center text-white text-[10px] font-bold">B</div>
                    <input type="text" value={destination} onChange={e => setDestination(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRoute()} placeholder="Contoh: UNESA Surabaya" className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-violet-400 bg-slate-50 text-black" />
                  </div>
                </div>
              </div>

              <button onClick={handleRoute} disabled={routeLoading} className="w-full py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-blue-500 to-violet-500 disabled:opacity-50 transition-all shadow-md">
                {routeLoading ? 'Menghitung rute...' : '🗺️ Cari Rute Aman'}
              </button>

              {routeError && <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-600">❌ {routeError}</div>}
              {avoidWarning && !routeError && <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-700">⚠️ Mengalihkan rute untuk menghindari genangan</div>}

              {routeData && (
                <div className="mt-4 space-y-3">
                  <div className="p-3 bg-gradient-to-r from-blue-50 to-violet-50 border border-blue-100 rounded-xl">
                    <div className="flex justify-between items-center text-center">
                      <div className="flex-1"><p className="text-[10px] text-slate-500 uppercase">Jarak</p><p className="text-lg font-bold text-slate-800">{routeData.distance} km</p></div>
                      <div className="w-px h-8 bg-slate-200" />
                      <div className="flex-1"><p className="text-[10px] text-slate-500 uppercase">Waktu</p><p className="text-lg font-bold text-slate-800">{routeData.duration} mnt</p></div>
                    </div>
                  </div>

                  {routeData.steps.length > 0 && (
                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                      {routeData.steps.map((step, i) => (
                        <button key={i} onClick={() => setActiveStep(i)} className={`w-full text-left flex items-start gap-2 p-2 rounded-lg text-[11px] ${activeStep === i ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                          <span className={`min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold mt-0.5 ${activeStep === i ? 'bg-blue-500 text-white' : 'bg-slate-200'}`}>{i + 1}</span>
                          <span>{step}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  <button onClick={clearRoute} className="w-full py-2 rounded-xl text-xs font-semibold text-slate-500 border border-slate-200 hover:bg-red-50 hover:text-red-500 transition-colors">✕ Hapus Rute</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Peta */}
        <div className="flex-1 relative">
          <MapContainer center={surabayaCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {routeData?.coords && <FitBounds bounds={routeData.coords} />}

            {sensors.map(sensor => (
              <React.Fragment key={sensor.id}>
                <Marker position={[sensor.lat, sensor.lng]} icon={createIcon(statusColor(sensor.status))}>
                  <Popup>
                    <div style={{ minWidth: 160 }}>
                      <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 12, background: statusColor(sensor.status), color: 'white', fontSize: 10, fontWeight: 'bold' }}>{sensor.status}</div>
                      <h4 style={{ fontWeight: 'bold', fontSize: 13, margin: '4px 0 2px' }}>{sensor.location}</h4>
                      <p style={{ margin: 0, fontSize: 12 }}>Ketinggian: <strong>{sensor.depth} cm</strong></p>
                    </div>
                  </Popup>
                </Marker>
                {sensor.status !== 'AMAN' && (
                  <Circle center={[sensor.lat, sensor.lng]} radius={sensor.status === 'BAHAYA' ? DANGER_RADIUS : WARNING_RADIUS} pathOptions={{ color: statusColor(sensor.status), fillOpacity: 0.12, weight: 2, dashArray: '6 4' }} />
                )}
              </React.Fragment>
            ))}

            {originCoord && <Marker position={[originCoord.lat, originCoord.lng]} icon={startIcon} />}
            {destCoord && <Marker position={[destCoord.lat, destCoord.lng]} icon={endIcon} />}

            {routeData && (
              <>
                <Polyline positions={routeData.coords} pathOptions={{ color: '#1e1b4b', weight: 8, opacity: 0.15 }} />
                <Polyline positions={routeData.coords} pathOptions={{ color: '#6366f1', weight: 5, opacity: 0.9 }} />
              </>
            )}
          </MapContainer>

          {/* Legenda */}
          <div className="absolute bottom-4 right-4 bg-white/95 p-3 rounded-xl shadow-lg z-[1000] border border-slate-100 text-[11px]">
            <p className="font-bold mb-2 text-slate-700">Keterangan</p>
            {[{ color: '#ef4444', label: 'Bahaya' }, { color: '#f59e0b', label: 'Waspada' }, { color: '#10b981', label: 'Aman' }].map(item => (
              <div key={item.label} className="flex items-center gap-2 mb-1">
                <span className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                <span className="text-slate-600">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GisMap;