import { useState } from 'react';
import Dashboard from '../components/Dashboard';
import GisMap from '../components/GisMap';
import { initialSensorData } from '../data/iotData';

const MainPage = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [sensors] = useState(initialSensorData); // Data dipusatkan di sini

    return (
        <div className="min-h-screen bg-slate-50 font-inter">
            <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-[1001]">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl">S</div>
                            <h1 className="font-black text-slate-800 text-xl tracking-tight uppercase">S.I.G.A.S.</h1>
                        </div>

                        {/* Menu Navigasi */}
                        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                            <button
                                onClick={() => setActiveTab('dashboard')}
                                className={`px-4 py-2 rounded-md text-sm font-bold transition ${activeTab === 'dashboard' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Dashboard
                            </button>
                            <button
                                onClick={() => setActiveTab('gis')}
                                className={`px-4 py-2 rounded-md text-sm font-bold transition ${activeTab === 'gis' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Peta SIG
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {activeTab === 'dashboard' ? (
                    <Dashboard initialData={sensors} />
                ) : (
                    <div className="space-y-6">
                        <div className="flex flex-col items-center justify-center text-center">
                            <h2 className="text-2xl font-black text-slate-800">Visualisasi Geografis</h2>
                            <p className="text-slate-500">Pemetaan titik sensor jalan protokol Surabaya secara real-time.</p>
                        </div>
                        <GisMap sensors={sensors} />
                    </div>
                )}
            </main>
        </div>
    );
};

export default MainPage;