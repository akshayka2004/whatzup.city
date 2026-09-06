import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '@saas/database';
import { JsonLoggerService } from '../logger/json-logger.service';

@Catch()
export class SecurityExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: JsonLoggerService) {}

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: any = 'Internal server error';

    // 1. Handle HTTP Exceptions (NestJS standard exceptions)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resObj = exception.getResponse();
      message = typeof resObj === 'object' && resObj !== null && 'message' in resObj
        ? (resObj as any).message
        : exception.message;
    }
    // 2. Handle Prisma Database Engine Exceptions
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      this.logger.error(`[Prisma Client Error Code ${exception.code}]: ${exception.message}`, exception.stack, 'Database');
      
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          message = 'Resource already exists';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Resource not found';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          message = 'Invalid relation reference';
          break;
        // Schema drift — the running process's Prisma Client (or the DB
        // itself) doesn't have a table/column the code just tried to use.
        // Near-certain cause: a deploy applied new code without running
        // `prisma migrate deploy` + `prisma generate` first, or PM2 never
        // restarted onto the new build. Same fix either way: redeploy.
        case 'P2021':
        case 'P2022':
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          message = 'Database schema is out of date for this build — re-run the deploy (migrate + generate + restart).';
          break;
        default:
          status = HttpStatus.BAD_REQUEST;
          // This filter is a global APP_FILTER — it also wraps public,
          // unauthenticated routes, so the raw Prisma message (which often
          // names tables/columns/constraints) must never go in the response.
          // The opaque code is enough to grep PM2 logs for the real detail,
          // which is already logged above in full.
          message = `Database operation failed (${exception.code})`;
          break;
      }
    }
    // 3. Fallback for other standard JavaScript errors
    else {
      const errorMessage = exception instanceof Error ? exception.message : String(exception);
      const errorStack = exception instanceof Error ? exception.stack : undefined;

      this.logger.error(`[Unhandled Exception]: ${errorMessage}`, errorStack, 'System');

      // Always surface the message — generic "Internal server error" makes debugging impossible
      // for end users on bare-metal deployments. The filter still hides the stack trace.
      message = errorMessage || message;
    }

    // Always log the details internally for developers
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `Critical error response generated (500): ${typeof message === 'string' ? message : JSON.stringify(message)}`,
        undefined,
        'ExceptionFilter',
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
