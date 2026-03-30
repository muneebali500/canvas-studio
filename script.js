const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 600;

let currentTool = "brush";
let currentColor = "#7c5cfc";
let brushSize = 12;
let isDrawing = false;
let lastX = 0;
let lastY = 0;

const canvas = document.getElementById("drawingCanvas");
const ctx = canvas.getContext("2d");
const mobileTabs = document.querySelectorAll(".mobile-tab");

ctx.lineCap = "round";
ctx.lineJoin = "round";

function setMobileView(view) {
  document.body.dataset.mobileView = view;

  mobileTabs.forEach((tab) => {
    const isActive = tab.dataset.view === view;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-pressed", String(isActive));
  });
}

mobileTabs.forEach((tab) => {
  tab.addEventListener("click", () => setMobileView(tab.dataset.view));
});

function getPointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  const source = event.touches ? event.touches[0] : event;

  return {
    x: (source.clientX - rect.left) * (CANVAS_WIDTH / rect.width),
    y: (source.clientY - rect.top) * (CANVAS_HEIGHT / rect.height),
  };
}

function updatePointerStatus(x, y) {
  document.getElementById("posX").textContent = Math.round(x);
  document.getElementById("posY").textContent = Math.round(y);
}

function setTool(tool) {
  currentTool = tool;

  document.querySelectorAll(".tool-btn").forEach((button) => {
    button.classList.remove("active");
  });

  document.getElementById(`tool-${tool}`).classList.add("active");
  document.getElementById("statusTool").textContent = tool;
  canvas.style.cursor = tool === "eraser" ? "cell" : "crosshair";
}

function updateSize() {
  brushSize = Number(document.getElementById("brushSize").value);
  document.getElementById("sizeVal").textContent = brushSize;
  document.getElementById("statusSize").textContent = brushSize;
}

function selectColor(color, selectedSwatch) {
  currentColor = color;
  document.getElementById("colorPicker").value = color;
  document.getElementById("statusColor").textContent = color;
  document.getElementById("statusColor").style.color = color;

  document.querySelectorAll(".color-swatch").forEach((swatch) => {
    swatch.classList.remove("active");
  });

  if (selectedSwatch) {
    selectedSwatch.classList.add("active");
  }
}

function applyStrokeStyle() {
  ctx.globalAlpha = currentTool === "pencil" ? 0.82 : 1;
  ctx.globalCompositeOperation =
    currentTool === "eraser" ? "destination-out" : "source-over";
  ctx.strokeStyle = currentColor;
  ctx.lineWidth =
    currentTool === "pencil" ? Math.max(1, brushSize * 0.5) : brushSize;
}

function startDrawing(event) {
  event.preventDefault();
  const position = getPointerPosition(event);

  isDrawing = true;
  lastX = position.x;
  lastY = position.y;
  updatePointerStatus(position.x, position.y);

  applyStrokeStyle();
  ctx.beginPath();
  ctx.moveTo(position.x, position.y);
  ctx.lineTo(position.x + 0.1, position.y + 0.1);
  ctx.stroke();
}

function draw(event) {
  const position = getPointerPosition(event);
  updatePointerStatus(position.x, position.y);

  if (!isDrawing) return;
  event.preventDefault();

  applyStrokeStyle();
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(position.x, position.y);
  ctx.stroke();

  lastX = position.x;
  lastY = position.y;
}

function stopDrawing() {
  isDrawing = false;
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

function clearCanvas() {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("mouseup", stopDrawing);
canvas.addEventListener("mouseleave", stopDrawing);

canvas.addEventListener("touchstart", startDrawing, { passive: false });
canvas.addEventListener("touchmove", draw, { passive: false });
canvas.addEventListener("touchend", stopDrawing, { passive: false });

document.addEventListener("keydown", (event) => {
  if (event.target.tagName === "INPUT") return;

  const shortcuts = {
    b: "brush",
    p: "pencil",
    e: "eraser",
  };

  if (shortcuts[event.key]) {
    setTool(shortcuts[event.key]);
  }
});
