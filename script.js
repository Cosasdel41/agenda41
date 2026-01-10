// --- UTILIDADES DE STORAGE ---
const Storage = {
    get: (key) => JSON.parse(localStorage.getItem(key)) || [],
    set: (key, data) => localStorage.setItem(key, JSON.stringify(data)),
    clear: () => localStorage.clear()
};

// --- ESTADO INICIAL ---
document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    loadEvents();
    loadReadings();
    loadSessions();
    document.getElementById('current-date').innerText = new Date().toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' });
});

// --- NAVEGACIÓN ---
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebar-overlay');
const sections = {
    'tasks': 'Mis Tareas',
    'calendar': 'Calendario',
    'readings': 'Lecturas',
    'pomodoro': 'Pomodoro'
};

function navigate(viewId) {
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active-view'));
    document.getElementById(viewId + '-section').classList.add('active-view');
    document.getElementById('page-title').innerText = sections[viewId];
    closeSidebar();
}

document.getElementById('menu-btn').addEventListener('click', () => {
    sidebar.classList.add('open');
    overlay.classList.add('open');
});

function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
}
document.getElementById('close-sidebar').addEventListener('click', closeSidebar);
overlay.addEventListener('click', closeSidebar);

// --- MODALES ---
function openModal(id) {
    document.getElementById(id).classList.add('active');
    // Enfocar input automáticamente
    const input = document.getElementById(id).querySelector('input');
    if(input) setTimeout(() => input.focus(), 100); 
}
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// --- TAREAS ---
function addTask() {
    const input = document.getElementById('new-task-input');
    const text = input.value.trim();
    if (!text) return;

    const tasks = Storage.get('tasks');
    tasks.unshift({ id: Date.now(), text, completed: false }); // Agregar al principio
    Storage.set('tasks', tasks);
    
    input.value = '';
    closeModal('task-modal');
    loadTasks();
}

function loadTasks() {
    const tasks = Storage.get('tasks');
    const list = document.getElementById('task-list');
    const emptyMsg = document.getElementById('empty-tasks');
    
    // Limpiar (excepto mensaje empty)
    list.innerHTML = '';
    if (tasks.length === 0) {
        list.appendChild(emptyMsg);
        emptyMsg.style.display = 'block';
        return;
    }
    emptyMsg.style.display = 'none';

    tasks.forEach(task => {
        const div = document.createElement('div');
        div.className = 'task-item';
        div.innerHTML = `
            <div class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTask(${task.id})"></div>
            <span class="task-text ${task.completed ? 'completed' : ''}">${task.text}</span>
            <button class="delete-btn" onclick="deleteTask(${task.id})"><i class="fas fa-trash"></i></button>
        `;
        list.appendChild(div);
    });
}

function toggleTask(id) {
    const tasks = Storage.get('tasks');
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        Storage.set('tasks', tasks);
        loadTasks();
    }
}

function deleteTask(id) {
    let tasks = Storage.get('tasks');
    tasks = tasks.filter(t => t.id !== id);
    Storage.set('tasks', tasks);
    loadTasks();
}

// --- CALENDARIO ---
function addEvent() {
    const title = document.getElementById('event-title').value;
    const date = document.getElementById('event-date').value;
    if (!title || !date) return;

    const events = Storage.get('events');
    events.push({ id: Date.now(), title, date });
    events.sort((a, b) => new Date(a.date) - new Date(b.date)); // Ordenar por fecha
    Storage.set('events', events);

    document.getElementById('event-title').value = '';
    document.getElementById('event-date').value = '';
    closeModal('event-modal');
    loadEvents();
}

function loadEvents() {
    const events = Storage.get('events');
    const list = document.getElementById('event-list');
    list.innerHTML = '';

    events.forEach(evt => {
        // Formato fecha amigable
        const [year, month, day] = evt.date.split('-');
        const dateStr = `${day}/${month}/${year}`;

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

function deleteEvent(id) {
    let events = Storage.get('events');
    events = events.filter(e => e.id !== id);
    Storage.set('events', events);
    loadEvents();
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

function updateReading(id, status) {
    const readings = Storage.get('readings');
    const reading = readings.find(r => r.id === id);
    if(reading) {
        // Toggle lógica (si ya está activo, lo desactiva, sino lo activa)
        reading.status = (reading.status === status) ? 'pending' : status;
        Storage.set('readings', readings);
        loadReadings();
    }
}

function deleteReading(id) {
    let readings = Storage.get('readings');
    readings = readings.filter(r => r.id !== id);
    Storage.set('readings', readings);
    loadReadings();
}

// --- POMODORO ---
let timerInterval;
let timeLeft = 25 * 60;
let isRunning = false;

function startPomodoro() {
    if (isRunning) return;
    isRunning = true;
    document.getElementById('start-timer').style.display = 'none';
    document.getElementById('pause-timer').style.display = 'inline-block';
    
    timerInterval = setInterval(() => {
        if (timeLeft > 0) {
            timeLeft--;
            updateTimerDisplay();
        } else {
            clearInterval(timerInterval);
            isRunning = false;
            // Sonido o alerta nativa
            try { navigator.vibrate(200); } catch(e){}
            alert("¡Tiempo terminado! Tomate un recreo.");
            resetPomodoro();
        }
    }, 1000);
}

function pausePomodoro() {
    clearInterval(timerInterval);
    isRunning = false;
    document.getElementById('start-timer').style.display = 'inline-block';
    document.getElementById('pause-timer').style.display = 'none';
}

function resetPomodoro() {
    pausePomodoro();
    timeLeft = 25 * 60;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const s = (timeLeft % 60).toString().padStart(2, '0');
    document.getElementById('timer').innerText = `${m}:${s}`;
}

// Sesiones Guardadas
function savePomodoroSession() {
    const nameInput = document.getElementById('pomo-session-name');
    const name = nameInput.value.trim();
    if (!name) return;

    const sessions = Storage.get('sessions');
    sessions.unshift({ id: Date.now(), name });
    Storage.set('sessions', sessions);
    
    nameInput.value = '';
    loadSessions();
}

function loadSessions() {
    const sessions = Storage.get('sessions');
    const list = document.getElementById('pomo-sessions-list');
    list.innerHTML = '';
    
    sessions.forEach(s => {
        const div = document.createElement('div');
        div.className = 'saved-session-item';
        div.innerHTML = `
            <span>${s.name}</span>
            <button onclick="deleteSession(${s.id})" class="delete-btn"><i class="fas fa-trash"></i></button>
        `;
        list.appendChild(div);
    });
}

function deleteSession(id) {
    let sessions = Storage.get('sessions');
    sessions = sessions.filter(s => s.id !== id);
    Storage.set('sessions', sessions);
    loadSessions();
}

// --- BORRAR TODO ---
function clearAllData() {
    if(confirm('¿Estás seguro de que querés borrar TODOS los datos de la app? Esta acción no se puede deshacer.')) {
        Storage.clear();
        location.reload();
    }
}
