import "./style.css";

const addBtn = document.querySelector(".button");
const modal = document.getElementById("modal");
const closeModal = document.getElementById("closeModal");
const saveTask = document.getElementById("saveTask");

const taskText = document.getElementById("taskText");
const taskDate = document.getElementById("taskDate");
const wahlButtons = document.querySelectorAll("#spaltenWahl .wahl");
const modalTitel = document.getElementById("modalTitel");
const modalUntertitel = document.getElementById("modalUntertitel");

const loginModal = document.getElementById("loginModal");
const loginUser = document.getElementById("loginUser");
const loginPass = document.getElementById("loginPass");
const loginError = document.getElementById("loginError");
const loginBtn = document.getElementById("loginBtn");
const registerBtn = document.getElementById("registerBtn");
const userInfo = document.getElementById("userInfo");
const userName = document.getElementById("userName");
const logoutBtn = document.getElementById("logoutBtn");

const TOKEN_KEY = "kanban-token";

// Spalte passend zum Status
const spalten = {
    idea: document.querySelector(".kasten .gelb"),
    todo: document.querySelector(".kasten .pink"),
    in_progress: document.querySelector(".kasten .lila"),
    done: document.querySelector(".kasten .blau")
};

// --- HILFSFUNKTION: Anfrage an unseren Node.js-Server ---
async function api(methode, pfad, daten) {
    const keinServer = "Server nicht erreichbar – starte das Projekt mit \"npm run dev\" und öffne http://localhost:5173";

    let response;
    try {
        response = await fetch("/api" + pfad, {
            method: methode,
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + (localStorage.getItem(TOKEN_KEY) || "")
            },
            body: daten ? JSON.stringify(daten) : undefined
        });
    } catch {
        throw new Error(keinServer);
    }

    const antwort = await response.json().catch(() => ({ error: keinServer }));

    // Token abgelaufen/ungültig -> zurück zum Login
    if (response.status === 401 && pfad !== "/login") {
        abmelden();
    }
    if (!response.ok) throw new Error(antwort.error || "Unbekannter Fehler");
    return antwort;
}

// --- HILFSFUNKTION: Reihenfolge in einer Spalte – höchste Prio oben, ausgegraute unten ---
const MAX_PRIO = 3;

function rang(task) {
    if (task.classList.contains("grau")) return MAX_PRIO + 1;
    return MAX_PRIO - Number(task.dataset.prio || 0);
}

function sortiereSpalte(column) {
    const karten = [...column.querySelectorAll(":scope > .task")];
    // sort ist stabil: innerhalb einer Gruppe bleibt die bisherige Reihenfolge
    karten.sort((a, b) => rang(a) - rang(b)).forEach(k => column.appendChild(k));
}

// In welcher Spalte (Status) steckt die Karte gerade?
function statusVon(task) {
    return Object.keys(spalten).find(status => spalten[status] === task.parentElement) || "todo";
}

