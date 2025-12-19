// Performance Indicator Component for Weak Devices

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Signal, SignalLow, SignalMedium, SignalHigh } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getConnectionInfo, isSlowNetwork, isWeakDevice } from '@/lib/performance';

const PerformanceIndicator: React.FC = () => {
  const [connectionInfo, setConnectionInfo] = useState(getConnectionInfo());
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    // Only show indicator if device is weak or network is slow
    setShowIndicator(isWeakDevice() || isSlowNetwork());

    // Update connection info periodically
    const interval = setInterval(() => {
      setConnectionInfo(getConnectionInfo());
    }, 5000);

    // Listen for connection changes
    const connection = (navigator as any).connection;
    if (connection) {
      const handleChange = () => setConnectionInfo(getConnectionInfo());
      connection.addEventListener('change', handleChange);
      
      return () => {
        connection.removeEventListener('change', handleChange);
        clearInterval(interval);
      };
    }

    return () => clearInterval(interval);
  }, []);

  if (!showIndicator) return null;

  const getSignalIcon = () => {
    const { effectiveType } = connectionInfo;
    
    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      return <SignalLow className="w-3 h-3" />;
    }
    
    if (effectiveType === '3g') {
      return <SignalMedium className="w-3 h-3" />;
    }
    
    return <SignalHigh className="w-3 h-3" />;
  };

  const getConnectionLabel = () => {
    const { effectiveType, saveData } = connectionInfo;
    
    if (saveData) {
      return 'Data Saver';
    }
    
    if (effectiveType === 'slow-2g') {
      return 'Very Slow';
    }
    
    if (effectiveType === '2g') {
      return 'Slow';
    }
    
    if (effectiveType === '3g') {
      return 'Medium';
    }
    
    return 'Fast';
  };

  const getVariant = (): 'default' | 'secondary' | 'destructive' | 'outline' => {
    const { effectiveType } = connectionInfo;
    
    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      return 'destructive';
    }
    
    if (effectiveType === '3g') {
      return 'secondary';
    }
    
    return 'default';
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Badge variant={getVariant()} className="flex items-center gap-2 px-3 py-1.5">
        {getSignalIcon()}
        <span className="text-xs">{getConnectionLabel()}</span>
      </Badge>
    </div>
  );
};

export default PerformanceIndicator;
