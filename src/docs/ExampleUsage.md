# Example Usage: Integrating TensorFlow.js Autoencoder

Below are practical examples of how to use the key components of a TensorFlow.js autoencoder for image privacy in a React application.

## Creating a Basic Autoencoder Model

```javascript
import * as tf from '@tensorflow/tfjs';

async function createBasicAutoencoder(imageSize = 224) {
  // Ensure TensorFlow is ready
  await tf.ready();
  
  const model = tf.sequential();
  
  // Encoder
  model.add(tf.layers.conv2d({
    inputShape: [imageSize, imageSize, 3],
    filters: 16,
    kernelSize: 3,
    strides: 1,
    padding: 'same',
    activation: 'relu'
  }));
  
  model.add(tf.layers.maxPooling2d({ poolSize: [2, 2] }));
  
  // Bottleneck (this is where information gets compressed)
  model.add(tf.layers.conv2d({
    filters: 8,
    kernelSize: 3,
    padding: 'same',
    activation: 'relu'
  }));
  
  // Decoder
  model.add(tf.layers.conv2dTranspose({
    filters: 16,
    kernelSize: 3,
    strides: 2,
    padding: 'same',
    activation: 'relu'
  }));
  
  // Output layer (reconstructs the image)
  model.add(tf.layers.conv2d({
    filters: 3,
    kernelSize: 3,
    padding: 'same',
    activation: 'sigmoid'
  }));
  
  return model;
}
```

## Loading a Pre-trained Model from URL

```javascript
import * as tf from '@tensorflow/tfjs';

async function loadPretrainedModel() {
  try {
    // This loads a model saved in the TensorFlow.js format
    const model = await tf.loadLayersModel('https://example.com/path/to/model.json');
    console.log('Model loaded successfully');
    return model;
  } catch (error) {
    console.error('Failed to load model:', error);
    throw error;
  }
}
```

## Processing an Image with the Model

```javascript
function processImageWithModel(imageElement, model, privacyLevel = 0.5) {
  return tf.tidy(() => {
    // Convert image to tensor and normalize
    const tensor = tf.browser.fromPixels(imageElement)
      .toFloat()
      .div(tf.scalar(255))
      .expandDims(0);
    
    // Run through model
    const result = model.predict(tensor);
    
    // Apply additional privacy effects based on level
    let processed = result;
    if (privacyLevel > 0) {
      // Add some noise proportional to privacy level
      const noise = tf.randomNormal(processed.shape, 0, privacyLevel * 0.1);
      processed = tf.add(processed, noise).clipByValue(0, 1);
    }
    
    // Remove batch dimension
    const outputTensor = processed.squeeze();
    
    // Create a canvas to display the result
    const canvas = document.createElement('canvas');
    canvas.width = imageElement.width;
    canvas.height = imageElement.height;
    
    // Render tensor to canvas
    tf.browser.toPixels(outputTensor, canvas);
    
    return canvas.toDataURL();
  });
}
```

## React Hook for Model Management

```javascript
import { useState, useEffect, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';

function useAutoencoder(modelUrl) {
  const [model, setModel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Keep track of whether component is mounted
  const isMounted = useRef(true);
  
  useEffect(() => {
    async function loadModel() {
      try {
        setIsLoading(true);
        
        // Wait for TensorFlow to initialize
        await tf.ready();
        
        // Load model (or create one if no URL provided)
        const loadedModel = modelUrl ? 
          await tf.loadLayersModel(modelUrl) : 
          await createBasicAutoencoder();
        
        // Only update state if component is still mounted
        if (isMounted.current) {
          setModel(loadedModel);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error loading model:', err);
        if (isMounted.current) {
          setError(err.message || 'Failed to load model');
          setIsLoading(false);
        }
      }
    }
    
    loadModel();
    
    // Cleanup function
    return () => {
      isMounted.current = false;
      if (model) {
        model.dispose();
      }
    };
  }, [modelUrl]);
  
  return { model, isLoading, error };
}
```

## Full React Component Example

```jsx
import React, { useState, useRef, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';

function ImagePrivacyFilter() {
  const [originalImage, setOriginalImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [privacyLevel, setPrivacyLevel] = useState(50);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const modelRef = useRef(null);
  const imageRef = useRef(null);
  
  useEffect(() => {
    async function initModel() {
      await tf.ready();
      modelRef.current = await createBasicAutoencoder();
    }
    
    initModel();
    
    return () => {
      if (modelRef.current) {
        modelRef.current.dispose();
      }
    };
  }, []);
  
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setOriginalImage(url);
      
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        processCurrentImage();
      };
      img.src = url;
    }
  };
  
  const processCurrentImage = async () => {
    if (!imageRef.current || !modelRef.current) return;
    
    setIsProcessing(true);
    
    try {
      const result = await processImageWithModel(
        imageRef.current, 
        modelRef.current, 
        privacyLevel / 100
      );
      setProcessedImage(result);
    } catch (err) {
      console.error('Processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };
  
  useEffect(() => {
    if (imageRef.current && modelRef.current) {
      processCurrentImage();
    }
  }, [privacyLevel]);
  
  return (
    <div className="image-privacy-filter">
      <h2>Image Privacy Filter</h2>
      
      <div className="upload-section">
        <input type="file" accept="image/*" onChange={handleImageUpload} />
      </div>
      
      {originalImage && (
        <div className="previews">
          <div className="preview-original">
            <h3>Original Image</h3>
            <img src={originalImage} alt="Original" />
          </div>
          
          <div className="preview-processed">
            <h3>Privacy-Protected Image</h3>
            {processedImage ? (
              <img src={processedImage} alt="Processed" />
            ) : (
              <div className="loading">Processing...</div>
            )}
          </div>
          
          <div className="controls">
            <label>Privacy Level: {privacyLevel}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={privacyLevel}
              onChange={(e) => setPrivacyLevel(parseInt(e.target.value))}
              disabled={isProcessing}
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

These examples provide a starting point for integrating TensorFlow.js autoencoder models in React applications for privacy-focused image processing.
