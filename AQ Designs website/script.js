const canvas = document.getElementById('designCanvas');
const ctx = canvas.getContext('2d');
const uploadInput = document.getElementById('imageUpload');
const colorPicker = document.getElementById('colorPicker');
const addTextInput = document.getElementById('addTextInput');
const addTextBtn = document.getElementById('addTextBtn');
const clearCanvasBtn = document.getElementById('clearCanvasBtn');
const saveDesignBtn = document.getElementById('saveDesign');
const itemSelect = document.getElementById('itemSelect');
const designCanvasContainer = document.getElementById('designCanvasContainer');
const errorMessage = document.getElementById('errorMessage');
const fontSelect = document.getElementById('fontSelect');
const fontSizeInput = document.getElementById('fontSize');

let backgroundImage = null;
let uploadedImage = null;
const texts = [];
let history = [];
let historyIndex = -1;
let isDragging = false;
let dragIndex = -1;
let dragStartX = 0;
let dragStartY = 0;

// Generate a unique ID for text elements
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Setup function to validate DOM elements
function setupCanvas() {
  console.log('Setting up canvas...');
  if (!canvas || !ctx || !uploadInput || !itemSelect || !designCanvasContainer || !errorMessage) {
    showError('Required DOM elements are missing. Please check the HTML structure.');
    return false;
  }
  return true;
}

// Show error message
function showError(message) {
  if (errorMessage) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    setTimeout(() => errorMessage.style.display = 'none', 3000);
  } else {
    console.error(message);
  }
}

// Load background mockup
function loadBackground(type) {
  console.log('Loading background for type:', type);
  const imagePath = {
    jacket: 'mockups/jacket-default.png',
    hoodie: 'mockups/hoodie-default.png',
    tshirt: 'mockups/tshirt-default.png'
  }[type] || 'mockups/jacket-default.png';

  const bgImg = new Image();
  bgImg.onload = () => {
    console.log('Image loaded:', imagePath);
    backgroundImage = bgImg;
    saveState();
    redrawCanvas();
    clearAllTexts();
  };
  bgImg.onerror = () => {
    showError('Failed to load background mockup. Check your mockup image path: ' + imagePath);
  };
  bgImg.src = imagePath;
}

// Handle image upload
function handleImageUpload() {
  uploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        uploadedImage = new Image();
        uploadedImage.onload = () => {
          saveState();
          redrawCanvas();
        };
        uploadedImage.onerror = () => showError('Failed to load uploaded image.');
        uploadedImage.src = event.target.result;
      };
      reader.onerror = () => showError('Error reading the file.');
      reader.readAsDataURL(file);
    }
  });
}

// Create text element
function createTextElement(text, color, x, y, font = 'Arial', size = 20) {
  const div = document.createElement('div');
  div.contentEditable = true;
  div.className = 'design-text';
  div.style.position = 'absolute';
  div.style.left = `${x}px`;
  div.style.top = `${y}px`;
  div.style.color = color;
  div.style.fontFamily = font;
  div.style.fontSize = `${size}px`;
  div.textContent = text;
  designCanvasContainer.appendChild(div);

  div.addEventListener('mousedown', startDragging);
  div.addEventListener('touchstart', startDragging, { passive: false });
  div.addEventListener('input', () => {
    const textObj = texts.find(t => t.element === div);
    if (textObj) {
      textObj.text = div.textContent;
      saveState();
      redrawCanvas();
    }
  });

  return div;
}

// Set color from palette
function setColor(color) {
  colorPicker.value = color;
  const selectedText = texts.find(t => t.element === document.activeElement && t.element.classList.contains('design-text'));
  if (selectedText) {
    selectedText.color = color;
    selectedText.element.style.color = color;
    saveState();
    redrawCanvas();
  }
}

// Start dragging text
function startDragging(e) {
  e.preventDefault();
  isDragging = true;
  dragIndex = texts.findIndex(t => t.element === (e.targetTouches ? e.targetTouches[0].target : e.target));
  dragStartX = (e.type === 'touchstart' ? e.targetTouches[0].clientX : e.clientX) - texts[dragIndex].x;
  dragStartY = (e.type === 'touchstart' ? e.targetTouches[0].clientY : e.clientY) - texts[dragIndex].y;
  document.addEventListener('mousemove', dragText);
  document.addEventListener('touchmove', dragText, { passive: false });
  document.addEventListener('mouseup', stopDragging);
  document.addEventListener('touchend', stopDragging);
}

// Drag text
function dragText(e) {
  if (isDragging && dragIndex !== -1) {
    e.preventDefault();
    const clientX = e.type === 'touchmove' ? e.targetTouches[0].clientX : e.clientX;
    const clientY = e.type === 'touchmove' ? e.targetTouches[0].clientY : e.clientY;
    texts[dragIndex].x = clientX - dragStartX;
    texts[dragIndex].y = clientY - dragStartY;
    texts[dragIndex].element.style.left = `${texts[dragIndex].x}px`;
    texts[dragIndex].element.style.top = `${texts[dragIndex].y}px`;
    saveState();
    redrawCanvas();
  }
}

