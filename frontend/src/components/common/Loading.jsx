import React from 'react';

// Loading Spinner Component
export const LoadingSpinner = ({ size = 'md', color = 'blue' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colorClasses = {
    blue: 'text-blue-600',
    white: 'text-white',
    gray: 'text-gray-600',
    green: 'text-green-600',
    red: 'text-red-600'
  };

  return (
    <div className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`}>
      <svg fill="none" viewBox="0 0 24 24">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
};

// Loading Button Component
export const LoadingButton = ({ 
  loading, 
  children, 
  disabled, 
  className = '',
  loadingText = 'กำลังโหลด...',
  ...props 
}) => {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`
        relative inline-flex items-center justify-center
        ${loading ? 'cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {loading && (
        <LoadingSpinner size="sm" color="white" />
      )}
      <span className={loading ? 'ml-2' : ''}>
        {loading ? loadingText : children}
      </span>
    </button>
  );
};

// Full Page Loading Component
export const PageLoading = ({ message = 'กำลังโหลด...' }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <LoadingSpinner size="xl" color="blue" />
        <p className="mt-4 text-gray-600">{message}</p>
      </div>
    </div>
  );
};

// Overlay Loading Component
export const OverlayLoading = ({ message = 'กำลังโหลด...' }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 text-center">
        <LoadingSpinner size="lg" color="blue" />
        <p className="mt-4 text-gray-700">{message}</p>
      </div>
    </div>
  );
};

// Table Loading Component
export const TableLoading = ({ columns = 4, rows = 5 }) => {
  return (
    <div className="animate-pulse">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="border-b border-gray-200">
          <div className="px-6 py-4 flex space-x-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div
                key={colIndex}
                className="flex-1 h-4 bg-gray-200 rounded"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Card Loading Component
export const CardLoading = () => {
  return (
    <div className="animate-pulse">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
        <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
      </div>
    </div>
  );
};

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center">
      <LoadingSpinner size="xl" color="blue" />
      <p className="mt-4 text-gray-600 text-center">กำลังโหลด...</p>
    </div>
  );
}