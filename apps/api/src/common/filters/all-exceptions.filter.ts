import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let error = 'Internal Server Error';
    let message = 'An unexpected error occurred. Please try again.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, any>;
        error = resObj.error || exception.name;
        if (Array.isArray(resObj.message)) {
          message = resObj.message.join('. ');
        } else if (typeof resObj.message === 'string') {
          message = resObj.message;
        } else {
          message = exception.message;
        }
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002': {
          status = HttpStatus.CONFLICT;
          error = 'Conflict';
          const target = (exception.meta?.target as string[] | string) || '';
          const targetStr = Array.isArray(target) ? target.join(', ') : String(target);
          if (targetStr.includes('email')) {
            message = 'A user with this email address already exists.';
          } else if (targetStr.includes('key') || targetStr.includes('projectKey')) {
            message = 'A project or resource with this unique key already exists.';
          } else if (targetStr.includes('issueKey')) {
            message = 'A defect with this issue key already exists.';
          } else if (targetStr.includes('reqKey')) {
            message = 'A requirement with this key already exists.';
          } else if (targetStr.includes('projectId') && targetStr.includes('userId')) {
            message = 'This user is already a member of this project.';
          } else if (targetStr) {
            message = `A record with this ${targetStr} already exists.`;
          } else {
            message = 'A record with these unique details already exists.';
          }
          break;
        }
        case 'P2003': {
          status = HttpStatus.BAD_REQUEST;
          error = 'Foreign Key Constraint';
          const fieldName = (exception.meta?.field_name as string) || '';
          message = fieldName
            ? `Referenced entity (${fieldName}) does not exist or cannot be modified.`
            : 'Referenced record does not exist or cannot be deleted due to existing dependencies.';
          break;
        }
        case 'P2025': {
          status = HttpStatus.NOT_FOUND;
          error = 'Not Found';
          message = (exception.meta?.cause as string) || 'The requested record was not found or has already been removed.';
          break;
        }
        case 'P2000': {
          status = HttpStatus.BAD_REQUEST;
          error = 'Bad Request';
          message = 'The provided value exceeds the maximum allowed length for this field.';
          break;
        }
        case 'P2014': {
          status = HttpStatus.BAD_REQUEST;
          error = 'Relation Violation';
          message = 'The change you are trying to make violates a required relation between records.';
          break;
        }
        default: {
          status = HttpStatus.BAD_REQUEST;
          error = 'Database Error';
          message = (exception.meta?.cause as string) || exception.message.split('\n').pop() || 'A database error occurred.';
          break;
        }
      }
      this.logger.warn(`Prisma Error [${exception.code}]: ${message} (Path: ${request.url})`);
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      error = 'Validation Error';
      // Extract human-readable line from Prisma validation message
      const lines = exception.message.split('\n').filter((l) => l.trim() && !l.includes('Invalid `prisma.'));
      message = lines.pop() || 'Invalid data provided for database operation.';
      this.logger.warn(`Prisma Validation Error: ${message} (Path: ${request.url})`);
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      error = exception.name || 'Internal Server Error';
      message = exception.message || 'An unexpected error occurred.';
      this.logger.error(`Unhandled Exception at ${request.method} ${request.url}: ${exception.message}`, exception.stack);
    } else {
      this.logger.error(`Unknown Exception at ${request.method} ${request.url}:`, exception);
    }

    response.status(status).json({
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