// Stop dragging
function stopDragging() {
  isDragging = false;
  dragIndex = -1;
  document.removeEventListener('mousemove', dragText);
  document.removeEventListener('touchmove', dragText);
  document.removeEventListener('mouseup', stopDragging);
  document.removeEventListener('touchend', stopDragging);
}

// Clear all texts
function clearAllTexts() {
  texts.forEach(t => t.element?.remove());
  texts.length = 0;
  saveState();
  redrawCanvas();
}

// Save state for undo/redo
function saveState() {
  history = history.slice(0, historyIndex + 1);
  history.push({ backgroundImage, uploadedImage, texts: [...texts] });
  historyIndex = history.length - 1;
}

// Undo
function undo() {
  if (historyIndex > 0) {
    historyIndex--;
    restoreState();
  }
}

// Redo
function redo() {
  if (historyIndex < history.length - 1) {
    historyIndex++;
    restoreState();
  }
}

// Restore state
function restoreState() {
  const state = history[historyIndex];
  backgroundImage = state.backgroundImage;
  uploadedImage = state.uploadedImage;
  clearAllTexts();
  state.texts.forEach(t => {
    const el = createTextElement(t.text, t.color, t.x, t.y, t.font, t.size);
    texts.push({ id: t.id, text: t.text, color: t.color, x: t.x, y: t.y, element: el, font: t.font, size: t.size });
  });
  redrawCanvas();
}

// Redraw canvas with aspect ratio preservation
function redrawCanvas(saveText = false) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw background image if available
  if (backgroundImage) {
    ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
  }

  // Draw uploaded image with aspect ratio preservation
  if (uploadedImage) {
    const canvasAspect = canvas.width / canvas.height;
    const imageAspect = uploadedImage.width / uploadedImage.height;
    let drawWidth, drawHeight, drawX, drawY;

    if (imageAspect > canvasAspect) {
      drawWidth = canvas.width;
      drawHeight = drawWidth / imageAspect;
      drawX = 0;
      drawY = (canvas.height - drawHeight) / 2;
    } else {
      drawHeight = canvas.height;
      drawWidth = drawHeight * imageAspect;
      drawX = (canvas.width - drawWidth) / 2;
      drawY = 0;
    }

    ctx.drawImage(uploadedImage, drawX, drawY, drawWidth, drawHeight);
  }

  // Draw text elements if saveText is true
  if (saveText) {
    texts.forEach(t => {
      ctx.font = `${t.size}px ${t.font}`;
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    });
  }
}

// Save text positions
function saveTextPositions() {
  texts.forEach(t => {
    const rect = t.element.getBoundingClientRect();
    const containerRect = designCanvasContainer.getBoundingClientRect();
    t.x = rect.left - containerRect.left;
    t.y = rect.top - containerRect.top;
  });
}

// Initialize event listeners
function initEventListeners() {
  if (itemSelect) {
    itemSelect.addEventListener('change', () => {
      console.log('Item changed to:', itemSelect.value);
      uploadedImage = null;
      clearAllTexts();
      loadBackground(itemSelect.value);
    });
    loadBackground(itemSelect.value);
  }

  if (addTextBtn) {
    addTextBtn.addEventListener('click', () => {
      const text = addTextInput.value.trim();
      if (!text) {
        showError('Please enter some text.');
        return;
      }
      const color = colorPicker.value;
      const font = fontSelect.value;
      const size = parseInt(fontSizeInput.value, 10);
      const startX = designCanvasContainer.clientWidth * 0.5 - 50;
      const startY = designCanvasContainer.clientHeight * 0.5 - (size / 2);
      const el = createTextElement(text, color, startX, startY, font, size);
      texts.push({ id: generateId(), text, color, x: startX, y: startY, element: el, font, size });
      addTextInput.value = '';
      saveState();
      redrawCanvas();
    });
  }

  if (clearCanvasBtn) {
    clearCanvasBtn.addEventListener('click', () => {
      uploadedImage = null;
      clearAllTexts();
      backgroundImage = null;
      saveState();
      redrawCanvas();
    });
  }

  if (saveDesignBtn) {
    saveDesignBtn.addEventListener('click', () => {
      saveTextPositions();
      redrawCanvas(true);
      const link = document.createElement('a');
      link.download = 'aqdesigns_design.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      redrawCanvas(false);
    });
  }

  const changeBackgroundBtn = document.getElementById('changeBackgroundBtn');
  if (changeBackgroundBtn) {
    changeBackgroundBtn.addEventListener('click', () => {
      uploadInput.click();
    });
  }

  const removeSelectedBtn = document.getElementById('removeSelectedBtn');
  if (removeSelectedBtn) {
    removeSelectedBtn.addEventListener('click', () => {
      const selectedText = texts.find(t => t.element === document.activeElement && t.element.classList.contains('design-text'));
      if (selectedText) {
        const idx = texts.indexOf(selectedText);
        if (idx !== -1) {
          selectedText.element.remove();
          texts.splice(idx, 1);
          saveState();
          redrawCanvas();
        }
      } else {
        showError('No text element selected. Click a text box to select it.');
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'z') undo();
    if (e.ctrlKey && e.key === 'y') redo();
  });
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing...');
  if (setupCanvas()) {
    handleImageUpload();
    initEventListeners();
    redrawCanvas();
  }
});