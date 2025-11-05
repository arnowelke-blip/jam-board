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
// DB öffnen …
const db = await open({
 filename: process.env.DB_FILE || path.join("/tmp", "jam-board.db"),
 driver: sqlite3.Database,
});

// --- Schema anlegen & Demo-Daten befüllen (einmalig) ---
await db.exec(`
 CREATE TABLE IF NOT EXISTS ads (
   id INTEGER PRIMARY KEY AUTOINCREMENT,
   title TEXT NOT NULL,
   description TEXT,
   price INTEGER,
   image_url TEXT,
   created_at TEXT DEFAULT (datetime('now'))
 );
`);

const { cnt } = await db.get(`SELECT COUNT(*) AS cnt FROM ads`);
if (cnt === 0) {
 const stmt = await db.prepare(
   `INSERT INTO ads (title, description, price, image_url, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))`
 );

 await stmt.run(
   "Fender Stratocaster",
   "Gepflegte Mex-Strat, neue Saiten, inkl. Gigbag.",
   650,
   "https://images.unsplash.com/photo-1511379938547-c1f69419868d"
 );

 await stmt.run(
   "Suche Blues-Harp Lehrer:in",
   "Einsteiger sucht wöchentliche Sessions in Herten/Umgebung.",
   0,
   null
 );

 await stmt.run(
   "Röhrenamp 15W",
   "Warmer Crunch, ideal für kleine Gigs. Test möglich.",
   320,
   null
 );

 await stmt.finalize();
 console.log("Seed: Demo-Anzeigen eingefügt.");
}

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