// --- HILFSFUNKTION: Kärtchen bauen und mit Events ausstatten ---
function erstelleKarte(taskData) {
    const task = document.createElement("div");
    task.className = "task";
    task.draggable = true;
    task.dataset.id = taskData.id;

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "X";

    const name = document.createElement("strong");
    const datum = document.createElement("small");

    function zeigeDaten() {
        name.textContent = taskData.name;
        datum.textContent = taskData.date;
    }
    zeigeDaten();

    // Aktionen unten auf der Karte
    const aktionen = document.createElement("div");
    aktionen.className = "karten-aktionen";

    const editBtn = document.createElement("button");
    editBtn.className = "aktion";
    editBtn.textContent = "Bearbeiten";

    const prioBtn = document.createElement("button");
    prioBtn.className = "aktion prio-btn";
    prioBtn.textContent = "Prio";

    const grauBtn = document.createElement("button");
    grauBtn.className = "aktion";

    aktionen.append(editBtn, prioBtn, grauBtn);
    task.append(deleteBtn, name, document.createElement("br"), datum, aktionen);

    function zeigeZustand() {
        task.classList.toggle("prio", taskData.prio > 0);
        task.dataset.prio = taskData.prio || 0;
        task.classList.toggle("grau", !!taskData.grau);
        prioBtn.textContent = taskData.prio ? "Prio " + taskData.prio + "/" + MAX_PRIO : "Prio";
        grauBtn.textContent = taskData.grau ? "Aktivieren" : "Ausgrauen";
    }
    zeigeZustand();

    // Prio eine Stufe hoch (nach der höchsten wieder 0) / Ausgrauen umschalten,
    // speichern und Spalte neu sortieren
    async function umschalten(feld) {
        let neu = taskData[feld] ? 0 : 1;

        if (feld === "prio") {
            // Nächste höhere Stufe, die in dieser Spalte noch frei ist (sonst zurück auf 0)
            const belegt = [...task.parentElement.querySelectorAll(":scope > .task")]
                .filter(k => k !== task)
                .map(k => Number(k.dataset.prio));
            neu = 0;
            for (let stufe = (taskData.prio || 0) + 1; stufe <= MAX_PRIO; stufe++) {
                if (!belegt.includes(stufe)) { neu = stufe; break; }
            }
            if (!taskData.prio && neu === 0) {
                alert("In dieser Spalte sind schon alle " + MAX_PRIO + " Prios vergeben.");
                return;
            }
        }

        try {
            await api("PATCH", "/tasks/" + taskData.id, { [feld]: neu });
            taskData[feld] = neu;
            zeigeZustand();
            sortiereSpalte(task.parentElement);
        } catch (error) {
            alert("Fehler beim Speichern: " + error.message);
        }
    }

    // Der Server meldet die Prio zurück (fällt weg, wenn die Stufe in der neuen Spalte belegt ist)
    task.setzePrio = (prio) => {
        taskData.prio = prio;
        zeigeZustand();
    };

    prioBtn.addEventListener("click", () => umschalten("prio"));
    grauBtn.addEventListener("click", () => umschalten("grau"));
    editBtn.addEventListener("click", () => oeffneModal({ taskData, task, zeigeDaten }));

    // Klick auf die Karte klappt langen Text auf/zu (nicht bei Klick auf einen Button)
    task.addEventListener("click", (e) => {
        if (!e.target.closest("button")) task.classList.toggle("offen");
    });

    // Drag & Drop
    task.addEventListener("dragstart", () => {
        task.classList.add("is-dragging");
    });
    task.addEventListener("dragend", () => {
        task.classList.remove("is-dragging");
    });

    // Löschen
    deleteBtn.addEventListener("click", async () => {
        if (confirm("Aufgabe wirklich löschen?")) {
            try {
                await api("DELETE", "/tasks/" + taskData.id);
                task.remove();
            } catch (error) {
                alert("Fehler beim Löschen: " + error.message);
            }
        }
    });

    return task;
}

// --- LOGIN / REGISTRIEREN / LOGOUT ---
async function anmelden(pfad) {
    loginError.textContent = "";
    try {
        const daten = await api("POST", pfad, { username: loginUser.value, password: loginPass.value });
        localStorage.setItem(TOKEN_KEY, daten.token);
        loginPass.value = "";
        zeigeBoard(daten.username);
    } catch (error) {
        loginError.textContent = error.message;
    }
}

function abmelden() {
    localStorage.removeItem(TOKEN_KEY);
    document.querySelectorAll(".task").forEach(t => t.remove());
    userInfo.classList.add("hidden");
    loginModal.classList.remove("hidden");
}

async function zeigeBoard(username) {
    userName.textContent = username;
    userInfo.classList.remove("hidden");
    loginModal.classList.add("hidden");

    // Aufgaben des Users laden
    document.querySelectorAll(".task").forEach(t => t.remove());
    const tasks = await api("GET", "/tasks");
    tasks.forEach(taskData => {
        const spalte = spalten[taskData.status] || spalten.todo;
        spalte.appendChild(erstelleKarte(taskData));
    });
    Object.values(spalten).forEach(sortiereSpalte);
}

loginBtn.addEventListener("click", () => anmelden("/login"));
registerBtn.addEventListener("click", () => anmelden("/register"));
loginPass.addEventListener("keydown", (e) => {
    if (e.key === "Enter") anmelden("/login");
});

logoutBtn.addEventListener("click", async () => {
    await api("POST", "/logout").catch(() => {});
    abmelden();
});

// Modal öffnen – ohne Angabe zum Anlegen, mit Karte zum Bearbeiten
let bearbeitung = null; // { taskData, task, zeigeDaten }, solange eine Karte bearbeitet wird

