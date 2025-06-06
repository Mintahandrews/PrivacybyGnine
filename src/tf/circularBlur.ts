import * as tf from '@tensorflow/tfjs';
import { Area, CircleArea, RectangleArea, EllipseArea } from '../components/ShapeAreaSelector';

// Cache for storing computed kernels to reduce redundant calculations
const kernelCache: Record<string, {
  kernel: tf.Tensor4D,
  hKernel?: tf.Tensor4D,
  vKernel?: tf.Tensor4D
}> = {};


/**
 * Applies blur masks to an image tensor for different shape types
 * @param imageTensor The input image tensor (3D)
 * @param areas Array of areas to blur (circles, rectangles, ellipses)
 * @param imageWidth Original image width
 * @param imageHeight Original image height
 * @param featherEdges Whether to feather the edges of the masked areas (default: true)
 * @returns A new tensor with blurred areas
 */
export const applyCircularBlurs = async (
  imageTensor: tf.Tensor3D,
  areas: Area[],
  imageWidth: number,
  imageHeight: number,
  featherEdges: boolean = true
): Promise<tf.Tensor3D> => {
  return tf.tidy(() => {
    if (!areas.length) {
      return imageTensor;
    }

    // Get tensor dimensions
    const [height, width] = imageTensor.shape.slice(0, 2);
    
    // Create a mask tensor for the areas
    const createMask = () => {
      return tf.tidy(() => {
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
        
        // Draw black circles for each area
        areas.forEach(area => {
          // Calculate scales
          const scaleX = width / imageWidth;
          const scaleY = height / imageHeight;
          
          // Draw appropriate shape based on type
          if (area.shapeType === 'circle') {
            const circleArea = area as CircleArea;
            ctx.beginPath();
            ctx.arc(
              circleArea.x * scaleX,
              circleArea.y * scaleY,
              circleArea.radius * Math.min(scaleX, scaleY),
              0,
              Math.PI * 2
            );
            ctx.fillStyle = 'white';
            ctx.fill();
          } else if (area.shapeType === 'rectangle') {
            const rectArea = area as RectangleArea;
            const x = rectArea.x * scaleX;
            const y = rectArea.y * scaleY;
            const rectWidth = rectArea.width * scaleX;
            const rectHeight = rectArea.height * scaleY;
            
            ctx.beginPath();
            ctx.rect(x - rectWidth/2, y - rectHeight/2, rectWidth, rectHeight);
            ctx.fillStyle = 'white';
            ctx.fill();
          } else if (area.shapeType === 'ellipse') {
            const ellipseArea = area as EllipseArea;
            const x = ellipseArea.x * scaleX;
            const y = ellipseArea.y * scaleY;
            const radiusX = ellipseArea.radiusX * scaleX;
            const radiusY = ellipseArea.radiusY * scaleY;
            
            ctx.beginPath();
            ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
          }
        });
        
        // Convert canvas to tensor and ensure proper memory management
        // Invert the mask (1 for areas to blur, 0 for areas to keep) and add channel dimension
        return tf.browser.fromPixels(maskCanvas, 1)
          .toFloat()
          .div(tf.scalar(255, 'float32'))
          .sub(1)
          .mul(-1)
          .expandDims(-1);
      });
    };
    
    // Create blurred version of the entire image with varying intensities
    const blurredTensors = areas.map(area => {
      return tf.tidy(() => {
        // Apply Gaussian blur with intensity based on the area's blurIntensity
        const sigma = area.blurIntensity / 10; // Convert 0-100 scale to appropriate sigma
        const kernelSize = Math.max(3, Math.floor(sigma * 3)) | 1; // Ensure odd kernel size and force odd with bitwise OR
        
        // Note: Grayscale conversion happens in the convolution step below
        
        // Use cached kernel if available to improve performance
        const cacheKey = `sigma_${Math.round(sigma * 100)}`; // Use rounded sigma as cache key
        let rgbKernel: tf.Tensor4D;
        let hRgbKernel: tf.Tensor4D | undefined;
        let vRgbKernel: tf.Tensor4D | undefined;
        
        if (kernelCache[cacheKey]) {
          // Use cached kernels
          rgbKernel = kernelCache[cacheKey].kernel;
          hRgbKernel = kernelCache[cacheKey].hKernel;
          vRgbKernel = kernelCache[cacheKey].vKernel;
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
          hRgbKernel = tf.concat([
            hKernel, hKernel, hKernel
          ], 2).asType('float32') as tf.Tensor4D;
          
          vRgbKernel = tf.concat([
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
          kernelCache[cacheKey] = {
            kernel: rgbKernel,
            hKernel: hRgbKernel,
            vKernel: vRgbKernel
          };
          
          // Clean up intermediate tensors
          tf.dispose([gauss, hKernel, vKernel]);
        }
        
        // Apply two-pass separable convolution for better performance
        return tf.tidy(() => {
          // Use the original image colors for a colorful blur effect
          // Expand input for convolution
          const expandedInput = imageTensor.expandDims(0).asType('float32') as tf.Tensor4D;
          
          // Use separable convolution if available (much faster)
          if (hRgbKernel && vRgbKernel) {
            // Apply horizontal blur first
            const hBlurred = tf.depthwiseConv2d(
              expandedInput,
              hRgbKernel,
              [1, 1],
              'same'
            );
            
            // Apply vertical blur to complete the Gaussian blur
            const blurred = tf.depthwiseConv2d(
              hBlurred,
              vRgbKernel,
              [1, 1],
              'same'
            );
            
            // Return the result as a 3D tensor
            return tf.squeeze(blurred, [0]) as tf.Tensor3D;
          } else {
            // Fallback to standard convolution if separable kernels aren't available
            const blurred = tf.depthwiseConv2d(
              expandedInput,
              rgbKernel,
              [1, 1],
              'same'
            );
            
            // Return the result as a 3D tensor
            return tf.squeeze(blurred, [0]) as tf.Tensor3D;
          }
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
    
    // Capture featherEdges parameter for use in the forEach callback
    const shouldFeatherEdges = featherEdges;
    
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
        
        // Handle different shape types
        if (area.shapeType === 'circle') {
          const circleArea = area as CircleArea;
          const x = circleArea.x * scaleX;
          const y = circleArea.y * scaleY;
          const radius = circleArea.radius * Math.min(scaleX, scaleY);
          
          if (shouldFeatherEdges) {
            // Create radial gradient for feathered edges
            const featherAmount = Math.max(5, radius * 0.1); // 10% feathering or at least 5px
            const gradient = ctx.createRadialGradient(
              x, y, radius - featherAmount, // Inner circle
              x, y, radius                  // Outer circle
            );
            
            gradient.addColorStop(0, 'white');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            // Draw feathered circle
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // Draw solid inner circle
            ctx.beginPath();
            ctx.arc(x, y, radius - featherAmount, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
          } else {
            // Simple circle without feathering
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
          }
        } else if (area.shapeType === 'rectangle') {
          const rectArea = area as RectangleArea;
          const x = rectArea.x * scaleX;
          const y = rectArea.y * scaleY;
          const width = rectArea.width * scaleX;
          const height = rectArea.height * scaleY;
          const halfWidth = width / 2;
          const halfHeight = height / 2;
          
          // Draw rectangle with feathered edges if needed
          if (shouldFeatherEdges) {
            // Create a gradient for feathered edges
            const featherAmount = Math.max(5, Math.min(width, height) * 0.1);
            
            // First draw the solid center
            ctx.beginPath();
            ctx.rect(
              x - halfWidth + featherAmount, 
              y - halfHeight + featherAmount, 
              width - featherAmount * 2, 
              height - featherAmount * 2
            );
            ctx.fillStyle = 'white';
            ctx.fill();
            
            // Then draw the feathered edges
            // Top edge
            const topGradient = ctx.createLinearGradient(
              x - halfWidth, y - halfHeight + featherAmount,
              x - halfWidth, y - halfHeight
            );
            topGradient.addColorStop(0, 'white');
            topGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = topGradient;
            ctx.fillRect(x - halfWidth, y - halfHeight, width, featherAmount);
            
            // Bottom edge
            const bottomGradient = ctx.createLinearGradient(
              x - halfWidth, y + halfHeight - featherAmount,
              x - halfWidth, y + halfHeight
            );
            bottomGradient.addColorStop(0, 'white');
            bottomGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = bottomGradient;
            ctx.fillRect(x - halfWidth, y + halfHeight - featherAmount, width, featherAmount);
            
            // Left edge
            const leftGradient = ctx.createLinearGradient(
              x - halfWidth + featherAmount, y - halfHeight,
              x - halfWidth, y - halfHeight
            );
            leftGradient.addColorStop(0, 'white');
            leftGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = leftGradient;
            ctx.fillRect(x - halfWidth, y - halfHeight, featherAmount, height);
            
            // Right edge
            const rightGradient = ctx.createLinearGradient(
              x + halfWidth - featherAmount, y - halfHeight,
              x + halfWidth, y - halfHeight
            );
            rightGradient.addColorStop(0, 'white');
            rightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = rightGradient;
            ctx.fillRect(x + halfWidth - featherAmount, y - halfHeight, featherAmount, height);
          } else {
            // Simple rectangle without feathering
            ctx.beginPath();
            ctx.rect(x - halfWidth, y - halfHeight, width, height);
            ctx.fillStyle = 'white';
            ctx.fill();
          }
        } else if (area.shapeType === 'ellipse') {
          const ellipseArea = area as EllipseArea;
          const x = ellipseArea.x * scaleX;
          const y = ellipseArea.y * scaleY;
          const radiusX = ellipseArea.radiusX * scaleX;
          const radiusY = ellipseArea.radiusY * scaleY;
          
          // Draw ellipse with feathered edges if needed
          if (shouldFeatherEdges) {
            const featherAmount = Math.max(5, Math.min(radiusX, radiusY) * 0.1);
            
            // Draw the solid inner ellipse
            ctx.beginPath();
            ctx.ellipse(x, y, radiusX - featherAmount, radiusY - featherAmount, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
            
            // Draw the feathered outer ellipse using a radial gradient
            // We'll use multiple ellipses with decreasing opacity to simulate the gradient
            const steps = 8; // Number of steps for the gradient
            for (let i = 0; i < steps; i++) {
              const ratio = i / steps;
              const innerRadiusX = radiusX - featherAmount + (featherAmount * ratio);
              const innerRadiusY = radiusY - featherAmount + (featherAmount * ratio);
              const outerRadiusX = innerRadiusX + (featherAmount / steps);
              const outerRadiusY = innerRadiusY + (featherAmount / steps);
              
              // Calculate opacity for this step (1 at inner edge, 0 at outer edge)
              const opacity = 1 - ratio;
              
              // Draw the elliptical ring
              ctx.beginPath();
              ctx.ellipse(x, y, outerRadiusX, outerRadiusY, 0, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
              ctx.fill();
            }
          } else {
            // Simple ellipse without feathering
            ctx.beginPath();
            ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
          }
        }
        
        // No need to add solid center here as it's already handled in the shape-specific drawing code
        
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
 * Completely hides areas by filling them with solid color
 * @param imageTensor The input image tensor (3D)
 * @param areas Array of areas to hide (circles, rectangles, ellipses)
 * @param imageWidth Original image width
 * @param imageHeight Original image height
 * @param color RGB color array to fill with [r, g, b] (0-255)
 * @param featherEdges Whether to feather the edges of the masked areas (default: true)
 * @returns A new tensor with hidden areas
 */
export const hideCircularAreas = (
  imageTensor: tf.Tensor3D,
  areas: Area[],
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
    
    // Draw filled shapes for each area
    areas.forEach(area => {
      const scaleX = width / imageWidth;
      const scaleY = height / imageHeight;
      const x = area.x * scaleX;
      const y = area.y * scaleY;
      const colorStr = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
      const colorStrTransparent = `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`;
      
      switch (area.shapeType) {
        case 'circle': {
          const circleArea = area as CircleArea;
          const radius = circleArea.radius * Math.min(scaleX, scaleY);
          
          if (featherEdges) {
            // Create radial gradient for feathered edges
            const featherAmount = Math.max(3, radius * 0.1); // 10% feathering or at least 3px
            const gradient = ctx.createRadialGradient(
              x, y, radius - featherAmount, // Inner circle
              x, y, radius                  // Outer circle
            );
            
            gradient.addColorStop(0, colorStr);
            gradient.addColorStop(1, colorStrTransparent);
            
            // Draw feathered circle
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // Add solid center
            ctx.beginPath();
            ctx.arc(x, y, radius - featherAmount, 0, Math.PI * 2);
            ctx.fillStyle = colorStr;
            ctx.fill();
          } else {
            // Simple filled circle
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = colorStr;
            ctx.fill();
          }
          break;
        }
        
        case 'rectangle': {
          const rectArea = area as RectangleArea;
          const width = rectArea.width * scaleX;
          const height = rectArea.height * scaleY;
          const halfWidth = width / 2;
          const halfHeight = height / 2;
          
          if (featherEdges) {
            // Create a gradient for feathered edges
            const featherAmount = Math.max(3, Math.min(width, height) * 0.1);
            
            // First draw the solid center
            ctx.beginPath();
            ctx.rect(
              x - halfWidth + featherAmount, 
              y - halfHeight + featherAmount, 
              width - featherAmount * 2, 
              height - featherAmount * 2
            );
            ctx.fillStyle = colorStr;
            ctx.fill();
            
            // Then draw the feathered edges
            // Top edge
            const topGradient = ctx.createLinearGradient(
              x - halfWidth, y - halfHeight + featherAmount,
              x - halfWidth, y - halfHeight
            );
            topGradient.addColorStop(0, colorStr);
            topGradient.addColorStop(1, colorStrTransparent);
            ctx.fillStyle = topGradient;
            ctx.fillRect(x - halfWidth, y - halfHeight, width, featherAmount);
            
            // Bottom edge
            const bottomGradient = ctx.createLinearGradient(
              x - halfWidth, y + halfHeight - featherAmount,
              x - halfWidth, y + halfHeight
            );
            bottomGradient.addColorStop(0, colorStr);
            bottomGradient.addColorStop(1, colorStrTransparent);
            ctx.fillStyle = bottomGradient;
            ctx.fillRect(x - halfWidth, y + halfHeight - featherAmount, width, featherAmount);
            
            // Left edge
            const leftGradient = ctx.createLinearGradient(
              x - halfWidth + featherAmount, y - halfHeight,
              x - halfWidth, y - halfHeight
            );
            leftGradient.addColorStop(0, colorStr);
            leftGradient.addColorStop(1, colorStrTransparent);
            ctx.fillStyle = leftGradient;
            ctx.fillRect(x - halfWidth, y - halfHeight, featherAmount, height);
            
            // Right edge
            const rightGradient = ctx.createLinearGradient(
              x + halfWidth - featherAmount, y - halfHeight,
              x + halfWidth, y - halfHeight
            );
            rightGradient.addColorStop(0, colorStr);
            rightGradient.addColorStop(1, colorStrTransparent);
            ctx.fillStyle = rightGradient;
            ctx.fillRect(x + halfWidth - featherAmount, y - halfHeight, featherAmount, height);
          } else {
            // Simple rectangle without feathering
            ctx.beginPath();
            ctx.rect(x - halfWidth, y - halfHeight, width, height);
            ctx.fillStyle = colorStr;
            ctx.fill();
          }
          break;
        }
        
        case 'ellipse': {
          const ellipseArea = area as EllipseArea;
          const radiusX = ellipseArea.radiusX * scaleX;
          const radiusY = ellipseArea.radiusY * scaleY;
          
          if (featherEdges) {
            const featherAmount = Math.max(3, Math.min(radiusX, radiusY) * 0.1);
            
            // Draw the solid inner ellipse
            ctx.beginPath();
            ctx.ellipse(x, y, radiusX - featherAmount, radiusY - featherAmount, 0, 0, Math.PI * 2);
            ctx.fillStyle = colorStr;
            ctx.fill();
            
            // Draw the feathered outer ellipse using multiple ellipses with decreasing opacity
            const steps = 8; // Number of steps for the gradient
            for (let i = 0; i < steps; i++) {
              const ratio = i / steps;
              const innerRadiusX = radiusX - featherAmount + (featherAmount * ratio);
              const innerRadiusY = radiusY - featherAmount + (featherAmount * ratio);
              const outerRadiusX = innerRadiusX + (featherAmount / steps);
              const outerRadiusY = innerRadiusY + (featherAmount / steps);
              
              // Calculate opacity for this step (1 at inner edge, 0 at outer edge)
              const opacity = 1 - ratio;
              
              // Draw the elliptical ring
              ctx.beginPath();
              ctx.ellipse(x, y, outerRadiusX, outerRadiusY, 0, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${opacity})`;
              ctx.fill();
            }
          } else {
            // Simple ellipse without feathering
            ctx.beginPath();
            ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
            ctx.fillStyle = colorStr;
            ctx.fill();
          }
          break;
        }
      }
    });
    
    // Convert back to tensor and ensure proper memory management
    // Use tidy to automatically clean up intermediate tensors
    return tf.tidy(() => {
      return tf.browser.fromPixels(canvas);
    });
  });
};
