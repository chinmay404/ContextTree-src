import fs from 'fs';
import path from 'path';

// Log file in the project root
const LOG_FILE_PATH = path.join(process.cwd(), 'api-upload-logs.log');

/**
 * Appends a log entry to the server-side log file.
 * This should only be called from Server Components or API Routes.
 */
export function logUploadEvent(level: 'INFO' | 'ERROR' | 'WARN', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const dataString = data ? (data instanceof Error ? data.toString() : JSON.stringify(data)) : '';
  const logEntry = `[${timestamp}] [${level}] ${message} ${dataString}\n`;
  
  // Always log to console as well for container logs
  const consoleMethod = level === 'ERROR' ? console.error : (level === 'WARN' ? console.warn : console.log);
  consoleMethod(`[UploadLog] ${message}`, data);

  try {
    // Determine if we are in a server environment where fs is available
    if (typeof window === 'undefined') {
        fs.appendFileSync(LOG_FILE_PATH, logEntry);
    }
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}
