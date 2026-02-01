const StatCard = ({ label, count, colorClass, id }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
        <p className="text-slate-500 text-sm font-medium mb-1">{label}</p>
        <p id={id} className={`text-4xl font-black ${colorClass}`}>{count}</p>
    </div>
);
export default StatCard;