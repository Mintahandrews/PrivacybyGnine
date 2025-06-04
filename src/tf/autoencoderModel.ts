import * as tf from '@tensorflow/tfjs';

// Filter types
export enum FilterType {
  BASIC,
  EDGE_ENHANCE,
  PIXELATE,
  GAUSSIAN,
  COLOR_QUANTIZE
}

// Simple autoencoder model for image privacy filtering
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
  
  // Decoder layers
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
  
  model.add(tf.layers.conv2d({
    filters: 3,
    kernelSize: 3,
    padding: 'same',
    activation: 'sigmoid'
  }));
  
  return model;
}

// Edge detection function using Sobel operators
export function detectEdges(imageTensor: tf.Tensor3D): tf.Tensor3D {
  return tf.tidy(() => {
    // Convert RGB to grayscale if needed
    let grayscale: tf.Tensor3D;
    if (imageTensor.shape[2] === 3) {
      // RGB to grayscale conversion weights
      const weights = [0.2989, 0.5870, 0.1140];
      grayscale = tf.tidy(() => {
        // Split the channels
        const rgb = tf.split(imageTensor, 3, 2);
        
        // Apply weights to each channel
        const r = tf.mul(rgb[0], tf.scalar(weights[0], 'float32'));
        const g = tf.mul(rgb[1], tf.scalar(weights[1], 'float32'));
        const b = tf.mul(rgb[2], tf.scalar(weights[2], 'float32'));
        
        // Sum the weighted channels
        return tf.add(tf.add(r, g), b);
      });
    } else {
      grayscale = imageTensor;
    }
    
    // Create Sobel kernels for x and y directions using flat arrays
    const sobelXValues = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelYValues = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    
    // Create 4D tensors with proper shapes for convolution
    const sobelX = tf.tensor4d(sobelXValues, [3, 3, 1, 1]);
    const sobelY = tf.tensor4d(sobelYValues, [3, 3, 1, 1]);
    
    // Add batch dimension for convolution operations
    const batchedInput = tf.expandDims(grayscale, 0);
    
    // Reshape grayscale to have a single channel if needed
    const reshapedInput = tf.reshape(batchedInput, [
      batchedInput.shape[0] || 1,
      batchedInput.shape[1] || 1,
      batchedInput.shape[2] || 1,
      1
    ]);
    
    // Apply convolution with Sobel kernels
    const gx = tf.conv2d(reshapedInput as tf.Tensor4D, sobelX, 1, 'same');
    const gy = tf.conv2d(reshapedInput as tf.Tensor4D, sobelY, 1, 'same');
    
    // Calculate gradient magnitude
    const magnitude = tf.sqrt(tf.add(tf.square(gx), tf.square(gy)));
    
    // Normalize to [0, 1] - ensure we have a valid max value
    const maxValue = tf.max(magnitude).dataSync()[0] || 1.0; // Default to 1 if undefined
    const normalized = tf.div(magnitude, tf.scalar(maxValue + 1e-7, 'float32'));
    
    // Remove batch dimension
    const squeezed = tf.squeeze(normalized, [0]);
    
    // Repeat the single channel to create an RGB image
    const edgesTiled = tf.tile(squeezed, [1, 1, 3]) as tf.Tensor3D;
    
    return edgesTiled as tf.Tensor3D;
  });
}

