<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class SystemNotificationEmail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $title,
        public string $message,
    ) {}

    public function build(): static
    {
        $year      = date('Y');
        $htmlTitle = htmlspecialchars($this->title, ENT_QUOTES, 'UTF-8');

        // Normalize message: strip surrounding whitespace, remove per-line
        // leading indentation (common when callers use multi-line PHP strings),
        // then convert newlines to <br> for HTML rendering.
        $normalized = implode(
            "\n",
            array_map('ltrim', explode("\n", trim($this->message)))
        );
        $bodyHtml = nl2br(htmlspecialchars($normalized, ENT_QUOTES, 'UTF-8'));

        $html = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>{$htmlTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background-color:#F9FAFB;min-width:100%;">
        <tr>
            <td align="center" style="padding:48px 16px;">

                <!-- ── Outer content wrapper (max 600 px) ── -->
                <table role="presentation" cellpadding="0" cellspacing="0" border="0"
                       style="width:100%;max-width:600px;">

                    <!-- ══ HEADER ══ -->
                    <tr>
                        <td style="background:linear-gradient(135deg,#16A34A 0%,#22C55E 100%);
                                   border-radius:16px 16px 0 0;
                                   padding:40px 40px 36px;
                                   text-align:center;">

                            <p style="margin:0 0 16px;
                                      font-size:11px;
                                      font-weight:700;
                                      letter-spacing:4px;
                                      text-transform:uppercase;
                                      color:rgba(255,255,255,0.75);">
                                TALENTO
                            </p>

                            <h1 style="margin:0;
                                       font-size:24px;
                                       font-weight:700;
                                       color:#FFFFFF;
                                       line-height:1.4;
                                       letter-spacing:-0.2px;">
                                {$htmlTitle}
                            </h1>

                        </td>
                    </tr>

                    <!-- ── Accent stripe ── -->
                    <tr>
                        <td style="background:#DCFCE7;height:4px;font-size:0;line-height:0;">&nbsp;</td>
                    </tr>

                    <!-- ══ BODY ══ -->
                    <tr>
                        <td style="background:#FFFFFF;
                                   padding:40px 40px 36px;
                                   border-left:1px solid #E5E7EB;
                                   border-right:1px solid #E5E7EB;">

                            <p style="margin:0;
                                      font-size:16px;
                                      line-height:1.85;
                                      color:#374151;">
                                {$bodyHtml}
                            </p>

                        </td>
                    </tr>

                    <!-- ══ FOOTER ══ -->
                    <tr>
                        <td style="background:#F9FAFB;
                                   border:1px solid #E5E7EB;
                                   border-top:none;
                                   border-radius:0 0 16px 16px;
                                   padding:28px 40px;
                                   text-align:center;">

                            <p style="margin:0 0 6px;
                                      font-size:13px;
                                      color:#6B7280;
                                      line-height:1.6;">
                                This automated message was sent by
                                <strong style="color:#111827;">Talento</strong>
                                &mdash; the intelligent recruitment platform.
                            </p>

                            <p style="margin:0;font-size:12px;color:#9CA3AF;">
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
            ->subject($this->title)
            ->html($html);
    }
}
