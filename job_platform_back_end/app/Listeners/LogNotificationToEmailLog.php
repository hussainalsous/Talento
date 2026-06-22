<?php

namespace App\Listeners;

use App\Enum\EmailStatus;
use App\Models\EmailLog;
use Illuminate\Notifications\Events\NotificationFailed;
use Illuminate\Notifications\Events\NotificationSending;
use Illuminate\Notifications\Events\NotificationSent;

/**
 * Bridges the notification mail channel into the email_logs audit table.
 *
 * The SendEmail job logs its sends explicitly via EmailLog::firstOrCreate.
 * Notifications (e.g. VerifyEmailNotification) bypass that job, so without this
 * listener their sends leave no audit trail. Listening to the notification
 * lifecycle events lets both code paths converge into the same table.
 *
 * Idempotency mirrors SendEmail: the framework assigns each notification a
 * stable UUID ($notification->id) at dispatch time which is serialised into the
 * queued payload and preserved across retries — so keying EmailLog on that id
 * guarantees one row per logical send, exactly like SendEmail's emailLogId.
 *
 * sender_id is always null: verification/reset notifications are system-
 * triggered, not sent by a specific authenticated user.
 */
class LogNotificationToEmailLog
{
    public function sending(NotificationSending $event): void
    {
        if ($event->channel !== 'mail') {
            return;
        }

        EmailLog::firstOrCreate(
            ['id' => $event->notification->id],
            $this->attributes($event->notification, $event->notifiable)
                + ['status' => EmailStatus::PENDING->value],
        );
    }

    public function sent(NotificationSent $event): void
    {
        if ($event->channel !== 'mail') {
            return;
        }

        EmailLog::updateOrCreate(
            ['id' => $event->notification->id],
            $this->attributes($event->notification, $event->notifiable)
                + ['status' => EmailStatus::SENT->value, 'error_message' => null],
        );
    }

    public function failed(NotificationFailed $event): void
    {
        if ($event->channel !== 'mail') {
            return;
        }

        $exception = $event->data['exception'] ?? null;

        EmailLog::updateOrCreate(
            ['id' => $event->notification->id],
            $this->attributes($event->notification, $event->notifiable)
                + [
                    'status'        => EmailStatus::FAILED->value,
                    'error_message' => $exception instanceof \Throwable ? $exception->getMessage() : null,
                ],
        );
    }

    /**
     * Build the shared EmailLog columns from the notification + notifiable.
     *
     * A notification may expose toEmailLog($notifiable): array to customise the
     * stored subject/body; otherwise sensible defaults derived from the class
     * name are used.
     */
    private function attributes(mixed $notification, mixed $notifiable): array
    {
        $meta = method_exists($notification, 'toEmailLog')
            ? $notification->toEmailLog($notifiable)
            : [];

        return [
            'sender_id' => null,
            'to_email'  => $this->recipientEmail($notifiable, $notification) ?? '',
            'subject'   => $meta['subject'] ?? class_basename($notification),
            'body'      => $meta['body'] ?? ('Notification email: ' . class_basename($notification)),
        ];
    }

    private function recipientEmail(mixed $notifiable, mixed $notification): ?string
    {
        $route = method_exists($notifiable, 'routeNotificationFor')
            ? $notifiable->routeNotificationFor('mail', $notification)
            : null;

        if (is_array($route)) {
            // mail routing may return ['email' => 'name'] or ['email']
            $route = array_key_first($route) ?: ($route[0] ?? null);
        }

        return $route ?: ($notifiable->email ?? null);
    }
}
