import express, { Request, Response } from "express";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

import sensorData from "./app/api/sensor/route.js";

const app = express();

const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

app.set('io', io);

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));

app.use(express.json());

io.on("connection", (socket) => {
    console.log(`Client terhubung: ${socket.id}`);
    socket.on("disconnect", () => console.log("Client terputus"));
});

app.use('/app/api/sensor', sensorData);
app.get('/', (req, res) => {
    res.status(200).send("Server berjalan!");
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
    console.log(` Server berjalan pada port ${PORT}`);
})