import axios from 'axios';
import http from 'http';
import https from 'https';
import logger from './logger';

// Create HTTP agents with connection pooling
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
  keepAliveMsecs: 30000
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
  keepAliveMsecs: 30000
});

// Configure axios defaults
axios.defaults.timeout = 30000; // 30 seconds
axios.defaults.httpAgent = httpAgent;
axios.defaults.httpsAgent = httpsAgent;

// Add response interceptor for cleanup
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log and cleanup on error
    if (error.code === 'ECONNABORTED') {
      logger.error('Request timeout:', error.config?.url);
    }
    return Promise.reject(error);
  }
);

export default axios;
