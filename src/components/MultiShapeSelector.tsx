import React, { useRef, useState, useEffect, useCallback } from 'react';

export type ShapeType = 'circle' | 'rectangle' | 'ellipse';

export interface BaseArea {
  id: string;
  x: number;
  y: number;
  blurIntensity: number; // 0-100
  shapeType: ShapeType;
}

export interface CircleArea extends BaseArea {
  shapeType: 'circle';
  radius: number;
}

export interface RectangleArea extends BaseArea {
  shapeType: 'rectangle';
  width: number;
  height: number;
}

export interface EllipseArea extends BaseArea {
  shapeType: 'ellipse';
  radiusX: number;
  radiusY: number;
}

export type Area = CircleArea | RectangleArea | EllipseArea;

interface MultiShapeSelectorProps {
  image: HTMLImageElement | null;
  areas: Area[];
  setAreas: (areas: Area[]) => void;
  disabled?: boolean;
  selectedShapeType: ShapeType;
  onChange?: (areas: Area[]) => void;
}

// Helper functions defined outside the component to avoid recreation
const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

const getPosition = (canvas: HTMLCanvasElement, clientX: number, clientY: number): { x: number; y: number } => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  const scrollX = typeof window !== 'undefined' ? (window.scrollX || document.documentElement.scrollLeft) : 0;
  const scrollY = typeof window !== 'undefined' ? (window.scrollY || document.documentElement.scrollTop) : 0;
  
  return {
    x: (clientX - rect.left - scrollX) * scaleX,
    y: (clientY - rect.top - scrollY) * scaleY
  };
};

const getEventPosition = (
  canvas: HTMLCanvasElement, 
  e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
) => {
  if ('touches' in e) {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      return getPosition(canvas, touch.clientX, touch.clientY);
    }
    return null;
  }
  return getPosition(canvas, e.clientX, e.clientY);
};

