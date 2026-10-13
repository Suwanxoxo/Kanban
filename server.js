import express from "express";
import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";

const PORT = 3000;

// --- DATENBANK (SQLite-Datei im Projektordner) ---
const db = new DatabaseSync("kanban.db");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        date TEXT,
        status TEXT NOT NULL DEFAULT 'todo'
    );
`);

const ERLAUBTE_STATUS = ["idea", "todo", "in_progress", "done"];

// --- PASSWÖRTER (nie im Klartext speichern!) ---
function hashPasswort(passwort) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(passwort, salt, 64).toString("hex");
    return `${salt}:${hash}`;
}

function pruefePasswort(passwort, gespeichert) {
    const [salt, hash] = gespeichert.split(":");
    const neu = crypto.scryptSync(passwort, salt, 64);
    return crypto.timingSafeEqual(neu, Buffer.from(hash, "hex"));
}

function neueSession(userId) {
    const token = crypto.randomBytes(32).toString("hex");
    db.prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").run(token, userId);
    return token;
}

const app = express();
app.use(express.json());

// --- REGISTRIEREN ---
app.post("/api/register", (req, res) => {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    if (username.length < 3) return res.status(400).json({ error: "Benutzername muss mindestens 3 Zeichen haben" });
    if (password.length < 4) return res.status(400).json({ error: "Passwort muss mindestens 4 Zeichen haben" });

    const vorhanden = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
    if (vorhanden) return res.status(409).json({ error: "Benutzername ist schon vergeben" });

    const result = db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)")
        .run(username, hashPasswort(password));

    res.json({ token: neueSession(result.lastInsertRowid), username });
});

// --- EINLOGGEN ---
app.post("/api/login", (req, res) => {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    const user = db.prepare("SELECT id, password_hash FROM users WHERE username = ?").get(username);
    if (!user || !pruefePasswort(password, user.password_hash)) {
        return res.status(401).json({ error: "Benutzername oder Passwort falsch" });
    }

    res.json({ token: neueSession(user.id), username });
});

// --- AB HIER NUR MIT LOGIN: Token prüfen ---
app.use("/api", (req, res, next) => {
    const token = (req.headers.authorization || "").replace("Bearer ", "");
    const session = db.prepare(`
        SELECT users.id, users.username FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.token = ?
    `).get(token);

    if (!session) return res.status(401).json({ error: "Nicht eingeloggt" });

    req.user = session;
    req.token = token;
    next();
});

app.get("/api/me", (req, res) => {
    res.json({ username: req.user.username });
});

app.post("/api/logout", (req, res) => {
    db.prepare("DELETE FROM sessions WHERE token = ?").run(req.token);
    res.json({ success: true });
});

// --- AUFGABEN (immer nur die des eingeloggten Users) ---
app.get("/api/tasks", (req, res) => {
    const tasks = db.prepare("SELECT id, name, date, status FROM tasks WHERE user_id = ?").all(req.user.id);
    res.json(tasks);
});

app.post("/api/tasks", (req, res) => {
    const name = String(req.body.name || "").trim();
    const date = String(req.body.date || "");
    // Ohne (gültige) Auswahl landet die Aufgabe in TO DO
    const status = ERLAUBTE_STATUS.includes(req.body.status) ? req.body.status : "todo";
    if (name === "") return res.status(400).json({ error: "Aufgabe darf nicht leer sein" });

    const result = db.prepare("INSERT INTO tasks (user_id, name, date, status) VALUES (?, ?, ?, ?)")
        .run(req.user.id, name, date, status);

    res.json({ id: Number(result.lastInsertRowid), name, date, status });
});

app.patch("/api/tasks/:id", (req, res) => {
    if (!ERLAUBTE_STATUS.includes(req.body.status)) return res.status(400).json({ error: "Ungültiger Status" });

    db.prepare("UPDATE tasks SET status = ? WHERE id = ? AND user_id = ?")
        .run(req.body.status, req.params.id, req.user.id);
    res.json({ success: true });
});

app.delete("/api/tasks/:id", (req, res) => {
    db.prepare("DELETE FROM tasks WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`API-Server läuft auf http://localhost:${PORT}`);
});
