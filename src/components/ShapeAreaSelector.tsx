import React, { useRef, useState, useEffect } from 'react';

// Define shape types
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

interface ShapeAreaSelectorProps {
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

export const ShapeAreaSelector: React.FC<ShapeAreaSelectorProps> = ({
  image,
  areas,
  setAreas,
  disabled = false,
  selectedShapeType,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedAreaIndex, setSelectedAreaIndex] = useState<number | null>(
    null
  );
  const [isResizing, setIsResizing] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });

  // Draw canvas whenever areas or image changes
  useEffect(() => {
    drawCanvas();
  }, [areas, image]);

  // Update canvas dimensions when image changes
  useEffect(() => {
    if (image && canvasRef.current) {
      // Set canvas dimensions based on image
      const canvas = canvasRef.current;
      canvas.width = image.width;
      canvas.height = image.height;

      // Force redraw
      drawCanvas();
    }
  }, [image]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image if available
    if (image) {
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      // Add semi-transparent overlay to indicate selection mode
      ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw all areas
    areas.forEach((area, index) => {
      const isSelected = index === selectedAreaIndex;
      
      // Draw shape based on type
      ctx.beginPath();
      if (area.shapeType === 'circle') {
        const circleArea = area as CircleArea;
        ctx.arc(circleArea.x, circleArea.y, circleArea.radius, 0, Math.PI * 2);
      } else if (area.shapeType === 'rectangle') {
        const rectArea = area as RectangleArea;
        ctx.rect(rectArea.x - rectArea.width/2, rectArea.y - rectArea.height/2, rectArea.width, rectArea.height);
      } else if (area.shapeType === 'ellipse') {
        const ellipseArea = area as EllipseArea;
        ctx.ellipse(ellipseArea.x, ellipseArea.y, ellipseArea.radiusX, ellipseArea.radiusY, 0, 0, Math.PI * 2);
      }
      
      // Clear the area to show original image
      ctx.save();
      ctx.clip();
      if (image) {
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      }
      ctx.restore();

      // Draw border with glow effect for selected areas
      if (isSelected) {
        // Draw outer glow based on shape type
        ctx.beginPath();
        if (area.shapeType === 'circle') {
          const circleArea = area as CircleArea;
          ctx.arc(circleArea.x, circleArea.y, circleArea.radius + 2, 0, Math.PI * 2);
        } else if (area.shapeType === 'rectangle') {
          const rectArea = area as RectangleArea;
          ctx.rect(rectArea.x - rectArea.width/2 - 2, rectArea.y - rectArea.height/2 - 2, 
                   rectArea.width + 4, rectArea.height + 4);
        } else if (area.shapeType === 'ellipse') {
          const ellipseArea = area as EllipseArea;
          ctx.ellipse(ellipseArea.x, ellipseArea.y, ellipseArea.radiusX + 2, ellipseArea.radiusY + 2, 0, 0, Math.PI * 2);
        }
        ctx.strokeStyle = "rgba(0, 191, 255, 0.5)";
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      // Draw main shape border
      ctx.beginPath();
      if (area.shapeType === 'circle') {
        const circleArea = area as CircleArea;
        ctx.arc(circleArea.x, circleArea.y, circleArea.radius, 0, Math.PI * 2);
      } else if (area.shapeType === 'rectangle') {
        const rectArea = area as RectangleArea;
        ctx.rect(rectArea.x - rectArea.width/2, rectArea.y - rectArea.height/2, rectArea.width, rectArea.height);
      } else if (area.shapeType === 'ellipse') {
        const ellipseArea = area as EllipseArea;
        ctx.ellipse(ellipseArea.x, ellipseArea.y, ellipseArea.radiusX, ellipseArea.radiusY, 0, 0, Math.PI * 2);
      }
      ctx.strokeStyle = isSelected ? "#00BFFF" : "#FFFFFF";
      ctx.lineWidth = isSelected ? 2 : 1.5;
      ctx.stroke();

      // Add visual indicator of intensity with gradient
      let intensityRing = 10;
      if (area.shapeType === 'circle') {
        const circleArea = area as CircleArea;
        intensityRing = Math.max(10, circleArea.radius - 10);
      } else if (area.shapeType === 'rectangle') {
        const rectArea = area as RectangleArea;
        intensityRing = Math.max(10, Math.min(rectArea.width, rectArea.height) / 2 - 10);
      } else if (area.shapeType === 'ellipse') {
        const ellipseArea = area as EllipseArea;
        intensityRing = Math.max(10, Math.min(ellipseArea.radiusX, ellipseArea.radiusY) - 10);
      }
      
      ctx.beginPath();
      ctx.arc(area.x, area.y, intensityRing, 0, Math.PI * 2);

      // Create gradient for intensity indicator
      const gradient = ctx.createRadialGradient(
        area.x,
        area.y,
        intensityRing - 5,
        area.x,
        area.y,
        intensityRing
      );
      gradient.addColorStop(0, `rgba(255, 255, 255, 0)`);
      gradient.addColorStop(
        1,
        `rgba(255, 255, 255, ${area.blurIntensity / 100})`
      );

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw resize handles for selected area
      if (isSelected) {
        // Draw multiple handles for better UX based on shape type
        let handlePositions: Array<{x: number, y: number}> = [];
        
        if (area.shapeType === 'circle') {
          const circleArea = area as CircleArea;
          handlePositions = [
            { x: circleArea.x + circleArea.radius, y: circleArea.y }, // Right
            { x: circleArea.x - circleArea.radius, y: circleArea.y }, // Left
            { x: circleArea.x, y: circleArea.y - circleArea.radius }, // Top
            { x: circleArea.x, y: circleArea.y + circleArea.radius }, // Bottom
          ];
          
          // Add diagonal handles for mobile devices
          if (isMobileDevice()) {
            const diagonalDist = circleArea.radius * 0.7071; // cos(45°) = sin(45°) = 0.7071
            handlePositions.push(
              { x: circleArea.x + diagonalDist, y: circleArea.y - diagonalDist }, // Top-right
              { x: circleArea.x - diagonalDist, y: circleArea.y - diagonalDist }, // Top-left
              { x: circleArea.x + diagonalDist, y: circleArea.y + diagonalDist }, // Bottom-right
              { x: circleArea.x - diagonalDist, y: circleArea.y + diagonalDist } // Bottom-left
            );
          }
        } else if (area.shapeType === 'rectangle') {
          const rectArea = area as RectangleArea;
          const halfWidth = rectArea.width / 2;
          const halfHeight = rectArea.height / 2;
          
          handlePositions = [
            { x: rectArea.x + halfWidth, y: rectArea.y }, // Right
            { x: rectArea.x - halfWidth, y: rectArea.y }, // Left
            { x: rectArea.x, y: rectArea.y - halfHeight }, // Top
            { x: rectArea.x, y: rectArea.y + halfHeight }, // Bottom
            { x: rectArea.x + halfWidth, y: rectArea.y - halfHeight }, // Top-right
            { x: rectArea.x - halfWidth, y: rectArea.y - halfHeight }, // Top-left
            { x: rectArea.x + halfWidth, y: rectArea.y + halfHeight }, // Bottom-right
            { x: rectArea.x - halfWidth, y: rectArea.y + halfHeight } // Bottom-left
          ];
        } else if (area.shapeType === 'ellipse') {
          const ellipseArea = area as EllipseArea;
          handlePositions = [
            { x: ellipseArea.x + ellipseArea.radiusX, y: ellipseArea.y }, // Right
            { x: ellipseArea.x - ellipseArea.radiusX, y: ellipseArea.y }, // Left
            { x: ellipseArea.x, y: ellipseArea.y - ellipseArea.radiusY }, // Top
            { x: ellipseArea.x, y: ellipseArea.y + ellipseArea.radiusY }, // Bottom
          ];
          
          // Add diagonal handles
          const diagonalX = ellipseArea.radiusX * 0.7071;
          const diagonalY = ellipseArea.radiusY * 0.7071;
          handlePositions.push(
            { x: ellipseArea.x + diagonalX, y: ellipseArea.y - diagonalY }, // Top-right
            { x: ellipseArea.x - diagonalX, y: ellipseArea.y - diagonalY }, // Top-left
            { x: ellipseArea.x + diagonalX, y: ellipseArea.y + diagonalY }, // Bottom-right
            { x: ellipseArea.x - diagonalX, y: ellipseArea.y + diagonalY } // Bottom-left
          );
        }

        handlePositions.forEach((pos) => {
          // Draw handle with shadow for depth - enhanced for mobile
          ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
          ctx.shadowBlur = isMobileDevice() ? 8 : 4;
          ctx.shadowOffsetX = isMobileDevice() ? 2 : 1;
          ctx.shadowOffsetY = isMobileDevice() ? 2 : 1;

          // Larger handles for mobile
          const handleSize = isMobileDevice() ? 10 : 6;

          ctx.beginPath();
          ctx.arc(pos.x, pos.y, handleSize, 0, Math.PI * 2);
          ctx.fillStyle = "#FFFFFF";
          ctx.fill();
          ctx.strokeStyle = "#00BFFF";
          ctx.lineWidth = isMobileDevice() ? 3 : 2;
          ctx.stroke();

          // Reset shadow
          ctx.shadowColor = "transparent";
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        });

        // Label with size - larger font on mobile
        ctx.font = isMobileDevice() ? "bold 16px Arial" : "bold 12px Arial";
        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Add text shadow for better visibility - stronger on mobile
        ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
        ctx.shadowBlur = isMobileDevice() ? 6 : 3;
        ctx.shadowOffsetX = isMobileDevice() ? 2 : 1;
        ctx.shadowOffsetY = isMobileDevice() ? 2 : 1;
        ctx.fillText(`${Math.round((area as CircleArea).radius)}px`, area.x, area.y);

        // Add blur intensity indicator
        const intensityText = `${(area as CircleArea).blurIntensity}%`;
        ctx.font = isMobileDevice() ? "12px Arial" : "10px Arial";
        ctx.fillText(
          intensityText,
          area.x,
          area.y + (isMobileDevice() ? 18 : 15)
        );

        // Reset shadow
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }
    });
  };

  const getMousePos = (canvas: HTMLCanvasElement, evt: React.MouseEvent) => {
    const rect = canvas.getBoundingClientRect();

    // Calculate scaling factor between canvas display size and actual size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (evt.clientX - rect.left) * scaleX,
      y: (evt.clientY - rect.top) * scaleY,
    };
  };

  // handleCanvasClick functionality is now integrated into handleMouseDown

  // Helper function to get touch position with scaling factor for responsive canvas
  const getTouchPos = (canvas: HTMLCanvasElement, evt: React.TouchEvent) => {
    const rect = canvas.getBoundingClientRect();
    const touch = evt.touches[0];

    // Calculate scaling factor between canvas display size and actual size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled || !image) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const mousePos = getMousePos(canvas, e);
    setStartPoint(mousePos);

    // Check if clicking on an existing area
    const clickedAreaIndex = areas.findIndex((area) => {
      if (area.shapeType === 'circle') {
        const circleArea = area as CircleArea;
        const dx = mousePos.x - circleArea.x;
        const dy = mousePos.y - circleArea.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= circleArea.radius;
      } else if (area.shapeType === 'rectangle') {
        const rectArea = area as RectangleArea;
        const halfWidth = rectArea.width / 2;
        const halfHeight = rectArea.height / 2;
        return (
          mousePos.x >= rectArea.x - halfWidth &&
          mousePos.x <= rectArea.x + halfWidth &&
          mousePos.y >= rectArea.y - halfHeight &&
          mousePos.y <= rectArea.y + halfHeight
        );
      } else if (area.shapeType === 'ellipse') {
        const ellipseArea = area as EllipseArea;
        // Normalize coordinates to check if point is inside ellipse
        const normalizedX = (mousePos.x - ellipseArea.x) / ellipseArea.radiusX;
        const normalizedY = (mousePos.y - ellipseArea.y) / ellipseArea.radiusY;
        return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
      }
      return false;
    });

    if (clickedAreaIndex !== -1) {
      // Check if clicking on a resize handle
      const clickedArea = areas[clickedAreaIndex];
      
      if (clickedArea.shapeType === 'circle') {
        const circleArea = clickedArea as CircleArea;
        // Check if clicking on any of the diagonal resize handles
        const handlePositions = [
          { x: circleArea.x + circleArea.radius * Math.cos(Math.PI / 4), y: circleArea.y + circleArea.radius * Math.sin(Math.PI / 4) },
          { x: circleArea.x + circleArea.radius * Math.cos(Math.PI * 3/4), y: circleArea.y + circleArea.radius * Math.sin(Math.PI * 3/4) },
          { x: circleArea.x + circleArea.radius * Math.cos(Math.PI * 5/4), y: circleArea.y + circleArea.radius * Math.sin(Math.PI * 5/4) },
          { x: circleArea.x + circleArea.radius * Math.cos(Math.PI * 7/4), y: circleArea.y + circleArea.radius * Math.sin(Math.PI * 7/4) }
        ];

        const isOnHandle = handlePositions.some(pos => {
          const dx = mousePos.x - pos.x;
          const dy = mousePos.y - pos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          return distance <= (isMobileDevice() ? 12 : 8); // Larger hit area for mobile
        });

        if (isOnHandle) {
          setIsResizing(true);
          setSelectedAreaIndex(clickedAreaIndex);
          return;
        }
      } else if (clickedArea.shapeType === 'rectangle') {
        const rectArea = clickedArea as RectangleArea;
        // Check if clicking on any of the corner resize handles
        const halfWidth = rectArea.width / 2;
        const halfHeight = rectArea.height / 2;
        const handlePositions = [
          { x: rectArea.x - halfWidth, y: rectArea.y - halfHeight }, // Top-left
          { x: rectArea.x + halfWidth, y: rectArea.y - halfHeight }, // Top-right
          { x: rectArea.x + halfWidth, y: rectArea.y + halfHeight }, // Bottom-right
          { x: rectArea.x - halfWidth, y: rectArea.y + halfHeight }  // Bottom-left
        ];

        const isOnHandle = handlePositions.some(pos => {
          const dx = mousePos.x - pos.x;
          const dy = mousePos.y - pos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          return distance <= (isMobileDevice() ? 12 : 8); // Larger hit area for mobile
        });

        if (isOnHandle) {
          setIsResizing(true);
          setSelectedAreaIndex(clickedAreaIndex);
          return;
        }
      } else if (clickedArea.shapeType === 'ellipse') {
        const ellipseArea = clickedArea as EllipseArea;
        // Check if clicking on any of the axis endpoint handles
        const handlePositions = [
          { x: ellipseArea.x + ellipseArea.radiusX, y: ellipseArea.y }, // Right
          { x: ellipseArea.x, y: ellipseArea.y - ellipseArea.radiusY }, // Top
          { x: ellipseArea.x - ellipseArea.radiusX, y: ellipseArea.y }, // Left
          { x: ellipseArea.x, y: ellipseArea.y + ellipseArea.radiusY }  // Bottom
        ];

        const isOnHandle = handlePositions.some(pos => {
          const dx = mousePos.x - pos.x;
          const dy = mousePos.y - pos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          return distance <= (isMobileDevice() ? 12 : 8); // Larger hit area for mobile
        });

        if (isOnHandle) {
          setIsResizing(true);
          setSelectedAreaIndex(clickedAreaIndex);
          return;
        }
      }

      // If not on a resize handle, start dragging the area
      setIsDragging(true);
      setSelectedAreaIndex(clickedAreaIndex);
    } else {
      // Create a new area at the clicked position
      const newAreaIndex = createNewArea(mousePos);
      setSelectedAreaIndex(newAreaIndex);
      setIsDragging(true); // Allow immediate dragging of the new area
    }
  };

  const createNewArea = (mousePos: { x: number; y: number }) => {
    let newArea: Area;
    
    if (selectedShapeType === 'circle') {
      newArea = {
        id: Date.now().toString(),
        x: mousePos.x,
        y: mousePos.y,
        radius: isMobileDevice() ? 40 : 30,
        blurIntensity: 50,
        shapeType: 'circle'
      } as CircleArea;
    } else if (selectedShapeType === 'rectangle') {
      newArea = {
        id: Date.now().toString(),
        x: mousePos.x,
        y: mousePos.y,
        width: isMobileDevice() ? 80 : 60,
        height: isMobileDevice() ? 80 : 60,
        blurIntensity: 50,
        shapeType: 'rectangle'
      } as RectangleArea;
    } else { // ellipse
      newArea = {
        id: Date.now().toString(),
        x: mousePos.x,
        y: mousePos.y,
        radiusX: isMobileDevice() ? 50 : 40,
        radiusY: isMobileDevice() ? 30 : 20,
        blurIntensity: 50,
        shapeType: 'ellipse'
      } as EllipseArea;
    }
    
    setAreas([...areas, newArea]);
    return areas.length; // Return the index of the new area
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled || !image || selectedAreaIndex === null) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const mousePos = getMousePos(canvas, e);

    if (isDragging) {
      // Move the selected shape with boundary constraints
      const dx = mousePos.x - startPoint.x;
      const dy = mousePos.y - startPoint.y;

      setAreas(
        areas.map((area, index) => {
          if (index === selectedAreaIndex) {
            // Calculate new position
            const newX = area.x + dx;
            const newY = area.y + dy;
            
            // Apply boundary constraints based on shape type
            let constrainedX = newX;
            let constrainedY = newY;
            
            if (area.shapeType === 'circle') {
              const circleArea = area as CircleArea;
              constrainedX = Math.max(
                circleArea.radius,
                Math.min(canvas.width - circleArea.radius, newX)
              );
              constrainedY = Math.max(
                circleArea.radius,
                Math.min(canvas.height - circleArea.radius, newY)
              );
            } else if (area.shapeType === 'rectangle') {
              const rectArea = area as RectangleArea;
              const halfWidth = rectArea.width / 2;
              const halfHeight = rectArea.height / 2;
              constrainedX = Math.max(
                halfWidth,
                Math.min(canvas.width - halfWidth, newX)
              );
              constrainedY = Math.max(
                halfHeight,
                Math.min(canvas.height - halfHeight, newY)
              );
            } else if (area.shapeType === 'ellipse') {
              const ellipseArea = area as EllipseArea;
              constrainedX = Math.max(
                ellipseArea.radiusX,
                Math.min(canvas.width - ellipseArea.radiusX, newX)
              );
              constrainedY = Math.max(
                ellipseArea.radiusY,
                Math.min(canvas.height - ellipseArea.radiusY, newY)
              );
            }

            return {
              ...area,
              x: constrainedX,
              y: constrainedY,
            };
          }
          return area;
        })
      );

      setStartPoint(mousePos);
    } else if (isResizing) {
      // Resize the selected shape with smooth constraints
      const selectedArea = areas[selectedAreaIndex];

      // Calculate distance from center to mouse position
      const dx = mousePos.x - selectedArea.x;
      const dy = mousePos.y - selectedArea.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Apply minimum and maximum constraints with smooth clamping
      const minSize = isMobileDevice() ? 20 : 10; // Larger minimum size for mobile
      const maxSize = Math.min(canvas.width, canvas.height) / 2; // Maximum size (half of the smaller dimension)
      
      if (selectedArea.shapeType === 'circle') {
        // Apply smooth easing for better UX when approaching min/max
        let newRadius = distance;

        // Apply minimum constraint with smooth transition
        if (distance < minSize + 5) {
          const t = (distance - minSize) / 5; // Transition factor (0 to 1)
          newRadius = minSize + (distance - minSize) * Math.max(0, t);
        }

        // Apply maximum constraint with smooth transition
        if (distance > maxSize - 10) {
          const t = (maxSize - distance) / 10; // Transition factor (0 to 1)
          newRadius = maxSize - (maxSize - distance) * Math.max(0, t);
        }

        // Ensure radius stays within absolute bounds
        newRadius = Math.max(minSize, Math.min(maxSize, newRadius));

        setAreas(
          areas.map((area, index) => {
            if (index === selectedAreaIndex) {
              return {
                ...area,
                radius: newRadius,
              } as CircleArea;
            }
            return area;
          })
        );
      } else if (selectedArea.shapeType === 'rectangle') {
        // For rectangle, use distance to determine both width and height
        // or could use dx for width and dy for height for non-square resizing
        const newWidth = Math.max(minSize, Math.min(maxSize * 2, Math.abs(dx) * 2));
        const newHeight = Math.max(minSize, Math.min(maxSize * 2, Math.abs(dy) * 2));
        
        setAreas(
          areas.map((area, index) => {
            if (index === selectedAreaIndex) {
              return {
                ...area,
                width: newWidth,
                height: newHeight,
              } as RectangleArea;
            }
            return area;
          })
        );
      } else if (selectedArea.shapeType === 'ellipse') {
        // For ellipse, use dx for radiusX and dy for radiusY
        const newRadiusX = Math.max(minSize, Math.min(maxSize, Math.abs(dx)));
        const newRadiusY = Math.max(minSize, Math.min(maxSize, Math.abs(dy)));
        
        setAreas(
          areas.map((area, index) => {
            if (index === selectedAreaIndex) {
              return {
                ...area,
                radiusX: newRadiusX,
                radiusY: newRadiusY,
              } as EllipseArea;
            }
            return area;
          })
        );
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  // Touch event handlers for mobile devices
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled || !image) return;

    // Prevent default to avoid scrolling while interacting with canvas
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const touchPos = getTouchPos(canvas, e);

    // Check if touching on an existing shape's resize handle
    const resizeHandleIndex = areas.findIndex((area) => {
      // Handle different shape types
      let handlePositions: Array<{x: number, y: number}> = [];
      
      if (area.shapeType === 'circle') {
        const circleArea = area as CircleArea;
        const radius = circleArea.radius;
        const diagonalDist = radius * 0.7071; // cos(45°) = sin(45°) = 0.7071
        
        handlePositions = [
          { x: area.x + radius, y: area.y }, // Right
          { x: area.x - radius, y: area.y }, // Left
          { x: area.x, y: area.y - radius }, // Top
          { x: area.x, y: area.y + radius }, // Bottom
          { x: area.x + diagonalDist, y: area.y - diagonalDist }, // Top-right
          { x: area.x - diagonalDist, y: area.y - diagonalDist }, // Top-left
          { x: area.x + diagonalDist, y: area.y + diagonalDist }, // Bottom-right
          { x: area.x - diagonalDist, y: area.y + diagonalDist } // Bottom-left
        ];
      } else if (area.shapeType === 'rectangle') {
        const rectArea = area as RectangleArea;
        const halfWidth = rectArea.width / 2;
        const halfHeight = rectArea.height / 2;
        
        handlePositions = [
          { x: area.x + halfWidth, y: area.y }, // Right
          { x: area.x - halfWidth, y: area.y }, // Left
          { x: area.x, y: area.y - halfHeight }, // Top
          { x: area.x, y: area.y + halfHeight }, // Bottom
          { x: area.x + halfWidth, y: area.y - halfHeight }, // Top-right
          { x: area.x - halfWidth, y: area.y - halfHeight }, // Top-left
          { x: area.x + halfWidth, y: area.y + halfHeight }, // Bottom-right
          { x: area.x - halfWidth, y: area.y + halfHeight } // Bottom-left
        ];
      } else if (area.shapeType === 'ellipse') {
        const ellipseArea = area as EllipseArea;
        const radiusX = ellipseArea.radiusX;
        const radiusY = ellipseArea.radiusY;
        const diagonalX = radiusX * 0.7071;
        const diagonalY = radiusY * 0.7071;
        
        handlePositions = [
          { x: area.x + radiusX, y: area.y }, // Right
          { x: area.x - radiusX, y: area.y }, // Left
          { x: area.x, y: area.y - radiusY }, // Top
          { x: area.x, y: area.y + radiusY }, // Bottom
          { x: area.x + diagonalX, y: area.y - diagonalY }, // Top-right
          { x: area.x - diagonalX, y: area.y - diagonalY }, // Top-left
          { x: area.x + diagonalX, y: area.y + diagonalY }, // Bottom-right
          { x: area.x - diagonalX, y: area.y + diagonalY } // Bottom-left
        ];
      }

      // Use larger hit area for touch (15px instead of 10px)
      const hitArea = 15;
      
      // Check if any handle is clicked with improved hit detection
      return handlePositions.some(pos => {
        const distance = Math.sqrt(
          Math.pow(touchPos.x - pos.x, 2) + Math.pow(touchPos.y - pos.y, 2)
        );
        return distance <= hitArea;
      });
    });

    if (resizeHandleIndex !== -1) {
      setSelectedAreaIndex(resizeHandleIndex);
      setIsResizing(true);
      setIsDragging(false);
      setStartPoint(touchPos);
      return;
    }

    // Check if touching on an existing shape
    const touchedAreaIndex = areas.findIndex((area) => {
      if (area.shapeType === 'circle') {
        const circleArea = area as CircleArea;
        const distance = Math.sqrt(
          Math.pow(touchPos.x - area.x, 2) + Math.pow(touchPos.y - area.y, 2)
        );
        // Add a larger buffer (10px) for touch
        return distance <= circleArea.radius + 10;
      } else if (area.shapeType === 'rectangle') {
        const rectArea = area as RectangleArea;
        const halfWidth = rectArea.width / 2;
        const halfHeight = rectArea.height / 2;
        // Add a buffer (5px) for easier touch selection
        return (
          touchPos.x >= area.x - halfWidth - 5 &&
          touchPos.x <= area.x + halfWidth + 5 &&
          touchPos.y >= area.y - halfHeight - 5 &&
          touchPos.y <= area.y + halfHeight + 5
        );
      } else if (area.shapeType === 'ellipse') {
        const ellipseArea = area as EllipseArea;
        // Normalize the point to ellipse coordinates
        const normalizedX = (touchPos.x - area.x) / ellipseArea.radiusX;
        const normalizedY = (touchPos.y - area.y) / ellipseArea.radiusY;
        // Check if point is inside ellipse (x²/a² + y²/b² <= 1) with buffer
        return normalizedX * normalizedX + normalizedY * normalizedY <= 1.2; // 20% buffer for touch
      }
      return false;
    });

    if (touchedAreaIndex !== -1) {
      setSelectedAreaIndex(touchedAreaIndex);
      setIsDragging(true);
      setIsResizing(false);
      setStartPoint(touchPos);
      return;
    }

    // Create a new area when touching empty space
    const newAreaIndex = createNewArea(touchPos);
    setSelectedAreaIndex(newAreaIndex);
    setIsDragging(true); // Allow immediate dragging of the new area
    setIsResizing(false);
    setStartPoint(touchPos);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled || !image || selectedAreaIndex === null) return;

    // Prevent default to avoid scrolling
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Use the first touch point for position
    if (e.touches.length === 0) return;

    const touchPos = getTouchPos(canvas, e);

    if (isDragging) {
      // Move the selected shape with boundary constraints
      const dx = touchPos.x - startPoint.x;
      const dy = touchPos.y - startPoint.y;

      setAreas(
        areas.map((area, index) => {
          if (index === selectedAreaIndex) {
            // Calculate new position
            const newX = area.x + dx;
            const newY = area.y + dy;
            
            // Apply boundary constraints based on shape type
            let constrainedX = newX;
            let constrainedY = newY;
            
            if (area.shapeType === 'circle') {
              const circleArea = area as CircleArea;
              constrainedX = Math.max(
                circleArea.radius,
                Math.min(canvas.width - circleArea.radius, newX)
              );
              constrainedY = Math.max(
                circleArea.radius,
                Math.min(canvas.height - circleArea.radius, newY)
              );
            } else if (area.shapeType === 'rectangle') {
              const rectArea = area as RectangleArea;
              const halfWidth = rectArea.width / 2;
              const halfHeight = rectArea.height / 2;
              constrainedX = Math.max(
                halfWidth,
                Math.min(canvas.width - halfWidth, newX)
              );
              constrainedY = Math.max(
                halfHeight,
                Math.min(canvas.height - halfHeight, newY)
              );
            } else if (area.shapeType === 'ellipse') {
              const ellipseArea = area as EllipseArea;
              constrainedX = Math.max(
                ellipseArea.radiusX,
                Math.min(canvas.width - ellipseArea.radiusX, newX)
              );
              constrainedY = Math.max(
                ellipseArea.radiusY,
                Math.min(canvas.height - ellipseArea.radiusY, newY)
              );
            }

            return {
              ...area,
              x: constrainedX,
              y: constrainedY,
            };
          }
          return area;
        })
      );

      setStartPoint(touchPos);
    } else if (isResizing) {
      // Resize the selected shape with smooth constraints
      const selectedArea = areas[selectedAreaIndex];

      // Calculate distance from center to mouse position
      const dx = touchPos.x - selectedArea.x;
      const dy = touchPos.y - selectedArea.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Apply minimum and maximum constraints with smooth clamping
      const minSize = isMobileDevice() ? 20 : 10; // Larger minimum size for mobile
      const maxSize = Math.min(canvas.width, canvas.height) / 2; // Maximum size (half of the smaller dimension)
      
      if (selectedArea.shapeType === 'circle') {
        // Apply smooth easing for better UX when approaching min/max
        let newRadius = distance;

        // Apply minimum constraint with smooth transition
        if (distance < minSize + 5) {
          const t = (distance - minSize) / 5; // Transition factor (0 to 1)
          newRadius = minSize + (distance - minSize) * Math.max(0, t);
        }

        // Apply maximum constraint with smooth transition
        if (distance > maxSize - 10) {
          const t = (maxSize - distance) / 10; // Transition factor (0 to 1)
          newRadius = maxSize - (maxSize - distance) * Math.max(0, t);
        }

        // Ensure radius stays within absolute bounds
        newRadius = Math.max(minSize, Math.min(maxSize, newRadius));

        setAreas(
          areas.map((area, index) => {
            if (index === selectedAreaIndex) {
              return {
                ...area,
                radius: newRadius,
              } as CircleArea;
            }
            return area;
          })
        );
      } else if (selectedArea.shapeType === 'rectangle') {
        // For rectangle, use distance to determine both width and height
        // or could use dx for width and dy for height for non-square resizing
        const newWidth = Math.max(minSize, Math.min(maxSize * 2, Math.abs(dx) * 2));
        const newHeight = Math.max(minSize, Math.min(maxSize * 2, Math.abs(dy) * 2));
        
        setAreas(
          areas.map((area, index) => {
            if (index === selectedAreaIndex) {
              return {
                ...area,
                width: newWidth,
                height: newHeight,
              } as RectangleArea;
            }
            return area;
          })
        );
      } else if (selectedArea.shapeType === 'ellipse') {
        // For ellipse, use dx for radiusX and dy for radiusY
        const newRadiusX = Math.max(minSize, Math.min(maxSize, Math.abs(dx)));
        const newRadiusY = Math.max(minSize, Math.min(maxSize, Math.abs(dy)));
        
        setAreas(
          areas.map((area, index) => {
            if (index === selectedAreaIndex) {
              return {
                ...area,
                radiusX: newRadiusX,
                radiusY: newRadiusY,
              } as EllipseArea;
            }
            return area;
          })
        );
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    // Prevent default to avoid any unwanted browser behaviors
    e.preventDefault();

    // End dragging and resizing operations
    setIsDragging(false);
    setIsResizing(false);

    // Force a re-render to ensure the final position is displayed correctly
    // The circles will be redrawn automatically due to state changes
  };

  const handleBlurIntensityChange = (intensity: number) => {
    if (selectedAreaIndex === null) return;

    setAreas(
      areas.map((area, index) => {
        if (index === selectedAreaIndex) {
          return {
            ...area,
            blurIntensity: intensity,
          };
        }
        return area;
      })
    );
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
        <div className="text-blue-600 font-medium text-xs sm:text-sm">
          Draw circles to protect sensitive areas
        </div>
        <div className="text-gray-500 text-xs sm:text-sm">
          {areas.length} area{areas.length !== 1 ? "s" : ""} selected
        </div>
      </div>
      <div
        className="canvas-container"
        style={{ maxWidth: "100%", overflow: "hidden" }}
      >
        <canvas
          ref={canvasRef}
          width={image?.width || 0}
          height={image?.height || 0}
          className={`border border-gray-300 rounded shadow-inner ${
            disabled ? "cursor-not-allowed" : "cursor-crosshair"
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          style={{
            touchAction: "none",
            maxWidth: "100%",
            height: "auto",
            display: "block",
          }}
        />
      </div>

      {selectedAreaIndex !== null && (
        <div className="absolute bottom-0 left-0 right-0 bg-gray-800 bg-opacity-90 text-white p-2 sm:p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-b gap-2 sm:gap-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:space-x-4">
            <div className="flex flex-wrap items-center gap-x-2">
              <label className="text-xs sm:text-sm font-medium">
                Intensity:
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={areas[selectedAreaIndex]?.blurIntensity || 50}
                onChange={(e) =>
                  handleBlurIntensityChange(parseInt(e.target.value))
                }
                className="w-24 sm:w-32"
              />
              <span className="text-xs sm:text-sm font-bold">
                {areas[selectedAreaIndex]?.blurIntensity}%
              </span>
            </div>

            {/* Shape-specific controls based on selected shape type */}
            {selectedAreaIndex !== null && (
              <>
                {/* Circle controls */}
                {areas[selectedAreaIndex].shapeType === 'circle' && (
                  <div className="flex flex-wrap items-center gap-x-2">
                    <label className="text-xs sm:text-sm font-medium">Radius:</label>
                    <input
                      type="range"
                      min="10"
                      max="150"
                      value={(areas[selectedAreaIndex] as CircleArea).radius}
                      onChange={(e) => {
                        const newRadius = parseInt(e.target.value);
                        setAreas(
                          areas.map((area, index) =>
                            index === selectedAreaIndex && area.shapeType === 'circle'
                              ? { ...area, radius: newRadius } as CircleArea
                              : area
                          )
                        );
                      }}
                      className="w-32"
                    />
                    <span className="ml-2 text-sm font-bold">
                      {Math.round((areas[selectedAreaIndex] as CircleArea).radius)}px
                    </span>
                  </div>
                )}
                
                {/* Rectangle controls */}
                {areas[selectedAreaIndex].shapeType === 'rectangle' && (
                  <>
                    <div className="flex flex-wrap items-center gap-x-2 mb-2">
                      <label className="text-xs sm:text-sm font-medium">Width:</label>
                      <input
                        type="range"
                        min="10"
                        max="300"
                        value={(areas[selectedAreaIndex] as RectangleArea).width}
                        onChange={(e) => {
                          const newWidth = parseInt(e.target.value);
                          setAreas(
                            areas.map((area, index) =>
                              index === selectedAreaIndex && area.shapeType === 'rectangle'
                                ? { ...area, width: newWidth } as RectangleArea
                                : area
                            )
                          );
                        }}
                        className="w-32"
                      />
                      <span className="ml-2 text-sm font-bold">
                        {Math.round((areas[selectedAreaIndex] as RectangleArea).width)}px
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2">
                      <label className="text-xs sm:text-sm font-medium">Height:</label>
                      <input
                        type="range"
                        min="10"
                        max="300"
                        value={(areas[selectedAreaIndex] as RectangleArea).height}
                        onChange={(e) => {
                          const newHeight = parseInt(e.target.value);
                          setAreas(
                            areas.map((area, index) =>
                              index === selectedAreaIndex && area.shapeType === 'rectangle'
                                ? { ...area, height: newHeight } as RectangleArea
                                : area
                            )
                          );
                        }}
                        className="w-32"
                      />
                      <span className="ml-2 text-sm font-bold">
                        {Math.round((areas[selectedAreaIndex] as RectangleArea).height)}px
                      </span>
                    </div>
                  </>
                )}
                
                {/* Ellipse controls */}
                {areas[selectedAreaIndex].shapeType === 'ellipse' && (
                  <>
                    <div className="flex flex-wrap items-center gap-x-2 mb-2">
                      <label className="text-xs sm:text-sm font-medium">Width:</label>
                      <input
                        type="range"
                        min="10"
                        max="200"
                        value={(areas[selectedAreaIndex] as EllipseArea).radiusX * 2}
                        onChange={(e) => {
                          const newRadiusX = parseInt(e.target.value) / 2;
                          setAreas(
                            areas.map((area, index) =>
                              index === selectedAreaIndex && area.shapeType === 'ellipse'
                                ? { ...area, radiusX: newRadiusX } as EllipseArea
                                : area
                            )
                          );
                        }}
                        className="w-32"
                      />
                      <span className="ml-2 text-sm font-bold">
                        {Math.round((areas[selectedAreaIndex] as EllipseArea).radiusX * 2)}px
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2">
                      <label className="text-xs sm:text-sm font-medium">Height:</label>
                      <input
                        type="range"
                        min="10"
                        max="200"
                        value={(areas[selectedAreaIndex] as EllipseArea).radiusY * 2}
                        onChange={(e) => {
                          const newRadiusY = parseInt(e.target.value) / 2;
                          setAreas(
                            areas.map((area, index) =>
                              index === selectedAreaIndex && area.shapeType === 'ellipse'
                                ? { ...area, radiusY: newRadiusY } as EllipseArea
                                : area
                            )
                          );
                        }}
                        className="w-32"
                      />
                      <span className="ml-2 text-sm font-bold">
                        {Math.round((areas[selectedAreaIndex] as EllipseArea).radiusY * 2)}px
                      </span>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          <div className="flex space-x-2">
            <button
              onClick={handleDeleteArea}
              className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-medium rounded transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShapeAreaSelector;
