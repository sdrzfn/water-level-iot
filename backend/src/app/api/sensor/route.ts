import { Router, Request, Response } from "express";
import { prisma } from "../../../lib/prisma.js";

const router = Router();

// Endpoint GET: Diambil oleh React saat pertama kali buka web
router.get("/latest", async (req: Request, res: Response) => {
    try {
        const latestData = await prisma.sensorLog.findMany({
            take: 10,
            orderBy: { timestamp: 'desc' }
        });
        return res.json(latestData);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Internal Server Error";
        return res.status(500).json({ error: errorMessage });
    }
});

// Endpoint POST: Digunakan oleh ESP8266 (SIM800L/WiFi)
router.post("/ketinggian", async (req: Request, res: Response) => {
    const { deviceId, height, status } = req.body;
    
    const apiKey = req.headers["x-api-key"];
    const validApiKey = process.env.SENSOR_API_KEY;

    if (apiKey !== validApiKey) {
        return res.status(403).json({ error: "Unauthorized" });
    }

    try {
        const newData = await prisma.sensorLog.create({
            data: { 
                deviceId, 
                height: parseFloat(height), 
                status, 
                timestamp: new Date() 
            }
        });

        const io = req.app.get('io');
        if (io) {
            io.emit('update-peta', newData);
        }

        return res.status(200).json({ message: "Data received" });
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : "Internal Server Error";
        return res.status(500).json({ error: errorMessage });
    }
});

export default router;