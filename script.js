const addBtn = document.querySelector(".button");
const modal = document.getElementById("modal");
const closeModal = document.getElementById("closeModal");
const saveTask = document.getElementById("saveTask");

const taskText = document.getElementById("taskText");
const taskDate = document.getElementById("taskDate");

const todoColumn = document.querySelector(".pink");

// --- HILFSFUNKTION: Kärtchen mit Lösch-Button ausstatten ---
function setupTaskEvents(task) {
    // Drag & Drop
    task.addEventListener("dragstart", () => {
        task.classList.add("is-dragging");
    });
    task.addEventListener("dragend", () => {
        task.classList.remove("is-dragging");
    });

    // Löschen
    const deleteBtn = task.querySelector(".delete-btn");
    deleteBtn.addEventListener("click", () => {
        // Kurze Sicherheitsabfrage (optional)
        if (confirm("Aufgabe wirklich löschen?")) {
            fetch("delete_task.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: task.dataset.id })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    task.remove(); // Löscht das Kärtchen sofort aus dem Browser
                } else {
                    alert("Fehler beim Löschen: " + data.error);
                }
            })
            .catch(error => console.error("Fehler:", error));
        }
    });
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
    if (taskText.value === "") return;

    fetch("save_task.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: taskText.value, date: taskDate.value, status: "todo" })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const task = document.createElement("div");
            task.className = "task";
            task.draggable = true; 
            task.dataset.id = data.id; 
            
            // HIER IST DAS NEUE X EINGEBAUT
            task.innerHTML = `
                <button class="delete-btn">X</button>
                <strong>${taskText.value}</strong><br>
                <small>${taskDate.value}</small>
            `;

            setupTaskEvents(task);
            todoColumn.appendChild(task);

            taskText.value = "";
            taskDate.value = "";
            modal.classList.add("hidden");
        }
    });
});

// --- 2. DROP-ZONEN (Für Drag & Drop und Status-Update) ---
const columns = document.querySelectorAll(".pink, .lila, .blau");

columns.forEach((column) => {
    column.addEventListener("dragover", (e) => e.preventDefault());

    column.addEventListener("drop", (e) => {
        e.preventDefault();
        const draggedTask = document.querySelector(".is-dragging");
        
        if (draggedTask) {
            column.appendChild(draggedTask);

            let neuerStatus = "todo";
            if (column.classList.contains("lila")) neuerStatus = "in_progress";
            if (column.classList.contains("blau")) neuerStatus = "done";

            fetch("update_status.php", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: draggedTask.dataset.id, status: neuerStatus })
            });
        }
    });
});

// --- 3. AUFGABEN BEIM LADEN DER SEITE AUS DB HOLEN ---
document.addEventListener("DOMContentLoaded", () => {
    fetch("load_tasks.php")
    .then(response => response.json())
    .then(tasks => {
        if (tasks.error) return;

        tasks.forEach(taskData => {
            const task = document.createElement("div");
            task.className = "task";
            task.draggable = true; 
            task.dataset.id = taskData.id; 
            
            const datum = taskData.date ? taskData.date.split(' ')[0] : '';

            // HIER IST DAS NEUE X EINGEBAUT
            task.innerHTML = `
                <button class="delete-btn">X</button>
                <strong>${taskData.name}</strong><br>
                <small>${datum}</small>
            `;

            setupTaskEvents(task);

            if (taskData.status === "in_progress") document.querySelector(".lila").appendChild(task);
            else if (taskData.status === "done") document.querySelector(".blau").appendChild(task);
            else document.querySelector(".pink").appendChild(task);
        });
    });
});