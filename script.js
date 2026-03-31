const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 600;

let currentTool = "brush";
let currentColor = "#7c5cfc";
let brushSize = 12;
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let layerCounter = 0;
let activeLayerIndex = 0;

const layers = [];
const layerOpacity = {};
const layerVisibility = {};

const container = document.getElementById("canvasContainer");
const layersList = document.getElementById("layersList");
const opacitySlider = document.getElementById("opacitySlider");
const opacityValue = document.getElementById("opacityVal");
const mobileTabs = document.querySelectorAll(".mobile-tab");

const interactiveCanvas = document.createElement("canvas");
interactiveCanvas.width = CANVAS_WIDTH;
interactiveCanvas.height = CANVAS_HEIGHT;
interactiveCanvas.style.zIndex = "100";
container.appendChild(interactiveCanvas);

const previewContext = interactiveCanvas.getContext("2d");
previewContext.lineCap = "round";
previewContext.lineJoin = "round";

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

function createLayerCanvas() {
  const layerCanvas = document.createElement("canvas");
  layerCanvas.width = CANVAS_WIDTH;
  layerCanvas.height = CANVAS_HEIGHT;
  container.insertBefore(layerCanvas, interactiveCanvas);
  return layerCanvas;
}

function addLayer(name) {
  layerCounter += 1;

  const id = `layer-${layerCounter}`;
  const layer = {
    id,
    name: name || `Layer ${layerCounter}`,
    canvas: createLayerCanvas(),
  };

  layers.push(layer);
  layerOpacity[id] = 1;
  layerVisibility[id] = true;
  activeLayerIndex = layers.length - 1;

  renderLayers();
  syncOpacityControl();
}

function setActiveLayer(index) {
  activeLayerIndex = index;
  renderLayers();
  syncOpacityControl();
}

function getActiveLayer() {
  return layers[activeLayerIndex];
}

function getActiveContext() {
  const layer = getActiveLayer();
  return layer ? layer.canvas.getContext("2d") : null;
}

function deleteLayer(index) {
  if (layers.length <= 1) return;

  const [removedLayer] = layers.splice(index, 1);
  removedLayer.canvas.remove();
  delete layerOpacity[removedLayer.id];
  delete layerVisibility[removedLayer.id];

  activeLayerIndex = Math.min(activeLayerIndex, layers.length - 1);
  renderLayers();
  syncOpacityControl();
}

function toggleLayerVisibility(index) {
  const layer = layers[index];
  layerVisibility[layer.id] = !layerVisibility[layer.id];
  layer.canvas.style.display = layerVisibility[layer.id] ? "block" : "none";
  renderLayers();
}

function updateLayerOpacity() {
  const layer = getActiveLayer();
  if (!layer) return;

  const value = Number(opacitySlider.value);
  layerOpacity[layer.id] = value / 100;
  layer.canvas.style.opacity = layerOpacity[layer.id];
  opacityValue.textContent = `${value}%`;
}

function syncOpacityControl() {
  const layer = getActiveLayer();
  if (!layer) return;

  const value = Math.round(layerOpacity[layer.id] * 100);
  opacitySlider.value = value;
  opacityValue.textContent = `${value}%`;
}

function renderLayers() {
  layersList.innerHTML = "";

  [...layers].reverse().forEach((layer, reversedIndex) => {
    const index = layers.length - 1 - reversedIndex;
    const item = document.createElement("div");
    item.className = `layer-item${index === activeLayerIndex ? " active" : ""}`;
    item.onclick = () => setActiveLayer(index);

    const thumbnail = document.createElement("canvas");
    thumbnail.className = "layer-thumb";
    thumbnail.width = 32;
    thumbnail.height = 24;
    thumbnail.getContext("2d").drawImage(layer.canvas, 0, 0, 32, 24);

    const info = document.createElement("span");
    info.className = "layer-info";
    info.innerHTML = `<span class="layer-name">${layer.name}</span>`;

    const controls = document.createElement("span");
    controls.className = "layer-controls";

    const visibilityButton = document.createElement("button");
    visibilityButton.className = `layer-btn${
      layerVisibility[layer.id] ? "" : " vis-off"
    }`;
    visibilityButton.type = "button";
    visibilityButton.title = "Toggle visibility";
    visibilityButton.textContent = "👁";
    visibilityButton.onclick = (event) => {
      event.stopPropagation();
      toggleLayerVisibility(index);
    };

    const deleteButton = document.createElement("button");
    deleteButton.className = "layer-btn";
    deleteButton.type = "button";
    deleteButton.title = "Delete layer";
    deleteButton.textContent = "✕";
    deleteButton.disabled = layers.length <= 1;
    deleteButton.onclick = (event) => {
      event.stopPropagation();
      deleteLayer(index);
    };

    controls.append(visibilityButton, deleteButton);
    item.append(thumbnail, info, controls);
    layersList.appendChild(item);
  });

  document.getElementById("statusLayers").textContent = layers.length;
}

function getPointerPosition(event) {
  const rect = interactiveCanvas.getBoundingClientRect();
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
  interactiveCanvas.style.cursor = tool === "eraser" ? "cell" : "crosshair";
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

function applyStrokeStyle(ctx) {
  ctx.globalAlpha = currentTool === "pencil" ? 0.82 : 1;
  ctx.globalCompositeOperation =
    currentTool === "eraser" ? "destination-out" : "source-over";
  ctx.strokeStyle = currentColor;
  ctx.lineWidth =
    currentTool === "pencil" ? Math.max(1, brushSize * 0.5) : brushSize;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

function startDrawing(event) {
  event.preventDefault();
  const ctx = getActiveContext();
  if (!ctx) return;

  const position = getPointerPosition(event);
  isDrawing = true;
  lastX = position.x;
  lastY = position.y;
  updatePointerStatus(position.x, position.y);

  applyStrokeStyle(ctx);
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

  const ctx = getActiveContext();
  if (!ctx) return;

  applyStrokeStyle(ctx);
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(position.x, position.y);
  ctx.stroke();

  lastX = position.x;
  lastY = position.y;
}

function stopDrawing() {
  if (!isDrawing) return;

  isDrawing = false;
  const ctx = getActiveContext();
  if (ctx) {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
  renderLayers();
}

function clearCanvas() {
  const ctx = getActiveContext();
  if (!ctx) return;

  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  renderLayers();
}

interactiveCanvas.addEventListener("mousedown", startDrawing);
interactiveCanvas.addEventListener("mousemove", draw);
interactiveCanvas.addEventListener("mouseup", stopDrawing);
interactiveCanvas.addEventListener("mouseleave", stopDrawing);

interactiveCanvas.addEventListener("touchstart", startDrawing, {
  passive: false,
});
interactiveCanvas.addEventListener("touchmove", draw, { passive: false });
interactiveCanvas.addEventListener("touchend", stopDrawing, { passive: false });

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

addLayer("Background");
addLayer("Layer 2");
setActiveLayer(1);
