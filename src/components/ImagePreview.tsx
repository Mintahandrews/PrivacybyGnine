import React, { useEffect, useRef, useState } from 'react';

interface ImagePreviewProps {
  originalImage: string | null;
  processedImage: string | null;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ 
  originalImage, 
  processedImage 
}) => {
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const processedCanvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (originalImage && originalCanvasRef.current) {
      const canvas = originalCanvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        const img = new Image();
        // Set crossOrigin to anonymous to avoid CORS issues
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          // Calculate optimal responsive dimensions while preserving aspect ratio
          const viewportWidth = window.innerWidth;
          // Use smaller dimensions on mobile devices
          const maxWidth = viewportWidth < 640 ? viewportWidth - 40 : 640;
          const maxHeight = viewportWidth < 640 ? window.innerHeight * 0.4 : 480;
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
          }
          
          // Ensure dimensions are at least 1px
          width = Math.max(1, width);
          height = Math.max(1, height);
          
          // Update canvas dimensions
          canvas.width = width;
          canvas.height = height;
          
          // Clear canvas before drawing
          ctx.clearRect(0, 0, width, height);
          
          try {
            // Try to draw the image
            ctx.drawImage(img, 0, 0, width, height);
            // Store dimensions to match processed image canvas
            setCanvasDimensions({ width, height });
          } catch (err) {
            console.error('Error drawing original image to canvas:', err);
            // Draw a fallback rectangle with error message
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, width, height);
            ctx.fillStyle = '#888';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '14px sans-serif';
            ctx.fillText('Image loading error', width/2, height/2);
            
            // Set fallback dimensions
            setCanvasDimensions({ width, height });
          }
        };
        
        img.onerror = () => {
          console.error('Failed to load original image');
          // Set fallback dimensions if image fails to load
          const width = 320;
          const height = 240;
          canvas.width = width;
          canvas.height = height;
          
          // Draw error state
          ctx.fillStyle = '#f0f0f0';
          ctx.fillRect(0, 0, width, height);
          ctx.fillStyle = '#888';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '14px sans-serif';
          ctx.fillText('Image loading error', width/2, height/2);
          
          setCanvasDimensions({ width, height });
        };
        
        // Set the source last after setting up handlers
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
        // Set crossOrigin to anonymous to avoid CORS issues
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          // Use the same dimensions as the original canvas for consistency
          const width = canvasDimensions.width || img.width;
          const height = canvasDimensions.height || img.height;
          
          // Ensure dimensions are at least 1px
          const safeWidth = Math.max(1, width);
          const safeHeight = Math.max(1, height);
          
          canvas.width = safeWidth;
          canvas.height = safeHeight;
          
          // Clear canvas before drawing
          ctx.clearRect(0, 0, safeWidth, safeHeight);
          
          // Draw with proper scaling
          try {
            ctx.drawImage(img, 0, 0, safeWidth, safeHeight);
          } catch (err) {
            console.error('Error drawing processed image to canvas:', err);
            // Draw fallback colored rectangle if image fails
            ctx.fillStyle = '#f0f0f0';
            ctx.fillRect(0, 0, safeWidth, safeHeight);
            ctx.fillStyle = '#888';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '14px sans-serif';
            ctx.fillText('Image processing error', safeWidth/2, safeHeight/2);
          }
        };
        
        img.onerror = () => {
          console.error('Failed to load processed image');
          // Draw error state on canvas
          const safeWidth = canvasDimensions.width || 320;
          const safeHeight = canvasDimensions.height || 240;
          canvas.width = safeWidth;
          canvas.height = safeHeight;
          
          ctx.fillStyle = '#f0f0f0';
          ctx.fillRect(0, 0, safeWidth, safeHeight);
          ctx.fillStyle = '#888';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = '14px sans-serif';
          ctx.fillText('Image processing error', safeWidth/2, safeHeight/2);
        };
        
        // Set the source last after setting up handlers
        img.src = processedImage;
      }
    } else if (processedCanvasRef.current && !processedImage && canvasDimensions.width > 0) {
      // Show loading state when we have dimensions but no processed image yet
      const canvas = processedCanvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        const safeWidth = canvasDimensions.width;
        const safeHeight = canvasDimensions.height;
        
        canvas.width = safeWidth;
        canvas.height = safeHeight;
        
        // Draw loading indicator
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, safeWidth, safeHeight);
        ctx.fillStyle = '#6c757d';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '14px sans-serif';
        ctx.fillText('Processing image...', safeWidth/2, safeHeight/2);
      }
    }
  }, [processedImage, canvasDimensions]);

  if (!originalImage && !processedImage) {
    return null;
  }

  return (
    <div className="w-full overflow-hidden">
      {/* Mobile tabs for toggling between original and processed images */}
      <div className="sm:hidden mb-4 flex border-b border-gray-200">
        <button
          className={`flex-1 py-3 px-4 text-center font-medium text-sm ${
            !processedImage 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => {
            if (processedImage) {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
        >
          Original
        </button>
        <button
          className={`flex-1 py-3 px-4 text-center font-medium text-sm ${
            processedImage 
              ? 'border-b-2 border-green-500 text-green-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          disabled={!processedImage}
          onClick={() => {
            if (processedImage) {
              // Scroll to the processed image section
              const element = document.getElementById('processed-image');
              if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
              }
            }
          }}
        >
          {processedImage ? 'Processed' : 'Processing...'}
        </button>
      </div>

      {/* Original Image - Full width on mobile, half on larger screens */}
      <div className={`${processedImage ? 'hidden sm:block' : ''} mb-6 sm:mb-0`}>
        <p className="text-center font-medium mb-2 text-sm sm:text-base text-gray-700">
          Original Image
        </p>
        <div className="border border-gray-200 rounded-lg overflow-hidden flex items-center justify-center bg-gray-50 p-1 sm:p-2">
          <canvas 
            ref={originalCanvasRef} 
            className="max-w-full h-auto touch-pan-x touch-pan-y"
            style={{ touchAction: 'pan-x pan-y' }}
          />
        </div>
      </div>

      {/* Processed Image - Full width on mobile, half on larger screens */}
      {processedImage && (
        <div id="processed-image" className={`${!processedImage ? 'hidden sm:block' : ''} sm:mt-0`}>
          <p className="text-center font-medium mb-2 text-sm sm:text-base text-gray-700">
            Processed Image
          </p>
          <div className="border border-gray-200 rounded-lg overflow-hidden flex items-center justify-center bg-gray-50 p-1 sm:p-2">
            <canvas 
              ref={processedCanvasRef} 
              className="max-w-full h-auto touch-pan-x touch-pan-y"
              style={{ touchAction: 'pan-x pan-y' }}
            />
          </div>
        </div>
      )}
      
      {!processedImage && originalImage && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg text-center">
          <p className="text-blue-700 text-sm sm:text-base">
            Processing your image... This may take a moment.
          </p>
          <div className="mt-2 h-1.5 w-full bg-blue-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '80%' }}></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImagePreview;
