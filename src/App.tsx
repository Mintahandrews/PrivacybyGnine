import { useState, useEffect, useRef } from "react";
import "./index.css";
import * as tf from "@tensorflow/tfjs";
import Logo from "./components/Logo";
import {
  Circle,
  Eye,
  EyeOff,
  RefreshCw,
  Save,
  Square,
} from "lucide-react";
import { saveAs } from "file-saver";

import {
  createAutoencoderModel,
  processImage,
  FilterType,
} from "./tf/autoencoderModel";
import { applyCircularBlurs, hideCircularAreas } from "./tf/circularBlur";
import ImageUploader from "./components/ImageUploader";
import ImagePreview from "./components/ImagePreview";

import PrivacySlider from "./components/PrivacySlider";
import { MultiShapeSelector, Area, ShapeType } from "./components/MultiShapeSelector";

// Helper function to format filter type name
const formatFilterTypeName = (type: FilterType): string => {
  switch (type) {
    case FilterType.BASIC:
      return "Basic";
    case FilterType.EDGE_ENHANCE:
      return "Edge Enhance";
    case FilterType.GAUSSIAN:
      return "Gaussian";
    case FilterType.PIXELATE:
      return "Pixelate";
    case FilterType.COLOR_QUANTIZE:
      return "Color Reduce";
    default:
      return "Unknown";
  }
};

