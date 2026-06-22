<?php

namespace App\Notifications;

use App\Mail\VerifyEmailMailable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\URL;

/**
 * Queued email-verification notification.
 *
 * Dispatched automatically by User::sendEmailVerificationNotification() which
 * is triggered at the end of AuthService::registerJobSeeker(). The notification
 * is serialised into the database jobs table and picked up by the queue worker,
 * keeping registration response times fast and email sending out of the HTTP cycle.
 */
class VerifyEmailNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries   = 3;
    public int $timeout = 30;
    public int $backoff = 60;

    public function via(mixed $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(mixed $notifiable): VerifyEmailMailable
    {
        $expiresInMinutes = (int) Config::get('auth.verification.expire', 60);

        $verificationUrl = URL::temporarySignedRoute(
            'api.v1.email.verify',
            Carbon::now()->addMinutes($expiresInMinutes),
            [
                'id'   => $notifiable->getKey(),
                'hash' => sha1($notifiable->getEmailForVerification()),
            ]
        );

        return (new VerifyEmailMailable($notifiable, $verificationUrl, $expiresInMinutes))
            ->to($notifiable->getEmailForVerification());
    }

    /**
     * Subject/body recorded by LogNotificationToEmailLog when this notification
     * is sent over the mail channel. Keeps the audit row descriptive without
     * re-rendering the mailable (which would regenerate the signed URL).
     */
    public function toEmailLog(mixed $notifiable): array
    {
        return [
            'subject' => 'Verify Your Email Address — Talento',
            'body'    => 'Email verification link sent to ' . $notifiable->getEmailForVerification() . '.',
        ];
    }
}
