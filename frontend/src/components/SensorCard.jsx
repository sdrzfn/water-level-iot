const SensorCard = ({ sensor }) => {
    const isPulse = sensor.status !== "Aman" ? "animate-pulse" : "";

    return (
        <div className={`sensor-card p-6 rounded-2xl text-white ${sensor.color} ${isPulse}`}>
            <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-xl">{sensor.name}</h3>
                <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider">
                    {sensor.status}
                </span>
            </div>
            <div className="space-y-1">
                <p className="text-white/80 text-sm">Lokasi: {sensor.location}</p>
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black">{sensor.depth}</span>
                    <span className="text-sm font-medium">cm</span>
                </div>
            </div>
        </div>
    );
};
export default SensorCard;