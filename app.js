const STORAGE_KEY = "test-todo-list-v2";

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
const PRIORITY_LABELS = { low: "Low", medium: "Medium", high: "High" };
const FILTER_TITLES = {
  all: "All tasks",
  active: "Active tasks",
  completed: "Completed tasks",
};

let todos = loadTodos();
let filter = "all";
let sortBy = "newest";
let searchQuery = "";

const addForm = document.getElementById("addForm");
const todoInput = document.getElementById("todoInput");
const prioritySelect = document.getElementById("prioritySelect");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const todoList = document.getElementById("todoList");
const itemCount = document.getElementById("itemCount");
const panelTitle = document.getElementById("panelTitle");
const clearCompleted = document.getElementById("clearCompleted");
const todoTemplate = document.getElementById("todoTemplate");
const filterButtons = document.querySelectorAll(".filter");
const progressRing = document.getElementById("progressRing");
const progressPercent = document.getElementById("progressPercent");
const statTotal = document.getElementById("statTotal");
const statActive = document.getElementById("statActive");
const statDone = document.getElementById("statDone");
const countAll = document.getElementById("countAll");
const countActive = document.getElementById("countActive");
const countCompleted = document.getElementById("countCompleted");

function loadTodos() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);

    const legacy = localStorage.getItem("test-todo-list");
    if (!legacy) return [];

    return JSON.parse(legacy).map((todo) => ({
      ...todo,
      priority: todo.priority || "medium",
      createdAt: todo.createdAt || Date.now(),
    }));
  } catch {
    return [];
  }
}

function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function createId() {
  return crypto.randomUUID?.() ?? String(Date.now()) + Math.random();
}

function matchesSearch(todo) {
  if (!searchQuery) return true;
  return todo.text.toLowerCase().includes(searchQuery);
}

function getFilteredTodos() {
  return todos.filter((todo) => {
    if (filter === "active" && todo.completed) return false;
    if (filter === "completed" && !todo.completed) return false;
    return matchesSearch(todo);
  });
}

function sortTodos(list) {
  const sorted = [...list];

  if (sortBy === "priority") {
    sorted.sort((a, b) => {
      const diff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      return diff || b.createdAt - a.createdAt;
    });
  } else if (sortBy === "alpha") {
    sorted.sort((a, b) => a.text.localeCompare(b.text));
  } else {
    sorted.sort((a, b) => b.createdAt - a.createdAt);
  }

  return sorted;
}

function updateStats() {
  const total = todos.length;
  const active = todos.filter((t) => !t.completed).length;
  const done = total - active;
  const percent = total ? Math.round((done / total) * 100) : 0;

  statTotal.textContent = total;
  statActive.textContent = active;
  statDone.textContent = done;
  countAll.textContent = total;
  countActive.textContent = active;
  countCompleted.textContent = done;
  progressRing.style.setProperty("--progress", percent);
  progressPercent.textContent = `${percent}%`;
  itemCount.textContent = `${active} item${active === 1 ? "" : "s"} left`;
  panelTitle.textContent = FILTER_TITLES[filter];
  clearCompleted.hidden = done === 0;
}

function render() {
  todoList.replaceChildren();
  updateStats();

  sortTodos(getFilteredTodos()).forEach((todo) => {
    const node = todoTemplate.content.cloneNode(true);
    const item = node.querySelector(".todo-item");
    const checkbox = node.querySelector(".todo-check");
    const text = node.querySelector(".todo-text");
    const badge = node.querySelector(".priority-badge");
    const editBtn = node.querySelector(".edit-btn");
    const deleteBtn = node.querySelector(".delete-btn");

    item.dataset.id = todo.id;
    item.classList.add(`priority-${todo.priority}`);
    if (todo.completed) item.classList.add("completed");

    checkbox.checked = todo.completed;
    text.textContent = todo.text;
    badge.textContent = PRIORITY_LABELS[todo.priority];
    badge.classList.add(`priority-${todo.priority}`);

    const editInput = document.createElement("input");
    editInput.type = "text";
    editInput.className = "edit-input";
    editInput.value = todo.text;
    editInput.maxLength = 200;
    item.querySelector(".todo-body").appendChild(editInput);

    checkbox.addEventListener("change", () => toggleTodo(todo.id));
    deleteBtn.addEventListener("click", () => deleteTodo(todo.id));
    editBtn.addEventListener("click", () => startEdit(item, todo.id, editInput));
    editInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") finishEdit(todo.id, editInput, item);
      if (e.key === "Escape") cancelEdit(item, editInput, todo.text);
    });
    editInput.addEventListener("blur", () => finishEdit(todo.id, editInput, item));

    todoList.appendChild(node);
  });
}

function startEdit(item, id, input) {
  if (item.classList.contains("editing")) return;
  item.classList.add("editing");
  input.value = todos.find((t) => t.id === id)?.text || "";
  input.focus();
  input.select();
}

function finishEdit(id, input, item) {
  if (!item.classList.contains("editing")) return;
  item.classList.remove("editing");

  const trimmed = input.value.trim();
  const todo = todos.find((t) => t.id === id);
  if (!todo || !trimmed) {
    input.value = todo?.text || "";
    return;
  }

  todo.text = trimmed;
  saveTodos();
  render();
}

function cancelEdit(item, input, original) {
  item.classList.remove("editing");
  input.value = original;
}

function addTodo(text, priority) {
  const trimmed = text.trim();
  if (!trimmed) return;

  todos.unshift({
    id: createId(),
    text: trimmed,
    priority,
    completed: false,
    createdAt: Date.now(),
  });

  saveTodos();
  render();
}

function toggleTodo(id) {
  const todo = todos.find((t) => t.id === id);
  if (!todo) return;

  todo.completed = !todo.completed;
  saveTodos();
  render();
}

function deleteTodo(id) {
  todos = todos.filter((t) => t.id !== id);
  saveTodos();
  render();
}

addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  addTodo(todoInput.value, prioritySelect.value);
  todoInput.value = "";
  todoInput.focus();
});

searchInput.addEventListener("input", (e) => {
  searchQuery = e.target.value.trim().toLowerCase();
  render();
});

sortSelect.addEventListener("change", (e) => {
  sortBy = e.target.value;
  render();
});

clearCompleted.addEventListener("click", () => {
  todos = todos.filter((t) => !t.completed);
  saveTodos();
  render();
});

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filter = btn.dataset.filter;
    filterButtons.forEach((b) => b.classList.toggle("active", b === btn));
    render();
  });
});

render();
