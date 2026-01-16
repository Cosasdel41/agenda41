// --- LÓGICA DE INICIO (SPLASH) ---
window.addEventListener('load', () => {
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        const app = document.getElementById('app-container');
        splash.style.opacity = '0';
        setTimeout(() => {
            splash.style.display = 'none';
            app.style.display = 'block';
            app.style.animation = 'fadeInApp 0.5s ease forwards';
        }, 500);
    }, 2500);
});

// --- UTILIDADES ---
const Storage = {
    get: (key) => JSON.parse(localStorage.getItem(key)) || [],
    set: (key, data) => localStorage.setItem(key, JSON.stringify(data)),
    clear: () => localStorage.clear()
};

document.addEventListener('DOMContentLoaded', () => {
    loadTasks(); loadEvents(); loadReadings(); loadSessions();
    checkUpcomingEvents(); // Chequeo inicial
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
    tasks.unshift({ id: Date.now(), text, completed: false });
    Storage.set('tasks', tasks);
    input.value = ''; closeModal('task-modal'); loadTasks();
}

function loadTasks() {
    const tasks = Storage.get('tasks');
    const list = document.getElementById('task-list');
    const emptyMsg = document.getElementById('empty-tasks');
    list.innerHTML = '';
    
    if (tasks.length === 0) { emptyMsg.style.display = 'block'; return; }
    emptyMsg.style.display = 'none';

    tasks.forEach(task => {
        const div = document.createElement('div');
        div.className = 'task-item'; div.setAttribute('data-id', task.id);
        div.innerHTML = `
            <div class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTask(${task.id})"></div>
            <span class="task-text ${task.completed ? 'completed' : ''}">${task.text}</span>
            <button class="delete-btn" onclick="deleteTask(${task.id})"><i class="fas fa-trash"></i></button>
        `;
        list.appendChild(div);
    });

    if (window.sortableInstance) window.sortableInstance.destroy();
    window.sortableInstance = new Sortable(list, {
        animation: 150, handle: '.task-item', delay: 150, delayOnTouchOnly: true,
        onEnd: function () {
            const newOrder = [];
            list.querySelectorAll('.task-item').forEach(item => {
                const id = Number(item.getAttribute('data-id'));
                const t = tasks.find(x => x.id === id);
                if (t) newOrder.push(t);
            });
            Storage.set('tasks', newOrder);
        }
    });
}

window.toggleTask = (id) => {
    const tasks = Storage.get('tasks');
    const t = tasks.find(x => x.id === id);
    if(t) { t.completed = !t.completed; Storage.set('tasks', tasks); loadTasks(); }
};
window.deleteTask = (id) => { Storage.set('tasks', Storage.get('tasks').filter(t => t.id !== id)); loadTasks(); };

// --- CALENDARIO Y NOTIFICACIONES MEJORADAS ---
function addEvent() {
    const title = document.getElementById('event-title').value;
    const date = document.getElementById('event-date').value;
    if (!title || !date) return;
    const events = Storage.get('events');
    events.push({ id: Date.now(), title, date });
    events.sort((a, b) => new Date(a.date) - new Date(b.date));
    Storage.set('events', events);
    document.getElementById('event-title').value = ''; document.getElementById('event-date').value = '';
    closeModal('event-modal'); loadEvents(); checkUpcomingEvents();
}

function loadEvents() {
    const list = document.getElementById('event-list'); list.innerHTML = '';
    Storage.get('events').forEach(evt => {
        const d = new Date(evt.date + 'T00:00:00'); // Fix zona horaria
        const div = document.createElement('div'); div.className = 'event-card';
        div.innerHTML = `
            <div class="event-date">${d.toLocaleDateString('es-AR', {day:'numeric', month:'short'})}</div>
            <div class="event-title">${evt.title}</div>
            <button class="delete-btn" style="position: absolute; right: 10px; top: 10px;" onclick="deleteEvent(${evt.id})"><i class="fas fa-trash"></i></button>
        `;
        list.appendChild(div);
    });
}
window.deleteEvent = (id) => { Storage.set('events', Storage.get('events').filter(e => e.id !== id)); loadEvents(); };

// SOLICITUD DE PERMISOS UNIVERSAL
window.requestNotificationPermission = () => {
    if (!("Notification" in window)) {
        alert("Tu navegador no soporta notificaciones.");
        return;
    }
    
    // Para iOS y Android modernos, esto debe ser disparado por un click de usuario
    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            new Notification("¡Agenda lista!", { body: "Te avisaremos de tus eventos y pomodoros." });
            checkUpcomingEvents();
        } else if (permission === "denied") {
            alert("Has bloqueado las notificaciones. Habilítalas en la configuración del navegador para recibir alertas.");
        }
    });
};

