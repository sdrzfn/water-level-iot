import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Dashboard from '../components/Dashboard';
import GisMap from '../components/GisMap';
import HistoryPage from '../components/HistoryPage';

// Inisialisasi socket di luar komponen agar tidak reconnect setiap render
const socket = io('http://localhost:4000');

const MainPage = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [sensors, setSensors] = useState([]); // Mulai dengan array kosong
    const [loading, setLoading] = useState(true);

    // Fungsi fetch data awal untuk mengisi state sensors
    const fetchAllData = async () => {
        try {
            const response = await fetch('http://localhost:4000/app/api/sensor/monitor');
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            
            // Format data agar sesuai dengan kebutuhan Dashboard & GisMap
            const formatted = data.map(dev => ({
                id: dev.id,
                name: dev.name,
                location: dev.location?.alamat || "Lokasi tidak diketahui",
                lat: dev.location?.latitude || -7.2575,
                lng: dev.location?.longitude || 112.7521,
                depth: dev.logs[0]?.height || 0,
                status: dev.logs[0]?.waterStatus || "AMAN",
                // Tambahkan properti color untuk SensorCard
                color: dev.logs[0]?.waterStatus === 'BAHAYA' ? 'bg-red-500' : 
                       dev.logs[0]?.waterStatus === 'SIAGA' ? 'bg-amber-400' : 'bg-emerald-400'
            }));
            
            setSensors(formatted);
            setLoading(false);
        } catch (error) {
            console.error("Gagal mengambil data awal:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();

        // Mendengarkan update dari Backend (Socket.io)
        socket.on('update-data', (newData) => {
            setSensors(prevSensors => prevSensors.map(sensor => {
                if (sensor.id === newData.deviceId) {
                    return {
                        ...sensor,
                        depth: newData.height,
                        status: newData.status,
                        color: newData.status === 'BAHAYA' ? 'bg-red-500' : 
                               newData.status === 'SIAGA' ? 'bg-amber-400' : 'bg-emerald-400'
                    };
                }
                return sensor;
            }));
        });

        return () => socket.off('update-data');
    }, []);

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-500 font-bold">Menghubungkan ke Server SIGAS...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-inter">
            <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-[1001]">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl">S</div>
                            <h1 className="font-black text-slate-800 text-xl tracking-normal uppercase">SIGAS</h1>
                        </div>
                        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                            <button
                                onClick={() => setActiveTab('dashboard')}
                                className={`px-4 py-2 rounded-md text-sm font-bold transition ${activeTab === 'dashboard' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Dashboard
                            </button>
                            <button
                                onClick={() => setActiveTab('gismap')}
                                className={`px-4 py-2 rounded-md text-sm font-bold transition ${activeTab === 'gismap' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Peta SIG
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`px-4 py-2 rounded-md text-sm font-bold transition ${activeTab === 'history' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Data Historis
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Kirim data sensors hasil fetching sebagai props ke anak komponen */}
                {activeTab === 'dashboard' ? (
                    <Dashboard sensors={sensors} /> 
                ) : activeTab === 'gismap' ? (
                    <div className="space-y-6">
                        <GisMap sensors={sensors} />
                    </div>
                ) : (
                    <div className="space-y-6">
                        <HistoryPage sensors={sensors} />
                    </div>
                )}
            </main>
        </div>
    );
};

export default MainPage;

// import { useState } from 'react';
// import Dashboard from '../components/Dashboard';
// import GisMap from '../components/GisMap';
// import { initialSensorData } from '../data/iotData';

// const MainPage = () => {
//     const [activeTab, setActiveTab] = useState('dashboard');
//     const [sensors] = useState(initialSensorData); // Data dipusatkan di sini

//     return (
//         <div className="min-h-screen bg-slate-50 font-inter">
//             <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-[1001]">
//                 <div className="max-w-7xl mx-auto flex justify-between items-center">
//                     <div className="flex items-center gap-8">
//                         <div className="flex items-center gap-3">
//                             <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl">S</div>
//                             <h1 className="font-black text-slate-800 text-xl tracking-normal uppercase">SIGAS</h1>
//                         </div>

//                         {/* Menu Navigasi */}
//                         <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
//                             <button
//                                 onClick={() => setActiveTab('dashboard')}
//                                 className={`px-4 py-2 rounded-md text-sm font-bold transition ${activeTab === 'dashboard' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
//                             >
//                                 Dashboard
//                             </button>
//                             <button
//                                 onClick={() => setActiveTab('gis')}
//                                 className={`px-4 py-2 rounded-md text-sm font-bold transition ${activeTab === 'gis' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
//                             >
//                                 Peta SIG
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             </nav>

//             <main className="max-w-7xl mx-auto px-6 py-8">
//                 {activeTab === 'dashboard' ? (
//                     <Dashboard initialData={sensors} />
//                 ) : (
//                     <div className="space-y-6">
//                         <div className="flex flex-col items-center justify-center text-center">
//                             <h2 className="text-2xl font-black text-slate-800">Peta Geografis</h2>
//                             <p className="text-slate-500">Pemetaan titik sensor jalan protokol Surabaya secara real-time.</p>
//                         </div>
//                         <GisMap sensors={sensors} />
//                     </div>
//                 )}
//             </main>
//         </div>
//     );
// };

// export default MainPage;