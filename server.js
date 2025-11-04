// server.js (Plain Text!)
import path from "path";
import express from "express";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bodyParser from "body-parser";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Sicherheit & Basics
app.use(helmet());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: false }));

// Rate Limiting
app.use(
 rateLimit({
   windowMs: 60 * 1000,
   max: 50,
 })
);

// EJS-Views
app.set("view engine", "ejs");

// DB öffnen (Render-kompatibel mit Fallback auf /tmp)
const db = await open({
 filename: process.env.DB_FILE || path.join("/tmp", "jam-board.db"),
 driver: sqlite3.Database,
});
// Routen
app.get("/", async (req, res) => {
 const ads = await db.all("SELECT * FROM ads ORDER BY created_at DESC");
 res.render("home", { ads });
});

app.get("/ad/:id", async (req, res) => {
 const ad = await db.get("SELECT * FROM ads WHERE id = ?", [req.params.id]);
 res.render("detail", { ad });
});

app.get("/admin/login", (req, res) => {
 res.render("admin_login");
});

// Start
app.listen(port, () => {
 console.log(`🚀 Jam-Board läuft auf http://localhost:${port}`);
});