function checkUpcomingEvents() {
    if (Notification.permission !== "granted") return;
    const events = Storage.get('events');
    const today = new Date(); today.setHours(0,0,0,0);
    
    events.forEach(evt => {
        const eventDate = new Date(evt.date + 'T00:00:00');
        const diffTime = eventDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 7) {
            new Notification("📅 Recordatorio Semanal", { body: `Falta 1 semana para: ${evt.title}` });
        }
    });
}

// --- LECTURAS ---
function addReading() {
    const title = document.getElementById('reading-title').value; if(!title) return;
    const r = Storage.get('readings'); r.push({ id: Date.now(), title, status: 'pending' });
    Storage.set('readings', r); document.getElementById('reading-title').value = ''; closeModal('reading-modal'); loadReadings();
}
function loadReadings() {
    const list = document.getElementById('readings-list'); list.innerHTML = '';
    let readings = Storage.get('readings');
    readings.sort((a, b) => (a.status === 'summarized') - (b.status === 'summarized'));
    readings.forEach(r => {
        const div = document.createElement('div'); div.className = 'reading-card';
        if(r.status === 'summarized') div.style.opacity = '0.6';
        div.innerHTML = `
            <div class="reading-title">${r.title}</div>
            <div class="reading-actions">
                <button class="status-btn ${r.status === 'process'?'active-process':''}" onclick="updateReading(${r.id}, 'process')">En Proceso</button>
                <button class="status-btn ${r.status === 'read'?'active-read':''}" onclick="updateReading(${r.id}, 'read')">Leído</button>
                <button class="status-btn ${r.status === 'summarized'?'active-summary':''}" onclick="updateReading(${r.id}, 'summarized')">Resumido</button>
                <button class="delete-btn" onclick="deleteReading(${r.id})"><i class="fas fa-trash"></i></button>
            </div>`;
        list.appendChild(div);
    });
}
window.updateReading = (id, s) => { 
    const rs = Storage.get('readings'); const r = rs.find(x => x.id === id);
    if(r) { r.status = (r.status === s) ? 'pending' : s; Storage.set('readings', rs); loadReadings(); }
};
window.deleteReading = (id) => { Storage.set('readings', Storage.get('readings').filter(r => r.id !== id)); loadReadings(); };

// --- POMODORO ---
let timerInterval; let timeLeft = 25 * 60; let isRunning = false;

window.startPomodoro = () => {
    if (isRunning) return;
    isRunning = true;
    document.getElementById('start-timer').style.display = 'none';
    document.getElementById('pause-timer').style.display = 'inline-block';
    document.getElementById('timer-status').innerText = "Enfocate...";
    
    timerInterval = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--; updateTimerDisplay();
        } else {
            clearInterval(timerInterval); isRunning = false;
            document.getElementById('timer-status').innerText = "¡Tiempo Terminado!";
            
            // Notificación sonora/visual
            if(Notification.permission === "granted") {
                new Notification("🍅 Pomodoro Terminado", { body: "¡Tomate un descanso de 5 minutos!" });
            }
            try { navigator.vibrate([200, 100, 200]); } catch(e){}
            alert("¡Tiempo terminado! Tomate un recreo.");
            resetPomodoro();
        }
    }, 1000);
};

window.pausePomodoro = () => {
    clearInterval(timerInterval); isRunning = false;
    document.getElementById('start-timer').style.display = 'inline-block';
    document.getElementById('pause-timer').style.display = 'none';
    document.getElementById('timer-status').innerText = "Pausado";
};

window.resetPomodoro = () => {
    pausePomodoro(); timeLeft = 25 * 60; updateTimerDisplay();
    document.getElementById('timer-status').innerText = "Listo para enfocar";
};

function updateTimerDisplay() {
    const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const s = (timeLeft % 60).toString().padStart(2, '0');
    document.getElementById('timer').innerText = `${m}:${s}`;
}

window.savePomodoroSession = () => {
    const name = document.getElementById('pomo-session-name').value; if(!name) return;
    const s = Storage.get('sessions'); s.unshift({id:Date.now(), name});
    Storage.set('sessions', s); document.getElementById('pomo-session-name').value = ''; loadSessions();
}
function loadSessions() {
    const list = document.getElementById('pomo-sessions-list'); list.innerHTML = '';
    Storage.get('sessions').forEach(s => {
        list.innerHTML += `<div class="saved-session-item"><span>${s.name}</span><button onclick="deleteSession(${s.id})" class="delete-btn"><i class="fas fa-trash"></i></button></div>`;
    });
}
window.deleteSession = (id) => { Storage.set('sessions', Storage.get('sessions').filter(s => s.id !== id)); loadSessions(); };
window.clearAllData = () => { if(confirm('¿Borrar todo?')) { Storage.clear(); location.reload(); }};
