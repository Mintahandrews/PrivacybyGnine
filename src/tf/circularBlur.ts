import * as tf from '@tensorflow/tfjs';
import { CircleArea } from '../components/CircularAreaSelector';

// Cache for storing computed kernels to reduce redundant calculations
const kernelCache: Record<number, tf.Tensor4D> = {};


/**
 * Applies circular blur masks to an image tensor
 * @param imageTensor The input image tensor (3D)
 * @param areas Array of circular areas to blur
 * @param imageWidth Original image width
 * @param imageHeight Original image height
 * @returns A new tensor with blurred circular areas
 */
export const applyCircularBlurs = async (
  imageTensor: tf.Tensor3D,
  areas: CircleArea[],
  imageWidth: number,
  imageHeight: number
): Promise<tf.Tensor3D> => {
  return tf.tidy(() => {
    if (!areas.length) {
      return imageTensor;
    }

    // Get tensor dimensions
    const [height, width] = imageTensor.shape.slice(0, 2);
    
    // Create a mask tensor (1 where we keep original, 0 where we blur)
    const createMask = () => {
      return tf.tidy(() => {
        // Start with all ones (keep everything)
        const mask = tf.ones([height, width, 1]);
        
        // For each area, set the circular region to 0 (blur area)
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = width;
        maskCanvas.height = height;
        const ctx = maskCanvas.getContext('2d');
        
        if (!ctx) {
          return mask;
        }
        
        // Fill with white
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        
        // Draw black circles for each area
        areas.forEach(area => {
          const scaleX = width / imageWidth;
          const scaleY = height / imageHeight;
          
          ctx.beginPath();
          ctx.arc(
            area.x * scaleX,
            area.y * scaleY,
            area.radius * Math.min(scaleX, scaleY),
            0,
            Math.PI * 2
          );
          ctx.fillStyle = 'black';
          ctx.fill();
        });
        
        // Convert canvas to tensor and ensure float32 data type
        return tf.browser.fromPixels(maskCanvas, 1)
          .toFloat()
          .div(tf.scalar(255, 'float32'))
          .asType('float32')
          .expandDims(-1);
      });
    };
    
    // Create blurred version of the entire image with varying intensities
    const blurredTensors = areas.map(area => {
      return tf.tidy(() => {
        // Apply Gaussian blur with intensity based on the area's blurIntensity
        const sigma = area.blurIntensity / 10; // Convert 0-100 scale to appropriate sigma
        const kernelSize = Math.max(3, Math.floor(sigma * 3)) | 1; // Ensure odd kernel size and force odd with bitwise OR
        
        // Use cached kernel if available to improve performance
        const cacheKey = Math.round(sigma * 100); // Use rounded sigma as cache key
        let rgbKernel: tf.Tensor4D;
        
        if (kernelCache[cacheKey]) {
          // Use cached kernel
          rgbKernel = kernelCache[cacheKey];
        } else {
          // Use separable convolution for better performance
          // Create 1D Gaussian kernel
          const gauss = tf.tidy(() => {
            const kernel = Array.from({ length: kernelSize }, (_, i) => {
              const x = i - (kernelSize - 1) / 2;
              return Math.exp(-(x * x) / (2 * sigma * sigma));
            });
            
            // Calculate sum for normalization
            const sum = kernel.reduce((a, b) => a + b, 0);
            
            // Normalize
            return tf.tensor1d(kernel.map(v => v / sum), 'float32');
          });
          
          // Create horizontal and vertical kernels for separable convolution
          const hKernel = tf.reshape(gauss, [1, kernelSize, 1, 1]);
          const vKernel = tf.reshape(gauss, [kernelSize, 1, 1, 1]);
          
          // Create separate kernels for each channel by repeating the base kernel
          const hRgbKernel = tf.concat([
            hKernel, hKernel, hKernel
          ], 2).asType('float32') as tf.Tensor4D;
          
          const vRgbKernel = tf.concat([
            vKernel, vKernel, vKernel
          ], 2).asType('float32') as tf.Tensor4D;
          
          // Store the kernels in an object
          rgbKernel = tf.tidy(() => {
            // Create 2D kernel from outer product for non-separable fallback
            const kernel2d = tf.outerProduct(gauss, gauss);
            
            // Reshape for depthwise convolution (height, width, in_channels, channel_multiplier)
            const kernel = kernel2d.reshape([kernelSize, kernelSize, 1, 1]).asType('float32');
            
            // Create separate kernels for each channel by repeating the base kernel
            return tf.concat([
              kernel, kernel, kernel
            ], 2).asType('float32') as tf.Tensor4D;
          });
          
          // Store in cache for future use
          kernelCache[cacheKey] = rgbKernel;
          
          // Clean up intermediate tensors
          tf.dispose([gauss, hKernel, vKernel, hRgbKernel, vRgbKernel]);
        }
        
        // Apply two-pass separable convolution for better performance
        return tf.tidy(() => {
          // Expand input for convolution
          const expandedInput = imageTensor.expandDims(0).asType('float32') as tf.Tensor4D;
          
          // Apply horizontal blur first
          const hBlurred = tf.depthwiseConv2d(
            expandedInput,
            rgbKernel,
            [1, 1],
            'same'
          );
          
          // Apply vertical blur to complete the Gaussian blur
          const blurred = tf.depthwiseConv2d(
            hBlurred,
            rgbKernel,
            [1, 1],
            'same'
          );
          
          // Return the result as a 3D tensor
          return tf.squeeze(blurred, [0]) as tf.Tensor3D;
        });
      });
    });
    
    // If no areas to blur, return original
    if (blurredTensors.length === 0) {
      return imageTensor;
    }
    
    // Create mask
    const mask = createMask();
    
    // Start with original image
    let result = imageTensor.clone();
    
    // Apply each blurred area with its mask
    areas.forEach((area, i) => {
      const blurredTensor = blurredTensors[i];
      
      // Create inverted mask for this specific area with feathered edges
      const areaMask = tf.tidy(() => {
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = width;
        maskCanvas.height = height;
        const ctx = maskCanvas.getContext('2d');
        
        if (!ctx) {
          return tf.ones([height, width, 1]);
        }
        
        // Fill with white
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
        
        // Calculate scales
        const scaleX = width / imageWidth;
        const scaleY = height / imageHeight;
        const x = area.x * scaleX;
        const y = area.y * scaleY;
        const radius = area.radius * Math.min(scaleX, scaleY);
        
        // Create radial gradient for feathered edges
        const featherAmount = Math.max(5, radius * 0.1); // 10% feathering or at least 5px
        const gradient = ctx.createRadialGradient(
          x, y, radius - featherAmount, // Inner circle
          x, y, radius                  // Outer circle
        );
        
        gradient.addColorStop(0, 'black');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        // Draw feathered circle
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Add solid center
        ctx.beginPath();
        ctx.arc(x, y, radius - featherAmount, 0, Math.PI * 2);
        ctx.fillStyle = 'black';
        ctx.fill();
        
        // Convert canvas to tensor and invert (0 where circle is, 1 elsewhere)
        return tf.browser.fromPixels(maskCanvas, 1).toFloat().div(tf.scalar(255, 'float32'));
      });
      
      // Blend original and blurred based on mask
      const invAreaMask = tf.sub(tf.onesLike(areaMask), areaMask);
      const areaMaskRGB = tf.tile(areaMask, [1, 1, 3]);
      const invAreaMaskRGB = tf.tile(invAreaMask, [1, 1, 3]);
      
      // Keep original where mask is 1, use blurred where mask is 0
      const newResult = tf.add(
        tf.mul(result, areaMaskRGB),
        tf.mul(blurredTensor, invAreaMaskRGB)
      );
      
      // Update result and dispose old one
      const oldResult = result;
      result = newResult as tf.Tensor3D;
      tf.dispose(oldResult);
      tf.dispose(areaMask);
      tf.dispose(invAreaMask);
      tf.dispose(areaMaskRGB);
      tf.dispose(invAreaMaskRGB);
    });
    
    // Dispose intermediate tensors
    blurredTensors.forEach(tensor => tf.dispose(tensor));
    tf.dispose(mask);
    
    return result;
  });
};

