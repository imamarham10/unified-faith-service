import { Injectable } from "@nestjs/common";

@Injectable()
export class UsersService {
  constructor() {}

  getUsers() {
    return 'Users';
  }
}