import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { AttachmentsService } from './attachments.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('bugs/:bugId/attachments')
export class AttachmentsController {
  constructor(private readonly svc: AttachmentsService) {}

  @Get()
  getAttachments(@Param('bugId') bugId: string) {
    return this.svc.getAttachments(bugId);
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