function oeffneModal(karte = null) {
    bearbeitung = karte;
    modal.classList.remove("hidden");

    if (karte) {
        modalTitel.textContent = "BEARBEITEN";
        modalUntertitel.textContent = "Was soll sich ändern?";
        taskText.value = karte.taskData.name;
        taskDate.value = karte.taskData.date;
        setzeAuswahl(statusVon(karte.task));
    } else {
        modalTitel.textContent = "NEUE AUFGABE";
        modalUntertitel.textContent = "Was steht an?";
        taskText.value = "";

        // Aktuelles Datum berechnen und eintragen
        const heute = new Date();
        const jahr = heute.getFullYear();
        const monat = String(heute.getMonth() + 1).padStart(2, '0');
        const tag = String(heute.getDate()).padStart(2, '0');

        taskDate.value = `${jahr}-${monat}-${tag}`;
        setzeAuswahl(null);
    }
}

addBtn.addEventListener("click", () => oeffneModal());

closeModal.addEventListener("click", () => modal.classList.add("hidden"));

// Spalte im Popup auswählen (nochmal klicken = Auswahl aufheben)
let gewaehlterStatus = null;

function setzeAuswahl(status) {
    gewaehlterStatus = status;
    wahlButtons.forEach(b => b.classList.toggle("aktiv", b.dataset.status === status));
}

wahlButtons.forEach(button => {
    button.addEventListener("click", () => {
        setzeAuswahl(gewaehlterStatus === button.dataset.status ? null : button.dataset.status);
    });
});

// --- 1. AUFGABE SPEICHERN (neu oder bearbeitet) ---
saveTask.addEventListener("click", async () => {
    if (taskText.value.trim() === "") return;

    try {
        if (bearbeitung) {
            const { taskData, task, zeigeDaten } = bearbeitung;
            // Ohne Auswahl bleibt die Karte in ihrer Spalte
            const status = gewaehlterStatus || statusVon(task);
            const antwort = await api("PATCH", "/tasks/" + taskData.id, {
                name: taskText.value,
                date: taskDate.value,
                status
            });
            taskData.name = taskText.value.trim();
            taskData.date = taskDate.value;
            zeigeDaten();
            task.setzePrio(antwort.prio);

            if (spalten[status] !== task.parentElement) {
                spalten[status].appendChild(task);
                sortiereSpalte(spalten[status]);
            }
        } else {
            const taskData = await api("POST", "/tasks", {
                name: taskText.value,
                date: taskDate.value,
                status: gewaehlterStatus || "todo"
            });
            const spalte = spalten[taskData.status] || spalten.todo;
            spalte.appendChild(erstelleKarte(taskData));
            sortiereSpalte(spalte);
        }

        taskText.value = "";
        taskDate.value = "";
        bearbeitung = null;
        modal.classList.add("hidden");
    } catch (error) {
        alert("Fehler beim Speichern: " + error.message);
    }
});

// --- FADING: Verlauf unten nur zeigen, wenn noch Karten darunter versteckt sind ---
function pruefeFading(column) {
    const mehrUnten = column.scrollTop + column.clientHeight < column.scrollHeight - 5;
    column.classList.toggle("mehr-unten", mehrUnten);
}

Object.values(spalten).forEach(column => {
    column.addEventListener("scroll", () => pruefeFading(column));
    // Neue/gelöschte/verschobene Karten oder aufgeklappter Text -> neu prüfen
    new MutationObserver(() => pruefeFading(column))
        .observe(column, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
});
window.addEventListener("resize", () => Object.values(spalten).forEach(pruefeFading));

// --- 2. DROP-ZONEN (Für Drag & Drop und Status-Update) ---
Object.entries(spalten).forEach(([status, column]) => {
    column.addEventListener("dragover", (e) => e.preventDefault());

    column.addEventListener("drop", (e) => {
        e.preventDefault();
        const draggedTask = document.querySelector(".is-dragging");

        if (draggedTask) {
            column.appendChild(draggedTask);
            sortiereSpalte(column);
            api("PATCH", "/tasks/" + draggedTask.dataset.id, { status })
                .then(antwort => {
                    draggedTask.setzePrio(antwort.prio);
                    sortiereSpalte(column);
                })
                .catch(error => alert("Fehler beim Verschieben: " + error.message));
        }
    });
});

// --- 3. BEIM LADEN: Schon eingeloggt? ---
if (localStorage.getItem(TOKEN_KEY)) {
    api("GET", "/me")
        .then(daten => zeigeBoard(daten.username))
        .catch(() => abmelden());
}
