// Application Configuration - Easy to change settings

export const APP_CONFIG = {
  // Application Name
  appName: 'نظام إدارة المدرسة',
  
  // Theme Colors (HSL format)
  colors: {
    // Primary color (Academic Blue)
    primary: '205 52% 36%',
    primaryGlow: '205 52% 50%',
    
    // Secondary color (Light Gray)
    secondary: '210 20% 96%',
    
    // Accent color (Success Green)
    accent: '142 76% 36%',
    
    // Destructive color (Alert Red)
    destructive: '0 84% 60%',
  },
  
  // File Upload Settings
  fileUpload: {
    maxImageSize: 2 * 1024 * 1024, // 2MB
    maxVideoSize: 50 * 1024 * 1024, // 50MB
    maxDocumentSize: 10 * 1024 * 1024, // 10MB
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedVideoTypes: ['video/mp4', 'video/webm', 'video/ogg'],
    allowedDocumentTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
  },
  
  // Password Policy
  password: {
    minLength: 6,
    requireUppercase: false,
    requireLowercase: false,
    requireNumbers: false,
    requireSpecialChars: false,
  },
  
  // Username Policy
  username: {
    minLength: 3,
    maxLength: 20,
  },
  
  // Content Settings
  content: {
    titleMaxLength: 100,
    descriptionMaxLength: 1000,
  },
  
  // Pagination
  pagination: {
    itemsPerPage: 10,
  },
  
  // Code Protection (disable right-click, copy, etc.)
  security: {
    enableCodeProtection: true,
    disableRightClick: true,
    disableCopy: true,
    disableInspect: true,
  },
  
  // Default Admin Credentials (for initial setup)
  defaultAdmin: {
    username: 'admin',
    password: 'admin123',
  },
  
  // Default Teacher Credentials (for initial setup)
  defaultTeacher: {
    username: 'teacher1',
    password: 'teacher123',
  },
};

export default APP_CONFIG;
