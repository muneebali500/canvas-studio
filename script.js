const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 600;

let currentTool = "brush";
let currentColor = "#7c5cfc";
let brushSize = 12;
let isDrawing = false;
let startX = 0;
let startY = 0;
let lastX = 0;
let lastY = 0;
let layerCounter = 0;
let activeLayerIndex = 0;

const layers = [];
const layerOpacity = {};
const layerVisibility = {};
const undoStacks = {};
const redoStacks = {};
const shapeTools = ["line", "rect", "circle", "triangle"];

const container = document.getElementById("canvasContainer");
const layersList = document.getElementById("layersList");
const opacitySlider = document.getElementById("opacitySlider");
const opacityValue = document.getElementById("opacityVal");
const undoButton = document.getElementById("undoBtn");
const redoButton = document.getElementById("redoBtn");
const fileInput = document.getElementById("fileInput");
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

function showPopup() {
  const popupOverlay = document.getElementById("popup-overlay");
  popupOverlay.classList.add("active");
  popupOverlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closePopup() {
  const popupOverlay = document.getElementById("popup-overlay");
  popupOverlay.classList.remove("active");
  popupOverlay.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

document.getElementById("popup-overlay").addEventListener("click", (event) => {
  if (event.target === document.getElementById("popup-overlay")) {
    closePopup();
  }
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
  undoStacks[id] = [];
  redoStacks[id] = [];
  activeLayerIndex = layers.length - 1;

  renderLayers();
  syncOpacityControl();
  updateHistoryButtons();
}

function setActiveLayer(index) {
  activeLayerIndex = index;
  renderLayers();
  syncOpacityControl();
  updateHistoryButtons();
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
  delete undoStacks[removedLayer.id];
  delete redoStacks[removedLayer.id];

  activeLayerIndex = Math.min(activeLayerIndex, layers.length - 1);
  renderLayers();
  syncOpacityControl();
  updateHistoryButtons();
}

function toggleLayerVisibility(index) {
  const layer = layers[index];
  layerVisibility[layer.id] = !layerVisibility[layer.id];
  layer.canvas.style.display = layerVisibility[layer.id] ? "block" : "none";
  renderLayers();
}

function saveSnapshot() {
  const layer = getActiveLayer();
  const ctx = getActiveContext();
  if (!layer || !ctx) return;

  const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  undoStacks[layer.id].push(imageData);

  if (undoStacks[layer.id].length > 40) {
    undoStacks[layer.id].shift();
  }

  redoStacks[layer.id] = [];
  updateHistoryButtons();
}

function undo() {
  const layer = getActiveLayer();
  const ctx = getActiveContext();
  if (!layer || !ctx || undoStacks[layer.id].length === 0) return;

  const currentImage = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  redoStacks[layer.id].push(currentImage);

  const previousImage = undoStacks[layer.id].pop();
  ctx.putImageData(previousImage, 0, 0);

  renderLayers();
  updateHistoryButtons();
}

function redo() {
  const layer = getActiveLayer();
  const ctx = getActiveContext();
  if (!layer || !ctx || redoStacks[layer.id].length === 0) return;

  const currentImage = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  undoStacks[layer.id].push(currentImage);

  const nextImage = redoStacks[layer.id].pop();
  ctx.putImageData(nextImage, 0, 0);

  renderLayers();
  updateHistoryButtons();
}

function updateHistoryButtons() {
  const layer = getActiveLayer();
  const undoCount = layer ? undoStacks[layer.id].length : 0;
  const redoCount = layer ? redoStacks[layer.id].length : 0;

  undoButton.disabled = undoCount === 0;
  redoButton.disabled = redoCount === 0;
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
  interactiveCanvas.style.cursor =
    tool === "eraser" ? "cell" : tool === "fill" ? "copy" : "crosshair";
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

function applyShapeStyle(ctx, isPreview) {
  ctx.globalAlpha = isPreview ? 0.58 : 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = currentColor;
  ctx.fillStyle = currentColor;
  ctx.lineWidth = Math.max(2, brushSize * 0.5);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

function drawShape(ctx, x1, y1, x2, y2, isPreview) {
  const shouldFill = document.getElementById("fillShape").checked;

  ctx.save();
  applyShapeStyle(ctx, isPreview);
  ctx.beginPath();

  if (currentTool === "line") {
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  if (currentTool === "rect") {
    const width = x2 - x1;
    const height = y2 - y1;
    if (shouldFill) ctx.fillRect(x1, y1, width, height);
    ctx.strokeRect(x1, y1, width, height);
  }

  if (currentTool === "circle") {
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;
    const radiusX = Math.abs(x2 - x1) / 2;
    const radiusY = Math.abs(y2 - y1) / 2;

    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    if (shouldFill) ctx.fill();
    ctx.stroke();
  }

  if (currentTool === "triangle") {
    const middleX = (x1 + x2) / 2;
    ctx.moveTo(middleX, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x1, y2);
    ctx.closePath();
    if (shouldFill) ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function startDrawing(event) {
  event.preventDefault();
  const ctx = getActiveContext();
  if (!ctx) return;

  const position = getPointerPosition(event);
  isDrawing = true;
  startX = position.x;
  startY = position.y;
  lastX = position.x;
  lastY = position.y;
  updatePointerStatus(position.x, position.y);
  saveSnapshot();

  if (shapeTools.includes(currentTool)) {
    return;
  }

  if (currentTool === "fill") {
    floodFill(ctx, Math.round(position.x), Math.round(position.y), currentColor);
    isDrawing = false;
    renderLayers();
    updateHistoryButtons();
    return;
  }

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

  if (shapeTools.includes(currentTool)) {
    previewContext.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawShape(previewContext, startX, startY, position.x, position.y, true);
    lastX = position.x;
    lastY = position.y;
    return;
  }

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
    if (shapeTools.includes(currentTool)) {
      drawShape(ctx, startX, startY, lastX, lastY, false);
      previewContext.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
  renderLayers();
  updateHistoryButtons();
}

function clearCanvas() {
  const ctx = getActiveContext();
  if (!ctx) return;

  saveSnapshot();
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  renderLayers();
  updateHistoryButtons();
}

function floodFill(ctx, x, y, fillColor) {
  if (x < 0 || y < 0 || x >= CANVAS_WIDTH || y >= CANVAS_HEIGHT) return;

  const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const data = imageData.data;
  const startIndex = (y * CANVAS_WIDTH + x) * 4;
  const target = [
    data[startIndex],
    data[startIndex + 1],
    data[startIndex + 2],
    data[startIndex + 3],
  ];
  const replacement = hexToRgb(fillColor);

  if (!replacement || colorsAreClose(target, replacement, 0)) return;

  const visited = new Uint8Array(CANVAS_WIDTH * CANVAS_HEIGHT);
  const stack = [[x, y]];

  while (stack.length) {
    const [currentX, currentY] = stack.pop();
    if (
      currentX < 0 ||
      currentY < 0 ||
      currentX >= CANVAS_WIDTH ||
      currentY >= CANVAS_HEIGHT
    ) {
      continue;
    }

    const pixelIndex = currentY * CANVAS_WIDTH + currentX;
    if (visited[pixelIndex]) continue;
    visited[pixelIndex] = 1;

    const dataIndex = pixelIndex * 4;
    const currentColorData = [
      data[dataIndex],
      data[dataIndex + 1],
      data[dataIndex + 2],
      data[dataIndex + 3],
    ];

    if (!colorsAreClose(currentColorData, target, 30)) continue;

    data[dataIndex] = replacement[0];
    data[dataIndex + 1] = replacement[1];
    data[dataIndex + 2] = replacement[2];
    data[dataIndex + 3] = 255;

    stack.push(
      [currentX + 1, currentY],
      [currentX - 1, currentY],
      [currentX, currentY + 1],
      [currentX, currentY - 1],
    );
  }

  ctx.putImageData(imageData, 0, 0);
}

function colorsAreClose(first, second, tolerance) {
  return (
    Math.abs(first[0] - second[0]) <= tolerance &&
    Math.abs(first[1] - second[1]) <= tolerance &&
    Math.abs(first[2] - second[2]) <= tolerance &&
    Math.abs(first[3] - second[3]) <= tolerance
  );
}

function hexToRgb(hex) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return null;

  return [
    parseInt(match[1], 16),
    parseInt(match[2], 16),
    parseInt(match[3], 16),
    255,
  ];
}

function createCompositeCanvas(includeWhiteBackground) {
  const output = document.createElement("canvas");
  output.width = CANVAS_WIDTH;
  output.height = CANVAS_HEIGHT;

  const outputContext = output.getContext("2d");
  if (includeWhiteBackground) {
    outputContext.fillStyle = "#ffffff";
    outputContext.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  layers.forEach((layer) => {
    if (!layerVisibility[layer.id]) return;

    outputContext.globalAlpha = layerOpacity[layer.id];
    outputContext.drawImage(layer.canvas, 0, 0);
  });

  outputContext.globalAlpha = 1;
  return output;
}

function downloadFile(fileName, href) {
  const link = document.createElement("a");
  link.download = fileName;
  link.href = href;
  link.click();
}

function exportPNG() {
  const output = createCompositeCanvas(true);
  downloadFile(`canvas-studio-${Date.now()}.png`, output.toDataURL("image/png"));
}

function saveDrawing() {
  const drawingData = {
    version: 1,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    layers: layers.map((layer) => ({
      name: layer.name,
      opacity: layerOpacity[layer.id],
      visible: layerVisibility[layer.id],
      data: layer.canvas.toDataURL("image/png"),
    })),
  };

  const blob = new Blob([JSON.stringify(drawingData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  downloadFile(`canvas-studio-${Date.now()}.json`, url);
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function loadDrawing() {
  fileInput.click();
}

function resetLayers() {
  layers.splice(0, layers.length);
  layerCounter = 0;
  activeLayerIndex = 0;
  container.querySelectorAll("canvas:not(:last-child)").forEach((layerCanvas) => {
    layerCanvas.remove();
  });

  Object.keys(layerOpacity).forEach((key) => delete layerOpacity[key]);
  Object.keys(layerVisibility).forEach((key) => delete layerVisibility[key]);
  Object.keys(undoStacks).forEach((key) => delete undoStacks[key]);
  Object.keys(redoStacks).forEach((key) => delete redoStacks[key]);
}

function handleLoad(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.type === "application/json" || file.name.endsWith(".json")) {
    loadProjectFile(file);
  } else if (file.type.startsWith("image/")) {
    loadImageFile(file);
  }

  event.target.value = "";
}

function loadProjectFile(file) {
  const reader = new FileReader();

  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      resetLayers();

      data.layers.forEach((savedLayer) => {
        addLayer(savedLayer.name);
        const layer = getActiveLayer();

        layerOpacity[layer.id] = savedLayer.opacity ?? 1;
        layerVisibility[layer.id] = savedLayer.visible ?? true;
        layer.canvas.style.opacity = layerOpacity[layer.id];
        layer.canvas.style.display = layerVisibility[layer.id] ? "block" : "none";

        const image = new Image();
        image.onload = () => {
          layer.canvas.getContext("2d").drawImage(image, 0, 0);
          renderLayers();
        };
        image.src = savedLayer.data;
      });

      if (!layers.length) addLayer("Background");
      activeLayerIndex = layers.length - 1;
      syncOpacityControl();
      renderLayers();
      updateHistoryButtons();
    } catch (error) {
      window.alert("This drawing file could not be loaded.");
    }
  };

  reader.readAsText(file);
}

function loadImageFile(file) {
  const reader = new FileReader();

  reader.onload = () => {
    const image = new Image();

    image.onload = () => {
      const ctx = getActiveContext();
      if (!ctx) return;

      saveSnapshot();
      const scale = Math.min(
        CANVAS_WIDTH / image.width,
        CANVAS_HEIGHT / image.height,
        1,
      );
      ctx.drawImage(image, 0, 0, image.width * scale, image.height * scale);
      renderLayers();
      updateHistoryButtons();
    };

    image.src = reader.result;
  };

  reader.readAsDataURL(file);
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

  if (event.key === "Escape") {
    closePopup();
    return;
  }

  if (event.ctrlKey && event.key.toLowerCase() === "z") {
    event.preventDefault();
    undo();
    return;
  }

  if (event.ctrlKey && event.key.toLowerCase() === "y") {
    event.preventDefault();
    redo();
    return;
  }

  const shortcuts = {
    b: "brush",
    p: "pencil",
    e: "eraser",
    f: "fill",
    l: "line",
    r: "rect",
    c: "circle",
    t: "triangle",
  };

  if (shortcuts[event.key]) {
    setTool(shortcuts[event.key]);
  }
});

addLayer("Background");
addLayer("Layer 2");
setActiveLayer(1);
showPopup();
