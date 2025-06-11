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
          const isMobile = viewportWidth < 640;
          
          // Use smaller dimensions on mobile devices with better proportions
          const maxWidth = isMobile ? viewportWidth - 32 : 640;
          const maxHeight = isMobile ? window.innerHeight * 0.35 : 480;
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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 my-4 sm:my-6">
      <div>
        <p className="text-center font-medium mb-1 sm:mb-2 text-sm sm:text-base text-gray-700">Original Image</p>
        <div className="border border-gray-200 rounded-lg overflow-hidden flex items-center justify-center bg-gray-50 p-1 sm:p-2">
          <canvas ref={originalCanvasRef} className="max-w-full h-auto" />
        </div>
      </div>
      <div>
        <p className="text-center font-medium mb-1 sm:mb-2 text-sm sm:text-base text-gray-700">Processed Image</p>
        <div className="border border-gray-200 rounded-lg overflow-hidden flex items-center justify-center bg-gray-50 p-1 sm:p-2">
          {processedImage ? (
            <canvas ref={processedCanvasRef} className="max-w-full h-auto" />
          ) : (
            <div className="w-full h-full min-h-[100px] sm:min-h-[150px] flex items-center justify-center p-4 sm:p-6">
              <p className="text-gray-500 text-xs sm:text-sm">
                {originalImage ? "Processing..." : "No image processed"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImagePreview;
