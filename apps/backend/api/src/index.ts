import express from "express";
import { registerRoutes } from "./core/routes.js";

const app = express();
app.use(express.json());

// Registra tutte le routes (include già middleware)
const server = await registerRoutes(app);

console.log("W3 Suite server running on port 5000");