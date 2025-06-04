# Integrating Pre-trained Autoencoder Models with TensorFlow.js in React

This guide explains how to integrate a TensorFlow.js autoencoder model into a React application for client-side image privacy filtering. We'll walk through the complete process, from model architecture to rendering the processed image.

## Table of Contents

1. [Understanding Autoencoders](#understanding-autoencoders)
2. [Loading TensorFlow.js](#loading-tensorflowjs)
3. [Creating the Autoencoder Architecture](#creating-the-autoencoder-architecture)
4. [Image Preprocessing](#image-preprocessing)
5. [Inference Pipeline](#inference-pipeline)
6. [Canvas Integration](#canvas-integration)
7. [Memory Management](#memory-management)
8. [React Integration](#react-integration)
9. [Privacy Controls](#privacy-controls)

## Understanding Autoencoders

Autoencoders are neural networks that compress data (encoding) and then reconstruct it (decoding). The compressed representation in the middle—called the "bottleneck"—forces the network to learn efficient encodings by discarding non-essential information.

For privacy applications, this compression naturally removes identifying details while preserving the overall structure of an image. By controlling the bottleneck size and adding noise, we can enhance this privacy-preserving effect.

```
Original Image → [Encoder] → Compressed Representation → [Decoder] → Anonymized Image
```

## Loading TensorFlow.js

First, install TensorFlow.js:

```bash
npm install @tensorflow/tfjs
```

In your React component, initialize TensorFlow when the component mounts:

```typescript
import { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';

function ImagePrivacyFilter() {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const modelRef = useRef<tf.LayersModel | null>(null);
  
  useEffect(() => {
    async function loadTf() {
      try {
        // Initialize TensorFlow.js
        await tf.ready();
        console.log('TensorFlow.js initialized successfully');
        setIsModelLoaded(true);
      } catch (error) {
        console.error('Failed to initialize TensorFlow.js:', error);
      }
    }
    
    loadTf();
    
    // Clean up on unmount
    return () => {
      if (modelRef.current) {
        modelRef.current.dispose();
      }
    };
  }, []);
  
  // Rest of the component...
}
```

## Creating the Autoencoder Architecture

Here's how to define a basic autoencoder model using TensorFlow.js:

```typescript
async function createAutoencoderModel(imageWidth: number, imageHeight: number) {
  // Create a sequential model
  const model = tf.sequential();
  
  // Encoder layers
  model.add(tf.layers.conv2d({
    inputShape: [imageHeight, imageWidth, 3], // [height, width, channels]
    filters: 16,
    kernelSize: 3,
    strides: 1,
    padding: 'same',
    activation: 'relu'
  }));
  
  model.add(tf.layers.maxPooling2d({
    poolSize: [2, 2],
    strides: [2, 2]
  }));
  
  // More encoder layers (compress further)
  model.add(tf.layers.conv2d({
    filters: 8,
    kernelSize: 3,
    strides: 1,
    padding: 'same',
    activation: 'relu'
  }));
  
  model.add(tf.layers.maxPooling2d({
    poolSize: [2, 2],
    strides: [2, 2]
  }));
  
  // Decoder layers (reconstruct the image)
  model.add(tf.layers.conv2dTranspose({
    filters: 8,
    kernelSize: 3,
    strides: 2,
    padding: 'same',
    activation: 'relu'
  }));
  
  model.add(tf.layers.conv2dTranspose({
    filters: 16,
    kernelSize: 3,
    strides: 2,
    padding: 'same',
    activation: 'relu'
  }));
  
  // Output layer (reconstructs the image with 3 channels - RGB)
  model.add(tf.layers.conv2d({
    filters: 3,
    kernelSize: 3,
    padding: 'same',
    activation: 'sigmoid'  // Values between 0-1 for RGB
  }));
  
  return model;
}
```

## Loading a Pre-trained Model

If you have a pre-trained model (saved in TensorFlow.js format):

```typescript
async function loadPretrainedModel(modelUrl: string): Promise<tf.LayersModel> {
  try {
    // Load the model from the specified URL
    const model = await tf.loadLayersModel(modelUrl);
    console.log('Pre-trained model loaded successfully');
    return model;
  } catch (error) {
    console.error('Failed to load pre-trained model:', error);
    throw error;
  }
}
```

## Image Preprocessing

Before feeding an image to the model, you need to convert it to a tensor and normalize it:

```typescript
function preprocessImage(imageElement: HTMLImageElement): tf.Tensor4D {
  return tf.tidy(() => {
    // Convert the image to a tensor
    const imageTensor = tf.browser.fromPixels(imageElement);
    
    // Normalize values to [0, 1]
    const normalized = imageTensor.toFloat().div(tf.scalar(255));
    
    // Add batch dimension (model expects shape [batch, height, width, channels])
    return normalized.expandDims(0) as tf.Tensor4D;
  });
}
```

## Inference Pipeline

This function processes an image through the model with an adjustable privacy level:

```typescript
async function processImage(
  imageElement: HTMLImageElement, 
  model: tf.LayersModel,
  privacyLevel: number  // 0-100
): Promise<string> {
  return tf.tidy(() => {
    // Preprocess the image
    const tensor = tf.browser.fromPixels(imageElement)
      .toFloat()
      .div(tf.scalar(255))
      .expandDims(0);
    
    // Pass through autoencoder
    let processedTensor = model.predict(tensor) as tf.Tensor;
    
    // Apply additional privacy effects based on level
    if (privacyLevel > 0) {
      const noiseLevel = privacyLevel / 100;
      
      // Add pixelation for higher privacy levels
      if (privacyLevel > 60) {
        const pixelSize = Math.max(2, Math.floor(privacyLevel / 20));
        const h = processedTensor.shape[1] as number;
        const w = processedTensor.shape[2] as number;
        const newH = Math.floor(h / pixelSize);
        const newW = Math.floor(w / pixelSize);
        
        // Downsample and upsample to create pixelation effect
        processedTensor = tf.image.resizeBilinear(processedTensor, [newH, newW]);
        processedTensor = tf.image.resizeBilinear(processedTensor, [h, w]);
      }
      
      // Add noise proportional to privacy level
      const noise = tf.randomUniform(processedTensor.shape, 0, noiseLevel);
      processedTensor = tf.add(
        tf.mul(processedTensor, tf.scalar(1 - noiseLevel)), 
        noise
      );
    }
    
    // Convert back to image format
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = imageElement.width;
    outputCanvas.height = imageElement.height;
    
    // Remove batch dimension and render to canvas
    const outputTensor = processedTensor.squeeze();
    tf.browser.toPixels(outputTensor, outputCanvas);
    
    // Return data URL
    return outputCanvas.toDataURL('image/png');
  });
}
```

## Canvas Integration

Display the processed image in a canvas element:

```typescript
function ImagePreview({ originalImage, processedImage }) {
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const processedCanvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (originalImage && originalCanvasRef.current) {
      const canvas = originalCanvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
        };
        img.src = originalImage;
      }
    }
  }, [originalImage]);
  
  useEffect(() => {
    if (processedImage && processedCanvasRef.current) {
      const canvas = processedCanvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
        };
        img.src = processedImage;
      }
    }
  }, [processedImage]);
  
  return (
    <div className="preview-container">
      <div className="original-preview">
        <h3>Original</h3>
        <canvas ref={originalCanvasRef} />
      </div>
      
      <div className="processed-preview">
        <h3>Privacy-Enhanced</h3>
        <canvas ref={processedCanvasRef} />
      </div>
    </div>
  );
}
```

## Memory Management

TensorFlow.js allocates WebGL textures that need to be managed manually to prevent memory leaks. Use these techniques:

1. **Use `tf.tidy()`**: Automatically disposes tensors created inside the callback
2. **Dispose Manually**: Call `.dispose()` on tensors when done using them
3. **Dispose Models**: Clean up models when components unmount

Example:

```typescript
// Good: Using tf.tidy()
const result = tf.tidy(() => {
  const tensor = tf.browser.fromPixels(img);
  const normalized = tensor.div(255);
  return model.predict(normalized.expandDims(0));
});
// All intermediate tensors are automatically disposed

// Bad: Memory leak
const tensor = tf.browser.fromPixels(img);
const normalized = tensor.div(255);
const result = model.predict(normalized.expandDims(0));
// These tensors remain in memory

// Cleanup in useEffect
useEffect(() => {
  return () => {
    if (modelRef.current) {
      modelRef.current.dispose();
    }
  };
}, []);
```

## React Integration

Here's how to integrate everything in a React component:

```typescript
function PrivacyFilter() {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [privacyLevel, setPrivacyLevel] = useState(50);
  const [isModelLoading, setIsModelLoading] = useState(true);
  
  const modelRef = useRef<tf.LayersModel | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  
  // Initialize TensorFlow and load model
  useEffect(() => {
    async function init() {
      try {
        setIsModelLoading(true);
        await tf.ready();
        const model = await createAutoencoderModel(224, 224);
        modelRef.current = model;
        setIsModelLoading(false);
      } catch (error) {
        console.error('Failed to initialize:', error);
      }
    }
    
    init();
    
    return () => {
      if (modelRef.current) {
        modelRef.current.dispose();
      }
    };
  }, []);
  
  // Process image when privacy level changes
  useEffect(() => {
    async function processCurrentImage() {
      if (!originalImage || !modelRef.current || !imageRef.current) return;
      
      try {
        const result = await processImage(
          imageRef.current, 
          modelRef.current, 
          privacyLevel
        );
        setProcessedImage(result);
      } catch (error) {
        console.error('Processing error:', error);
      }
    }
    
    if (!isModelLoading) {
      processCurrentImage();
    }
  }, [originalImage, privacyLevel, isModelLoading]);
  
  // Handle image upload
  const handleImageUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    setOriginalImage(url);
    
    // Load image for processing
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
    };
    img.src = url;
  };
  
  return (
    <div className="privacy-filter">
      <h1>Privacy Filter</h1>
      
      <ImageUploader onImageUpload={handleImageUpload} />
      
      {isModelLoading && <p>Loading TensorFlow.js model...</p>}
      
      {originalImage && (
        <>
          <PrivacySlider
            value={privacyLevel}
            onChange={setPrivacyLevel}
            disabled={isModelLoading}
          />
          
          <ImagePreview
            originalImage={originalImage}
            processedImage={processedImage}
          />
          
          {processedImage && (
            <button onClick={() => downloadImage(processedImage)}>
              Download Processed Image
            </button>
          )}
        </>
      )}
    </div>
  );
}

function downloadImage(dataUrl: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = 'privacy-filtered-image.png';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
```

## Privacy Controls

The privacy slider controls multiple aspects of image anonymization:

```typescript
function PrivacySlider({ value, onChange, disabled }) {
  return (
    <div className="privacy-slider">
      <label htmlFor="privacy-level">Privacy Protection Level: {value}%</label>
      <input
        id="privacy-level"
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        disabled={disabled}
      />
      <div className="slider-labels">
        <span>Low Protection</span>
        <span>High Protection</span>
      </div>
    </div>
  );
}
```

## Advanced Techniques

For better results, consider these enhancements:

1. **Fine-tuned Models**: Train models specifically on face data for better anonymization
2. **Face Detection**: Use a face detection model to only anonymize face regions
3. **Progressive Enhancement**: Process at low resolution first for immediate feedback
4. **Web Workers**: Move processing to a separate thread to prevent UI freezing

## Conclusion

This integration guide demonstrates how to use TensorFlow.js in a React application to process images client-side using an autoencoder model. By following these patterns, you can create privacy-focused applications that keep user data secure by processing everything locally in the browser.
