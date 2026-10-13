import "./style.css";

const addBtn = document.querySelector(".button");
const modal = document.getElementById("modal");
const closeModal = document.getElementById("closeModal");
const saveTask = document.getElementById("saveTask");

const taskText = document.getElementById("taskText");
const taskDate = document.getElementById("taskDate");
const wahlButtons = document.querySelectorAll("#spaltenWahl .wahl");

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
    name.textContent = taskData.name;

    const datum = document.createElement("small");
    datum.textContent = taskData.date;

    task.append(deleteBtn, name, document.createElement("br"), datum);

    // Klick auf die Karte klappt langen Text auf/zu
    task.addEventListener("click", (e) => {
        if (e.target !== deleteBtn) task.classList.toggle("offen");
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
    userName.textContent = "👤 " + username;
    userInfo.classList.remove("hidden");
    loginModal.classList.add("hidden");

    // Aufgaben des Users laden
    document.querySelectorAll(".task").forEach(t => t.remove());
    const tasks = await api("GET", "/tasks");
    tasks.forEach(taskData => {
        const spalte = spalten[taskData.status] || spalten.todo;
        spalte.appendChild(erstelleKarte(taskData));
    });
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

// Modal öffnen / schließen
addBtn.addEventListener("click", () => {
    modal.classList.remove("hidden");

    // Aktuelles Datum berechnen und eintragen
    const heute = new Date();
    const jahr = heute.getFullYear();
    const monat = String(heute.getMonth() + 1).padStart(2, '0');
    const tag = String(heute.getDate()).padStart(2, '0');

    taskDate.value = `${jahr}-${monat}-${tag}`;
    setzeAuswahl(null);
});

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

// --- 1. NEUE AUFGABE SPEICHERN ---
saveTask.addEventListener("click", async () => {
    if (taskText.value.trim() === "") return;

    try {
        const taskData = await api("POST", "/tasks", {
            name: taskText.value,
            date: taskDate.value,
            status: gewaehlterStatus || "todo"
        });
        (spalten[taskData.status] || spalten.todo).appendChild(erstelleKarte(taskData));

        taskText.value = "";
        taskDate.value = "";
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
            api("PATCH", "/tasks/" + draggedTask.dataset.id, { status })
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
