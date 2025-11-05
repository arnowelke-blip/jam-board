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
// Schema einmalig anlegen
await db.exec(`
 CREATE TABLE IF NOT EXISTS ads (
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   title TEXT NOT NULL,
   price INTEGER,
   description TEXT,
   contact TEXT,
   image TEXT,
   created_at DATETIME DEFAULT CURRENT_TIMESTAMP
 );
`);

// Optionale Startdaten, nur wenn Tabelle leer ist
const row = await db.get("SELECT COUNT(*) AS cnt FROM ads");
if (row.cnt === 0) {
 await db.run(
   "INSERT INTO ads (title, price, description, contact) VALUES (?, ?, ?, ?)",
   ["Erste Anzeige", 0, "Willkommen auf dem Jam-Board!", "demo@example.com"]
 );
}
// Formular anzeigen
app.get("/admin/new", (req, res) => {
 res.render("admin_new");
});

// Formular verarbeiten
app.post("/admin/new", async (req, res) => {
 try {
   const title = (req.body.title || "").trim();
   const description = (req.body.description || "").trim();
   const image_url = (req.body.image_url || "").trim();
   const price = Number.isFinite(Number(req.body.price)) ? Number(req.body.price) : 0;

   if (!title) return res.status(400).send("Titel fehlt.");

   await db.run(
     "INSERT INTO ads (title, description, price, image_url) VALUES (?, ?, ?, ?)",
     [title, description, price, image_url]
   );

   res.redirect("/");
 } catch (err) {
   console.error(err);
   res.status(500).send("Speichern fehlgeschlagen.");
 }
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
// Formular anzeigen (GET)
app.get("/admin/new", (req, res) => {
 res.render("admin_new");
});

// Formular verarbeiten (POST)
app.post("/admin/new", async (req, res) => {
 try {
   const title = (req.body.title || "").trim();
   const description = (req.body.description || "").trim();
   const image_url = (req.body.image_url || "").trim();
   const price = Number.isFinite(Number(req.body.price)) ? Number(req.body.price) : 0;

   if (!title) return res.status(400).send("Titel fehlt.");

   await db.run(
     "INSERT INTO ads (title, description, price, image_url) VALUES (?, ?, ?, ?)",
     [title, description, price, image_url]
   );

   res.redirect("/");
 } catch (err) {
   console.error(err);
   res.status(500).send("Speichern fehlgeschlagen.");
 }
});
app.listen(port, () => {
 console.log(`🚀 Jam-Board läuft auf http://localhost:${port}`);
});
