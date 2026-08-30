import { IsEmail, IsNotEmpty, IsString, Length, MinLength, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  otp: string;

  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/, {
    message: 'Password must contain at least one uppercase letter, one number, and one special character',
  })
  @IsNotEmpty({ message: 'Password is required' })
  newPassword: string;
}
