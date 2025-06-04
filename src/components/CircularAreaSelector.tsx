import React, { useRef, useState, useEffect } from 'react';

export interface CircleArea {
  id: string;
  x: number;
  y: number;
  radius: number;
  blurIntensity: number; // 0-100
}

interface CircularAreaSelectorProps {
  imageUrl: string | null;
  onAreasChange: (areas: CircleArea[]) => void;
  containerWidth: number;
  containerHeight: number;
  disabled?: boolean;
}

const CircularAreaSelector: React.FC<CircularAreaSelectorProps> = ({
  imageUrl,
  onAreasChange,
  containerWidth,
  containerHeight,
  disabled = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [areas, setAreas] = useState<CircleArea[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedAreaIndex, setSelectedAreaIndex] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  // Load image when URL changes
  useEffect(() => {
    if (imageUrl) {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        drawCanvas();
      };
      img.src = imageUrl;
    } else {
      setImage(null);
      setAreas([]);
    }
  }, [imageUrl]);

  // Draw canvas whenever areas or image changes
  useEffect(() => {
    drawCanvas();
    // Notify parent component of areas change
    onAreasChange(areas);
  }, [areas, image, containerWidth, containerHeight]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image if available
    if (image) {
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      
      // Add semi-transparent overlay to indicate selection mode
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw all circular areas
    areas.forEach((area, index) => {
      const isSelected = index === selectedAreaIndex;
      
      // Draw selection area with semi-transparent fill
      ctx.beginPath();
      ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
      
      // Clear the area to show original image
      ctx.save();
      ctx.clip();
      if (image) {
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      }
      ctx.restore();
      
      // Draw circle border
      ctx.beginPath();
      ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
      ctx.strokeStyle = isSelected ? '#00BFFF' : '#FFFFFF';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();
      
      // Add visual indicator of intensity
      const intensityRing = Math.max(10, area.radius - 10);
      ctx.beginPath();
      ctx.arc(area.x, area.y, intensityRing, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${area.blurIntensity/100})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw resize handle for selected area
      if (isSelected) {
        // Right handle
        ctx.beginPath();
        ctx.arc(area.x + area.radius, area.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#00BFFF';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Label with size
        ctx.font = '12px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(area.radius)}px`, area.x, area.y);
      }
    });
  };

  const getMousePos = (canvas: HTMLCanvasElement, evt: React.MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: evt.clientX - rect.left,
      y: evt.clientY - rect.top
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled || !image) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const mousePos = getMousePos(canvas, e);
    
    // Check if clicking on an existing circle's resize handle
    const resizeHandleIndex = areas.findIndex(area => {
      const handleX = area.x + area.radius;
      const handleY = area.y;
      const distance = Math.sqrt(Math.pow(mousePos.x - handleX, 2) + Math.pow(mousePos.y - handleY, 2));
      return distance <= 6;
    });
    
    if (resizeHandleIndex !== -1) {
      setSelectedAreaIndex(resizeHandleIndex);
      setIsResizing(true);
      setIsDragging(false);
      setStartPoint(mousePos);
      return;
    }
    
    // Check if clicking on an existing circle
    const clickedAreaIndex = areas.findIndex(area => {
      const distance = Math.sqrt(Math.pow(mousePos.x - area.x, 2) + Math.pow(mousePos.y - area.y, 2));
      return distance <= area.radius;
    });
    
    if (clickedAreaIndex !== -1) {
      setSelectedAreaIndex(clickedAreaIndex);
      setIsDragging(true);
      setIsResizing(false);
      setStartPoint(mousePos);
      return;
    }
    
    // Create a new circle
    const newArea: CircleArea = {
      id: Date.now().toString(),
      x: mousePos.x,
      y: mousePos.y,
      radius: 30,
      blurIntensity: 50
    };
    
    setAreas([...areas, newArea]);
    setSelectedAreaIndex(areas.length);
    setIsDragging(true);
    setIsResizing(false);
    setStartPoint(mousePos);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled || !image || selectedAreaIndex === null) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const mousePos = getMousePos(canvas, e);
    
    if (isDragging) {
      // Move the selected circle
      const dx = mousePos.x - startPoint.x;
      const dy = mousePos.y - startPoint.y;
      
      setAreas(areas.map((area, index) => {
        if (index === selectedAreaIndex) {
          return {
            ...area,
            x: area.x + dx,
            y: area.y + dy
          };
        }
        return area;
      }));
      
      setStartPoint(mousePos);
    } else if (isResizing) {
      // Resize the selected circle
      const selectedArea = areas[selectedAreaIndex];
      const newRadius = Math.max(10, Math.sqrt(
        Math.pow(mousePos.x - selectedArea.x, 2) + 
        Math.pow(mousePos.y - selectedArea.y, 2)
      ));
      
      setAreas(areas.map((area, index) => {
        if (index === selectedAreaIndex) {
          return {
            ...area,
            radius: newRadius
          };
        }
        return area;
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  const handleBlurIntensityChange = (intensity: number) => {
    if (selectedAreaIndex === null) return;
    
    setAreas(areas.map((area, index) => {
      if (index === selectedAreaIndex) {
        return {
          ...area,
          blurIntensity: intensity
        };
      }
      return area;
    }));
  };

  const handleDeleteArea = () => {
    if (selectedAreaIndex === null) return;
    
    const newAreas = [...areas];
    newAreas.splice(selectedAreaIndex, 1);
    setAreas(newAreas);
    setSelectedAreaIndex(null);
  };

  return (
    <div className="relative">
      <div className="mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
        <div className="text-blue-600 font-medium text-xs sm:text-sm">Draw circles to protect sensitive areas</div>
        <div className="text-gray-500 text-xs sm:text-sm">{areas.length} area{areas.length !== 1 ? 's' : ''} selected</div>
      </div>
      <canvas
        ref={canvasRef}
        width={containerWidth}
        height={containerHeight}
        className={`border border-gray-300 rounded ${disabled ? 'cursor-not-allowed' : 'cursor-crosshair'} shadow-inner`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      
      {selectedAreaIndex !== null && (
        <div className="absolute bottom-0 left-0 right-0 bg-gray-800 bg-opacity-90 text-white p-2 sm:p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-b gap-2 sm:gap-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:space-x-4">
            <div className="flex flex-wrap items-center gap-x-2">
              <label className="text-xs sm:text-sm font-medium">Intensity:</label>
              <input
                type="range"
                min="0"
                max="100"
                value={areas[selectedAreaIndex]?.blurIntensity || 50}
                onChange={(e) => handleBlurIntensityChange(parseInt(e.target.value))}
                className="w-24 sm:w-32"
              />
              <span className="text-xs sm:text-sm font-bold">{areas[selectedAreaIndex]?.blurIntensity}%</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-x-2">
              <label className="text-xs sm:text-sm font-medium">Size:</label>
              <input
                type="range"
                min="10"
                max="150"
                value={areas[selectedAreaIndex]?.radius || 30}
                onChange={(e) => {
                  const newRadius = parseInt(e.target.value);
                  setAreas(areas.map((area, index) => 
                    index === selectedAreaIndex ? { ...area, radius: newRadius } : area
                  ));
                }}
                className="w-32"
              />
              <span className="ml-2 text-sm font-bold">{Math.round(areas[selectedAreaIndex]?.radius || 0)}px</span>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button 
              onClick={handleDeleteArea}
              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded transition-colors">
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CircularAreaSelector;
