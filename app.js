const STORAGE_KEY = "test-todo-list";

let todos = loadTodos();
let filter = "all";

const addForm = document.getElementById("addForm");
const todoInput = document.getElementById("todoInput");
const todoList = document.getElementById("todoList");
const itemCount = document.getElementById("itemCount");
const clearCompleted = document.getElementById("clearCompleted");
const todoTemplate = document.getElementById("todoTemplate");
const filterButtons = document.querySelectorAll(".filter");

function loadTodos() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
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

function getVisibleTodos() {
  if (filter === "active") return todos.filter((t) => !t.completed);
  if (filter === "completed") return todos.filter((t) => t.completed);
  return todos;
}

function render() {
  todoList.replaceChildren();

  getVisibleTodos().forEach((todo) => {
    const node = todoTemplate.content.cloneNode(true);
    const item = node.querySelector(".todo-item");
    const checkbox = node.querySelector(".todo-check");
    const text = node.querySelector(".todo-text");
    const deleteBtn = node.querySelector(".delete-btn");

    item.dataset.id = todo.id;
    if (todo.completed) item.classList.add("completed");

    checkbox.checked = todo.completed;
    text.textContent = todo.text;

    checkbox.addEventListener("change", () => toggleTodo(todo.id));
    deleteBtn.addEventListener("click", () => deleteTodo(todo.id));

    todoList.appendChild(node);
  });

  const activeCount = todos.filter((t) => !t.completed).length;
  itemCount.textContent = `${activeCount} item${activeCount === 1 ? "" : "s"} left`;

  const hasCompleted = todos.some((t) => t.completed);
  clearCompleted.hidden = !hasCompleted;
}

function addTodo(text) {
  const trimmed = text.trim();
  if (!trimmed) return;

  todos.unshift({
    id: createId(),
    text: trimmed,
    completed: false,
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
  addTodo(todoInput.value);
  todoInput.value = "";
  todoInput.focus();
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
