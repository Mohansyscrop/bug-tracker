import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

export class CreateCommentDto {
  bodyMarkdown: string;
}

@Controller('bugs/:bugId/comments')
export class CommentsController {
  constructor(private readonly svc: CommentsService) {}

  @Get()
  getComments(@Param('bugId') bugId: string) {
    return this.svc.getComments(bugId);
  }

  @Post()
  addComment(@Param('bugId') bugId: string, @Body() dto: CreateCommentDto, @CurrentUser() user: any) {
    return this.svc.addComment(bugId, dto.bodyMarkdown, user.id);
  }

  @Put(':commentId')
  updateComment(@Param('commentId') id: string, @Body() dto: CreateCommentDto, @CurrentUser() user: any) {
    return this.svc.updateComment(id, dto.bodyMarkdown, user.id);
  }

  @Delete(':commentId')
  deleteComment(@Param('commentId') id: string, @CurrentUser() user: any) {
    return this.svc.deleteComment(id, user.id);
  }
}
