import {
  Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, Req,
} from '@nestjs/common';
import { BugsService } from './bugs.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateBugDto, UpdateBugDto, TransitionStatusDto, BulkUpdateDto, BugFilterDto,
} from './dto/bugs.dto';

@Controller('bugs')
export class BugsController {
  constructor(private readonly svc: BugsService) {}

  @Get()
  listBugs(@Query() filter: BugFilterDto, @CurrentUser() user: any) {
    return this.svc.listBugs(filter, user.id);
  }

  @Post()
  createBug(@Body() dto: CreateBugDto, @CurrentUser() user: any) {
    return this.svc.createBug(dto, user.id);
  }

  @Get('bulk-export')
  exportBugs(@Query() filter: BugFilterDto) {
    return this.svc.exportBugs(filter);
  }

  @Patch('bulk-update')
  bulkUpdate(@Body() dto: BulkUpdateDto, @CurrentUser() user: any) {
    return this.svc.bulkUpdate(dto, user.id);
  }

  @Get(':id')
  getBug(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.getBug(id, user.id);
  }

  @Put(':id')
  updateBug(@Param('id') id: string, @Body() dto: UpdateBugDto, @CurrentUser() user: any) {
    return this.svc.updateBug(id, dto, user.id);
  }

  @Patch(':id/status')
  transitionStatus(@Param('id') id: string, @Body() dto: TransitionStatusDto, @CurrentUser() user: any, @Req() req: any) {
    return this.svc.transitionStatus(id, dto, user.id, req.projectRole ?? user.globalRole);
  }

  @Delete(':id')
  softDelete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.softDelete(id, user.id, user.globalRole);
  }

  @Post(':id/watch')
  toggleWatch(@Param('id') id: string, @CurrentUser() user: any) {
    return this.svc.toggleWatch(id, user.id);
  }

  @Get(':id/activity-log')
  getActivityLog(@Param('id') id: string) {
    return this.svc.getActivityLog(id);
  }

  @Post(':id/links')
  createLink(@Param('id') bugId: string, @Body() body: { targetBugId: string; linkType: string }, @CurrentUser() user: any) {
    return this.svc.createLink(bugId, body.targetBugId, body.linkType);
  }
}
