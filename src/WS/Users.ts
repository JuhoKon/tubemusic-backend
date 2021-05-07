class UserService {
  private static instance: UserService;
  private users: any;
  constructor() {
    this.users = [];
    /* */
  }
  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  public addUser(user: any) {
    this.users.push(user);
  }
}

export default UserService;
