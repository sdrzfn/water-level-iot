import { Router } from "express";

const router = Router();

router.post("/ketinggian", async (req, res) => {
    const { deviceId, height, status } = req.body;
    const apiKey = req.headers["x-api-key"];

    if (apiKey !== process.env.SENSOR_API_KEY) {
        return res.status(403).json({ error: "Unauthorized" });
    }

    try {
        const newData = await prisma.sensorLog.create({
            data: { deviceId, height, status, timestamp: new Date() }
        });

        req.app.get('io').emit('update-peta', newData);

        return res.status(200).json({ message: "Data received" });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
})