import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import * as nodemailer from 'nodemailer';

const LOGO_URL = 'https://i.postimg.cc/Yq6vn9Vt/Asset-6startxpress.png';

function baseTemplate({
  previewText,
  headerBg = '#0B1F3A',
  accentColor = '#db175f',
  body,
  year,
  footerLine = 'You received this email because you are a registered customer on our platform.',
}: {
  previewText: string;
  headerBg?: string;
  accentColor?: string;
  body: string;
  year: number;
  footerLine?: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <meta name="format-detection" content="telephone=no,date=no,address=no,email=no"/>
  <title>${previewText}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#EEF2F7;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <!-- Preview text (hidden) -->
  <div style="display:none;font-size:1px;color:#EEF2F7;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${previewText}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#EEF2F7;">
    <tr>
      <td align="center" style="padding:40px 16px 40px;">

        <!-- Outer container -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- ── HEADER ── -->
          <tr>
            <td style="background-color:${headerBg};border-radius:8px 8px 0 0;padding:28px 40px;text-align:center;">
              <img src="${LOGO_URL}" alt="Ophelia Go" width="160" height="auto"
                   style="display:inline-block;border:0;max-width:160px;height:auto;"/>
            </td>
          </tr>

          <!-- Accent rule -->
          <tr>
            <td style="height:4px;background-color:${accentColor};font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- ── BODY ── -->
          <tr>
            <td style="background-color:#ffffff;padding:44px 48px 40px;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1A2332;font-size:15px;line-height:1.75;">
              ${body}
            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="background-color:#F4F7FB;border-radius:0 0 8px 8px;border-top:1px solid #DDE3EC;padding:24px 40px;text-align:center;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
              <p style="margin:0 0 6px;color:#5A6A85;font-size:12px;line-height:1.6;">
                ${footerLine}
              </p>
              <p style="margin:0;color:#9AA3B2;font-size:11px;">
                &copy; ${year} Ophelia Go. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
        <!-- End outer container -->

      </td>
    </tr>
  </table>
</body>
</html>`;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // ── Campaign email ────────────────────────────────────────────────────────────

  async sendCampaignEmail(
    to: string,
    subject: string,
    htmlContent: string,
  ): Promise<void> {
    const year = new Date().getFullYear();

    const body = `
      <!-- Message content -->
      <div style="font-size:15px;color:#1A2332;line-height:1.8;">
        ${htmlContent}
      </div>

      <!-- Divider -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:36px;">
        <tr><td style="border-top:1px solid #DDE3EC;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>

      <!-- CTA -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;">
        <tr>
          <td style="text-align:center;">
            <a href="https://opheliago.com"
               style="display:inline-block;background-color:#db175f;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.5px;padding:13px 36px;border-radius:5px;font-family:'Segoe UI',Roboto,Arial,sans-serif;text-transform:uppercase;">
              Visit Our Store &rarr;
            </a>
          </td>
        </tr>
      </table>`;

    const html = baseTemplate({
      previewText: subject,
      body,
      year,
      footerLine:
        'You are receiving this email as a registered customer. To unsubscribe, contact our support team.',
    });

    await this.transporter.sendMail({
      from: `"Ophelia Go" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
  }

  // ── OTP / Forgot-password email ───────────────────────────────────────────────

  async sendOtp(to: string, otp: string): Promise<void> {
    const year = new Date().getFullYear();
    const digits = otp.split('');

    const digitCells = digits
      .map(
        (d) => `
      <td style="padding:0 5px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="width:46px;height:58px;background-color:#F0F5FF;border:1.5px solid #93B4E8;border-radius:6px;text-align:center;vertical-align:middle;">
              <span style="font-size:30px;font-weight:800;color:#0B1F3A;font-family:'Segoe UI',Roboto,Arial,sans-serif;line-height:1;">${d}</span>
            </td>
          </tr>
        </table>
      </td>`,
      )
      .join('');

    const body = `
      <!-- Section label -->
      <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#5A6A85;">
        Password Reset
      </p>

      <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#0B1F3A;letter-spacing:-0.3px;line-height:1.3;">
        Verify Your Identity
      </h1>

      <p style="margin:0 0 32px;font-size:15px;color:#3D4F6B;line-height:1.75;">
        We received a request to reset the password on your account.<br/>
        Enter the verification code below to proceed. This code will expire in&nbsp;<strong style="color:#0B1F3A;">5&nbsp;minutes</strong>.
      </p>

      <!-- OTP block -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
        <tr>
          <td style="background-color:#F7FAFF;border:1px solid #DDE3EC;border-radius:8px;padding:28px 24px;">

            <p style="margin:0 0 20px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#5A6A85;text-align:center;">
              One-Time Verification Code
            </p>

            <!-- Digit row -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
              <tr>${digitCells}</tr>
            </table>

            <!-- Expiry note -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;width:100%;">
              <tr>
                <td style="text-align:center;">
                  <span style="display:inline-block;background-color:#FFF8E6;border:1px solid #F5C842;border-radius:4px;padding:5px 14px;font-size:12px;font-weight:600;color:#7A5C00;">
                    &#9679;&nbsp; Expires in 5 minutes
                  </span>
                </td>
              </tr>
            </table>

          </td>
        </tr>
      </table>

      <!-- Divider -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
        <tr><td style="border-top:1px solid #DDE3EC;font-size:0;line-height:0;">&nbsp;</td></tr>
      </table>

      <!-- Security notice -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="border-left:3px solid #db175f;padding:12px 16px;background-color:#F4F7FB;border-radius:0 6px 6px 0;">
            <p style="margin:0;font-size:13px;color:#3D4F6B;line-height:1.6;">
              <strong style="color:#0B1F3A;">Did not request this?</strong>&nbsp;
              If you did not initiate this request, please disregard this email. Your account remains secure and no changes have been made.
            </p>
          </td>
        </tr>
      </table>`;

    const html = baseTemplate({
      previewText: `Your verification code is ${otp}`,
      body,
      year,
      footerLine:
        'This is a system-generated email. Please do not reply to this message.',
    });

    try {
      await this.transporter.sendMail({
        from: `"Ophelia Go" <${process.env.SMTP_USER}>`,
        to,
        subject: `[${otp}] Your Ophelia Go Verification Code`,
        html,
      });
      this.logger.log(`OTP email sent to ${to}`);
    } catch (err) {
      this.logger.error(`Failed to send OTP email to ${to}:`, err);
      throw new InternalServerErrorException(
        'Failed to send verification email. Please try again.',
      );
    }
  }
}
