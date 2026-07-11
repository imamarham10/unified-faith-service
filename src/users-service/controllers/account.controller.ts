import { Controller, Delete, UseGuards } from '@nestjs/common';
import { AccountService } from '../services/account.service';
import { JwtAuthGuard } from '../../auth-service/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../../auth-service/decorators/current-user.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  /**
   * Permanently delete the authenticated user's account and all data.
   * Required in-app by Google Play's Account Deletion policy and
   * App Store Guideline 5.1.1(v).
   */
  @Delete('me')
  async deleteAccount(@CurrentUser() user: CurrentUserData) {
    return this.accountService.deleteAccount(user.userId);
  }
}
