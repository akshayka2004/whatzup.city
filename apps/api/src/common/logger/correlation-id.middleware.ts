import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { loggerLocalStorage } from './logger.context';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();

    // Set headers for response tracking
    res.setHeader('x-correlation-id', correlationId);

    // Run the request inside the AsyncLocalStorage scope
    loggerLocalStorage.run({ correlationId }, () => {
      next();
    });
  }
}
