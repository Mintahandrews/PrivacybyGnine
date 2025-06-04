# Performance Optimization for TensorFlow.js in React

When integrating TensorFlow.js into a React application for image processing, performance is a critical concern. This guide covers techniques to optimize your application.

## Memory Management

TensorFlow.js relies on WebGL for GPU acceleration, which requires explicit memory management:

```javascript
// BAD: Memory leak
function processImageBad(img) {
  const tensor = tf.browser.fromPixels(img);
  const normalized = tensor.toFloat().div(tf.scalar(255));
  const batched = normalized.expandDims(0);
  const result = model.predict(batched);
  return result;  // Tensors not cleaned up!
}

// GOOD: Using tf.tidy()
function processImageGood(img) {
  return tf.tidy(() => {
    const tensor = tf.browser.fromPixels(img);
    const normalized = tensor.toFloat().div(tf.scalar(255));
    const batched = normalized.expandDims(0);
    return model.predict(batched);
  });  // All intermediate tensors are automatically disposed
}

// GOOD: Manual cleanup
function processImageManual(img) {
  const tensor = tf.browser.fromPixels(img);
  const normalized = tensor.toFloat().div(tf.scalar(255));
  const batched = normalized.expandDims(0);
  const result = model.predict(batched);
  
  // Cleanup
  tensor.dispose();
  normalized.dispose();
  batched.dispose();
  
  return result;  // Only result tensor needs to be disposed by caller
}
```

## Model Loading Strategies

### 1. Lazy Loading

Only load the model when needed:

```javascript
function PrivacyFilter() {
  const [model, setModel] = useState(null);
  const [modelLoading, setModelLoading] = useState(false);
  
  const ensureModelLoaded = async () => {
    if (model) return model;
    
    setModelLoading(true);
    const loadedModel = await tf.loadLayersModel('path/to/model.json');
    setModel(loadedModel);
    setModelLoading(false);
    return loadedModel;
  };
  
  const processImage = async (img) => {
    const model = await ensureModelLoaded();
    // Process with model...
  };
}
```

### 2. Progressive Loading

```javascript
async function loadModel() {
  // Start with a smaller, faster model
  const quickModel = await createSimpleModel();
  setModel(quickModel);
  
  // Then load the more complex model in the background
  tf.loadLayersModel('path/to/complex-model.json')
    .then(complexModel => {
      if (quickModel) quickModel.dispose();
      setModel(complexModel);
    });
}
```

## Web Workers

Moving TensorFlow.js operations to a Web Worker prevents UI freezing:

```javascript
// In your React component
const [worker] = useState(() => new Worker(new URL('../workers/tf-worker.js', import.meta.url)));

useEffect(() => {
  worker.onmessage = (e) => {
    if (e.data.type === 'PROCESSED_IMAGE') {
      setProcessedImage(e.data.result);
      setIsProcessing(false);
    }
  };
  
  return () => {
    worker.terminate();
  };
}, [worker]);

const processImage = (imageData, privacyLevel) => {
  setIsProcessing(true);
  worker.postMessage({
    type: 'PROCESS_IMAGE',
    imageData,
    privacyLevel
  });
};
```

```javascript
// In tf-worker.js
importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.2.0/dist/tf.min.js');

let model = null;

async function loadModel() {
  await tf.ready();
  model = tf.sequential();
  // Build or load your model...
  return model;
}

self.onmessage = async function(e) {
  if (e.data.type === 'PROCESS_IMAGE') {
    if (!model) {
      model = await loadModel();
    }
    
    // Process the image
    const result = await processImageData(
      e.data.imageData,
      model,
      e.data.privacyLevel
    );
    
    self.postMessage({
      type: 'PROCESSED_IMAGE',
      result
    });
  }
};
```

## Image Preprocessing Optimizations

### 1. Resize Before Processing

```javascript
function prepareImageForModel(img, targetSize = 224) {
  return tf.tidy(() => {
    // Resize image to target size
    const smallImg = tf.image.resizeBilinear(
      tf.browser.fromPixels(img),
      [targetSize, targetSize]
    );
    
    // Normalize and add batch dimension
    return smallImg.toFloat().div(tf.scalar(255)).expandDims(0);
  });
}
```

### 2. Progressive Enhancement

Process at low resolution first, then improve:

```javascript
async function progressiveProcess(img, model) {
  // First pass: Quick low-res processing
  const lowRes = await tf.tidy(() => {
    const tensor = tf.browser.fromPixels(img)
      .resizeBilinear([64, 64])
      .toFloat()
      .div(255)
      .expandDims(0);
    return model.predict(tensor);
  });
  
  // Display low-res result immediately
  displayResult(lowRes);
  
  // Second pass: Full resolution (in background)
  setTimeout(async () => {
    const highRes = await tf.tidy(() => {
      const tensor = tf.browser.fromPixels(img)
        .toFloat()
        .div(255)
        .expandDims(0);
      return model.predict(tensor);
    });
    
    // Update with high-res result
    displayResult(highRes);
    lowRes.dispose();
  }, 100);
}
```

## React Component Optimizations

### 1. Throttling State Updates

```javascript
import { useState, useEffect } from 'react';
import { throttle } from 'lodash';

function PrivacyFilterControl() {
  const [privacyLevel, setPrivacyLevel] = useState(50);
  const [debouncedLevel, setDebouncedLevel] = useState(50);
  
  // Update debounced value using throttle
  const throttledSetLevel = throttle(setDebouncedLevel, 200);
  
  // Update the UI immediately but processing less frequently
  const handleSliderChange = (e) => {
    const value = parseInt(e.target.value);
    setPrivacyLevel(value);
    throttledSetLevel(value);
  };
  
  // Only process the image when debouncedLevel changes
  useEffect(() => {
    if (imageRef.current && modelRef.current) {
      processImage(imageRef.current, modelRef.current, debouncedLevel);
    }
  }, [debouncedLevel]);
  
  return (
    <input
      type="range"
      min="0"
      max="100"
      value={privacyLevel}
      onChange={handleSliderChange}
    />
  );
}
```

### 2. Using `useRef` for Performance-Critical Data

```javascript
function ImageProcessor() {
  // Use useState for UI-related state
  const [isProcessing, setIsProcessing] = useState(false);
  const [displayImage, setDisplayImage] = useState(null);
  
  // Use useRef for data that doesn't need to trigger renders
  const modelRef = useRef(null);
  const tensorRef = useRef(null);
  const processingOptionsRef = useRef({
    privacyLevel: 50,
    enablePixelation: true
  });
  
  // Update options without triggering re-renders
  const updateProcessingOption = (key, value) => {
    processingOptionsRef.current[key] = value;
    processWithCurrentOptions();
  };
  
  const processWithCurrentOptions = () => {
    if (!tensorRef.current || !modelRef.current) return;
    
    setIsProcessing(true);
    // Process using refs...
    setIsProcessing(false);
  };
}
```

By implementing these optimizations, your TensorFlow.js-powered React application will be more responsive and memory-efficient, providing a better user experience even when processing large images.
