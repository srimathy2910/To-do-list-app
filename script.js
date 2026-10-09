const taskForm = document.getElementById("task-form");
const taskInput = document.getElementById("task-input");
const submitButton = document.getElementById("submit-button");
const taskList = document.getElementById("task-list");
const emptyMessage = document.getElementById("empty-message");
const taskSummary = document.getElementById("task-summary");
const remainingCount = document.getElementById("remaining-count");
const clearCompletedButton = document.getElementById("clear-completed");
const statusMessage = document.getElementById("status-message");
const filterButtons = document.querySelector(".filters");

const STORAGE_KEY = "taskflow-tasks";

let tasks = loadTasks();
let currentFilter = "all";
let editingTaskId = null;

function loadTasks() {
    try {
        const savedTasks = localStorage.getItem(STORAGE_KEY);

        if (!savedTasks) {
            return [];
        }

        const parsedTasks = JSON.parse(savedTasks);

        if (!Array.isArray(parsedTasks)) {
            return [];
        }

        return parsedTasks.filter(task =>
            task &&
            typeof task.id === "string" &&
            typeof task.title === "string" &&
            typeof task.completed === "boolean"
        );
    } catch (error) {
        console.error("Could not load saved tasks:", error);
        return [];
    }
}

function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        return true;
    } catch (error) {
        console.error("Could not save tasks:", error);
        showStatus("Unable to save tasks in this browser.");
        return false;
    }
}

function showStatus(message) {
    statusMessage.textContent = message;
}

function createTask(title) {
    const task = {
        id: crypto.randomUUID(),
        title: title,
        completed: false
    };

    tasks.unshift(task);
    saveTasks();
    renderTasks();
    showStatus("Task added successfully.");
}

function updateTask(id, newTitle) {
    const task = tasks.find(item => item.id === id);

    if (!task) {
        return;
    }

    task.title = newTitle;
    saveTasks();
    renderTasks();
    showStatus("Task updated successfully.");
}

function deleteTask(id) {
    tasks = tasks.filter(task => task.id !== id);

    if (editingTaskId === id) {
        cancelEditing();
    }

    saveTasks();
    renderTasks();
    showStatus("Task deleted.");
}

function toggleTask(id) {
    const task = tasks.find(item => item.id === id);

    if (!task) {
        return;
    }

    task.completed = !task.completed;
    saveTasks();
    renderTasks();

    showStatus(
        task.completed
            ? "Task marked as completed."
            : "Task marked as active."
    );
}

function startEditing(id) {
    const task = tasks.find(item => item.id === id);

    if (!task) {
        return;
    }

    editingTaskId = id;
    taskInput.value = task.title;
    submitButton.textContent = "Save Changes";
    taskInput.focus();
    showStatus("Edit the task and select Save Changes.");
}

function cancelEditing() {
    editingTaskId = null;
    taskInput.value = "";
    submitButton.textContent = "Add Task";
}

function getVisibleTasks() {
    if (currentFilter === "active") {
        return tasks.filter(task => !task.completed);
    }

    if (currentFilter === "completed") {
        return tasks.filter(task => task.completed);
    }

    return tasks;
}

function renderTasks() {
    taskList.replaceChildren();

    const visibleTasks = getVisibleTasks();

    visibleTasks.forEach(task => {
        const item = document.createElement("li");
        item.className = "task-item";
        item.dataset.id = task.id;

        if (task.completed) {
            item.classList.add("completed");
        }

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "task-checkbox";
        checkbox.checked = task.completed;
        checkbox.setAttribute("aria-label", `Complete ${task.title}`);
        checkbox.dataset.action = "toggle";

        const title = document.createElement("span");
        title.className = "task-title";
        title.textContent = task.title;

        const actions = document.createElement("div");
        actions.className = "task-actions";

        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.textContent = "Edit";
        editButton.dataset.action = "edit";
        editButton.setAttribute("aria-label", `Edit ${task.title}`);

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.textContent = "Delete";
        deleteButton.dataset.action = "delete";
        deleteButton.setAttribute("aria-label", `Delete ${task.title}`);

        actions.append(editButton, deleteButton);
        item.append(checkbox, title, actions);
        taskList.appendChild(item);
    });

    const completedTasks = tasks.filter(task => task.completed).length;
    const activeTasks = tasks.length - completedTasks;

    taskSummary.textContent = `${tasks.length} total task${tasks.length === 1 ? "" : "s"}`;
    remainingCount.textContent =
        `${activeTasks} task${activeTasks === 1 ? "" : "s"} remaining`;

    emptyMessage.hidden = visibleTasks.length > 0;
    clearCompletedButton.disabled = completedTasks === 0;

    clearCompletedButton.style.opacity =
        completedTasks === 0 ? "0.5" : "1";

    filterButtons.querySelectorAll(".filter-btn").forEach(button => {
        const isActive = button.dataset.filter === currentFilter;

        button.classList.toggle("active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
    });
}

taskForm.addEventListener("submit", event => {
    event.preventDefault();

    const title = taskInput.value.trim();

    if (!title) {
        showStatus("Please enter a task.");
        taskInput.focus();
        return;
    }

    if (editingTaskId) {
        updateTask(editingTaskId, title);
        cancelEditing();
        renderTasks();
    } else {
        createTask(title);
    }

    taskInput.value = "";
    taskInput.focus();
});

taskList.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");

    if (!button) {
        return;
    }

    const item = button.closest(".task-item");

    if (!item) {
        return;
    }

    const id = item.dataset.id;
    const action = button.dataset.action;

    if (action === "edit") {
        startEditing(id);
    }

    if (action === "delete") {
        deleteTask(id);
    }
});

taskList.addEventListener("change", event => {
    if (!event.target.matches('input[data-action="toggle"]')) {
        return;
    }

    const item = event.target.closest(".task-item");

    if (item) {
        toggleTask(item.dataset.id);
    }
});

filterButtons.addEventListener("click", event => {
    const button = event.target.closest("button[data-filter]");

    if (!button) {
        return;
    }

    currentFilter = button.dataset.filter;
    renderTasks();
});

clearCompletedButton.addEventListener("click", () => {
    const completedCount = tasks.filter(task => task.completed).length;

    if (completedCount === 0) {
        return;
    }

    tasks = tasks.filter(task => !task.completed);

    if (
        editingTaskId &&
        !tasks.some(task => task.id === editingTaskId)
    ) {
        cancelEditing();
    }

    saveTasks();
    renderTasks();
    showStatus("Completed tasks cleared.");
});

renderTasks();