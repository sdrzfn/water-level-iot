import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import SensorCard from './SensorCard';
import StatCard from './StatCard';

const socket = io('http://localhost:4000');

const Dashboard = () => {
  const [sensors, setSensors] = useState([]);
  const [lastUpdate, setLastUpdate] = useState("-");
  const [loading, setLoading] = useState(true);

  const getStatusColor = (status) => {
    const s = status?.toUpperCase();
    if (s === 'BAHAYA') return 'bg-red-500';
    if (s === 'WASPADA' || s === 'SIAGA') return 'bg-amber-400';
    return 'bg-emerald-400';
  };

  const fetchInitialData = async () => {
    try {
      const response = await fetch('http://localhost:4000/app/api/sensor/monitor');
      const devices = await response.json();

      const formattedData = devices.map(device => {
        const latestLog = device.logs[0] || {};
        return {
          id: device.id,
          serial: device.serialNumber, // ALAT_GENANGAN_01
          name: device.name,
          location: device.location?.alamat || "Lokasi tidak terdaftar",
          depth: latestLog.height || 0,
          status: latestLog.waterStatus || "AMAN",
          color: getStatusColor(latestLog.waterStatus)
        };
      });

      setSensors(formattedData);
      setLoading(false);
    } catch (error) {
      console.error("Fetch Error:", error);
    }
  };

  useEffect(() => {
    fetchInitialData();
    // Listener socket.io
    socket.on('update-data', (newData) => {
      console.log("Menerima data real-time:", newData);

      setSensors(prevSensors => {
        return prevSensors.map(sensor => {
          if (sensor.id === newData.deviceId) {
            return {
              ...sensor,
              depth: newData.height,
              status: newData.status,
              color: getStatusColor(newData.status)
            };
          }
          return sensor;
        });
      });
      setLastUpdate(new Date().toLocaleTimeString());
    });

    return () => {
      socket.off('update-data');
    };
  }, []);

  const stats = {
    aman: sensors.filter(s => s.status.toUpperCase() === "AMAN").length,
    waspada: sensors.filter(s => ["WASPADA", "SIAGA"].includes(s.status.toUpperCase())).length,
    bahaya: sensors.filter(s => s.status.toUpperCase() === "BAHAYA").length,
  };

  if (loading && sensors.length === 0) {
    return <div className="h-screen flex items-center justify-center font-inter">Sinkronisasi data database...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-inter">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="font-black text-slate-800 text-xl tracking-tight">
              SISTEM INFORMASI GENANGAN AIR <span className="text-blue-600"> SURABAYA</span>
            </h1>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest leading-none mb-1">Update Terakhir</p>
            <p className="text-slate-700 font-mono font-bold">{lastUpdate}</p>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatCard label="Titik Aman" count={stats.aman} colorClass="text-emerald-500" />
          <StatCard label="Titik Waspada" count={stats.waspada} colorClass="text-amber-500" />
          <StatCard label="Titik Bahaya" count={stats.bahaya} colorClass="text-red-500" />
        </div>

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

// import { useState, useEffect } from 'react';
// import { initialSensorData } from '../data/iotData';
// import SensorCard from './SensorCard';
// import StatCard from './StatCard';

// const Dashboard = () => {
//   // const [sensors, setSensors] = useState([]);
//   const [sensors, setSensors] = useState([initialSensorData]);
//   // const [lastUpdate, setLastUpdate] = useState("-");
//   const [lastUpdate, setLastUpdate] = useState(new Date().toLocaleTimeString());
//   const [loading, setLoading] = useState(true);

//   // const getStatusColor = (status) => {
//   //   switch (status?.toLowerCase()) {
//   //     case 'bahaya':
//   //       return 'bg-red-500';
//   //     case 'waspada':
//   //       return 'bg-amber-400';
//   //     case 'aman':
//   //     default:
//   //       return 'bg-emerald-400';
//   //   }
//   // };

//   // const fetchSensorData = async () => {
//   //   try {
//   //     const response = await fetch('http://localhost:4000/app/api/sensor');
//   //     if (!response.ok) throw new Error('Gagal mengambil data');

//   //     const data = await response.json();

//   //     const formattedData = data.map(sensor => ({
//   //       ...sensor,
//   //       color: getStatusColor(sensor.status)
//   //     }));

//   //     setSensors(formattedData);
//   //     setLastUpdate(new Date().toLocaleTimeString());
//   //     setLoading(false);
//   //   } catch (error) {
//   //     console.error("Error fetching data:", error);
//   //   }
//   // };

//   useEffect(() => {
//     // fetchSensorData();

//     const interval = setInterval(() => {
//       // fetchSensorData();
//       setSensors(prevSensors => {
//         const randomIndex = Math.floor(Math.random() * prevSensors.length);
//         const newDepth = Math.floor(Math.random() * 40);

//         let newStatus = "Aman";
//         let newColor = "bg-emerald-400";

//         if (newDepth >= 20) {
//           newStatus = "Bahaya";
//           newColor = "bg-red-500";
//         } else if (newDepth >= 10) {
//           newStatus = "Waspada";
//           newColor = "bg-amber-400";
//         }

//         const newSensors = [...prevSensors];
//         newSensors[randomIndex] = {
//           ...newSensors[randomIndex],
//           depth: newDepth,
//           status: newStatus,
//           color: newColor
//         };
//         return newSensors;
//       });
//       setLastUpdate(new Date().toLocaleTimeString());
//     }, 5000);

//     return () => clearInterval(interval);
//   }, []);

//   const stats = {
//     aman: sensors.filter(s => s.status === "Aman").length,
//     waspada: sensors.filter(s => s.status === "Waspada").length,
//     bahaya: sensors.filter(s => s.status === "Bahaya").length,
//   };

//   if (loading && sensors.length === 0) {
//     return (
//       <div className="h-screen flex items-center justify-center font-inter text-slate-500">
//         Memuat data sensor...
//       </div>
//     );
//   }

//   return (
//     <div className="min-height-screen bg-slate-50 font-inter">
//       {/* Header */}
//       <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
//         <div className="max-w-7xl mx-auto flex justify-between items-center">
//           <div className="flex items-center gap-3">
//             {/* <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl">S</div> */}
//             <h1 className="font-black text-slate-800 text-xl tracking-normal">SISTEM INFORMASI GENANGAN AIR <span className="text-blue-600"> SURABAYA</span></h1>
//           </div>
//           <div className="text-right">
//             <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest leading-none mb-1">Update Terakhir</p>
//             <p className="text-slate-700 font-mono font-bold">{lastUpdate}</p>
//           </div>
//         </div>
//       </nav>

//       <main className="max-w-7xl mx-auto px-6 py-8">
//         {/* Ringkasan Status */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
//           <StatCard label="Titik Aman" count={stats.aman} colorClass="text-emerald-500" />
//           <StatCard label="Titik Waspada" count={stats.waspada} colorClass="text-amber-500" />
//           <StatCard label="Titik Bahaya" count={stats.bahaya} colorClass="text-red-500" />
//         </div>

//         {/* Grid Sensor */}
//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
//           {sensors.map(sensor => (
//             <SensorCard key={sensor.id} sensor={sensor} />
//           ))}
//         </div>
//       </main>
//     </div>
//   );
// };

// export default Dashboard;