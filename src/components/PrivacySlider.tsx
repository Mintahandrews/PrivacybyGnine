import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Shield, Sliders, Image, Grid, Layers, Zap } from 'lucide-react';
import { FilterType } from '../tf/autoencoderModel';

interface PrivacySliderProps {
  value: number;
  onChange: (value: number) => void;
  onFilterTypeChange?: (filterType: FilterType) => void;
  filterType?: FilterType;
  disabled: boolean;
}

const PrivacySlider: React.FC<PrivacySliderProps> = ({ 
  value, 
  onChange, 
  onFilterTypeChange,
  filterType = FilterType.BASIC,
  disabled 
}) => {
  const [presetMenuOpen, setPresetMenuOpen] = useState(false);
  
  // Preset privacy configurations for quick selection
  const presets = [
    { name: "Light", level: 25, filter: FilterType.BASIC, description: "Subtle protection" },
    { name: "Standard", level: 50, filter: FilterType.GAUSSIAN, description: "Balanced protection" },
    { name: "Strong", level: 75, filter: FilterType.PIXELATE, description: "High protection" },
    { name: "Maximum", level: 100, filter: FilterType.COLOR_QUANTIZE, description: "Complete anonymity" },
  ];
  
  // Apply a preset configuration
  const applyPreset = (preset: typeof presets[0]) => {
    onChange(preset.level);
    if (onFilterTypeChange) {
      onFilterTypeChange(preset.filter);
    }
    setPresetMenuOpen(false);
  };
  // Determine the current privacy level category
  const getPrivacyLevelInfo = (level: number) => {
    if (level <= 20) {
      return {
        label: "Minimal Protection",
        description: "Basic anonymization with minimal image quality impact",
        icon: <Eye className="w-5 h-5 text-yellow-500" />
      };
    } else if (level <= 40) {
      return {
        label: "Low Protection",
        description: "Light smoothing effect to obscure minor details",
        icon: <Shield className="w-5 h-5 text-yellow-400" />
      };
    } else if (level <= 60) {
      return {
        label: "Medium Protection",
        description: "Moderate abstraction with noise to hide identifiable features",
        icon: <Shield className="w-5 h-5 text-blue-500" />
      };
    } else if (level <= 80) {
      return {
        label: "High Protection",
        description: "Significant pixelation for strong anonymization",
        icon: <EyeOff className="w-5 h-5 text-purple-600" />
      };
    } else {
      return {
        label: "Maximum Protection",
        description: "Heavy pixelation and color reduction for complete anonymity",
        icon: <Lock className="w-5 h-5 text-red-600" />
      };
    }
  };

  const levelInfo = getPrivacyLevelInfo(value);

  // Calculate the background gradient for the slider
  const getSliderBackground = () => {
    return `linear-gradient(to right, 
      rgb(34, 197, 94) 0%, 
      rgb(234, 179, 8) 25%, 
      rgb(59, 130, 246) 50%, 
      rgb(147, 51, 234) 75%, 
      rgb(239, 68, 68) 100%)`;
  };

  // Filter type options with icons and descriptions
  const filterOptions = [
    {
      type: FilterType.BASIC,
      label: "Basic",
      icon: <Shield className="w-4 h-4" />,
      description: "Standard autoencoder-based privacy protection"
    },
    {
      type: FilterType.EDGE_ENHANCE,
      label: "Edge Enhance",
      icon: <Layers className="w-4 h-4" />,
      description: "Preserves edges while obscuring details"
    },
    {
      type: FilterType.GAUSSIAN,
      label: "Gaussian",
      icon: <Image className="w-4 h-4" />,
      description: "Smooth blur effect for natural anonymization"
    },
    {
      type: FilterType.PIXELATE,
      label: "Pixelate",
      icon: <Grid className="w-4 h-4" />,
      description: "Classic pixelation effect for strong privacy"
    },
    {
      type: FilterType.COLOR_QUANTIZE,
      label: "Color Reduce",
      icon: <Sliders className="w-4 h-4" />,
      description: "Reduces color information while preserving structure"
    }
  ];

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
        <div className="flex items-center space-x-2">
          {levelInfo.icon}
          <div>
            <h3 className="text-sm sm:text-base font-medium text-gray-800">{levelInfo.label}</h3>
            <p className="text-xs text-gray-500 max-w-xs sm:max-w-sm">{levelInfo.description}</p>
          </div>
        </div>
        
        <div className="text-lg sm:text-xl font-bold text-gray-700">
          {value}%
        </div>
      </div>
      
      <div className="mb-2">
        <div className="text-sm font-medium text-gray-700">
          {levelInfo.label}
        </div>
        <div className="text-xs text-gray-500">
          {levelInfo.description}
        </div>
      </div>
      
      {/* Filter Type Selection */}
      <div className="mt-4 sm:mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 sm:mb-3 gap-2 sm:gap-0">
          <h3 className="text-sm sm:text-base font-medium text-gray-800">Filter Type</h3>
          
          <div className="relative self-start">
            <button
              onClick={() => setPresetMenuOpen(!presetMenuOpen)}
              className="text-xs sm:text-sm flex items-center px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700"
              disabled={disabled}
              aria-expanded={presetMenuOpen}
              aria-haspopup="true"
            >
              <Zap className="w-3 h-3 mr-1" />
              Quick Presets
            </button>
            
            {presetMenuOpen && (
              <div className="absolute right-0 z-10 mt-1 w-48 sm:w-56 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                  {presets.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => applyPreset(preset)}
                      className="flex items-center justify-between w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      role="menuitem"
                    >
                      <div className="flex items-center">
                        <span className="font-medium">{preset.name}</span>
                        <span className="ml-2 text-xs text-gray-500">{preset.level}%</span>
                      </div>
                      <span className="text-xs text-gray-500">{preset.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1 sm:gap-2">
          {filterOptions.map((option) => (
            <button
              key={option.type}
              onClick={() => onFilterTypeChange && onFilterTypeChange(option.type)}
              disabled={disabled}
              className={`flex flex-col items-center justify-center p-1 sm:p-2 rounded-md border transition-all ${filterType === option.type 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:bg-gray-50'} 
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center mb-1">
                {option.icon}
                <span className="text-xs font-medium ml-1">{option.label}</span>
              </div>
              <span className="text-[10px] sm:text-xs text-gray-500 text-center line-clamp-2" style={{ minHeight: '1.8rem' }}>
                {option.description}
              </span>
            </button>
          ))}
        </div>
      </div>
      
      <div className="relative mt-4">
        <input
          id="privacy-slider"
          type="range"
          min="0"
          max="100"
          step="5"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          disabled={disabled}
          aria-label="Privacy protection level"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={value}
          aria-valuetext={`${value}% - ${getPrivacyLevelInfo(value).label}`}
          className="w-full h-3 appearance-none rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: getSliderBackground(),
            WebkitAppearance: 'none',
            appearance: 'none'
          }}
        />
        
        <div className="flex justify-between mt-1 px-1 text-[10px] sm:text-xs text-gray-500">
          <span>Original</span>
          <span>Low</span>
          <span>Medium</span>
          <span>High</span>
          <span>Maximum</span>
        </div>
      </div>
      
      <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-blue-50 border border-blue-100 rounded-lg">
        <h4 className="text-xs font-semibold text-blue-700 mb-1">Privacy Level Effects:</h4>
        <ul className="text-[10px] sm:text-xs text-gray-600 space-y-1">
          <li>• 0-20%: Basic autoencoder compression</li>
          <li>• 20-40%: Light smoothing of details</li>
          <li>• 40-60%: Moderate noise and abstraction</li>
          <li>• 60-80%: Significant pixelation</li>
          <li>• 80-100%: Maximum anonymization with color reduction</li>
        </ul>
        <div className="mt-3 border-t border-blue-100 pt-2">
          <p className="text-[10px] sm:text-xs text-gray-600">
            <span className="font-semibold">Tip:</span> Use the quick presets for recommended privacy configurations, or combine any privacy level with your preferred filter type for custom results.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacySlider;
