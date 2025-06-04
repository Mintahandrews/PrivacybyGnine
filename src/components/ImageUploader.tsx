import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload }) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      onImageUpload(acceptedFiles[0]);
    }
  }, [onImageUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxFiles: 1,
    multiple: false
  });

  return (
    <div 
      {...getRootProps()} 
      className={`flex flex-col items-center justify-center w-full p-4 sm:p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 ${
        isDragActive 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-300 bg-white hover:bg-gray-50'
      }`}
    >
      <input {...getInputProps()} />
      <Upload className="w-8 h-8 sm:w-12 sm:h-12 mb-2 sm:mb-4 text-gray-400" />
      <p className="text-base sm:text-lg font-medium text-gray-700 text-center">Drop your image here, or click to select</p>
      <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-500 text-center">
        Supported formats: JPEG, PNG, GIF, WebP
      </p>
      <p className="mt-1 text-xs text-gray-400 text-center max-w-xs">
        Your images remain private - processing happens only in your browser
      </p>
    </div>
  );
};

export default ImageUploader;
