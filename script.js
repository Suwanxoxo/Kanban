const addBtn = document.querySelector(".button");
const modal = document.getElementById("modal");
const closeModal = document.getElementById("closeModal");
const saveTask = document.getElementById("saveTask");

const taskText = document.getElementById("taskText");
const taskDate = document.getElementById("taskDate");

const STORAGE_KEY = "kanban-tasks";

// Spalte passend zum Status
const spalten = {
    todo: document.querySelector(".pink"),
    in_progress: document.querySelector(".lila"),
    done: document.querySelector(".blau")
};

// --- SPEICHER (localStorage statt PHP/Datenbank) ---
function ladeAufgaben() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
        return [];
    }
}

function speichereAufgaben(tasks) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
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

    // Drag & Drop
    task.addEventListener("dragstart", () => {
        task.classList.add("is-dragging");
    });
    task.addEventListener("dragend", () => {
        task.classList.remove("is-dragging");
    });

    // Löschen
    deleteBtn.addEventListener("click", () => {
        if (confirm("Aufgabe wirklich löschen?")) {
            speichereAufgaben(ladeAufgaben().filter(t => t.id !== taskData.id));
            task.remove();
        }
    });

    return task;
}

// Modal öffnen / schließen
addBtn.addEventListener("click", () => {
    modal.classList.remove("hidden");

    // Aktuelles Datum berechnen und eintragen
    const heute = new Date();
    const jahr = heute.getFullYear();
    const monat = String(heute.getMonth() + 1).padStart(2, '0');
    const tag = String(heute.getDate()).padStart(2, '0');

    taskDate.value = `${jahr}-${monat}-${tag}`;
});

closeModal.addEventListener("click", () => modal.classList.add("hidden"));

// --- 1. NEUE AUFGABE SPEICHERN ---
saveTask.addEventListener("click", () => {
    if (taskText.value.trim() === "") return;

    const taskData = {
        id: crypto.randomUUID(),
        name: taskText.value.trim(),
        date: taskDate.value,
        status: "todo"
    };

    const tasks = ladeAufgaben();
    tasks.push(taskData);
    speichereAufgaben(tasks);

    spalten.todo.appendChild(erstelleKarte(taskData));

    taskText.value = "";
    taskDate.value = "";
    modal.classList.add("hidden");
});

// --- 2. DROP-ZONEN (Für Drag & Drop und Status-Update) ---
Object.entries(spalten).forEach(([status, column]) => {
    column.addEventListener("dragover", (e) => e.preventDefault());

    column.addEventListener("drop", (e) => {
        e.preventDefault();
        const draggedTask = document.querySelector(".is-dragging");

        if (draggedTask) {
            column.appendChild(draggedTask);

            const tasks = ladeAufgaben();
            const gefunden = tasks.find(t => t.id === draggedTask.dataset.id);
            if (gefunden) {
                gefunden.status = status;
                speichereAufgaben(tasks);
            }
        }
    });
});

// --- 3. AUFGABEN BEIM LADEN DER SEITE ANZEIGEN ---
ladeAufgaben().forEach(taskData => {
    const spalte = spalten[taskData.status] || spalten.todo;
    spalte.appendChild(erstelleKarte(taskData));
});
