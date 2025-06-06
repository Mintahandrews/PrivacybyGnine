import React from 'react';
import logo from '../assets/logo.svg';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 'medium', className = '' }) => {
  const sizeClasses = {
    small: 'h-6 w-6',
    medium: 'h-8 w-8',
    large: 'h-12 w-12'
  };

  return (
    <img 
      src={logo} 
      alt="PrivacyGnine Logo" 
      className={`${sizeClasses[size]} ${className}`} 
    />
  );
};

export default Logo;
