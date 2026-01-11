// --- UTILIDADES ---
const Storage = {
    get: (key) => JSON.parse(localStorage.getItem(key)) || [],
    set: (key, data) => localStorage.setItem(key, JSON.stringify(data)),
    clear: () => localStorage.clear()
};
// --- LÓGICA DE PANTALLA DE CARGA ---
window.addEventListener('load', () => {
    // Esperamos 2.5 segundos (2500 ms)
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        const app = document.getElementById('app-container');

        // 1. Desvanecer splash
        splash.style.opacity = '0';

        // 2. Esperar a que termine la transición CSS (0.5s) y borrarlo
        setTimeout(() => {
            splash.style.display = 'none';
            // 3. Mostrar App y animar entrada
            app.style.display = 'block';
            app.style.animation = 'fadeInApp 0.5s ease forwards';
        }, 500);

    }, 2500);
});

// Agregar esta animación CSS dinámicamente o ponerla en style.css
const styleSheet = document.createElement("style");
styleSheet.innerText = `
@keyframes fadeInApp {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}`;
document.head.appendChild(styleSheet);

// ... AQUÍ SIGUE EL RESTO DE TU CÓDIGO (Storage, Navigation, etc.) ...
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    loadEvents();
    loadReadings();
    loadSessions();
    checkUpcomingEvents(); // Chequear notificaciones al abrir
});

// --- NAVEGACIÓN ---
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebar-overlay');
const sections = { 'tasks': 'Mis Tareas', 'calendar': 'Calendario', 'readings': 'Lecturas', 'pomodoro': 'Pomodoro' };

function navigate(viewId) {
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active-view'));
    document.getElementById(viewId + '-section').classList.add('active-view');
    document.getElementById('page-title').innerText = sections[viewId];
    closeSidebar();
}

document.getElementById('menu-btn').addEventListener('click', () => { sidebar.classList.add('open'); overlay.classList.add('open'); });
const closeSidebar = () => { sidebar.classList.remove('open'); overlay.classList.remove('open'); };
document.getElementById('close-sidebar').addEventListener('click', closeSidebar);
overlay.addEventListener('click', closeSidebar);

window.openModal = (id) => {
    document.getElementById(id).classList.add('active');
    setTimeout(() => document.getElementById(id).querySelector('input')?.focus(), 100);
}
window.closeModal = (id) => document.getElementById(id).classList.remove('active');

// --- TAREAS CON DRAG & DROP ---
function addTask() {
    const input = document.getElementById('new-task-input');
    const text = input.value.trim();
    if (!text) return;

    const tasks = Storage.get('tasks');
    // Guardamos la tarea al principio
    tasks.unshift({ id: Date.now(), text, completed: false });
    Storage.set('tasks', tasks);
    
    input.value = '';
    closeModal('task-modal');
    loadTasks();
}

function loadTasks() {
    const tasks = Storage.get('tasks');
    const list = document.getElementById('task-list');
    const emptyMsg = document.getElementById('empty-tasks');
    
    list.innerHTML = '';
    if (tasks.length === 0) {
        emptyMsg.style.display = 'block';
        return;
    }
    emptyMsg.style.display = 'none';

    tasks.forEach(task => {
        const div = document.createElement('div');
        div.className = 'task-item';
        div.setAttribute('data-id', task.id); // Importante para el reordenamiento
        div.innerHTML = `
            <div class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTask(${task.id})"></div>
            <span class="task-text ${task.completed ? 'completed' : ''}">${task.text}</span>
            <button class="delete-btn" onclick="deleteTask(${task.id})"><i class="fas fa-trash"></i></button>
        `;
        list.appendChild(div);
    });

    // Inicializar SortableJS (Drag and Drop)
    // Destruir instancia previa si existe para evitar duplicados
    if (window.sortableInstance) window.sortableInstance.destroy();
    
    window.sortableInstance = new Sortable(list, {
        animation: 150,
        ghostClass: 'blue-background-class',
        onEnd: function () {
            // Guardar el nuevo orden
            saveNewOrder();
        }
    });
}

function saveNewOrder() {
    const list = document.getElementById('task-list');
    const newOrder = [];
    const currentTasks = Storage.get('tasks');

    // Recorrer el DOM para ver el nuevo orden
    list.querySelectorAll('.task-item').forEach(item => {
        const id = Number(item.getAttribute('data-id'));
        const taskData = currentTasks.find(t => t.id === id);
        if (taskData) newOrder.push(taskData);
    });

    Storage.set('tasks', newOrder);
}

window.toggleTask = (id) => {
    const tasks = Storage.get('tasks');
    const task = tasks.find(t => t.id === id);
    if (task) { task.completed = !task.completed; Storage.set('tasks', tasks); loadTasks(); }
};

window.deleteTask = (id) => {
    let tasks = Storage.get('tasks');
    tasks = tasks.filter(t => t.id !== id);
    Storage.set('tasks', tasks);
    loadTasks();
};

// --- CALENDARIO Y NOTIFICACIONES ---
function addEvent() {
    const title = document.getElementById('event-title').value;
    const date = document.getElementById('event-date').value;
    if (!title || !date) return;

    const events = Storage.get('events');
    events.push({ id: Date.now(), title, date });
    events.sort((a, b) => new Date(a.date) - new Date(b.date));
    Storage.set('events', events);

    document.getElementById('event-title').value = '';
    document.getElementById('event-date').value = '';
    closeModal('event-modal');
    loadEvents();
    
    // Verificar si el nuevo evento requiere alerta inmediata (poco probable al crear, pero buena práctica)
    checkUpcomingEvents();
}

