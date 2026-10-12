import express from "express";
import cors from "cors";  //Para que el frontend pueda llamar
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import gatoRoutes from "./routes/gato.routes.js";
import db from "./firebase.js"; // Para el registro de la bitácora
const app = express();

// Middlewares
app.use(cors());  //Permite peticiones desde cualquier origen
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Render está detrás de un proxy: confiamos en él para leer la IP del cliente
app.set("trust proxy", true);

// Rate limit para gatos
const limiterGatos = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  // Contamos las peticiones por la IP real del cliente (la misma que guarda la bitácora)
  keyGenerator: (req) =>
    ipKeyGenerator(req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip),
  message: {
    mensaje: "Demasiadas peticiones desde esta IP. Intenta de nuevo más tarde.",
  },
  handler: async (req, res, next, options) => {
    try {
      await db.collection("auditoria_gatos").add({
        accion: "rate_limit_bloqueado",
        fecha: new Date().toISOString(),
        ip: req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip,
        userAgent: req.headers["user-agent"],
        ruta: req.originalUrl,
        metodo: req.method,
      });
    } catch (e) {}
    res.status(options.statusCode).json(options.message);
  },
});

// Aplicar el limitador ANTES de las rutas de gatos
app.use("/gato", limiterGatos);
app.use("/gatos", limiterGatos);

// Rutas
app.use(gatoRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ mensaje: "Ruta no registrada." });
});

export default app;
