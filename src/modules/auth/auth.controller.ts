import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

class ForgotPasswordDto {
  @IsEmail() email: string;
}
class VerifyOtpDto {
  @IsEmail() email: string;
  @IsString() @IsNotEmpty() otp: string;
}
class ResetPasswordDto {
  @IsEmail() email: string;
  @IsString() @IsNotEmpty() otp: string;
  @IsString() @MinLength(6) newPassword: string;
}

@ApiTags('Auth — Password Reset')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('forgot-password')
  @ApiOperation({ summary: 'Step 1 — Send OTP to email' })
  @ApiBody({ schema: { properties: { email: { type: 'string' } } } })
  @ApiResponse({ status: 201, description: 'OTP sent' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Step 2 — Verify the 6-digit OTP' })
  @ApiBody({ schema: { properties: { email: { type: 'string' }, otp: { type: 'string' } } } })
  @ApiResponse({ status: 201, description: 'OTP verified' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.email, dto.otp);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Step 3 — Set new password' })
  @ApiBody({
    schema: {
      properties: {
        email: { type: 'string' },
        otp: { type: 'string' },
        newPassword: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Password reset' })
  @ApiResponse({ status: 400, description: 'Invalid session or weak password' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email, dto.otp, dto.newPassword);
  }
}
