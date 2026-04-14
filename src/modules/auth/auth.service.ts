import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/common/database/prisma.service';
import { EmailService } from 'src/services/email.service';
import { setCache, getCache, deleteCache } from 'src/services/cache.service';

const OTP_TTL = 300; // 5 minutes
const otpKey = (email: string) => `otp:reset:${email.toLowerCase()}`;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  /** Step 1 — send a 6-digit OTP to the given email */
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user) {
      throw new NotFoundException('No account found with this email address.');
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    await setCache(otpKey(email), otp, OTP_TTL);
    await this.emailService.sendOtp(email, otp);

    return { message: 'A 6-digit code has been sent to your email.' };
  }

  /** Step 2 — verify the OTP without resetting (lets frontend gate step 3) */
  async verifyOtp(email: string, otp: string) {
    const stored = await getCache(otpKey(email));
    if (!stored || stored !== otp) {
      throw new BadRequestException('Invalid or expired code. Please try again.');
    }
    // Mark OTP as verified by prefixing it — keeps TTL alive
    await setCache(otpKey(email), `verified:${otp}`, OTP_TTL);
    return { message: 'Code verified.' };
  }

  /** Step 3 — set new password (requires prior OTP verification) */
  async resetPassword(email: string, otp: string, newPassword: string) {
    if (newPassword.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters.');
    }

    const stored = await getCache(otpKey(email));
    if (!stored || stored !== `verified:${otp}`) {
      throw new BadRequestException('Session expired. Please start again.');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (!user) throw new NotFoundException('User not found.');

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    await deleteCache(otpKey(email));
    return { message: 'Password reset successfully.' };
  }
}