function loadEvents() {
    const events = Storage.get('events');
    const list = document.getElementById('event-list');
    list.innerHTML = '';

    events.forEach(evt => {
        const dateParts = evt.date.split('-'); // yyyy-mm-dd
        const dateObj = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
        const dateStr = dateObj.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });

        const div = document.createElement('div');
        div.className = 'event-card';
        div.innerHTML = `
            <div class="event-date">${dateStr}</div>
            <div class="event-title">${evt.title}</div>
            <button class="delete-btn" style="position: absolute; right: 10px; top: 10px;" onclick="deleteEvent(${evt.id})"><i class="fas fa-trash"></i></button>
        `;
        list.appendChild(div);
    });
}

window.deleteEvent = (id) => {
    let events = Storage.get('events');
    events = events.filter(e => e.id !== id);
    Storage.set('events', events);
    loadEvents();
};

// --- SISTEMA DE NOTIFICACIONES ---
window.requestNotificationPermission = () => {
    if (!("Notification" in window)) {
        alert("Tu navegador no soporta notificaciones.");
        return;
    }
    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            alert("Notificaciones activadas. Te avisaremos 1 semana antes de tus eventos.");
            checkUpcomingEvents();
        }
    });
};

function checkUpcomingEvents() {
    if (Notification.permission !== "granted") return;

    const events = Storage.get('events');
    const today = new Date();
    today.setHours(0,0,0,0);

    events.forEach(evt => {
        const eventDateParts = evt.date.split('-');
        const eventDate = new Date(eventDateParts[0], eventDateParts[1] - 1, eventDateParts[2]);
        
        // Calcular diferencia en días
        const diffTime = eventDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

        // Si faltan exactamente 7 días
        if (diffDays === 7) {
            new Notification("Recordatorio de Agenda", {
                body: `Falta 1 semana para: ${evt.title}`,
                icon: "https://cdn-icons-png.flaticon.com/512/2693/2693507.png" // Icono genérico de calendario
            });
        }
    });
}

// --- LECTURAS ---
function addReading() {
    const title = document.getElementById('reading-title').value;
    if (!title) return;
    const readings = Storage.get('readings');
    readings.push({ id: Date.now(), title, status: 'pending' });
    Storage.set('readings', readings);
    document.getElementById('reading-title').value = '';
    closeModal('reading-modal');
    loadReadings();
}

function loadReadings() {
    let readings = Storage.get('readings');
    const list = document.getElementById('readings-list');
    list.innerHTML = '';
    // Ordenar: Resumidos al final
    readings.sort((a, b) => (a.status === 'summarized') - (b.status === 'summarized'));

    readings.forEach(r => {
        const div = document.createElement('div');
        div.className = 'reading-card';
        if(r.status === 'summarized') div.style.opacity = '0.6';

        div.innerHTML = `
            <div class="reading-title">${r.title}</div>
            <div class="reading-actions">
                <button class="status-btn ${r.status === 'process' ? 'active-process' : ''}" onclick="updateReading(${r.id}, 'process')">En Proceso</button>
                <button class="status-btn ${r.status === 'read' ? 'active-read' : ''}" onclick="updateReading(${r.id}, 'read')">Leído</button>
                <button class="status-btn ${r.status === 'summarized' ? 'active-summary' : ''}" onclick="updateReading(${r.id}, 'summarized')">Resumido</button>
                <button class="delete-btn" onclick="deleteReading(${r.id})"><i class="fas fa-trash"></i></button>
            </div>
        `;
        list.appendChild(div);
    });
}

window.updateReading = (id, status) => {
    const readings = Storage.get('readings');
    const reading = readings.find(r => r.id === id);
    if(reading) {
        reading.status = (reading.status === status) ? 'pending' : status;
        Storage.set('readings', readings);
        loadReadings();
    }
};

window.deleteReading = (id) => {
    let readings = Storage.get('readings');
    readings = readings.filter(r => r.id !== id);
    Storage.set('readings', readings);
    loadReadings();
};

// --- POMODORO Y UTILIDADES EXTRA (Mismas funciones anteriores simplificadas) ---
let timerInterval; let timeLeft = 25 * 60; let isRunning = false;
window.startPomodoro = () => {
    if (isRunning) return;
    isRunning = true;
    timerInterval = setInterval(() => {
        if (timeLeft > 0) { timeLeft--; updateTimerDisplay(); } else { clearInterval(timerInterval); isRunning = false; alert("Tiempo terminado!"); resetPomodoro(); }
    }, 1000);
};
window.pausePomodoro = () => { clearInterval(timerInterval); isRunning = false; };
window.resetPomodoro = () => { pausePomodoro(); timeLeft = 25 * 60; updateTimerDisplay(); };
function updateTimerDisplay() {
    const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const s = (timeLeft % 60).toString().padStart(2, '0');
    document.getElementById('timer').innerText = `${m}:${s}`;
}
window.savePomodoroSession = () => {
    const name = document.getElementById('pomo-session-name').value;
    if(!name) return;
    const sessions = Storage.get('sessions');
    sessions.unshift({id: Date.now(), name});
    Storage.set('sessions', sessions);
    document.getElementById('pomo-session-name').value = '';
    loadSessions();
}
function loadSessions() {
    const list = document.getElementById('pomo-sessions-list'); list.innerHTML = '';
    Storage.get('sessions').forEach(s => {
        list.innerHTML += `<div class="saved-session-item"><span>${s.name}</span><button onclick="deleteSession(${s.id})" class="delete-btn"><i class="fas fa-trash"></i></button></div>`;
    });
}
window.deleteSession = (id) => { Storage.set('sessions', Storage.get('sessions').filter(s => s.id !== id)); loadSessions(); };
window.clearAllData = () => { if(confirm('¿Borrar todo?')) { Storage.clear(); location.reload(); }};
