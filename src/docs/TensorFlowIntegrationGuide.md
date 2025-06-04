# Integrating TensorFlow.js Autoencoder in React

This guide explains how PrivacyGnine integrates a TensorFlow.js autoencoder model for client-side image processing.

## 1. Model Architecture

The autoencoder in `autoencoderModel.ts` consists of an encoder that compresses the image and a decoder that reconstructs it, losing sensitive details in the process:

```javascript
export async function createAutoencoderModel(imageWidth: number, imageHeight: number) {
  // Create a sequential model
  const model = tf.sequential();
  
  // Encoder layers
  model.add(tf.layers.conv2d({
    inputShape: [imageHeight, imageWidth, 3],
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
  
  // More encoder layers...
  
  // Decoder layers
  model.add(tf.layers.conv2dTranspose({
    filters: 8,
    kernelSize: 3,
    strides: 2,
    padding: 'same',
    activation: 'relu'
  }));
  
  // More decoder layers...
  
  model.add(tf.layers.conv2d({
    filters: 3,
    kernelSize: 3,
    padding: 'same',
    activation: 'sigmoid'
  }));
  
  return model;
}
```

## 2. Loading the Model

In `App.tsx`, the model is loaded when the component mounts:

```javascript
// Load TensorFlow.js model
useEffect(() => {
  async function loadModel() {
    try {
      setIsModelLoading(true);
      // Initialize TensorFlow.js
      await tf.ready();
      
      // Create autoencoder model
      const model = await createAutoencoderModel(224, 224);
      modelRef.current = model;
      
      setIsModelLoading(false);
    } catch (err) {
      console.error('Failed to load model:', err);
      setError('Failed to initialize TensorFlow.js model');
      setIsModelLoading(false);
    }
  }
  
  loadModel();
  
  return () => {
    // Cleanup
    if (modelRef.current) {
      modelRef.current.dispose();
    }
  };
}, []);
```

## 3. Preprocessing Images

When a user uploads an image, it's converted to a tensor:

```javascript
// Normalize image to [0, 1]
const tensor = tf.browser.fromPixels(imageElement)
  .toFloat()
  .div(tf.scalar(255))
  .expandDims(0);
```

Key preprocessing steps:
1. `fromPixels()` converts the HTML image to a 3D tensor (height, width, channels)
2. `toFloat()` converts integer pixel values to floating point
3. `div(tf.scalar(255))` normalizes values to [0,1] range
4. `expandDims(0)` adds a batch dimension as the model expects 4D input

## 4. Running Inference

The `processImage` function in `autoencoderModel.ts` shows the full pipeline:

```javascript
export async function processImage(
  imageElement: HTMLImageElement, 
  model: tf.LayersModel,
  privacyLevel: number
): Promise<string> {
  return tf.tidy(() => {
    // Preprocess image
    const tensor = tf.browser.fromPixels(imageElement)
      .toFloat()
      .div(tf.scalar(255))
      .expandDims(0);
    
    // Apply privacy filtering
    let processedTensor;
    
    if (privacyLevel === 0) {
      // No privacy filtering
      processedTensor = tensor;
    } else {
      // Run through the autoencoder
      processedTensor = model.predict(tensor) as tf.Tensor;
      
      // Apply additional effects based on privacy level
      const noiseLevel = privacyLevel / 100;
      
      // Pixelation for higher privacy levels
      if (privacyLevel > 60) {
        const pixelSize = Math.max(2, Math.floor(privacyLevel / 20));
        const h = processedTensor.shape[1] as number;
        const w = processedTensor.shape[2] as number;
        const newH = Math.floor(h / pixelSize);
        const newW = Math.floor(w / pixelSize);
        
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
    
    return outputCanvas.toDataURL('image/png');
  });
}
```

The `tf.tidy()` wrapper is crucial as it automatically cleans up tensors to prevent memory leaks.

## 5. Displaying Results on Canvas

In `ImagePreview.tsx`, the processed image is displayed:

```javascript
useEffect(() => {
  if (processedImage && processedCanvasRef.current) {
    const canvas = processedCanvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      const img = new Image();
      img.onload = () => {
        // Set canvas dimensions to match image
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
      };
      img.src = processedImage;
    }
  }
}, [processedImage]);
```

## 6. Memory Management

TensorFlow.js requires careful memory management. The app uses:

1. `tf.tidy()` to automatically dispose of intermediate tensors
2. `model.dispose()` in the cleanup function of the effect hook
3. `useRef` to maintain references to the model and avoid recreating it

## 7. Integration with React

The entire flow in the React application is:

1. User uploads an image via `ImageUploader` component
2. Image is stored in React state and passed to the TensorFlow processing function
3. Privacy level is controlled via the `PrivacySlider` component
4. Processed image is generated and displayed in the `ImagePreview` component
5. User can download the processed image

## Best Practices

1. **Avoid Memory Leaks**: Always dispose of tensors and models
2. **Use Async Loading**: Initialize TensorFlow asynchronously
3. **Error Handling**: Provide fallbacks for failed model loading or processing
4. **Progressive Enhancement**: Allow basic functionality even if TensorFlow fails
5. **Performance**: Use `tf.tidy()` and consider Web Workers for larger models

This implementation keeps all processing client-side, ensuring user privacy by never sending images to a server.
