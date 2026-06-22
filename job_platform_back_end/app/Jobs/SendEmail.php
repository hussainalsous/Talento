<?php

namespace App\Jobs;

use App\Enum\EmailStatus;
use App\Models\EmailLog;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class SendEmail implements ShouldQueue
{
    use Dispatchable;
    use InteractsWithQueue;
    use SerializesModels;
    use Queueable;

    /** Maximum send attempts before the job is moved to failed_jobs. */
    public int $tries = 3;

    /** Seconds the job may run before the worker kills it. */
    public int $timeout = 30;

    /** Seconds to wait between retry attempts. */
    public int $backoff = 60;

    /**
     * Stable UUID generated at dispatch time and serialised into the job
     * payload. Retries reuse this same ID so that EmailLog::firstOrCreate
     * never inserts a second row for the same logical send attempt.
     */
    private string $emailLogId;

    public function __construct(
        public string|array $recipient,
        public Mailable $mailable,
        public array $log = [],
    ) {
        $this->emailLogId = (string) Str::uuid();
    }

    public function handle(): void
    {
        $emailLog = EmailLog::firstOrCreate(
            ['id' => $this->emailLogId],
            [
                'sender_id' => $this->log['id'] ?? null,
                'to_email'  => \is_array($this->recipient)
                    ? implode(',', $this->recipient)
                    : $this->recipient,
                'subject'   => $this->log['subject'] ?? '',
                'body'      => $this->log['body'] ?? '',
            ]
        );

        try {
            Mail::to($this->recipient)->send($this->mailable);

            $emailLog->update([
                'status'        => EmailStatus::SENT->value,
                'error_message' => null,
            ]);
        } catch (\Throwable $e) {
            $emailLog->update([
                'status'        => EmailStatus::FAILED->value,
                'error_message' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}
