import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFiles,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { AttachmentsService, UploadFileItem } from './attachments.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('bugs/:bugId/attachments')
export class AttachmentsController {
  constructor(private readonly svc: AttachmentsService) {}

  @Get()
  getAttachments(@Param('bugId') bugId: string) {
    return this.svc.getAttachments(bugId);
  }

  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      limits: { fileSize: 15 * 1024 * 1024 }, // 15MB per file
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp|svg\+xml)$/i)) {
          return cb(new BadRequestException('Only image files (PNG, JPG, JPEG, WEBP, GIF, SVG) are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  )
  uploadAttachments(
    @Param('bugId') bugId: string,
    @UploadedFiles() files: Array<UploadFileItem>,
    @CurrentUser() user: any,
  ) {
    return this.svc.saveUploadedFiles(bugId, files, user.id);
  }

  @Public()
  @Get(':id/file')
  async getAttachmentFile(
    @Param('bugId') bugId: string,
    @Param('id') attachmentId: string,
    @Res() res: Response,
  ) {
    const { filePath, mimeType, fileName } = await this.svc.getAttachmentFile(bugId, attachmentId);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    return res.sendFile(filePath);
  }

  @Delete(':id')
  deleteAttachment(
    @Param('bugId') bugId: string,
    @Param('id') attachmentId: string,
    @CurrentUser() user: any,
  ) {
    return this.svc.deleteAttachment(bugId, attachmentId, user.id, user.globalRole === 'ADMIN');
  }

  @Post('presigned-url')
  getPresignedUrl(
    @Param('bugId') bugId: string,
    @Body() body: { fileName: string; mimeType: string; fileSizeBytes: number },
    @CurrentUser() user: any,
  ) {
    return this.svc.getPresignedUrl(bugId, body, user.id);
  }

  @Post('confirm')
  confirmUpload(
    @Param('bugId') bugId: string,
    @Body() body: { attachmentId: string },
  ) {
    return this.svc.confirmUpload(bugId, body.attachmentId);
  }
}
