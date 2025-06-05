import React, { useRef, useState, useEffect } from "react";

export interface CircleArea {
  id: string;
  x: number;
  y: number;
  radius: number;
  blurIntensity: number; // 0-100
}

interface CircularAreaSelectorProps {
  image: HTMLImageElement | null;
  areas: CircleArea[];
  setAreas: (areas: CircleArea[]) => void;
  disabled?: boolean;
}

// Helper function to detect mobile devices
const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

export const CircularAreaSelector: React.FC<CircularAreaSelectorProps> = ({
  image,
  areas,
  setAreas,
  disabled = false,
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
        ctx.strokeStyle = "rgba(0, 191, 255, 0.5)";
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      // Draw main circle border
      ctx.beginPath();
      ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
      ctx.strokeStyle = isSelected ? "#00BFFF" : "#FFFFFF";
      ctx.lineWidth = isSelected ? 2 : 1.5;
      ctx.stroke();

      // Add visual indicator of intensity with gradient
      const intensityRing = Math.max(10, area.radius - 10);
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
        // Draw multiple handles for better UX
        // Add diagonal handles for mobile for 8-way resizing
        const handlePositions = [
          { x: area.x + area.radius, y: area.y }, // Right
          { x: area.x - area.radius, y: area.y }, // Left
          { x: area.x, y: area.y - area.radius }, // Top
          { x: area.x, y: area.y + area.radius }, // Bottom
        ];

        // Add diagonal handles for mobile devices
        if (isMobileDevice()) {
          const diagonalDist = area.radius * 0.7071; // cos(45°) = sin(45°) = 0.7071
          handlePositions.push(
            { x: area.x + diagonalDist, y: area.y - diagonalDist }, // Top-right
            { x: area.x - diagonalDist, y: area.y - diagonalDist }, // Top-left
            { x: area.x + diagonalDist, y: area.y + diagonalDist }, // Bottom-right
            { x: area.x - diagonalDist, y: area.y + diagonalDist } // Bottom-left
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
        ctx.fillText(`${Math.round(area.radius)}px`, area.x, area.y);

        // Add blur intensity indicator
        const intensityText = `${area.blurIntensity}%`;
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

    // Check if clicking on an existing circle's resize handle with improved hit detection
    const resizeHandleIndex = areas.findIndex((area) => {
      // Check all resize handles (right, left, top, bottom)
      const rightHandleX = area.x + area.radius;
      const rightHandleY = area.y;
      const rightDistance = Math.sqrt(
        Math.pow(mousePos.x - rightHandleX, 2) +
          Math.pow(mousePos.y - rightHandleY, 2)
      );

      const leftHandleX = area.x - area.radius;
      const leftHandleY = area.y;
      const leftDistance = Math.sqrt(
        Math.pow(mousePos.x - leftHandleX, 2) +
          Math.pow(mousePos.y - leftHandleY, 2)
      );

      const topHandleX = area.x;
      const topHandleY = area.y - area.radius;
      const topDistance = Math.sqrt(
        Math.pow(mousePos.x - topHandleX, 2) +
          Math.pow(mousePos.y - topHandleY, 2)
      );

      const bottomHandleX = area.x;
      const bottomHandleY = area.y + area.radius;
      const bottomDistance = Math.sqrt(
        Math.pow(mousePos.x - bottomHandleX, 2) +
          Math.pow(mousePos.y - bottomHandleY, 2)
      );

      // Add diagonal handles for better touch experience
      const diagonalDist = area.radius * 0.7071; // cos(45°) = sin(45°) = 0.7071

      const topRightX = area.x + diagonalDist;
      const topRightY = area.y - diagonalDist;
      const topRightDistance = Math.sqrt(
        Math.pow(mousePos.x - topRightX, 2) +
          Math.pow(mousePos.y - topRightY, 2)
      );

      const topLeftX = area.x - diagonalDist;
      const topLeftY = area.y - diagonalDist;
      const topLeftDistance = Math.sqrt(
        Math.pow(mousePos.x - topLeftX, 2) + Math.pow(mousePos.y - topLeftY, 2)
      );

      const bottomRightX = area.x + diagonalDist;
      const bottomRightY = area.y + diagonalDist;
      const bottomRightDistance = Math.sqrt(
        Math.pow(mousePos.x - bottomRightX, 2) +
          Math.pow(mousePos.y - bottomRightY, 2)
      );

      const bottomLeftX = area.x - diagonalDist;
      const bottomLeftY = area.y + diagonalDist;
      const bottomLeftDistance = Math.sqrt(
        Math.pow(mousePos.x - bottomLeftX, 2) +
          Math.pow(mousePos.y - bottomLeftY, 2)
      );

      // Increased hit area based on device type (10px for desktop, 15px for mobile)
      const hitArea = isMobileDevice() ? 15 : 10;

      // Check if any handle is clicked with improved hit detection
      return (
        Math.min(
          rightDistance,
          leftDistance,
          topDistance,
          bottomDistance,
          topRightDistance,
          topLeftDistance,
          bottomRightDistance,
          bottomLeftDistance
        ) <= hitArea
      );
    });

    if (resizeHandleIndex !== -1) {
      setSelectedAreaIndex(resizeHandleIndex);
      setIsResizing(true);
      setIsDragging(false);
      setStartPoint(mousePos);
      return;
    }

    // Check if clicking on an existing circle with improved hit detection
    const clickedAreaIndex = areas.findIndex((area) => {
      const distance = Math.sqrt(
        Math.pow(mousePos.x - area.x, 2) + Math.pow(mousePos.y - area.y, 2)
      );
      // Add a buffer to make selection easier (larger on mobile)
      const selectionBuffer = isMobileDevice() ? 8 : 3;
      return distance <= area.radius + selectionBuffer;
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
      radius: isMobileDevice() ? 40 : 30, // Larger initial radius for mobile devices
      blurIntensity: 50,
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

      setAreas(
        areas.map((area, index) => {
          if (index === selectedAreaIndex) {
            // Calculate new position
            const newX = area.x + dx;
            const newY = area.y + dy;

            // Apply boundary constraints to keep circle within canvas
            const constrainedX = Math.max(
              area.radius,
              Math.min(canvas.width - area.radius, newX)
            );
            const constrainedY = Math.max(
              area.radius,
              Math.min(canvas.height - area.radius, newY)
            );

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
      // Resize the selected circle with smooth constraints
      const selectedArea = areas[selectedAreaIndex];

      // Calculate distance from center to mouse position
      const dx = mousePos.x - selectedArea.x;
      const dy = mousePos.y - selectedArea.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Apply minimum and maximum constraints with smooth clamping
      const minRadius = isMobileDevice() ? 20 : 10; // Larger minimum radius for mobile
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

      setAreas(
        areas.map((area, index) => {
          if (index === selectedAreaIndex) {
            return {
              ...area,
              radius: newRadius,
            };
          }
          return area;
        })
      );
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

    // Check if touching on an existing circle's resize handle
    const resizeHandleIndex = areas.findIndex((area) => {
      // Check all resize handles (right, left, top, bottom) with larger touch areas
      // Add diagonal handles as well for better touch experience

      // Main handles (right, left, top, bottom)
      const rightHandleX = area.x + area.radius;
      const rightHandleY = area.y;
      const rightDistance = Math.sqrt(
        Math.pow(touchPos.x - rightHandleX, 2) +
          Math.pow(touchPos.y - rightHandleY, 2)
      );

      const leftHandleX = area.x - area.radius;
      const leftHandleY = area.y;
      const leftDistance = Math.sqrt(
        Math.pow(touchPos.x - leftHandleX, 2) +
          Math.pow(touchPos.y - leftHandleY, 2)
      );

      const topHandleX = area.x;
      const topHandleY = area.y - area.radius;
      const topDistance = Math.sqrt(
        Math.pow(touchPos.x - topHandleX, 2) +
          Math.pow(touchPos.y - topHandleY, 2)
      );

      const bottomHandleX = area.x;
      const bottomHandleY = area.y + area.radius;
      const bottomDistance = Math.sqrt(
        Math.pow(touchPos.x - bottomHandleX, 2) +
          Math.pow(touchPos.y - bottomHandleY, 2)
      );

      // Diagonal handles for better touch experience
      const topRightX = area.x + area.radius * 0.7071; // cos(45°)
      const topRightY = area.y - area.radius * 0.7071; // sin(45°)
      const topRightDistance = Math.sqrt(
        Math.pow(touchPos.x - topRightX, 2) +
          Math.pow(touchPos.y - topRightY, 2)
      );

      const topLeftX = area.x - area.radius * 0.7071;
      const topLeftY = area.y - area.radius * 0.7071;
      const topLeftDistance = Math.sqrt(
        Math.pow(touchPos.x - topLeftX, 2) + Math.pow(touchPos.y - topLeftY, 2)
      );

      const bottomRightX = area.x + area.radius * 0.7071;
      const bottomRightY = area.y + area.radius * 0.7071;
      const bottomRightDistance = Math.sqrt(
        Math.pow(touchPos.x - bottomRightX, 2) +
          Math.pow(touchPos.y - bottomRightY, 2)
      );

      const bottomLeftX = area.x - area.radius * 0.7071;
      const bottomLeftY = area.y + area.radius * 0.7071;
      const bottomLeftDistance = Math.sqrt(
        Math.pow(touchPos.x - bottomLeftX, 2) +
          Math.pow(touchPos.y - bottomLeftY, 2)
      );

      // Use larger hit area for touch (15px instead of 12px)
      return (
        Math.min(
          rightDistance,
          leftDistance,
          topDistance,
          bottomDistance,
          topRightDistance,
          topLeftDistance,
          bottomRightDistance,
          bottomLeftDistance
        ) <= 15
      );
    });

    if (resizeHandleIndex !== -1) {
      setSelectedAreaIndex(resizeHandleIndex);
      setIsResizing(true);
      setIsDragging(false);
      setStartPoint(touchPos);
      return;
    }

    // Check if touching on an existing circle
    const touchedAreaIndex = areas.findIndex((area) => {
      const distance = Math.sqrt(
        Math.pow(touchPos.x - area.x, 2) + Math.pow(touchPos.y - area.y, 2)
      );
      // Add a larger buffer (8px) for touch
      return distance <= area.radius + 8;
    });

    if (touchedAreaIndex !== -1) {
      setSelectedAreaIndex(touchedAreaIndex);
      setIsDragging(true);
      setIsResizing(false);
      setStartPoint(touchPos);
      return;
    }

    // Create a new area when touching empty space
    const newArea: CircleArea = {
      id: Date.now().toString(),
      x: touchPos.x,
      y: touchPos.y,
      radius: 40, // Larger initial radius for touch
      blurIntensity: 50,
    };

    // Add the new area and set it as selected
    const updatedAreas = [...areas, newArea];
    setAreas(updatedAreas);
    setSelectedAreaIndex(updatedAreas.length - 1);

    // Set up for potential dragging
    setIsDragging(true);
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
      // Move the selected circle with boundary constraints
      const dx = touchPos.x - startPoint.x;
      const dy = touchPos.y - startPoint.y;

      // Apply smoother movement with debouncing for mobile
      setAreas(
        areas.map((area, index) => {
          if (index === selectedAreaIndex) {
            // Calculate new position
            const newX = area.x + dx;
            const newY = area.y + dy;

            // Apply boundary constraints to keep circle within canvas
            const constrainedX = Math.max(
              area.radius,
              Math.min(canvas.width - area.radius, newX)
            );
            const constrainedY = Math.max(
              area.radius,
              Math.min(canvas.height - area.radius, newY)
            );

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
      // Resize the selected circle with smooth constraints
      const selectedArea = areas[selectedAreaIndex];

      // Calculate distance from center to touch position
      const dx = touchPos.x - selectedArea.x;
      const dy = touchPos.y - selectedArea.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Apply minimum and maximum constraints with smooth clamping
      const minRadius = 20; // Larger minimum radius for touch
      const maxRadius = Math.min(canvas.width, canvas.height) / 2;

      // Apply smooth easing for better UX when approaching min/max
      let newRadius = distance;

      // Apply minimum constraint with smooth transition
      if (distance < minRadius + 5) {
        const t = (distance - minRadius) / 5;
        newRadius = minRadius + (distance - minRadius) * Math.max(0, t);
      }

      // Apply maximum constraint with smooth transition
      if (distance > maxRadius - 10) {
        const t = (maxRadius - distance) / 10;
        newRadius = maxRadius - (maxRadius - distance) * Math.max(0, t);
      }

      // Ensure radius stays within absolute bounds
      newRadius = Math.max(minRadius, Math.min(maxRadius, newRadius));

      setAreas(
        areas.map((area, index) => {
          if (index === selectedAreaIndex) {
            return {
              ...area,
              radius: newRadius,
            };
          }
          return area;
        })
      );
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

            <div className="flex flex-wrap items-center gap-x-2">
              <label className="text-xs sm:text-sm font-medium">Size:</label>
              <input
                type="range"
                min="10"
                max="150"
                value={areas[selectedAreaIndex]?.radius || 30}
                onChange={(e) => {
                  const newRadius = parseInt(e.target.value);
                  setAreas(
                    areas.map((area, index) =>
                      index === selectedAreaIndex
                        ? { ...area, radius: newRadius }
                        : area
                    )
                  );
                }}
                className="w-32"
              />
              <span className="ml-2 text-sm font-bold">
                {Math.round(areas[selectedAreaIndex]?.radius || 0)}px
              </span>
            </div>
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

export default CircularAreaSelector;
