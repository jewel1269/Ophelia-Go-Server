import { UAParser } from 'ua-parser-js';
import { Request } from 'express';

export interface DeviceInfo {
  userId: string;
  ipAddress: string;
  deviceType: string;
  os: string;
  browser: string;
}

export const trackDevice = (userId: string, req: Request): DeviceInfo => {
  const ipAddress =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';

  const userAgent = req.headers['user-agent'] || '';
  const parser = new UAParser(userAgent);
  const ua = parser.getResult();

  return {
    userId,
    ipAddress,
    deviceType: ua.device.type || 'desktop',
    os: ua.os.name || 'unknown',
    browser: ua.browser.name || 'unknown',
  };
};
