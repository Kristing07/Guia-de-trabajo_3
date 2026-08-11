
import express from "express";
import { registrarGato } from "../controllers/gato.controller.js";

const router = express.Router();

router.post("/gatos", registrarGato);

export default router;