function App() {
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [privacyLevel, setPrivacyLevel] = useState(50);
  const [filterType, setFilterType] = useState<FilterType>(FilterType.BASIC);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedShapeType, setSelectedShapeType] = useState<ShapeType>("circle");
  const [isCircleSelectMode, setIsCircleSelectMode] = useState(false);
  const [circleBlurMode, setCircleBlurMode] = useState<"blur" | "hide">("blur");
  const [imageDimensions, setImageDimensions] = useState({
    width: 0,
    height: 0,
  });

  const modelRef = useRef<tf.LayersModel | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const timeoutRef = useRef<number | null>(null);

  // Add meta viewport tag for proper mobile scaling
  useEffect(() => {
    // Check if viewport meta tag exists
    let viewportMeta = document.querySelector(
      'meta[name="viewport"]'
    ) as HTMLMetaElement | null;

    // If it doesn't exist, create and add it
    if (!viewportMeta) {
      viewportMeta = document.createElement("meta");
      viewportMeta.name = "viewport";
      viewportMeta.content =
        "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
      document.getElementsByTagName("head")[0].appendChild(viewportMeta);
    } else {
      // Update existing viewport meta
      viewportMeta.content =
        "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
    }
  }, []);

  // Load TensorFlow.js model
  useEffect(() => {
    async function loadModel() {
      try {
        setIsModelLoading(true);
        // Initialize TensorFlow.js with specific flags for better performance
        await tf.setBackend("webgl");
        await tf.ready();

        // Enable memory cleanup
        tf.ENV.set("WEBGL_DELETE_TEXTURE_THRESHOLD", 0);
        tf.ENV.set("WEBGL_FORCE_F16_TEXTURES", false);
        tf.ENV.set("WEBGL_PACK", true);

        // Create a simple autoencoder model (for demo purposes)
        const model = await createAutoencoderModel(224, 224);
        modelRef.current = model;

        // Run a small warmup tensor through the model to initialize WebGL context
        const warmupTensor = tf.zeros([1, 224, 224, 3]);
        await model.predict(warmupTensor);
        warmupTensor.dispose();

        setIsModelLoading(false);
      } catch (err) {
        console.error("Failed to load model:", err);
        setError(
          "Failed to initialize TensorFlow.js model. Please try refreshing the page."
        );
        setIsModelLoading(false);
      }
    }

    loadModel();

    // Load Google Fonts
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    return () => {
      // Cleanup
      if (modelRef.current) {
        modelRef.current.dispose();
      }
      // Force garbage collection of WebGL textures
      tf.disposeVariables();
    };
  }, []);

  // Process image when privacy level changes
  useEffect(() => {
    // Track if the component is still mounted
    let isMounted = true;
    // Performance optimization - track processing start time
    const startTime = performance.now();

    async function applyPrivacyFilter() {
      if (!originalImage || !modelRef.current || !imageRef.current) {
        setIsProcessing(false);
        return;
      }

      try {
        setIsProcessing(true);

        // Ensure the image is fully loaded
        if (!imageRef.current.complete) {
          await new Promise<void>((resolve) => {
            imageRef.current!.onload = () => resolve();
            // If image already loaded, this won't fire, so add a backup
            if (imageRef.current!.complete) resolve();
          });
        }

        // First apply the main privacy filter
        let result = await processImage(
          imageRef.current,
          modelRef.current,
          privacyLevel,
          filterType
        );

        // Then apply circular area effects if any exist
        if (areas.length > 0) {
          try {
            // Create a temporary image to load the processed result
            const tempImg = new Image();
            tempImg.crossOrigin = "anonymous";

            // Wait for the image to load
            await new Promise<void>((resolve, reject) => {
              tempImg.onload = () => resolve();
              tempImg.onerror = () =>
                reject(new Error("Failed to load processed image"));
              tempImg.src = result;
            });

            // Convert to tensor - can't use tf.tidy with async functions
            const tensor = tf.browser.fromPixels(tempImg);

            // Make sure tensor is 3D with shape [height, width, channels]
            const tensor3D = tensor.reshape([
              tensor.shape[0],
              tensor.shape[1],
              3,
            ]) as tf.Tensor3D;

            // Apply circular effects based on mode
            let finalTensor: tf.Tensor3D;

            try {
              if (circleBlurMode === "blur") {
                // Apply blur with varying intensities for all shape types
                finalTensor = await applyCircularBlurs(
                  tensor3D,
                  areas,
                  imageDimensions.width,
                  imageDimensions.height,
                  true // Enable feathered edges for smoother blur effect
                );
              } else {
                // Hide mode - fill with solid color for all shape types
                finalTensor = hideCircularAreas(
                  tensor3D,
                  areas,
                  imageDimensions.width,
                  imageDimensions.height,
                  [0, 0, 0] // Black color
                );
              }

              // Clean up intermediate tensors
              tensor.dispose();
              if (tensor3D !== tensor) {
                tensor3D.dispose();
              }
            } catch (err) {
              console.error("Error applying circular effects:", err);
              throw err; // Re-throw to be caught by the outer try-catch
            }

            // Convert to canvas
            const canvas = document.createElement("canvas");
            canvas.width = imageDimensions.width;
            canvas.height = imageDimensions.height;

            try {
              // Convert tensor to pixels on canvas
              await tf.browser.toPixels(finalTensor, canvas);

              // Get data URL
              result = canvas.toDataURL("image/png");
            } catch (err) {
              console.error("Error converting tensor to pixels:", err);
              setError("Failed to process image for display");
              setIsProcessing(false);
            } finally {
              // Always clean up tensors to prevent memory leaks
              finalTensor.dispose();
              // Force garbage collection in case of any leaked tensors
              tf.engine().endScope();
              tf.engine().startScope();
            }
          } catch (circleErr) {
            console.error("Error applying circular effects:", circleErr);
            // Continue with the original processed image if circular processing fails
          }
        }

        if (isMounted) {
          // Measure processing time for optimization opportunities
          const processingTime = performance.now() - startTime;
          console.log(
            `Image processing completed in ${processingTime.toFixed(2)}ms`
          );

          setProcessedImage(result);
          setIsProcessing(false);
          setError(null); // Clear any previous errors on success
        }
      } catch (err) {
        console.error("Error processing image:", err);
        if (isMounted) {
          setError(
            "Failed to process the image. Please try again with a different image."
          );
          setIsProcessing(false);
        }

        // Force garbage collection to clean up any leaked tensors
        try {
          if (tf.memory().numTensors > 0) {
            tf.disposeVariables();
          }
        } catch (memErr) {
          console.error("Error during memory cleanup:", memErr);
        }
      }
    }

    if (originalImage && !isModelLoading) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      // Show processing state immediately for better UX
      setIsProcessing(true);

      // Use a small timeout to debounce rapid slider changes - increased for smoother UX
      timeoutRef.current = window.setTimeout(() => {
        applyPrivacyFilter();
      }, 200); // Increased to 200ms for more effective debouncing
    }

    // Cleanup function
    return () => {
      isMounted = false;
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [
    originalImage,
    privacyLevel,
    filterType,
    isModelLoading,
    areas,
    circleBlurMode,
    imageDimensions,
  ]);

  const handleImageUpload = (file: File) => {
    // Validate file type and size
    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file.");
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError(
        "Image file is too large. Please upload an image smaller than 10MB."
      );
      return;
    }

    setError(null);
    setIsProcessing(true);

    // Reset processed image
    setProcessedImage(null);

    // Release any previous object URL to prevent memory leaks
    if (originalImage && originalImage.startsWith("blob:")) {
      URL.revokeObjectURL(originalImage);
    }

    // Create URL for the original image
    const imageUrl = URL.createObjectURL(file);
    setOriginalImage(imageUrl);

    // Load image for processing
    const img = new Image();

    // Set crossOrigin to anonymous to avoid CORS issues with canvas
    img.crossOrigin = "anonymous";

    img.onload = () => {
      // Check if image dimensions are valid
      if (img.width === 0 || img.height === 0) {
        setError("Invalid image dimensions. Please try another image.");
        setIsProcessing(false);
        URL.revokeObjectURL(imageUrl);
        return;
      }

      // Store the image for processing and set dimensions
      imageRef.current = img;
      setImageDimensions({ width: img.width, height: img.height });

      // Reset circle areas when loading a new image
      setAreas([]);

      // Apply privacy filter with current level
      if (modelRef.current && !isModelLoading) {
        // Add a small delay to ensure UI updates first
        setTimeout(async () => {
          try {
            // Make sure TensorFlow backend is initialized
            if (!tf.getBackend()) {
              await tf.setBackend("webgl");
              await tf.ready();
            }

            // Ensure model is loaded before processing
            if (!modelRef.current) {
              throw new Error("Model not loaded yet");
            }
            const result = await processImage(
              img,
              modelRef.current,
              privacyLevel
            );
            setProcessedImage(result);
            setIsProcessing(false);
          } catch (err) {
            console.error("Error in initial processing:", err);
            setError(
              "Failed to process the image. Please try again with a different image."
            );
            setIsProcessing(false);

            // Force cleanup of any tensors
            try {
              tf.disposeVariables();
            } catch (e) {
              console.error("Error during tensor cleanup:", e);
            }
          }
        }, 200);
      } else {
        setIsProcessing(false);
      }
    };

    img.onerror = () => {
      setError(
        "Failed to load the image. Please try again with a different image."
      );
      setIsProcessing(false);
      URL.revokeObjectURL(imageUrl);
    };

    img.src = imageUrl;
  };

  const handleDownload = () => {
    if (!processedImage) return;

    // Convert data URL to Blob
    fetch(processedImage)
      .then((res) => res.blob())
      .then((blob) => {
        saveAs(
          blob,
          `privacygnine-image-${new Date().toISOString().slice(0, 10)}.png`
        );
      })
      .catch((err) => {
        console.error("Download error:", err);
        setError("Failed to download the image. Please try again.");
      });
  };

  const handleReset = () => {
    // Release object URLs to prevent memory leaks
    if (originalImage && originalImage.startsWith("blob:")) {
      URL.revokeObjectURL(originalImage);
    }

    // Clear all images and reset state
    setOriginalImage(null);
    setProcessedImage(null);
    setError(null);
    setPrivacyLevel(50); // Reset to default level

    if (imageRef.current) {
      imageRef.current = null;
    }

    // Reset areas
    setAreas([]);
    setIsCircleSelectMode(false);

    // Force cleanup of any tensors
    try {
      tf.disposeVariables();
      if (tf.ENV.get("IS_BROWSER")) {
        tf.ENV.set("WEBGL_DELETE_TEXTURE_THRESHOLD", 0);
      }
    } catch (e) {
      console.error("Error during tensor cleanup:", e);
    }
  };

  return (
    <div
      className="min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-100"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <div className="container px-3 sm:px-4 py-4 sm:py-8 mx-auto max-w-full sm:max-w-5xl">
        <header className="text-center mb-6 sm:mb-12">
          <div className="flex items-center justify-center mb-2">
            <Logo size="large" className="mr-3" />
            <h1
              className="text-3xl sm:text-4xl font-bold text-gray-800"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              PrivacyGnine
            </h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-2">
            Protect your privacy with browser-based image anonymization. No data
            leaves your device - all processing happens locally.
          </p>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg overflow-hidden p-4 sm:p-6 mb-5 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
            Upload Image
          </h2>
          <ImageUploader onImageUpload={handleImageUpload} />
        </div>

        {originalImage && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden p-3 sm:p-6 mb-4 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 space-y-2 sm:space-y-0">
              <div className="flex items-center space-x-2">
                <Logo size="medium" />
                <h2 className="text-lg sm:text-xl font-semibold">
                  PrivacyGnine
                </h2>
                <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                  Pro
                </span>
              </div>
              {originalImage && (
                <div className="text-xs px-3 py-1 bg-gray-100 text-gray-800 rounded-full flex items-center self-start sm:self-auto">
                  <span className="mr-1">Filter:</span>
                  <span className="font-semibold">
                    {formatFilterTypeName(filterType)}
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 sm:mb-4 space-y-3 sm:space-y-0">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                Image Preview
              </h2>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button
                  onClick={handleReset}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  style={{ minHeight: "44px", minWidth: "80px" }} /* Better touch target */
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Reset
                </button>
                <button
                  onClick={() => setIsCircleSelectMode(!isCircleSelectMode)}
                  className={`flex-1 sm:flex-initial inline-flex items-center justify-center px-3 py-2.5 border rounded-lg shadow-sm text-sm font-medium ${
                    isCircleSelectMode
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-300 bg-white text-gray-700"
                  } hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                  style={{ minHeight: "44px", minWidth: "120px" }} /* Better touch target */
                >
                  <Circle className="w-5 h-5 mr-2" />
                  {isCircleSelectMode ? "Exit Selection" : "Select Areas"}
                </button>
                {isCircleSelectMode && (
                  <>
                    <button
                      onClick={() =>
                        setCircleBlurMode(
                          circleBlurMode === "blur" ? "hide" : "blur"
                        )
                      }
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      style={{ minHeight: "44px", minWidth: "110px" }} /* Better touch target */
                    >
                      {circleBlurMode === "blur" ? (
                        <>
                          <Eye className="w-5 h-5 mr-2" />
                          Blur Areas
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-5 h-5 mr-2" />
                          Hide Areas
                        </>
                      )}
                    </button>
                    <div className="flex-1 sm:flex-initial inline-flex rounded-lg overflow-hidden border border-gray-300">
                      <button
                        onClick={() => setSelectedShapeType("circle")}
                        className={`px-3 py-2.5 text-sm font-medium ${selectedShapeType === "circle" ? "bg-blue-50 text-blue-700" : "bg-white text-gray-700"}`}
                        style={{ minHeight: "44px" }}
                      >
                        <Circle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setSelectedShapeType("rectangle")}
                        className={`px-3 py-2.5 text-sm font-medium ${selectedShapeType === "rectangle" ? "bg-blue-50 text-blue-700" : "bg-white text-gray-700"}`}
                        style={{ minHeight: "44px" }}
                      >
                        <Square className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setSelectedShapeType("ellipse")}
                        className={`px-3 py-2.5 text-sm font-medium ${selectedShapeType === "ellipse" ? "bg-blue-50 text-blue-700" : "bg-white text-gray-700"}`}
                        style={{ minHeight: "44px" }}
                      >
                        <Circle className="w-5 h-5 transform scale-x-125" />
                      </button>
                    </div>
                  </>
                )}
                <button
                  onClick={handleDownload}
                  disabled={!processedImage || isProcessing}
                  className={`flex-1 sm:flex-initial inline-flex items-center justify-center px-3 py-2.5 border rounded-lg shadow-sm text-sm font-medium ${
                    !processedImage || isProcessing
                      ? "border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "border-green-500 bg-green-50 text-green-700 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  }`}
                  style={{ minHeight: "44px", minWidth: "120px" }} /* Better touch target */
                >
                  <Save className="w-5 h-5 mr-2" />
                  Download
                </button>
              </div>
            </div>

            {!isCircleSelectMode ? (
              <ImagePreview
                originalImage={originalImage}
                processedImage={processedImage}
              />
            ) : (
              <div className="relative border border-gray-300 rounded-lg overflow-hidden">
                <MultiShapeSelector
                  image={imageRef.current}
                  areas={areas}
                  setAreas={setAreas}
                  disabled={isProcessing}
                  selectedShapeType={selectedShapeType}
                />
              </div>
            )}

            <PrivacySlider
              value={privacyLevel}
              onChange={(newLevel) => {
                setPrivacyLevel(newLevel);
                // Show processing state immediately for better UX
                if (originalImage) {
                  setIsProcessing(true);
                }
              }}
              filterType={filterType}
              onFilterTypeChange={(newFilterType) => {
                setFilterType(newFilterType);
                // Show processing state immediately for better UX
                if (originalImage) {
                  setIsProcessing(true);
                }
              }}
              disabled={isProcessing || isModelLoading}
            />

            {isProcessing && (
              <div className="mt-4 text-center">
                <div className="inline-flex items-center px-3 sm:px-4 py-1 sm:py-2 bg-blue-50 text-blue-700 rounded-full text-xs sm:text-sm">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing your image with advanced AI...
                </div>
              </div>
            )}
          </div>
        )}

        <footer className="mt-6 sm:mt-12 text-center text-xs sm:text-sm text-gray-500 px-2">
          <p>
            PrivacyGnine - All processing happens in your browser. Your images
            never leave your device.
          </p>
          <p className="mt-1">Built with React.js and TensorFlow.js</p>
          <p className="mt-2 text-xs">
            &copy; {new Date().getFullYear()} PrivacyGnine -{" "}
            <a href="#" className="text-blue-500 hover:text-blue-700">
              Privacy Policy
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