export const MultiShapeSelector: React.FC<MultiShapeSelectorProps> = ({
  image,
  areas,
  setAreas,
  disabled = false,
  selectedShapeType,
  onChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedAreaIndex, setSelectedAreaIndex] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 });
  const [lastTouchTime, setLastTouchTime] = useState(0);

  // Draw canvas whenever areas or image changes
  useEffect(() => {
    drawCanvas();
  }, [areas, image]);

  // Prevent default touch behaviors
  useEffect(() => {
    const preventDefault = (e: TouchEvent) => {
      if (e.target === canvasRef.current) {
        e.preventDefault();
      }
    };
    
    document.addEventListener('touchmove', preventDefault, { passive: false });
    return () => {
      document.removeEventListener('touchmove', preventDefault);
    };
  }, []);

  // Update canvas dimensions when image changes
  useEffect(() => {
    if (image && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = image.width;
      canvas.height = image.height;
      drawCanvas();
    }
  }, [image]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // Draw shapes
    areas.forEach((area, index) => {
      const isSelected = index === selectedAreaIndex;
      ctx.strokeStyle = isSelected ? '#2196F3' : '#ffffff';
      ctx.lineWidth = isSelected ? 3 : 2;
      
      switch (area.shapeType) {
        case 'circle':
          drawCircle(ctx, area as CircleArea, isSelected);
          break;
        case 'rectangle':
          drawRectangle(ctx, area as RectangleArea, isSelected);
          break;
        case 'ellipse':
          drawEllipse(ctx, area as EllipseArea, isSelected);
          break;
      }
    });
  }, [image, areas, selectedAreaIndex, canvasRef]);

  // Drawing functions for different shapes
  const drawCircle = (ctx: CanvasRenderingContext2D, area: CircleArea, isSelected: boolean) => {
    ctx.beginPath();
    ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
    ctx.stroke();

    if (isSelected) {
      drawResizeHandles(ctx, [
        { x: area.x + area.radius, y: area.y, cursor: 'e-resize', handle: 'right' },
        { x: area.x - area.radius, y: area.y, cursor: 'w-resize', handle: 'left' },
        { x: area.x, y: area.y - area.radius, cursor: 'n-resize', handle: 'top' },
        { x: area.x, y: area.y + area.radius, cursor: 's-resize', handle: 'bottom' },
        { x: area.x + area.radius * 0.7071, y: area.y - area.radius * 0.7071, cursor: 'ne-resize', handle: 'topRight' },
        { x: area.x - area.radius * 0.7071, y: area.y - area.radius * 0.7071, cursor: 'nw-resize', handle: 'topLeft' },
        { x: area.x + area.radius * 0.7071, y: area.y + area.radius * 0.7071, cursor: 'se-resize', handle: 'bottomRight' },
        { x: area.x - area.radius * 0.7071, y: area.y + area.radius * 0.7071, cursor: 'sw-resize', handle: 'bottomLeft' }
      ]);
      
      // Label with size
      drawSizeLabel(ctx, `${Math.round(area.radius)}px`, area.x, area.y);
      
      // Add blur intensity indicator
      drawBlurLabel(ctx, area.blurIntensity, area.x, area.y + (area.radius / 2));
    }
  };

  const drawRectangle = (ctx: CanvasRenderingContext2D, area: RectangleArea, isSelected: boolean) => {
    ctx.beginPath();
    ctx.rect(area.x - area.width/2, area.y - area.height/2, area.width, area.height);
    ctx.stroke();

    if (isSelected) {
      drawResizeHandles(ctx, [
        { x: area.x + area.width/2, y: area.y, cursor: 'e-resize', handle: 'right' },
        { x: area.x - area.width/2, y: area.y, cursor: 'w-resize', handle: 'left' },
        { x: area.x, y: area.y - area.height/2, cursor: 'n-resize', handle: 'top' },
        { x: area.x, y: area.y + area.height/2, cursor: 's-resize', handle: 'bottom' },
        { x: area.x + area.width/2, y: area.y - area.height/2, cursor: 'ne-resize', handle: 'topRight' },
        { x: area.x - area.width/2, y: area.y - area.height/2, cursor: 'nw-resize', handle: 'topLeft' },
        { x: area.x + area.width/2, y: area.y + area.height/2, cursor: 'se-resize', handle: 'bottomRight' },
        { x: area.x - area.width/2, y: area.y + area.height/2, cursor: 'sw-resize', handle: 'bottomLeft' }
      ]);
      
      // Label with size
      drawSizeLabel(ctx, `${Math.round(area.width)}×${Math.round(area.height)}`, area.x, area.y);
      
      // Add blur intensity indicator
      drawBlurLabel(ctx, area.blurIntensity, area.x, area.y + (area.height / 4));
    }
  };

  const drawEllipse = (ctx: CanvasRenderingContext2D, area: EllipseArea, isSelected: boolean) => {
    ctx.beginPath();
    ctx.ellipse(area.x, area.y, area.radiusX, area.radiusY, 0, 0, Math.PI * 2);
    ctx.stroke();

    if (isSelected) {
      drawResizeHandles(ctx, [
        { x: area.x + area.radiusX, y: area.y, cursor: 'e-resize', handle: 'right' },
        { x: area.x - area.radiusX, y: area.y, cursor: 'w-resize', handle: 'left' },
        { x: area.x, y: area.y - area.radiusY, cursor: 'n-resize', handle: 'top' },
        { x: area.x, y: area.y + area.radiusY, cursor: 's-resize', handle: 'bottom' },
        { x: area.x + area.radiusX * 0.7071, y: area.y - area.radiusY * 0.7071, cursor: 'ne-resize', handle: 'topRight' },
        { x: area.x - area.radiusX * 0.7071, y: area.y - area.radiusY * 0.7071, cursor: 'nw-resize', handle: 'topLeft' },
        { x: area.x + area.radiusX * 0.7071, y: area.y + area.radiusY * 0.7071, cursor: 'se-resize', handle: 'bottomRight' },
        { x: area.x - area.radiusX * 0.7071, y: area.y + area.radiusY * 0.7071, cursor: 'sw-resize', handle: 'bottomLeft' }
      ]);
      
      // Label with size
      drawSizeLabel(ctx, `${Math.round(area.radiusX)}×${Math.round(area.radiusY)}`, area.x, area.y);
      
      // Add blur intensity indicator
      drawBlurLabel(ctx, area.blurIntensity, area.x, area.y + (area.radiusY / 2));
    }
  };

  // Helper functions for drawing UI elements
  const drawResizeHandles = (ctx: CanvasRenderingContext2D, handlePositions: Array<{x: number, y: number, cursor: string, handle: string}>) => {
    handlePositions.forEach(pos => {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = isMobileDevice() ? 8 : 4;
      ctx.shadowOffsetX = isMobileDevice() ? 2 : 1;
      ctx.shadowOffsetY = isMobileDevice() ? 2 : 1;
      
      const handleSize = isMobileDevice() ? 10 : 6;
      
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, handleSize, 0, Math.PI * 2);
      ctx.fillStyle = '#2196F3';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  };

  const drawSizeLabel = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number) => {
    ctx.font = isMobileDevice() ? 'bold 16px Arial' : 'bold 12px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = isMobileDevice() ? 6 : 3;
    ctx.shadowOffsetX = isMobileDevice() ? 2 : 1;
    ctx.shadowOffsetY = isMobileDevice() ? 2 : 1;
    ctx.fillText(text, x, y);
  };

  const drawBlurLabel = (ctx: CanvasRenderingContext2D, intensity: number, x: number, y: number) => {
    ctx.font = isMobileDevice() ? 'bold 16px Arial' : 'bold 12px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = isMobileDevice() ? 6 : 3;
    ctx.shadowOffsetX = isMobileDevice() ? 2 : 1;
    ctx.shadowOffsetY = isMobileDevice() ? 2 : 1;
    ctx.fillText(`Blur: ${intensity}%`, x, y);
  };

  // Check if a point is inside a circle
  const isPointInCircle = useCallback((x: number, y: number, circle: CircleArea): boolean => {
    const dx = x - circle.x;
    const dy = y - circle.y;
    return dx * dx + dy * dy <= circle.radius * circle.radius;
  }, []);

  // Check if a point is inside a rectangle
  const isPointInRectangle = useCallback((x: number, y: number, rect: RectangleArea): boolean => {
    return x >= rect.x - rect.width / 2 && 
           x <= rect.x + rect.width / 2 && 
           y >= rect.y - rect.height / 2 && 
           y <= rect.y + rect.height / 2;
  }, []);

  // Check if a point is inside an ellipse
  const isPointInEllipse = useCallback((x: number, y: number, ellipse: EllipseArea): boolean => {
    const normalizedX = (x - ellipse.x) / ellipse.radiusX;
    const normalizedY = (y - ellipse.y) / ellipse.radiusY;
    return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
  }, []);

  // Check if a point is inside any shape
  const isPointInShape = useCallback((x: number, y: number, area: Area): boolean => {
    switch (area.shapeType) {
      case 'circle':
        return isPointInCircle(x, y, area as CircleArea);
      case 'rectangle':
        return isPointInRectangle(x, y, area as RectangleArea);
      case 'ellipse':
        return isPointInEllipse(x, y, area as EllipseArea);
      default:
        return false;
    }
  }, [isPointInCircle, isPointInRectangle, isPointInEllipse]);

  // Get the area at a specific position
  const getAreaAtPos = useCallback((x: number, y: number): number => {
    for (let i = areas.length - 1; i >= 0; i--) {
      if (isPointInShape(x, y, areas[i])) {
        return i;
      }
    }
    return -1;
  }, [areas, isPointInShape]);