// Gaussian blur function
export function applyGaussianBlur(imageTensor: tf.Tensor3D, kernelSize: number = 5, sigma: number = 1.0): tf.Tensor3D {
  return tf.tidy(() => {
    // Ensure kernel size is odd
    const kSize = kernelSize % 2 === 0 ? kernelSize + 1 : kernelSize;
    
    // Create 1D Gaussian kernel
    const halfSize = Math.floor(kSize / 2);
    const kernelRange = tf.range(-halfSize, halfSize + 1, 1, 'float32');
    
    // Calculate Gaussian distribution
    const kernel1d = tf.exp(
      tf.div(
        tf.neg(tf.square(kernelRange)),
        tf.scalar(2.0 * sigma * sigma, 'float32')
      )
    );
    
    // Normalize the kernel
    const normalizedKernel1d = tf.div(kernel1d, tf.sum(kernel1d));
    
    // Create 2D kernel from 1D kernel using outer product
    const kernel2d = tf.outerProduct(
      normalizedKernel1d as tf.Tensor1D, 
      normalizedKernel1d as tf.Tensor1D
    );
    
    // Prepare kernel for depthwise convolution - shape [height, width, inChannels, channelMultiplier]
    const reshapedKernel = tf.reshape(kernel2d, [kSize, kSize, 1, 1]);
    
    // Repeat the kernel for each input channel (RGB)
    const kernelRGB = tf.tile(reshapedKernel, [1, 1, 3, 1]) as tf.Tensor4D;
    
    // Apply convolution
    const expandedInput = imageTensor.expandDims(0) as tf.Tensor4D;
    const blurred = tf.depthwiseConv2d(
      expandedInput,
      kernelRGB,
      [1, 1],
      'same'
    );
    
    return tf.squeeze(blurred, [0]) as tf.Tensor3D;
  });
}

// Color quantization function
export function quantizeColors(imageTensor: tf.Tensor3D, levels: number = 4): tf.Tensor3D {
  return tf.tidy(() => {
    // Scale to levels - ensure proper scalar types
    const levelsScalar = tf.scalar(levels, 'float32');
    
    // Multiply, floor, and divide to quantize colors
    const scaled = tf.mul(imageTensor, levelsScalar);
    const floored = tf.floor(scaled);
    const quantized = tf.div(floored, levelsScalar);
    
    return quantized as tf.Tensor3D;
  });
}

// Advanced pixelation function
export function pixelate(imageTensor: tf.Tensor3D, blockSize: number): tf.Tensor3D {
  return tf.tidy(() => {
    // Get image dimensions
    const [height, width] = imageTensor.shape.slice(0, 2) as [number, number];
    
    // Calculate reduced dimensions based on block size
    // Ensure we have at least 1 pixel in each dimension
    const h = Math.max(1, Math.floor(height / blockSize));
    const w = Math.max(1, Math.floor(width / blockSize));
    
    // Add batch dimension for resize operations
    const batchedInput = imageTensor.expandDims(0) as tf.Tensor4D;
    
    // Resize down to create pixelation effect
    const small = tf.image.resizeBilinear(batchedInput, [h, w]);
    
    // Resize back up to original dimensions
    const pixelated = tf.image.resizeBilinear(small, [height, width]);
    
    // Remove batch dimension and ensure it's a Tensor3D
    return tf.squeeze(pixelated, [0]) as tf.Tensor3D;
  });
}

