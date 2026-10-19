// Centralized API Base configuration for Ember & Ash
// In production behind Nginx reverse proxy, relative paths ('') ensure same-origin requests
// In development, defaults to 'http://localhost:5000' unless overridden via REACT_APP_API_URL

export const API_BASE_URL =
  process.env.REACT_APP_API_URL !== undefined
    ? process.env.REACT_APP_API_URL
    : process.env.NODE_ENV === 'production'
    ? ''
    : 'http://localhost:5000';