// Check if a point is near a resize handle
const getResizeHandleAt = useCallback((x: number, y: number, area: Area): string | null => {
  if (selectedAreaIndex === null) return null;
  
  // Larger touch target on mobile
  const handleSize = isMobileDevice() ? 25 : 10;
  let handlePositions: Array<{x: number, y: number, handle: string}> = [];
  
  switch (area.shapeType) {
    case 'circle': {
      const circle = area as CircleArea;
      handlePositions = [
        { x: circle.x + circle.radius, y: circle.y, handle: 'right' },
        { x: circle.x - circle.radius, y: circle.y, handle: 'left' },
        { x: circle.x, y: circle.y - circle.radius, handle: 'top' },
        { x: circle.x, y: circle.y + circle.radius, handle: 'bottom' },
        { x: circle.x + circle.radius * 0.7071, y: circle.y - circle.radius * 0.7071, handle: 'topRight' },
        { x: circle.x - circle.radius * 0.7071, y: circle.y - circle.radius * 0.7071, handle: 'topLeft' },
        { x: circle.x + circle.radius * 0.7071, y: circle.y + circle.radius * 0.7071, handle: 'bottomRight' },
        { x: circle.x - circle.radius * 0.7071, y: circle.y + circle.radius * 0.7071, handle: 'bottomLeft' }
      ];
      break;
    }
    case 'rectangle': {
      const rect = area as RectangleArea;
      handlePositions = [
        { x: rect.x + rect.width/2, y: rect.y, handle: 'right' },
        { x: rect.x - rect.width/2, y: rect.y, handle: 'left' },
        { x: rect.x, y: rect.y - rect.height/2, handle: 'top' },
        { x: rect.x, y: rect.y + rect.height/2, handle: 'bottom' },
        { x: rect.x + rect.width/2, y: rect.y - rect.height/2, handle: 'topRight' },
        { x: rect.x - rect.width/2, y: rect.y - rect.height/2, handle: 'topLeft' },
        { x: rect.x + rect.width/2, y: rect.y + rect.height/2, handle: 'bottomRight' },
        { x: rect.x - rect.width/2, y: rect.y + rect.height/2, handle: 'bottomLeft' }
      ];
      break;
    }
    case 'ellipse': {
      const ellipse = area as EllipseArea;
      handlePositions = [
        { x: ellipse.x + ellipse.radiusX, y: ellipse.y, handle: 'right' },
        { x: ellipse.x - ellipse.radiusX, y: ellipse.y, handle: 'left' },
        { x: ellipse.x, y: ellipse.y - ellipse.radiusY, handle: 'top' },
        { x: ellipse.x, y: ellipse.y + ellipse.radiusY, handle: 'bottom' },
        { x: ellipse.x + ellipse.radiusX * 0.7071, y: ellipse.y - ellipse.radiusY * 0.7071, handle: 'topRight' },
        { x: ellipse.x - ellipse.radiusX * 0.7071, y: ellipse.y - ellipse.radiusY * 0.7071, handle: 'topLeft' },
        { x: ellipse.x + ellipse.radiusX * 0.7071, y: ellipse.y + ellipse.radiusY * 0.7071, handle: 'bottomRight' },
        { x: ellipse.x - ellipse.radiusX * 0.7071, y: ellipse.y + ellipse.radiusY * 0.7071, handle: 'bottomLeft' }
      ];
      break;
    }
  }
  
  for (const pos of handlePositions) {
    const dx = x - pos.x;
    const dy = y - pos.y;
    if (dx * dx + dy * dy <= handleSize * handleSize) {
      return pos.handle;
    }
  }
  
  return null;
}, [selectedAreaIndex]);