export async function processImage(
  imageElement: HTMLImageElement, 
  model: tf.LayersModel,
  privacyLevel: number,
  filterType: FilterType = FilterType.BASIC
): Promise<string> {
  // Log model expected input shape for debugging
  const inputShape = model.inputs[0].shape;
  console.log(`Model expects input shape: ${JSON.stringify(inputShape)}`);
  // Can't mix tf.tidy with async Promise returns, so we need to handle tensors manually
  let tensor: tf.Tensor | null = null;
  let processedTensor: tf.Tensor | null = null;
  let outputTensor: tf.Tensor | null = null;
  
  // Check if TensorFlow backend is ready
  if (!tf.getBackend()) {
    await tf.setBackend('webgl');
    await tf.ready();
  }
  
  try {
    // Original dimensions for reference
    const origWidth = imageElement.width;
    const origHeight = imageElement.height;
    console.log(`Original image dimensions: ${origWidth}x${origHeight}`);
    
    // Normalize image to [0, 1] and resize if needed for the model
    tensor = tf.tidy(() => {
      // Convert image to tensor
      const pixelsTensor = tf.browser.fromPixels(imageElement);
      
      // Check if we need to resize for the model (for FilterType.BASIC)
      if (filterType === FilterType.BASIC && model.inputs[0].shape) {
        // Get expected dimensions from model input shape
        const expectedWidth = model.inputs[0].shape[1] || 224;
        const expectedHeight = model.inputs[0].shape[2] || 224;
        
        // Only resize if dimensions don't match
        if (imageElement.width !== expectedWidth || imageElement.height !== expectedHeight) {
          console.log(`Resizing to ${expectedWidth}x${expectedHeight} for model input`);
          return tf.image.resizeBilinear(pixelsTensor, [expectedWidth, expectedHeight])
            .toFloat()
            .div(tf.scalar(255, 'float32'));
        }
      }
      
      // Otherwise just normalize without resizing
      return pixelsTensor.toFloat().div(tf.scalar(255, 'float32'));
    });
    
    // Create a 3D tensor for processing
    const tensor3d = tensor as tf.Tensor3D;
    
    // Apply privacy level with advanced filtering techniques
    if (privacyLevel === 0) {
      // No privacy filtering - use original image
      processedTensor = tensor.expandDims(0) as tf.Tensor4D;
    } else {
      // Apply different filtering techniques based on the selected filter type
      let processingTensor: tf.Tensor3D;
      
      switch (filterType) {
        case FilterType.EDGE_ENHANCE: {
          // Edge detection with original image blending
          const edges = detectEdges(tensor3d);
          const blendFactor = Math.min(0.7, privacyLevel / 100);
          
          // Blend edges with original image
          const blended = tf.tidy(() => {
            const scaledOriginal = tf.mul(tensor3d, tf.scalar(1 - blendFactor, 'float32'));
            const scaledEdges = tf.mul(edges, tf.scalar(blendFactor, 'float32'));
            return tf.add(scaledOriginal, scaledEdges) as tf.Tensor3D;
          });
          
          processingTensor = blended;
          edges.dispose();
          break;
        }
        
        case FilterType.GAUSSIAN: {
          // Apply gaussian blur with strength based on privacy level
          const sigma = 0.5 + (privacyLevel / 100) * 2.5;
          const kernelSize = Math.max(3, Math.min(13, Math.floor(privacyLevel / 10)));
          processingTensor = applyGaussianBlur(tensor3d, kernelSize, sigma);
          break;
        }
        
        case FilterType.PIXELATE: {
          // Advanced pixelation with block size based on privacy level
          const blockSize = Math.max(2, Math.floor((privacyLevel / 100) * 20));
          processingTensor = pixelate(tensor3d, blockSize);
          break;
        }
        
        case FilterType.COLOR_QUANTIZE: {
          // Color quantization with levels based on privacy level
          // Higher privacy = fewer colors
          const colorLevels = Math.max(2, Math.floor(10 - (privacyLevel / 100) * 8));
          processingTensor = quantizeColors(tensor3d, colorLevels);
          break;
        }
        
        case FilterType.BASIC:
        default: {
          // Run through the autoencoder - basic level of abstraction
          try {
            const inputTensor = tensor.expandDims(0) as tf.Tensor4D;
            console.log(`Input tensor shape: ${inputTensor.shape}`);
            
            // Validate tensor shape matches model input requirements
            const autoencoderOutput = model.predict(inputTensor) as tf.Tensor4D;
            processingTensor = tf.squeeze(autoencoderOutput, [0]) as tf.Tensor3D;
            inputTensor.dispose();
          } catch (modelError) {
            console.error("Error in model prediction:", modelError);
            // Fallback to using original image with subtle blur as a baseline effect
            console.log("Using fallback processing method due to model error");
            const sigma = 0.5 + (privacyLevel / 100) * 2;
            const kernelSize = Math.max(3, Math.min(7, Math.floor(privacyLevel / 15)));
            processingTensor = applyGaussianBlur(tensor3d, kernelSize, sigma);
          }
          
          // Apply additional effects based on privacy level
          if (privacyLevel > 40) {
            // Add noise proportional to privacy level
            const noiseLevel = (privacyLevel / 100) * 0.3;
            const noise = tf.randomUniform(processingTensor.shape, 0, noiseLevel);
            const noisyTensor = tf.add(processingTensor, noise) as tf.Tensor3D;
            processingTensor.dispose();
            processingTensor = noisyTensor;
            noise.dispose();
          }
          
          if (privacyLevel > 60) {
            // Add pixelation effect for higher privacy levels
            const blockSize = Math.max(2, Math.floor((privacyLevel / 100) * 10));
            const pixelated = pixelate(processingTensor, blockSize);
            processingTensor.dispose();
            processingTensor = pixelated;
          }
          
          if (privacyLevel > 80) {
            // Color quantization for highest privacy levels
            const colorLevels = Math.max(2, Math.floor(8 - (privacyLevel / 100) * 6));
            const quantized = quantizeColors(processingTensor, colorLevels);
            processingTensor.dispose();
            processingTensor = quantized;
          }
          
          break;
        }
      }
      
      // Expand dimensions for model output format
      processedTensor = processingTensor.expandDims(0) as tf.Tensor4D;
      processingTensor.dispose();
    }
    
    // Convert back to an image
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = imageElement.width;
    outputCanvas.height = imageElement.height;
    
    // Remove batch dimension and convert back to pixel data
    outputTensor = processedTensor.squeeze([0]) as tf.Tensor3D;
    
    // Resize back to original dimensions if resizing was applied
    if (outputTensor.shape[0] !== imageElement.height || outputTensor.shape[1] !== imageElement.width) {
      const resizedTensor = tf.image.resizeBilinear(outputTensor as tf.Tensor3D, [imageElement.height, imageElement.width]) as tf.Tensor3D;
      outputTensor.dispose();
      outputTensor = resizedTensor;
    }
    
    // Ensure pixel values are in the correct range [0, 255] for toPixels
    // and enforce float32 data type to ensure compatibility
    const normalizedOutput = tf.tidy(() => {
      // Clamp values between 0 and 1 first to avoid extreme values
      const clampedTensor = tf.clipByValue(outputTensor as tf.Tensor3D, 0, 1);
      // Convert to float32 and scale to 0-255 range
      return tf.mul(clampedTensor, tf.scalar(255, 'float32')).asType('float32');
    }) as tf.Tensor3D;
    
    // Return a promise for the image data URL
    // toPixels expects a Tensor3D, Tensor2D, or TensorLike
    try {
      await tf.browser.toPixels(normalizedOutput, outputCanvas);
    } catch (pixelError) {
      console.error("Error converting tensor to pixels:", pixelError);
      // Try an alternative method if the first fails
      const backupCanvas = document.createElement('canvas');
      backupCanvas.width = imageElement.width;
      backupCanvas.height = imageElement.height;
      await tf.browser.toPixels(
        tf.image.resizeBilinear(normalizedOutput as tf.Tensor3D, [imageElement.height, imageElement.width]), 
        backupCanvas
      );
      outputCanvas.getContext('2d')?.drawImage(backupCanvas, 0, 0);
    }
    const dataUrl = outputCanvas.toDataURL('image/png');
    
    // Clean up the normalized tensor
    normalizedOutput.dispose();
    
    return dataUrl;
  } catch (error) {
    console.error("Error in image processing:", error);
    // Return the original image as fallback
    return imageElement.src;
  } finally {
    // Clean up all tensors to prevent memory leaks
    if (tensor) tensor.dispose();
    if (processedTensor) processedTensor.dispose();
    if (outputTensor) outputTensor.dispose();
  }
}
