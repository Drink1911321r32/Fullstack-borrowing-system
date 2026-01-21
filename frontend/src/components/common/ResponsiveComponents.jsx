import React from 'react';
import PropTypes from 'prop-types';

/**
 * Responsive Card Component
 * รองรับทุกขนาดหน้าจอ
 */
export const ResponsiveCard = ({ 
  title, 
  subtitle,
  children, 
  className = '',
  actions 
}) => (
  <div className={`
    bg-white rounded-lg shadow-md 
    p-3 sm:p-4 md:p-6 lg:p-8
    mb-3 sm:mb-4 md:mb-6
    transition-shadow duration-200 hover:shadow-lg
    ${className}
  `}>
    {(title || subtitle) && (
      <div className="mb-3 sm:mb-4 md:mb-6 pb-3 sm:pb-4 border-b border-gray-200">
        {title && (
          <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900 mb-1">
            {title}
          </h3>
        )}
        {subtitle && (
          <p className="text-xs sm:text-sm md:text-base text-gray-600">
            {subtitle}
          </p>
        )}
      </div>
    )}
    
    <div className="space-y-2 sm:space-y-3 md:space-y-4">
      {children}
    </div>
    
    {actions && (
      <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200 flex flex-col sm:flex-row gap-2 sm:gap-3">
        {actions}
      </div>
    )}
  </div>
);

ResponsiveCard.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  actions: PropTypes.node
};

/**
 * Responsive Button Component
 * ปรับขนาดและแสดงข้อความตามหน้าจอ
 */
export const ResponsiveButton = ({ 
  icon: Icon, 
  children, 
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  iconOnly = false,
  ...props 
}) => {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-yellow-500 hover:bg-yellow-600 text-white',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50'
  };
  
  const sizes = {
    sm: 'px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm',
    md: 'px-3 sm:px-4 md:px-6 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base',
    lg: 'px-4 sm:px-6 md:px-8 py-3 sm:py-3.5 md:py-4 text-base sm:text-lg'
  };
  
  return (
    <button 
      className={`
        flex items-center justify-center gap-1 sm:gap-2
        rounded-lg transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        font-medium
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${iconOnly ? 'aspect-square p-2 sm:p-2.5 md:p-3' : ''}
      `}
      {...props}
    >
      {Icon && <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />}
      {!iconOnly && <span className={Icon ? 'hidden sm:inline' : ''}>{children}</span>}
    </button>
  );
};

ResponsiveButton.propTypes = {
  icon: PropTypes.elementType,
  children: PropTypes.node,
  variant: PropTypes.oneOf(['primary', 'secondary', 'success', 'danger', 'warning', 'outline']),
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  fullWidth: PropTypes.bool,
  iconOnly: PropTypes.bool
};

/**
 * Responsive Grid Component
 * Grid ที่ปรับจำนวนคอลัมน์อัตโนมัติ
 */
export const ResponsiveGrid = ({ 
  children, 
  cols = { xs: 1, sm: 2, md: 3, lg: 4, xl: 6 },
  gap = 4,
  className = ''
}) => {
  const colsClass = `
    grid
    grid-cols-${cols.xs || 1}
    sm:grid-cols-${cols.sm || 2}
    md:grid-cols-${cols.md || 3}
    lg:grid-cols-${cols.lg || 4}
    xl:grid-cols-${cols.xl || cols.lg || 4}
    2xl:grid-cols-${cols['2xl'] || cols.xl || cols.lg || 4}
    gap-${gap}
  `;
  
  return (
    <div className={`${colsClass} ${className}`}>
      {children}
    </div>
  );
};

ResponsiveGrid.propTypes = {
  children: PropTypes.node.isRequired,
  cols: PropTypes.object,
  gap: PropTypes.number,
  className: PropTypes.string
};

/**
 * Responsive Table Component
 * แสดง table บน desktop, cards บน mobile
 */