/**
 * Completely hides circular areas by filling them with solid color or pixelation
 * @param imageTensor The input image tensor (3D)
 * @param areas Array of circular areas to hide
 * @param imageWidth Original image width
 * @param imageHeight Original image height
 * @param color RGB color array to fill with [r, g, b] (0-255)
 * @param featherEdges Whether to feather the edges of the masked areas (default: true)
 * @returns A new tensor with hidden circular areas
 */
export const hideCircularAreas = (
  imageTensor: tf.Tensor3D,
  areas: CircleArea[],
  imageWidth: number,
  imageHeight: number,
  color: [number, number, number] = [0, 0, 0],
  featherEdges: boolean = true
): tf.Tensor3D => {
  return tf.tidy(() => {
    if (!areas.length) {
      return imageTensor;
    }

    // Get tensor dimensions
    const [height, width] = imageTensor.shape.slice(0, 2);
    
    // Create a canvas to draw the mask
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      return imageTensor;
    }
    
    // Draw the original image to canvas
    const imageData = new ImageData(width, height);
    const pixelData = new Uint8ClampedArray(width * height * 4);
    
    // Get pixel data from tensor
    const tensorData = imageTensor.dataSync();
    
    // Fill pixel data
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const idx = (i * width + j) * 4;
        const tensorIdx = (i * width + j) * 3;
        
        pixelData[idx] = tensorData[tensorIdx]; // R
        pixelData[idx + 1] = tensorData[tensorIdx + 1]; // G
        pixelData[idx + 2] = tensorData[tensorIdx + 2]; // B
        pixelData[idx + 3] = 255; // Alpha
      }
    }
    
    imageData.data.set(pixelData);
    ctx.putImageData(imageData, 0, 0);
    
    // Draw filled circles for each area
    areas.forEach(area => {
      const scaleX = width / imageWidth;
      const scaleY = height / imageHeight;
      const x = area.x * scaleX;
      const y = area.y * scaleY;
      const radius = area.radius * Math.min(scaleX, scaleY);
      
      if (featherEdges) {
        // Create radial gradient for feathered edges
        const featherAmount = Math.max(3, radius * 0.1); // 10% feathering or at least 3px
        const gradient = ctx.createRadialGradient(
          x, y, radius - featherAmount, // Inner circle
          x, y, radius                  // Outer circle
        );
        
        gradient.addColorStop(0, `rgb(${color[0]}, ${color[1]}, ${color[2]})`);
        gradient.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`);
        
        // Draw feathered circle
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Add solid center
        ctx.beginPath();
        ctx.arc(x, y, radius - featherAmount, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
        ctx.fill();
      } else {
        // Simple solid fill circle
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
        ctx.fill();
      }
    });
    
    // Convert back to tensor
    return tf.browser.fromPixels(canvas);
  });
};
