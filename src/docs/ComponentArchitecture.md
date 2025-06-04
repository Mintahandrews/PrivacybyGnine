# PrivacyGnine: Component Architecture & Data Flow

This document provides an overview of the key components in the PrivacyGnine application and how they interact to provide privacy-enhanced image processing.

## Core Components

### 1. `App.tsx` (Main Application Controller)
The central component that orchestrates the application flow, manages state, and coordinates between other components. It handles:
- TensorFlow.js model initialization
- Global state management
- Error handling
- Component coordination

### 2. `ImageUploader.tsx`
Responsible for image input with the following features:
- Drag-and-drop interface via react-dropzone
- File type validation (images only)
- Visual feedback during drag states
- Privacy messaging for user trust

```jsx
// Key interaction pattern
<ImageUploader onImageUpload={handleImageUpload} />
```

### 3. `ImagePreview.tsx`
Handles side-by-side display of original and processed images:
- Canvas-based rendering for both images
- Proper scaling and aspect ratio maintenance
- Loading state visualization
- Efficient re-rendering when images change

```jsx
// Key interaction pattern
<ImagePreview 
  originalImage={originalImage} 
  processedImage={processedImage} 
/>
```

### 4. `PrivacySlider.tsx`
Controls the level of privacy filtering applied:
- Range slider from 0-100%
- Visual indicators for different privacy levels
- Descriptive labels that change based on level
- Icons that represent different privacy strengths

```jsx
// Key interaction pattern
<PrivacySlider
  value={privacyLevel}
  onChange={setPrivacyLevel}
  disabled={isProcessing}
/>
```

### 5. TensorFlow.js Integration (`autoencoderModel.ts`)
Handles the ML-based image processing:
- Autoencoder model for basic anonymization
- Additional effects based on privacy level:
  - 0-20%: Basic compression
  - 20-40%: Light smoothing
  - 40-60%: Moderate noise and abstraction
  - 60-80%: Significant pixelation
  - 80-100%: Maximum anonymization with color reduction

## Data Flow & Communication

### Image Upload Flow
1. User uploads image via `ImageUploader`
2. `App` receives file through `handleImageUpload` callback
3. Image URL created with `URL.createObjectURL`
4. `originalImage` state updated
5. HTML Image element loaded and stored in `imageRef`
6. Initial processing triggered

### Processing Flow
1. Privacy level changes (slider movement)
2. `useEffect` in `App` detects change
3. `processImage` function called with current image and privacy level
4. TensorFlow processes image using autoencoder model
5. Additional effects applied based on privacy level
6. Resulting image data URL stored in `processedImage` state
7. `ImagePreview` component re-renders with new image

### Download Flow
1. User clicks download button
2. `handleDownload` converts data URL to Blob
3. FileSaver.js saves the image to user's device

## State Management

The application uses React's built-in state management with:
- `useState` for component-specific state
- `useRef` for mutable values that don't trigger re-renders
- `useEffect` for side effects and lifecycle management

Key state variables:
- `originalImage`: URL of the uploaded image
- `processedImage`: URL of the processed image
- `privacyLevel`: Numeric value (0-100) controlling privacy strength
- `isProcessing`: Boolean indicating active processing
- `error`: Error message state

## Memory Management

TensorFlow.js requires careful memory handling:
- `tf.tidy()` used to automatically clean up tensors
- Model disposed of when component unmounts
- Throttling/debouncing used to prevent excessive processing

## Security & Privacy

- All processing happens client-side
- No data leaves the user's browser
- No server-side storage of images
- No tracking or analytics on image content

This architecture ensures a responsive, private, and efficient image anonymization experience.
