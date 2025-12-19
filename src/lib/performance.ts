// Performance utilities for weak devices and slow networks

/**
 * Detect if device is weak (low-end device)
 */
export const isWeakDevice = (): boolean => {
  // Check hardware concurrency (CPU cores)
  const cores = navigator.hardwareConcurrency || 1;
  
  // Check device memory (if available)
  const memory = (navigator as any).deviceMemory || 4;
  
  // Check connection type
  const connection = (navigator as any).connection;
  const effectiveType = connection?.effectiveType || '4g';
  
  // Weak device criteria:
  // - Less than 4 CPU cores
  // - Less than 4GB RAM
  // - Slow connection (2g or slow-2g)
  return cores < 4 || memory < 4 || effectiveType === '2g' || effectiveType === 'slow-2g';
};

/**
 * Detect if network is slow
 */
export const isSlowNetwork = (): boolean => {
  const connection = (navigator as any).connection;
  if (!connection) return false;
  
  const effectiveType = connection.effectiveType;
  const downlink = connection.downlink; // Mbps
  
  // Slow network criteria:
  // - 2g or slow-2g connection
  // - Downlink less than 1 Mbps
  return effectiveType === '2g' || effectiveType === 'slow-2g' || downlink < 1;
};

/**
 * Get recommended image quality based on device and network
 */
export const getRecommendedImageQuality = (): 'low' | 'medium' | 'high' => {
  if (isWeakDevice() || isSlowNetwork()) {
    return 'low';
  }
  
  const connection = (navigator as any).connection;
  if (connection?.effectiveType === '3g') {
    return 'medium';
  }
  
  return 'high';
};

/**
 * Retry fetch with exponential backoff
 */
export const fetchWithRetry = async (
  url: string,
  options: RequestInit = {},
  maxRetries = 3,
  baseDelay = 1000
): Promise<Response> => {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      // If successful, return response
      if (response.ok) {
        return response;
      }
      
      // If 4xx error (client error), don't retry
      if (response.status >= 400 && response.status < 500) {
        return response;
      }
      
      // If 5xx error (server error), retry
      throw new Error(`Server error: ${response.status}`);
    } catch (error) {
      lastError = error as Error;
      
      // If last retry, throw error
      if (i === maxRetries - 1) {
        throw lastError;
      }
      
      // Wait before retrying (exponential backoff)
      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error('Fetch failed');
};

/**
 * Compress image before upload
 */
export const compressImage = async (
  file: File,
  maxWidth = 1920,
  maxHeight = 1080,
  quality = 0.8
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          file.type,
          quality
        );
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

/**
 * Lazy load images with Intersection Observer
 */
export const lazyLoadImage = (img: HTMLImageElement, src: string) => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          img.src = src;
          observer.unobserve(img);
        }
      });
    },
    {
      rootMargin: '50px'
    }
  );
  
  observer.observe(img);
  
  return () => observer.unobserve(img);
};

/**
 * Get optimal page size based on device and network
 */
export const getOptimalPageSize = (): number => {
  if (isWeakDevice() || isSlowNetwork()) {
    return 10; // Load fewer items
  }
  
  return 20; // Default page size
};

/**
 * Check if browser supports modern features
 */
export const supportsModernFeatures = (): boolean => {
  return (
    'IntersectionObserver' in window &&
    'fetch' in window &&
    'Promise' in window &&
    'localStorage' in window
  );
};

/**
 * Get connection info
 */
export const getConnectionInfo = () => {
  const connection = (navigator as any).connection;
  
  if (!connection) {
    return {
      effectiveType: 'unknown',
      downlink: 0,
      rtt: 0,
      saveData: false
    };
  }
  
  return {
    effectiveType: connection.effectiveType || 'unknown',
    downlink: connection.downlink || 0,
    rtt: connection.rtt || 0,
    saveData: connection.saveData || false
  };
};

/**
 * Preload critical resources
 */
export const preloadCriticalResources = (urls: string[]) => {
  urls.forEach((url) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'fetch';
    link.href = url;
    document.head.appendChild(link);
  });
};

/**
 * Debounce function for performance
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function for performance
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};
