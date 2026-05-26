import { useState, useEffect, useMemo } from 'react';
import StatCard from './StatCard';
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';

// Helper status
const getStatusColor = (status) => {
  const s = status?.toUpperCase();
  if (s === 'BAHAYA')                          return 'bg-red-500';
  if (s === 'WASPADA' || s === 'SIAGA')        return 'bg-amber-400';
  return 'bg-emerald-400';
};

const getStatusTextColor = (status) => {
  const s = status?.toUpperCase();
  if (s === 'BAHAYA')                          return 'text-red-600';
  if (s === 'WASPADA' || s === 'SIAGA')        return 'text-amber-500';
  return 'text-emerald-500';
};

const getStatusLabel = (status) => {
  const s = status?.toUpperCase();
  if (s === 'BAHAYA') return 'Bahaya';
  if (s === 'WASPADA' || s === 'SIAGA') return 'Siaga';
  return 'Aman';
};

// ── Format tanggal ────────────────────────────────────────────────────────
const fmtDate  = (iso) => new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtTime  = (iso) => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const fmtShort = (iso) => new Date(iso).toLocaleString('id-ID',    { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

// ── Custom Tooltip grafik ─────────────────────────────────────────────────
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs min-w-[150px]">
      <p className="font-bold text-slate-600 mb-1">{fmtShort(d?.timestamp)}</p>
      <p className="text-slate-800">
        Ketinggian: <span className="font-black">{d?.height} cm</span>
      </p>
      <p className={`font-bold mt-0.5 ${getStatusTextColor(d?.waterStatus)}`}>
        {getStatusLabel(d?.waterStatus)}
      </p>
    </div>
  );
};

