import express, { Request, Response } from "express";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

import sensorData from "./app/api/sensor/route.js";

const app = express();

const httpServer = createServer(app);

const corsLink = [
    'http://localhost:5173'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        if (corsLink.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed in CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}));

app.use(express.json());

app.use('/app/api/sensor', sensorData);

app.get('/', (req, res) => {
    res.status(200).send("Server berjalan!");
});

// Mengecek di console server berjalan di port 4000
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
    console.log(` Server berjalan pada port ${PORT}`);
})