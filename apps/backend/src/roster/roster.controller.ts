import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RosterService } from './roster.service';

@ApiBearerAuth()
@ApiTags('roster')
@Controller('roster-profiles')
export class RosterController {
  constructor(private readonly rosterService: RosterService) {}

  @Get('')
  async getProfiles(): Promise<any[]> {
    return this.rosterService.getRoster();
  }
}
