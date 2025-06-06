import React, { useRef, useState, useEffect } from "react";

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
}

// Helper function to detect mobile devices
const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

// Helper function to get mouse position relative to canvas
const getMousePos = (canvas: HTMLCanvasElement, evt: React.MouseEvent<HTMLCanvasElement> | Touch): { x: number; y: number } => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  let clientX: number;
  let clientY: number;
  
  // Check if it's a React.MouseEvent or a Touch
  if ('nativeEvent' in evt) {
    clientX = evt.nativeEvent.clientX;
    clientY = evt.nativeEvent.clientY;
  } else {
    clientX = evt.clientX;
    clientY = evt.clientY;
  }
  
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
};

export const MultiShapeSelector: React.FC<MultiShapeSelectorProps> = ({
  image,
  areas,
  setAreas,
  disabled = false,
  selectedShapeType,
}): JSX.Element => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedAreaIndex, setSelectedAreaIndex] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);

  // Draw canvas whenever areas or image changes
  useEffect(() => {
    drawCanvas();
  }, [areas, image]);

  // Update canvas dimensions when image changes
  useEffect(() => {
    if (image && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = image.width;
      canvas.height = image.height;
      drawCanvas();
    }
  }, [image]);

  const drawCanvas = () => {
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
  };

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
  const isPointInCircle = (x: number, y: number, circle: CircleArea): boolean => {
    const dx = x - circle.x;
    const dy = y - circle.y;
    return dx * dx + dy * dy <= circle.radius * circle.radius;
  };

  // Check if a point is inside a rectangle
  const isPointInRectangle = (x: number, y: number, rect: RectangleArea): boolean => {
    return (
      x >= rect.x - rect.width / 2 &&
      x <= rect.x + rect.width / 2 &&
      y >= rect.y - rect.height / 2 &&
      y <= rect.y + rect.height / 2
    );
  };

  // Check if a point is inside an ellipse
  const isPointInEllipse = (x: number, y: number, ellipse: EllipseArea): boolean => {
    const normalizedX = (x - ellipse.x) / ellipse.radiusX;
    const normalizedY = (y - ellipse.y) / ellipse.radiusY;
    return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
  };

  // Check if a point is inside any shape
  const isPointInShape = (x: number, y: number, area: Area): boolean => {
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
  };

  // Check if a point is near a resize handle
  const getResizeHandleAt = (x: number, y: number, area: Area): string | null => {
    if (selectedAreaIndex === null) return null;
    
    const handleSize = isMobileDevice() ? 15 : 10; // Larger touch target
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
  };

  // Create a new shape based on the selected shape type
  const createNewShape = (x: number, y: number): Area => {
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
        };
      case 'rectangle':
        return {
          id,
          x,
          y,
          width: minSize * 2,
          height: minSize,
          blurIntensity: defaultBlurIntensity,
          shapeType: 'rectangle'
        };
      case 'ellipse':
        return {
          id,
          x,
          y,
          radiusX: minSize * 1.5,
          radiusY: minSize,
          blurIntensity: defaultBlurIntensity,
          shapeType: 'ellipse'
        };
      default:
        return {
          id,
          x,
          y,
          radius: minSize,
          blurIntensity: defaultBlurIntensity,
          shapeType: 'circle'
        };
    }
  };

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const mousePos = getMousePos(canvas, e);
    
    // Check if clicking on a resize handle
    if (selectedAreaIndex !== null) {
      const handle = getResizeHandleAt(mousePos.x, mousePos.y, areas[selectedAreaIndex]);
      if (handle) {
        setIsResizing(true);
        setResizeHandle(handle);
        return;
      }
    }
    
    // Check if clicking on an existing shape
    for (let i = areas.length - 1; i >= 0; i--) {
      if (isPointInShape(mousePos.x, mousePos.y, areas[i])) {
        setSelectedAreaIndex(i);
        setIsDragging(true);
        return;
      }
    }
    
    // Create a new shape
    const newShape = createNewShape(mousePos.x, mousePos.y);
    setAreas([...areas, newShape]);
    setSelectedAreaIndex(areas.length);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const mousePos = getMousePos(canvas, e);
    
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
    } else if (isDragging && selectedAreaIndex !== null) {
      const updatedAreas = [...areas];
      updatedAreas[selectedAreaIndex] = {
        ...updatedAreas[selectedAreaIndex],
        x: mousePos.x,
        y: mousePos.y
      };
      setAreas(updatedAreas);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  };

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled || !canvasRef.current || e.touches.length === 0) return;
    
    const canvas = canvasRef.current;
    const touch = e.touches[0];
    // Create a position object directly instead of using getMousePos
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const touchPos = {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY
    };
    
    // Check if touching a resize handle
    if (selectedAreaIndex !== null) {
      const handle = getResizeHandleAt(touchPos.x, touchPos.y, areas[selectedAreaIndex]);
      if (handle) {
        e.preventDefault(); // Prevent scrolling when resizing
        setIsResizing(true);
        setResizeHandle(handle);
        return;
      }
    }
    
    // Check if touching an existing shape
    for (let i = areas.length - 1; i >= 0; i--) {
      if (isPointInShape(touchPos.x, touchPos.y, areas[i])) {
        e.preventDefault(); // Prevent scrolling when dragging
        setSelectedAreaIndex(i);
        setIsDragging(true);
        return;
      }
    }
    
    // Create a new shape
    e.preventDefault(); // Prevent scrolling when creating a new shape
    const newShape = createNewShape(touchPos.x, touchPos.y);
    setAreas([...areas, newShape]);
    setSelectedAreaIndex(areas.length);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled || !canvasRef.current || e.touches.length === 0) return;
    
    // Only prevent default if we're actively resizing or dragging to avoid interfering with normal scrolling
    if (isResizing || isDragging) {
      e.preventDefault(); // Prevent scrolling
    }
    
    const canvas = canvasRef.current;
    const touch = e.touches[0];
    // Create a position object directly instead of using getMousePos
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const touchPos = {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY
    };
    
    // Handle the same way as mouse move
    if (isResizing && selectedAreaIndex !== null && resizeHandle) {
      const updatedAreas = [...areas];
      const area = updatedAreas[selectedAreaIndex];
      
      switch (area.shapeType) {
        case 'circle': {
          const circle = area as CircleArea;
          const dx = touchPos.x - circle.x;
          const dy = touchPos.y - circle.y;
          
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
            rect.width = Math.max(20, (touchPos.x - rect.x) * 2);
            rect.height = Math.max(20, (rect.y - touchPos.y) * 2);
          } else if (resizeHandle === 'topLeft') {
            rect.width = Math.max(20, (rect.x - touchPos.x) * 2);
            rect.height = Math.max(20, (rect.y - touchPos.y) * 2);
          } else if (resizeHandle === 'bottomRight') {
            rect.width = Math.max(20, (touchPos.x - rect.x) * 2);
            rect.height = Math.max(20, (touchPos.y - rect.y) * 2);
          } else if (resizeHandle === 'bottomLeft') {
            rect.width = Math.max(20, (rect.x - touchPos.x) * 2);
            rect.height = Math.max(20, (touchPos.y - rect.y) * 2);
          } else {
            // Handle single-direction resizing
            if (resizeHandle === 'right') {
              rect.width = Math.max(20, (touchPos.x - rect.x) * 2);
            } else if (resizeHandle === 'left') {
              rect.width = Math.max(20, (rect.x - touchPos.x) * 2);
            } else if (resizeHandle === 'top') {
              rect.height = Math.max(20, (rect.y - touchPos.y) * 2);
            } else if (resizeHandle === 'bottom') {
              rect.height = Math.max(20, (touchPos.y - rect.y) * 2);
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
            ellipse.radiusX = Math.max(10, Math.abs(touchPos.x - ellipse.x));
            ellipse.radiusY = Math.max(10, Math.abs(touchPos.y - ellipse.y));
          } else {
            // Handle single-direction resizing
            if (resizeHandle === 'right' || resizeHandle === 'left') {
              ellipse.radiusX = Math.max(10, Math.abs(touchPos.x - ellipse.x));
            } else if (resizeHandle === 'top' || resizeHandle === 'bottom') {
              ellipse.radiusY = Math.max(10, Math.abs(touchPos.y - ellipse.y));
            }
          }
          break;
        }
      }
      
      setAreas(updatedAreas);
    } else if (isDragging && selectedAreaIndex !== null) {
      const updatedAreas = [...areas];
      updatedAreas[selectedAreaIndex] = {
        ...updatedAreas[selectedAreaIndex],
        x: touchPos.x,
        y: touchPos.y
      };
      setAreas(updatedAreas);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
  };

  // Render the component
  return (
    <div className="shape-area-selector-container" style={{ position: 'relative', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          cursor: disabled ? 'default' : 'crosshair',
          maxWidth: '100%',
          height: 'auto',
          display: 'block'
        }}
      />
    </div>
  );
};
