const STORAGE_KEY = "test-todo-list-v2";
const THEME_KEY = "task-board-theme";

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
const PRIORITY_LABELS = { low: "Low", medium: "Medium", high: "High" };
const CATEGORY_LABELS = {
  work: "Work",
  personal: "Personal",
  shopping: "Shopping",
  other: "Other",
};
const FILTER_TITLES = {
  all: "All tasks",
  active: "Active tasks",
  completed: "Completed tasks",
  pinned: "Pinned tasks",
};

let todos = loadTodos();
let filter = "all";
let categoryFilter = "all";
let sortBy = "newest";
let searchQuery = "";
let deletedBackup = null;
let undoTimer = null;

const addForm = document.getElementById("addForm");
const todoInput = document.getElementById("todoInput");
const categorySelect = document.getElementById("categorySelect");
const prioritySelect = document.getElementById("prioritySelect");
const dueDateInput = document.getElementById("dueDateInput");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const todoList = document.getElementById("todoList");
const itemCount = document.getElementById("itemCount");
const panelTitle = document.getElementById("panelTitle");
const clearCompleted = document.getElementById("clearCompleted");
const completeAll = document.getElementById("completeAll");
const todoTemplate = document.getElementById("todoTemplate");
const filterButtons = document.querySelectorAll(".filter");
const categoryFilters = document.getElementById("categoryFilters");
const progressRing = document.getElementById("progressRing");
const progressPercent = document.getElementById("progressPercent");
const statTotal = document.getElementById("statTotal");
const statActive = document.getElementById("statActive");
const statDone = document.getElementById("statDone");
const countAll = document.getElementById("countAll");
const countActive = document.getElementById("countActive");
const countCompleted = document.getElementById("countCompleted");
const countPinned = document.getElementById("countPinned");
const overdueNote = document.getElementById("overdueNote");
const themeToggle = document.getElementById("themeToggle");
const toast = document.getElementById("toast");
const toastMessage = document.getElementById("toastMessage");
const undoBtn = document.getElementById("undoBtn");

function loadTodos() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return normalizeTodos(JSON.parse(data));

    const legacy = localStorage.getItem("test-todo-list");
    if (!legacy) return [];

    return normalizeTodos(JSON.parse(legacy));
  } catch {
    return [];
  }
}

function normalizeTodos(list) {
  return list.map((todo) => ({
    ...todo,
    priority: todo.priority || "medium",
    category: todo.category || "other",
    pinned: Boolean(todo.pinned),
    dueDate: todo.dueDate || null,
    createdAt: todo.createdAt || Date.now(),
  }));
}

function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function createId() {
  return crypto.randomUUID?.() ?? String(Date.now()) + Math.random();
}

function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const theme = saved === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
  themeToggle.textContent = theme === "dark" ? "☀" : "☾";
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem(THEME_KEY, next);
  themeToggle.textContent = next === "dark" ? "☀" : "☾";
}

function matchesSearch(todo) {
  if (!searchQuery) return true;
  const haystack = `${todo.text} ${CATEGORY_LABELS[todo.category]}`.toLowerCase();
  return haystack.includes(searchQuery);
}

function isOverdue(todo) {
  if (!todo.dueDate || todo.completed) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(todo.dueDate + "T00:00:00") < today;
}

function formatDueDate(dueDate) {
  if (!dueDate) return "";
  const date = new Date(dueDate + "T00:00:00");
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getFilteredTodos() {
  return todos.filter((todo) => {
    if (filter === "active" && todo.completed) return false;
    if (filter === "completed" && !todo.completed) return false;
    if (filter === "pinned" && !todo.pinned) return false;
    if (categoryFilter !== "all" && todo.category !== categoryFilter) return false;
    return matchesSearch(todo);
  });
}

function sortTodos(list) {
  const sorted = [...list];

  sorted.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;

    if (sortBy === "priority") {
      const diff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      return diff || b.createdAt - a.createdAt;
    }

    if (sortBy === "due") {
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return b.createdAt - a.createdAt;
    }

    if (sortBy === "alpha") {
      return a.text.localeCompare(b.text);
    }

    return b.createdAt - a.createdAt;
  });

  return sorted;
}

function renderCategoryFilters() {
  categoryFilters.querySelectorAll(".category-chip").forEach((el) => el.remove());

  const chips = [
    { id: "all", label: "All" },
    ...Object.entries(CATEGORY_LABELS).map(([id, label]) => ({ id, label })),
  ];

  chips.forEach(({ id, label }) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `category-chip${categoryFilter === id ? " active" : ""}`;
    btn.dataset.category = id;
    btn.textContent = label;
    btn.addEventListener("click", () => {
      categoryFilter = id;
      renderCategoryFilters();
      render();
    });
    categoryFilters.appendChild(btn);
  });
}