export const ResponsiveTable = ({ 
  data = [], 
  columns = [],
  onRowClick,
  emptyMessage = 'ไม่พบข้อมูล'
}) => {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 sm:py-12 text-gray-500">
        {emptyMessage}
      </div>
    );
  }
  
  return (
    <>
      {/* Desktop Table */}
      <div className="hidden lg:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map(col => (
                <th 
                  key={col.key} 
                  className="px-4 xl:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, idx) => (
              <tr 
                key={row.id || idx}
                onClick={() => onRowClick && onRowClick(row)}
                className={onRowClick ? 'hover:bg-gray-50 cursor-pointer transition' : ''}
              >
                {columns.map(col => (
                  <td 
                    key={col.key} 
                    className="px-4 xl:px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                  >
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Mobile Cards */}
      <div className="lg:hidden space-y-3 sm:space-y-4">
        {data.map((row, idx) => (
          <div 
            key={row.id || idx}
            onClick={() => onRowClick && onRowClick(row)}
            className={`
              bg-white rounded-lg shadow p-3 sm:p-4 space-y-2
              ${onRowClick ? 'cursor-pointer hover:shadow-md transition' : ''}
            `}
          >
            {columns.map(col => (
              <div key={col.key} className="flex justify-between items-start gap-4 py-1">
                <span className="text-xs sm:text-sm font-medium text-gray-600 flex-shrink-0">
                  {col.label}:
                </span>
                <span className="text-xs sm:text-sm text-gray-900 text-right">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
};

ResponsiveTable.propTypes = {
  data: PropTypes.array.isRequired,
  columns: PropTypes.arrayOf(PropTypes.shape({
    key: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    render: PropTypes.func
  })).isRequired,
  onRowClick: PropTypes.func,
  emptyMessage: PropTypes.string
};

/**
 * Responsive Modal Component
 * Modal ที่ปรับขนาดตามหน้าจอ
 */
export const ResponsiveModal = ({ 
  isOpen, 
  onClose, 
  title,
  children,
  footer,
  size = 'md',
  closable = true
}) => {
  if (!isOpen) return null;
  
  const sizes = {
    sm: 'max-w-sm sm:max-w-md',
    md: 'max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl',
    lg: 'max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-3xl',
    xl: 'max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-4xl xl:max-w-5xl',
    full: 'max-w-full mx-4'
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={closable ? onClose : undefined}
      />
      <div className={`
        relative bg-white rounded-lg shadow-xl 
        w-full ${sizes[size]}
        max-h-[95vh] sm:max-h-[90vh] 
        flex flex-col
        animate-fade-in
      `}>
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-3 sm:p-4 md:p-6 border-b border-gray-200">
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900">
              {title}
            </h3>
            {closable && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition p-1 rounded-lg hover:bg-gray-100"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
        
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          {children}
        </div>
        
        {/* Footer */}
        {footer && (
          <div className="p-3 sm:p-4 md:p-6 border-t border-gray-200 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

ResponsiveModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  children: PropTypes.node.isRequired,
  footer: PropTypes.node,
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl', 'full']),
  closable: PropTypes.bool
};

/**
 * Responsive Stats Card
 * Card สำหรับแสดงสถิติ
 */
export const ResponsiveStatsCard = ({
  label,
  value,
  icon: Icon,
  color = 'blue',
  trend,
  trendValue
}) => {
  const colors = {
    blue: 'border-blue-500 text-blue-500',
    green: 'border-green-500 text-green-500',
    yellow: 'border-yellow-500 text-yellow-500',
    red: 'border-red-500 text-red-500',
    indigo: 'border-indigo-500 text-indigo-500',
    purple: 'border-purple-500 text-purple-500',
    pink: 'border-pink-500 text-pink-500',
    gray: 'border-gray-500 text-gray-500'
  };
  
  return (
    <div className={`bg-white rounded-lg shadow p-3 sm:p-4 border-l-4 ${colors[color]} transition-transform hover:scale-105`}>
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm text-gray-600 truncate mb-1">
            {label}
          </p>
          <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">
            {value}
          </p>
          {(trend || trendValue) && (
            <div className="flex items-center gap-1 mt-1">
              {trend && (
                <span className={`text-xs ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  {trend === 'up' ? '↑' : '↓'}
                </span>
              )}
              {trendValue && (
                <span className="text-xs text-gray-500">{trendValue}</span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <Icon className={`${colors[color]} flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8`} />
        )}
      </div>
    </div>
  );
};

ResponsiveStatsCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  icon: PropTypes.elementType,
  color: PropTypes.string,
  trend: PropTypes.oneOf(['up', 'down']),
  trendValue: PropTypes.string
};

/**
 * Responsive Input Field
 */
export const ResponsiveInput = ({
  label,
  icon: Icon,
  error,
  helper,
  className = '',
  ...props
}) => (
  <div className="mb-3 sm:mb-4">
    {label && (
      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
        {label}
      </label>
    )}
    <div className="relative">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
        </div>
      )}
      <input
        className={`
          w-full rounded-lg border border-gray-300
          px-3 sm:px-4 py-2 sm:py-2.5
          text-sm sm:text-base
          ${Icon ? 'pl-10' : ''}
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${error ? 'border-red-500 focus:ring-red-500' : ''}
          ${className}
        `}
        {...props}
      />
    </div>
    {error && (
      <p className="mt-1 text-xs sm:text-sm text-red-600">{error}</p>
    )}
    {helper && !error && (
      <p className="mt-1 text-xs sm:text-sm text-gray-500">{helper}</p>
    )}
  </div>
);

ResponsiveInput.propTypes = {
  label: PropTypes.string,
  icon: PropTypes.elementType,
  error: PropTypes.string,
  helper: PropTypes.string,
  className: PropTypes.string
};

export default {
  ResponsiveCard,
  ResponsiveButton,
  ResponsiveGrid,
  ResponsiveTable,
  ResponsiveModal,
  ResponsiveStatsCard,
  ResponsiveInput
};
