import { Router, Request, Response } from "express";
import { prisma } from "../../../lib/prisma.js";

const router = Router();

// Endpoint get
router.get("/monitor", async (req: Request, res: Response) => {
    try {
        const devices = await prisma.device.findMany({
            include: {
                location: true,
                logs: {
                    orderBy: { timestamp: 'desc' },
                    take: 1
                }
            }
        });
        return res.json(devices);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Gagal memuat data sensor";
        return res.status(500).json({ error: errorMessage });
    }
});

// Endpoint post
router.post("/ketinggian", async (req: Request, res: Response) => {
    const { deviceId, height, status } = req.body;
    const apiKey = req.headers["x-api-key"];

    if (apiKey !== process.env.SENSOR_API_KEY) {
        return res.status(403).json({ error: "Unauthorized" });
    }

    try {
        const device = await prisma.device.findUnique({
            where: { serialNumber: deviceId }
        });

        if (!device) return res.status(404).json({ error: "Device tidak dikenali" });

        const newLog = await prisma.sensorLog.create({
            data: {
                deviceId: device.id,
                height: parseFloat(height),
                waterStatus: status,
                timestamp: new Date()
            }
        });

        const io = req.app.get('io');
        if (io) {
            io.emit('update-data', {
                deviceId: device.id,
                name: device.name,
                height: newLog.height,
                status: newLog.waterStatus,
                timestamp: newLog.timestamp
            });
        }

        return res.status(200).json({ message: "Data tersinkronisasi" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Gagal mengolah data sensor" });
    }
});

router.get("/data-historis", async (req: Request, res: Response) => {
    const { deviceId, status, from, to, limit = "500" } = req.query;

    try {
        const where: any = {};

        if (deviceId) where.deviceId = String(deviceId);

        if (status) {
            const s = String(status).toUpperCase();
            where.waterStatus = s === 'SIAGA'
                ? { in: ['SIAGA', 'WASPADA'] }
                : s;
        }

        if (from || to) {
            where.timestamp = {
                ...(from && { gte: new Date(String(from)) }),
                ...(to && { lte: new Date(String(to) + 'T23:59:59.999Z') }),
            };
        }

        const logs = await prisma.sensorLog.findMany({
            where,
            orderBy: { timestamp: 'desc' },
            take: parseInt(String(limit)),
            include: {
                device: {
                    include: { location: true }
                }
            }
        });

        const result = logs.map(log => ({
            id: log.id,
            timestamp: log.timestamp,
            height: log.height,
            waterStatus: log.waterStatus,
            deviceId: log.deviceId,
            deviceName: log.device.name,
            deviceSerial: log.device.serialNumber,
            location: log.device.location?.alamat ?? 'Lokasi tidak terdaftar',
        }));

        return res.json({ logs: result, total: result.length });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Gagal mengambil data historis' });
    }

})

export default router;