function updateStats() {
  const total = todos.length;
  const active = todos.filter((t) => !t.completed).length;
  const done = total - active;
  const pinned = todos.filter((t) => t.pinned).length;
  const overdue = todos.filter(isOverdue).length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  statTotal.textContent = total;
  statActive.textContent = active;
  statDone.textContent = done;
  countAll.textContent = total;
  countActive.textContent = active;
  countCompleted.textContent = done;
  countPinned.textContent = pinned;
  progressRing.style.setProperty("--progress", percent);
  progressPercent.textContent = `${percent}%`;
  itemCount.textContent = `${active} item${active === 1 ? "" : "s"} left`;
  panelTitle.textContent = FILTER_TITLES[filter];
  clearCompleted.hidden = done === 0;
  completeAll.hidden = active === 0;

  if (overdue > 0) {
    overdueNote.hidden = false;
    overdueNote.textContent = `${overdue} overdue task${overdue === 1 ? "" : "s"}`;
  } else {
    overdueNote.hidden = true;
  }
}

function render() {
  todoList.replaceChildren();
  updateStats();

  sortTodos(getFilteredTodos()).forEach((todo) => {
    const node = todoTemplate.content.cloneNode(true);
    const item = node.querySelector(".todo-item");
    const pinBtn = node.querySelector(".pin-btn");
    const checkbox = node.querySelector(".todo-check");
    const text = node.querySelector(".todo-text");
    const categoryBadge = node.querySelector(".category-badge");
    const badge = node.querySelector(".priority-badge");
    const dueBadge = node.querySelector(".due-badge");
    const editBtn = node.querySelector(".edit-btn");
    const deleteBtn = node.querySelector(".delete-btn");

    item.dataset.id = todo.id;
    item.classList.add(`priority-${todo.priority}`, `category-${todo.category}`);
    if (todo.completed) item.classList.add("completed");
    if (todo.pinned) item.classList.add("pinned");
    if (isOverdue(todo)) item.classList.add("overdue");

    checkbox.checked = todo.completed;
    text.textContent = todo.text;
    pinBtn.textContent = todo.pinned ? "★" : "☆";
    pinBtn.classList.toggle("is-pinned", todo.pinned);
    categoryBadge.textContent = CATEGORY_LABELS[todo.category];
    badge.textContent = PRIORITY_LABELS[todo.priority];
    badge.classList.add(`priority-${todo.priority}`);

    if (todo.dueDate) {
      dueBadge.textContent = formatDueDate(todo.dueDate);
      if (isOverdue(todo)) dueBadge.classList.add("overdue");
    } else {
      dueBadge.remove();
    }

    const editInput = document.createElement("input");
    editInput.type = "text";
    editInput.className = "edit-input";
    editInput.value = todo.text;
    editInput.maxLength = 200;
    item.querySelector(".todo-body").appendChild(editInput);

    checkbox.addEventListener("change", () => toggleTodo(todo.id));
    pinBtn.addEventListener("click", () => togglePin(todo.id));
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

function addTodo(text, priority, category, dueDate) {
  const trimmed = text.trim();
  if (!trimmed) return;

  todos.unshift({
    id: createId(),
    text: trimmed,
    priority,
    category,
    dueDate: dueDate || null,
    pinned: false,
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

function togglePin(id) {
  const todo = todos.find((t) => t.id === id);
  if (!todo) return;

  todo.pinned = !todo.pinned;
  saveTodos();
  render();
}

function deleteTodo(id) {
  const index = todos.findIndex((t) => t.id === id);
  if (index === -1) return;

  deletedBackup = { todo: todos[index], index };
  todos = todos.filter((t) => t.id !== id);
  saveTodos();
  render();
  showUndo("Task deleted");
}

function showUndo(message) {
  clearTimeout(undoTimer);
  toastMessage.textContent = message;
  toast.hidden = false;

  undoTimer = setTimeout(() => {
    toast.hidden = true;
    deletedBackup = null;
  }, 5000);
}

function undoDelete() {
  if (!deletedBackup) return;

  const { todo, index } = deletedBackup;
  todos.splice(Math.min(index, todos.length), 0, todo);
  deletedBackup = null;
  toast.hidden = true;
  clearTimeout(undoTimer);
  saveTodos();
  render();
}

function completeAllActive() {
  todos.forEach((todo) => {
    if (!todo.completed) todo.completed = true;
  });
  saveTodos();
  render();
}

addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  addTodo(
    todoInput.value,
    prioritySelect.value,
    categorySelect.value,
    dueDateInput.value
  );
  todoInput.value = "";
  dueDateInput.value = "";
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

completeAll.addEventListener("click", () => {
  completeAllActive();
});

undoBtn.addEventListener("click", undoDelete);
themeToggle.addEventListener("click", toggleTheme);

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    filter = btn.dataset.filter;
    filterButtons.forEach((b) => b.classList.toggle("active", b === btn));
    render();
  });
});

document.addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement !== searchInput) {
    e.preventDefault();
    searchInput.focus();
  }
});

loadTheme();
renderCategoryFilters();
render();