const HistoryPage = () => {
  const [logs,         setLogs]         = useState([]);
  const [devices,      setDevices]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [selectedDev,  setSelectedDev]  = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom,     setDateFrom]     = useState('');
  const [dateTo,       setDateTo]       = useState('');
  const [page,         setPage]         = useState(1);
  const [chartType,    setChartType]    = useState('area');
  const PER_PAGE = 10;

  // ── Fetch devices untuk dropdown filter ──────────────────────────────
  useEffect(() => {
    fetch('http://localhost:4000/app/api/sensor/monitor')
      .then(r => r.json())
      .then(setDevices)
      .catch(console.error);
  }, []);

  // ── Fetch logs — dipanggil ulang setiap filter berubah ────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedDev  !== 'all') params.set('deviceId', selectedDev);
        if (statusFilter !== 'all') params.set('status',   statusFilter);
        if (dateFrom)               params.set('from',     dateFrom);
        if (dateTo)                 params.set('to',       dateTo);
        params.set('limit', '500'); // ambil maksimal 500 data

        const res  = await fetch(`http://localhost:4000/app/api/sensor/data-historis?${params}`);
        const data = await res.json();

        const raw = Array.isArray(data) ? data : (data.logs ?? []);
        raw.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setLogs(raw);
        setPage(1);
      } catch (err) {
        console.error('Gagal memuat data historis:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedDev, statusFilter, dateFrom, dateTo]);

  // Filter sisi client sudah minimal karena backend yang handle —
  // useMemo ini hanya untuk sinkronisasi stats & chart dari data yang sudah diterima
  const filtered = useMemo(() => logs, [logs]);

  // ── Stats (sama polanya dengan Dashboard) ────────────────────────────
  const stats = {
    total:   filtered.length,
    aman:    filtered.filter(l => l.waterStatus?.toUpperCase() === 'AMAN').length,
    waspada: filtered.filter(l => ['WASPADA','SIAGA'].includes(l.waterStatus?.toUpperCase())).length,
    bahaya:  filtered.filter(l => l.waterStatus?.toUpperCase() === 'BAHAYA').length,
  };

  // ── Data grafik (60 titik terbaru, ascending) ────────────────────────
  const chartData = useMemo(() =>
    [...filtered].reverse().slice(-60)
  , [filtered]);

  // ── Warna grafik ikut status dominan ────────────────────────────────
  const chartColor = useMemo(() => {
    if (stats.bahaya > 0)                                      return '#ef4444';
    if (stats.waspada > 0)                                     return '#f59e0b';
    return '#10b981';
  }, [stats]);

  // ── Pagination ───────────────────────────────────────────────────────
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const resetFilters = () => {
    setSelectedDev('all'); setStatusFilter('all');
    setDateFrom(''); setDateTo('');
    // page akan direset otomatis oleh useEffect fetch
  };

  // Export CSV
  const exportCSV = () => {
    const header = ['Waktu', 'Sensor', 'Serial', 'Lokasi', 'Ketinggian (cm)', 'Status'];
    const rows   = filtered.map(l => [
      `${fmtDate(l.timestamp)} ${fmtTime(l.timestamp)}`,
      l.deviceName, l.deviceSerial, l.location, l.height, l.waterStatus
    ]);
    const csv  = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: 'historis-sigas.csv' });
    a.click(); URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center font-inter text-slate-500">
        Sinkronisasi data historis...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-inter">

      {/* ── Navbar — identik dengan Dashboard ── */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="font-black text-slate-800 text-xl tracking-tight">
            SISTEM INFORMASI GENANGAN AIR <span className="text-blue-600"> SURABAYA</span>
          </h1>

          {/* ── Toggle navigasi ── */}
          <div className="flex items-center gap-2">
            {[
              { label: 'Dashboard', href: '/'        },
              { label: 'Peta SIG',  href: '/map'     },
              { label: 'Historis',  href: '/history' },
            ].map(({ label, href }) => {
              const isActive = window.location.pathname === href;
              return (
                <a
                  key={label}
                  href={href}
                  className={`px-4 py-2 rounded-lg text-sm font-bold tracking-tight transition-all ${
                    isActive
                      ? 'bg-slate-100 text-slate-800 border border-slate-200'
                      : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {label}
                </a>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* ── Stat Cards — pakai StatCard yang sama ── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard label="Total Data"    count={stats.total}   colorClass="text-blue-600"    />
          <StatCard label="Titik Aman"    count={stats.aman}    colorClass="text-emerald-500" />
          <StatCard label="Titik Waspada" count={stats.waspada} colorClass="text-amber-500"   />
          <StatCard label="Titik Bahaya"  count={stats.bahaya}  colorClass="text-red-500"     />
        </div>

        {/* ── Filter Panel ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-black text-slate-800 tracking-tight">Filter Data</h2>
            <button
              onClick={resetFilters}
              className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest"
            >
              Reset
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Sensor */}
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block mb-2">
                Sensor
              </label>
              <select
                value={selectedDev}
                onChange={e => { setSelectedDev(e.target.value); setPage(1); }}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">Semua Sensor</option>
                {devices.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              >
                <option value="all">Semua Status</option>
                <option value="BAHAYA">Bahaya</option>
                <option value="SIAGA">Siaga / Waspada</option>
                <option value="AMAN">Aman</option>
              </select>
            </div>

            {/* Dari tanggal */}
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block mb-2">
                Dari Tanggal
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
              />
            </div>

            {/* Sampai tanggal */}
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest block mb-2">
                Sampai Tanggal
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={e => { setDateTo(e.target.value); setPage(1); }}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
              />
            </div>
          </div>
        </div>

        {/* ── Grafik ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h2 className="font-black text-slate-800 tracking-tight">Grafik Ketinggian Air</h2>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-1">
                {Math.min(chartData.length, 60)} data terbaru ditampilkan
              </p>
            </div>
            {/* Toggle area/line */}
            <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
              {[['area','Area'], ['line','Garis']].map(([val, lbl]) => (
                <button
                  key={val}
                  onClick={() => setChartType(val)}
                  className={`px-4 py-2 rounded-lg text-xs font-black tracking-tight transition-all ${
                    chartType === val
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-400 text-sm font-medium">
              Tidak ada data untuk ditampilkan
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              {chartType === 'area' ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={chartColor} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={chartColor} stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="timestamp" tickFormatter={fmtShort}
                    tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'inherit' }}
                    tickLine={false} axisLine={false} interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'inherit' }}
                    tickLine={false} axisLine={false}
                    tickFormatter={v => `${v}cm`} width={48}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={150} stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1.5}
                    label={{ value: 'Bahaya', position: 'insideTopRight', fontSize: 10, fill: '#ef4444', fontWeight: 'bold' }} />
                  <ReferenceLine y={50} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1.5}
                    label={{ value: 'Siaga', position: 'insideTopRight', fontSize: 10, fill: '#f59e0b', fontWeight: 'bold' }} />
                  <Area
                    type="monotone" dataKey="height"
                    stroke={chartColor} strokeWidth={2.5}
                    fill="url(#areaGrad)"
                    dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: chartColor }}
                  />
                </AreaChart>
              ) : (
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="timestamp" tickFormatter={fmtShort}
                    tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'inherit' }}
                    tickLine={false} axisLine={false} interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'inherit' }}
                    tickLine={false} axisLine={false}
                    tickFormatter={v => `${v}cm`} width={48}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={150} stroke="#ef4444" strokeDasharray="4 3" strokeWidth={1.5}
                    label={{ value: 'Bahaya', position: 'insideTopRight', fontSize: 10, fill: '#ef4444', fontWeight: 'bold' }} />
                  <ReferenceLine y={75} stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1.5}
                    label={{ value: 'Siaga', position: 'insideTopRight', fontSize: 10, fill: '#f59e0b', fontWeight: 'bold' }} />
                  <Line
                    type="monotone" dataKey="height"
                    stroke={chartColor} strokeWidth={2.5}
                    dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: chartColor }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Tabel ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-black text-slate-800 tracking-tight">Riwayat Pembacaan</h2>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-1">
                {filtered.length} entri ditemukan
              </p>
            </div>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 text-xs font-black text-slate-500 border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all tracking-tight"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
          </div>

          {paginated.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm font-medium">
              Tidak ada data yang sesuai filter
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {['Waktu', 'Sensor', 'Lokasi', 'Ketinggian', 'Status'].map(h => (
                        <th key={h} className="text-left px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((log, i) => (
                      <tr
                        key={`${log.id}-${i}`}
                        className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                      >
                        {/* Waktu */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="font-bold text-slate-700">{fmtDate(log.timestamp)}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{fmtTime(log.timestamp)}</p>
                        </td>

                        {/* Sensor */}
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-700">{log.deviceName}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{log.deviceSerial}</p>
                        </td>

                        {/* Lokasi */}
                        <td className="px-6 py-4 text-slate-600 max-w-[200px]">
                          <p className="truncate font-medium">{log.location}</p>
                        </td>

                        {/* Ketinggian */}
                        <td className="px-6 py-4">
                          <span className="font-black text-slate-800 text-base">{log.height}</span>
                          <span className="text-slate-400 text-xs font-bold ml-1">cm</span>
                        </td>

                        {/* Status — pakai getStatusColor yang sama dengan Dashboard */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black text-white ${getStatusColor(log.waterStatus)}`}>
                            {getStatusLabel(log.waterStatus)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                    Hal. {page} / {totalPages} &middot; {filtered.length} data
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-2 text-xs font-black rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >← Prev</button>

                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const p = Math.min(Math.max(page - 2, 1) + i, totalPages);
                      return (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-9 h-9 text-xs font-black rounded-xl transition-colors ${
                            page === p
                              ? 'bg-blue-600 text-white'
                              : 'border border-slate-200 text-slate-500 hover:bg-slate-50'
                          }`}
                        >{p}</button>
                      );
                    })}

                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-2 text-xs font-black rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >Next →</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default HistoryPage;