// Create a new shape based on the selected shape type
const createNewShape = useCallback((x: number, y: number): Area => {
  const id = Date.now().toString();
  const defaultBlurIntensity = 50;
  const minSize = isMobileDevice() ? 40 : 30;
  
  switch (selectedShapeType) {
    case 'circle':
      return {
        id,
        x,
        y,
        radius: minSize,
        blurIntensity: defaultBlurIntensity,
        shapeType: 'circle'
      } as CircleArea;
    case 'rectangle':
      return {
        id,
        x,
        y,
        width: minSize * 2,
        height: minSize,
        blurIntensity: defaultBlurIntensity,
        shapeType: 'rectangle'
      } as RectangleArea;
    case 'ellipse':
      return {
        id,
        x,
        y,
        radiusX: minSize * 1.5,
        radiusY: minSize,
        blurIntensity: defaultBlurIntensity,
        shapeType: 'ellipse'
      } as EllipseArea;
    default:
      throw new Error(`Unknown shape type: ${selectedShapeType}`);
  }
}, [selectedShapeType]);

// Mouse and touch event handlers
const handlePointerDown = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
  if (disabled || !canvasRef.current) return;
  
  const canvas = canvasRef.current;
  const pos = getEventPosition(canvas, e);
  if (!pos) return;
  
  // Prevent default for touch events to avoid scrolling
  if ('touches' in e) {
    e.preventDefault();
  }
  
  // Check if clicking on a resize handle
  const areaIndex = getAreaAtPos(pos.x, pos.y);
  if (areaIndex !== -1) {
    const handle = getResizeHandleAt(pos.x, pos.y, areas[areaIndex]);
    if (handle) {
      setIsResizing(true);
      setResizeHandle(handle);
      setSelectedAreaIndex(areaIndex);
      setTouchStartPos(pos);
      return;
    }
    
    // If not resizing but clicked on an area, select it
    setSelectedAreaIndex(areaIndex);
    setIsDragging(true);
    setTouchStartPos(pos);
    return;
  }
  
  // If not resizing or dragging, create a new area
  const newArea = createNewShape(pos.x, pos.y);
  setAreas([...areas, newArea]);
  setSelectedAreaIndex(areas.length);
  setIsDragging(true);
  setTouchStartPos(pos);
}, [areas, disabled, createNewShape, getAreaAtPos, getResizeHandleAt]);

