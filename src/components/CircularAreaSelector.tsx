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
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
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
      
      // Draw circle border with glow effect for selected areas
      if (isSelected) {
        // Draw outer glow
        ctx.beginPath();
        ctx.arc(area.x, area.y, area.radius + 2, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 191, 255, 0.5)';
        ctx.lineWidth = 4;
        ctx.stroke();
      }
      
      // Draw main circle border
      ctx.beginPath();
      ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
      ctx.strokeStyle = isSelected ? '#00BFFF' : '#FFFFFF';
      ctx.lineWidth = isSelected ? 2 : 1.5;
      ctx.stroke();
      
      // Add visual indicator of intensity with gradient
      const intensityRing = Math.max(10, area.radius - 10);
      ctx.beginPath();
      ctx.arc(area.x, area.y, intensityRing, 0, Math.PI * 2);
      
      // Create gradient for intensity indicator
      const gradient = ctx.createRadialGradient(
        area.x, area.y, intensityRing - 5,
        area.x, area.y, intensityRing
      );
      gradient.addColorStop(0, `rgba(255, 255, 255, 0)`);
      gradient.addColorStop(1, `rgba(255, 255, 255, ${area.blurIntensity/100})`);
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw resize handles for selected area
      if (isSelected) {
        // Draw multiple handles for better UX
        const handlePositions = [
          { x: area.x + area.radius, y: area.y }, // Right
          { x: area.x - area.radius, y: area.y }, // Left
          { x: area.x, y: area.y - area.radius }, // Top
          { x: area.x, y: area.y + area.radius }  // Bottom
        ];
        
        handlePositions.forEach(pos => {
          // Draw handle with shadow for depth
          ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 1;
          
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
          ctx.strokeStyle = '#00BFFF';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Reset shadow
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        });
        
        // Label with size
        ctx.font = 'bold 12px Arial';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Add text shadow for better visibility
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.fillText(`${Math.round(area.radius)}px`, area.x, area.y);
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
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

  // handleCanvasClick functionality is now integrated into handleMouseDown

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled || !image) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const mousePos = getMousePos(canvas, e);
    
    // Check if clicking on an existing circle's resize handle with improved hit detection
    const resizeHandleIndex = areas.findIndex(area => {
      // Check all resize handles (right, left, top, bottom)
      const rightHandleX = area.x + area.radius;
      const rightHandleY = area.y;
      const rightDistance = Math.sqrt(Math.pow(mousePos.x - rightHandleX, 2) + Math.pow(mousePos.y - rightHandleY, 2));
      
      const leftHandleX = area.x - area.radius;
      const leftHandleY = area.y;
      const leftDistance = Math.sqrt(Math.pow(mousePos.x - leftHandleX, 2) + Math.pow(mousePos.y - leftHandleY, 2));
      
      const topHandleX = area.x;
      const topHandleY = area.y - area.radius;
      const topDistance = Math.sqrt(Math.pow(mousePos.x - topHandleX, 2) + Math.pow(mousePos.y - topHandleY, 2));
      
      const bottomHandleX = area.x;
      const bottomHandleY = area.y + area.radius;
      const bottomDistance = Math.sqrt(Math.pow(mousePos.x - bottomHandleX, 2) + Math.pow(mousePos.y - bottomHandleY, 2));
      
      // Check if any handle is clicked (increased hit area to 8px for better UX)
      return Math.min(rightDistance, leftDistance, topDistance, bottomDistance) <= 8;
    });
    
    if (resizeHandleIndex !== -1) {
      setSelectedAreaIndex(resizeHandleIndex);
      setIsResizing(true);
      setIsDragging(false);
      setStartPoint(mousePos);
      return;
    }
    
    // Check if clicking on an existing circle with improved hit detection
    const clickedAreaIndex = areas.findIndex(area => {
      const distance = Math.sqrt(Math.pow(mousePos.x - area.x, 2) + Math.pow(mousePos.y - area.y, 2));
      // Add a small buffer (3px) to make selection easier
      return distance <= (area.radius + 3);
    });
    
    if (clickedAreaIndex !== -1) {
      setSelectedAreaIndex(clickedAreaIndex);
      setIsDragging(true);
      setIsResizing(false);
      setStartPoint(mousePos);
      return;
    }
    
    // Create a new area when clicking on empty space
    const newArea: CircleArea = {
      id: Date.now().toString(),
      x: mousePos.x,
      y: mousePos.y,
      radius: 30,
      blurIntensity: 50
    };
    
    // Add the new area and set it as selected
    const updatedAreas = [...areas, newArea];
    setAreas(updatedAreas);
    setSelectedAreaIndex(updatedAreas.length - 1);
    
    // Set up for potential dragging
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
      // Move the selected circle with boundary constraints
      const dx = mousePos.x - startPoint.x;
      const dy = mousePos.y - startPoint.y;
      
      setAreas(areas.map((area, index) => {
        if (index === selectedAreaIndex) {
          // Calculate new position
          const newX = area.x + dx;
          const newY = area.y + dy;
          
          // Apply boundary constraints to keep circle within canvas
          const constrainedX = Math.max(area.radius, Math.min(canvas.width - area.radius, newX));
          const constrainedY = Math.max(area.radius, Math.min(canvas.height - area.radius, newY));
          
          return {
            ...area,
            x: constrainedX,
            y: constrainedY
          };
        }
        return area;
      }));
      
      setStartPoint(mousePos);
    } else if (isResizing) {
      // Resize the selected circle with smooth constraints
      const selectedArea = areas[selectedAreaIndex];
      
      // Calculate distance from center to mouse position
      const dx = mousePos.x - selectedArea.x;
      const dy = mousePos.y - selectedArea.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Apply minimum and maximum constraints with smooth clamping
      const minRadius = 10; // Minimum radius
      const maxRadius = Math.min(canvas.width, canvas.height) / 2; // Maximum radius (half of the smaller dimension)
      
      // Apply smooth easing for better UX when approaching min/max
      let newRadius = distance;
      
      // Apply minimum constraint with smooth transition
      if (distance < minRadius + 5) {
        const t = (distance - minRadius) / 5; // Transition factor (0 to 1)
        newRadius = minRadius + (distance - minRadius) * Math.max(0, t);
      }
      
      // Apply maximum constraint with smooth transition
      if (distance > maxRadius - 10) {
        const t = (maxRadius - distance) / 10; // Transition factor (0 to 1)
        newRadius = maxRadius - (maxRadius - distance) * Math.max(0, t);
      }
      
      // Ensure radius stays within absolute bounds
      newRadius = Math.max(minRadius, Math.min(maxRadius, newRadius));
      
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
