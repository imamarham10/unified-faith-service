import { UsersService } from "../services/users.services";
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getUsers(): string;
}