const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
  if (disabled || !canvasRef.current) return;
  
  const canvas = canvasRef.current;
  const mousePos = getEventPosition(canvas, e);
  if (!mousePos) return;
  
  if (isResizing && selectedAreaIndex !== null && resizeHandle) {
    const updatedAreas = [...areas];
    const area = updatedAreas[selectedAreaIndex];
    
    switch (area.shapeType) {
      case 'circle': {
        const circle = area as CircleArea;
        const dx = mousePos.x - circle.x;
        const dy = mousePos.y - circle.y;
        
        // Calculate new radius based on resize handle
        let newRadius = circle.radius;
        if (resizeHandle.includes('right')) newRadius = Math.max(10, Math.abs(dx));
        else if (resizeHandle.includes('left')) newRadius = Math.max(10, Math.abs(dx));
        else if (resizeHandle.includes('top')) newRadius = Math.max(10, Math.abs(dy));
        else if (resizeHandle.includes('bottom')) newRadius = Math.max(10, Math.abs(dy));
        else {
          // For diagonal handles, use distance from center
          newRadius = Math.max(10, Math.sqrt(dx * dx + dy * dy));
        }
        
        circle.radius = newRadius;
        break;
      }
      case 'rectangle': {
        const rect = area as RectangleArea;
        
        // Handle corner resizing properly
        if (resizeHandle === 'topRight') {
          rect.width = Math.max(20, (mousePos.x - rect.x) * 2);
          rect.height = Math.max(20, (rect.y - mousePos.y) * 2);
        } else if (resizeHandle === 'topLeft') {
          rect.width = Math.max(20, (rect.x - mousePos.x) * 2);
          rect.height = Math.max(20, (rect.y - mousePos.y) * 2);
        } else if (resizeHandle === 'bottomRight') {
          rect.width = Math.max(20, (mousePos.x - rect.x) * 2);
          rect.height = Math.max(20, (mousePos.y - rect.y) * 2);
        } else if (resizeHandle === 'bottomLeft') {
          rect.width = Math.max(20, (rect.x - mousePos.x) * 2);
          rect.height = Math.max(20, (mousePos.y - rect.y) * 2);
        } else {
          // Handle single-direction resizing
          if (resizeHandle === 'right') {
            rect.width = Math.max(20, (mousePos.x - rect.x) * 2);
          } else if (resizeHandle === 'left') {
            rect.width = Math.max(20, (rect.x - mousePos.x) * 2);
          } else if (resizeHandle === 'top') {
            rect.height = Math.max(20, (rect.y - mousePos.y) * 2);
          } else if (resizeHandle === 'bottom') {
            rect.height = Math.max(20, (mousePos.y - rect.y) * 2);
          }
        }
        break;
      }
      case 'ellipse': {
        const ellipse = area as EllipseArea;
        
        // Handle corner resizing properly
        if (resizeHandle === 'topRight' || resizeHandle === 'bottomRight' || 
            resizeHandle === 'topLeft' || resizeHandle === 'bottomLeft') {
          // For corner handles, update both radiusX and radiusY
          ellipse.radiusX = Math.max(10, Math.abs(mousePos.x - ellipse.x));
          ellipse.radiusY = Math.max(10, Math.abs(mousePos.y - ellipse.y));
        } else {
          // Handle single-direction resizing
          if (resizeHandle === 'right' || resizeHandle === 'left') {
            ellipse.radiusX = Math.max(10, Math.abs(mousePos.x - ellipse.x));
          } else if (resizeHandle === 'top' || resizeHandle === 'bottom') {
            ellipse.radiusY = Math.max(10, Math.abs(mousePos.y - ellipse.y));
          }
        }
        break;
      }
    }
    
    setAreas(updatedAreas);
    drawCanvas();
  } else if (isDragging && selectedAreaIndex !== null) {
    const updatedAreas = [...areas];
    const dx = mousePos.x - touchStartPos.x;
    const dy = mousePos.y - touchStartPos.y;
    
    updatedAreas[selectedAreaIndex] = {
      ...updatedAreas[selectedAreaIndex],
      x: updatedAreas[selectedAreaIndex].x + dx,
      y: updatedAreas[selectedAreaIndex].y + dy
    };
    
    setAreas(updatedAreas);
    setTouchStartPos(mousePos);
    drawCanvas();
  }
}, [areas, disabled, drawCanvas, isDragging, isResizing, resizeHandle, selectedAreaIndex, touchStartPos]);

  
  
  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
    
    // Notify parent of changes
    if (onChange && areas.length > 0) {
      onChange(areas);
    }
  }, [areas, onChange]);

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled || !canvasRef.current || e.touches.length === 0) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const pos = getPosition(canvasRef.current, touch.clientX, touch.clientY);
    setTouchStartPos(pos);
    
    // Reset touch timer for potential double-tap
    const now = Date.now();
    if (now - lastTouchTime < 300) { // 300ms threshold for double-tap
      const areaIndex = getAreaAtPos(pos.x, pos.y);
      if (areaIndex !== -1) {
        const newAreas = [...areas];
        newAreas.splice(areaIndex, 1);
        setAreas(newAreas);
        setSelectedAreaIndex(null);
        if (onChange) {
          onChange(newAreas);
        }
        drawCanvas();
        return;
      }
    }
    setLastTouchTime(now);
    
    // Handle touch start for dragging/resizing
    handlePointerDown(e);
  }, [disabled, canvasRef, lastTouchTime, getAreaAtPos, areas, setAreas, drawCanvas, handlePointerDown, onChange, setSelectedAreaIndex, setTouchStartPos, setLastTouchTime]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled || !canvasRef.current || (!isDragging && !isResizing)) return;
    e.preventDefault();
    
    handleMouseMove(e);
  }, [disabled, canvasRef, isDragging, isResizing, handleMouseMove]);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled || !canvasRef.current) return;
    e.preventDefault();
    handlePointerUp();
  }, [disabled, canvasRef, handlePointerUp]);

  const handleTouchCancel = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled || !canvasRef.current) return;
    e.preventDefault();
    handlePointerUp();
  }, [disabled, canvasRef, handlePointerUp]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        touchAction: 'none',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handlePointerDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          touchAction: 'none',
          WebkitTapHighlightColor: 'transparent',
        }}
      />
    </div>
  );
};
