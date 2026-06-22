<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class VerifyEmailMailable extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $verificationUrl,
        public int $expiresInMinutes = 60,
    ) {}

    public function build(): static
    {
        $year       = date('Y');
        $firstName  = $this->user->jobSeeker?->first_name
            ?? $this->user->companyMember?->first_name
            ?? 'there';
        $safeName   = htmlspecialchars($firstName, ENT_QUOTES, 'UTF-8');
        $safeUrl    = htmlspecialchars($this->verificationUrl, ENT_QUOTES, 'UTF-8');

        $expiryLabel = $this->expiresInMinutes >= 60
            ? ($this->expiresInMinutes / 60) . ' hour' . ($this->expiresInMinutes > 60 ? 's' : '')
            : $this->expiresInMinutes . ' minutes';

        $html = <<<HTML
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width,initial-scale=1.0">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <title>Verify Your Email Address — Talento</title>
        </head>
        <body style="margin:0;padding:0;background-color:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F9FAFB;padding:40px 20px;">
                <tr>
                    <td align="center">
                        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

                            <!-- Header -->
                            <tr>
                                <td style="background:linear-gradient(135deg,#15803D 0%,#16A34A 50%,#22C55E 100%);border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
                                    <div style="display:inline-flex;align-items:center;gap:10px;">
                                        <div style="width:36px;height:36px;background:rgba(255,255,255,0.2);border-radius:8px;display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;">
                                            <span style="color:#FFFFFF;font-size:20px;font-weight:900;line-height:36px;">T</span>
                                        </div>
                                        <span style="color:#FFFFFF;font-size:26px;font-weight:800;letter-spacing:-0.5px;vertical-align:middle;">Talento</span>
                                    </div>
                                    <p style="margin:10px 0 0;color:rgba(255,255,255,0.85);font-size:14px;letter-spacing:0.3px;">Job Platform</p>
                                </td>
                            </tr>

                            <!-- Green accent stripe -->
                            <tr>
                                <td style="background:linear-gradient(90deg,#16A34A,#22C55E);height:4px;"></td>
                            </tr>

                            <!-- Card body -->
                            <tr>
                                <td style="background:#FFFFFF;padding:40px 40px 32px;border-radius:0;">

                                    <!-- Icon -->
                                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                                        <tr>
                                            <td align="center">
                                                <div style="width:64px;height:64px;background:#DCFCE7;border-radius:50%;display:inline-block;line-height:64px;text-align:center;">
                                                    <span style="font-size:28px;line-height:64px;">&#9993;</span>
                                                </div>
                                            </td>
                                        </tr>
                                    </table>

                                    <!-- Title -->
                                    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;text-align:center;">
                                        Verify Your Email Address
                                    </h1>
                                    <p style="margin:0 0 28px;font-size:14px;color:#6B7280;text-align:center;">
                                        One quick step to activate your Talento account
                                    </p>

                                    <!-- Greeting & message -->
                                    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
                                        Hi <strong>{$safeName}</strong>,
                                    </p>
                                    <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                                        Thank you for joining Talento. To complete your registration and unlock all platform features, please verify your email address by clicking the button below.
                                    </p>

                                    <!-- CTA button -->
                                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                                        <tr>
                                            <td align="center">
                                                <a href="{$safeUrl}"
                                                   style="display:inline-block;background:linear-gradient(135deg,#16A34A,#22C55E);color:#FFFFFF;text-decoration:none;padding:16px 48px;border-radius:10px;font-size:16px;font-weight:700;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(34,197,94,0.35);">
                                                    Verify Email Address
                                                </a>
                                            </td>
                                        </tr>
                                    </table>

                                    <!-- Expiry notice -->
                                    <div style="background:#DCFCE7;border:1px solid #BBF7D0;border-radius:8px;padding:14px 18px;margin-bottom:24px;text-align:center;">
                                        <p style="margin:0;font-size:13px;color:#166534;">
                                            &#9201; This link expires in <strong>{$expiryLabel}</strong>.
                                            After that you can request a new one.
                                        </p>
                                    </div>

                                    <!-- Fallback link -->
                                    <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:8px;padding:16px 18px;margin-bottom:28px;">
                                        <p style="margin:0 0 8px;font-size:12px;color:#6B7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">
                                            Button not working?
                                        </p>
                                        <p style="margin:0 0 6px;font-size:12px;color:#374151;">
                                            Copy and paste this link into your browser:
                                        </p>
                                        <p style="margin:0;font-size:11px;color:#16A34A;word-break:break-all;font-family:monospace;">
                                            {$safeUrl}
                                        </p>
                                    </div>

                                    <!-- Security note -->
                                    <div style="border-top:1px solid #F3F4F6;padding-top:20px;">
                                        <p style="margin:0;font-size:13px;color:#9CA3AF;line-height:1.6;">
                                            If you did not create an account on Talento, you can safely ignore this email.
                                            No account will be activated without this verification.
                                        </p>
                                    </div>

                                </td>
                            </tr>

                            <!-- Footer accent -->
                            <tr>
                                <td style="background:linear-gradient(90deg,#16A34A,#22C55E);height:3px;"></td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td style="background:#F3F4F6;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
                                    <p style="margin:0 0 4px;font-size:12px;color:#6B7280;">
                                        This automated message was sent by <strong>Talento Job Platform</strong>
                                    </p>
                                    <p style="margin:0;font-size:11px;color:#9CA3AF;">
                                        &copy; {$year} Talento. All rights reserved.
                                    </p>
                                </td>
                            </tr>

                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        HTML;

        return $this
            ->subject('Verify Your Email Address — Talento')
            ->html($html);
    }
}
