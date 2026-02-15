import { Injectable } from '@nestjs/common';
import { SUPPORTED_FAITHS } from './common/constants/faiths.constant';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Unified Faith Service API is running!';
  }

  getSupportedFaiths() {
    return SUPPORTED_FAITHS;
  }
}
