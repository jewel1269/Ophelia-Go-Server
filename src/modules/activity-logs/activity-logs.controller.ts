import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtRefreshGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ActivityLogsService } from './activity-logs.service';
import { LogQueryDto } from './dto/log-query.dto';

@ApiTags('Activity Logs')
@Controller('activity-logs')
@UseGuards(JwtRefreshGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @Get()
  @ApiOperation({ summary: 'List all activity logs with filters' })
  findAll(@Query() query: LogQueryDto) {
    return this.activityLogsService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Log statistics — totals by type and source' })
  getStats() {
    return this.activityLogsService.getStats();
  }

  @Get('dangerous')
  @ApiOperation({ summary: 'Latest dangerous logs' })
  getDangerousLogs(@Query('limit') limit?: string) {
    return this.activityLogsService.getDangerousLogs(Number(limit) || 10);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single log entry' })
  @ApiParam({ name: 'id', description: 'Log UUID' })
  findOne(@Param('id') id: string) {
    return this.activityLogsService.findOne(id);
  }
}
