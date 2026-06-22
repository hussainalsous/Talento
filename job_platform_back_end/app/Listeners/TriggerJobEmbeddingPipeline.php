<?php

namespace App\Listeners;

use App\Events\JobPostPublished;
use App\Models\JobEmbedMeta;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\URL;
use Throwable;

class TriggerJobEmbeddingPipeline implements ShouldQueue
{
    /**
     * Number of times the queued listener may be attempted.
     */
    public int $tries = 3;

    /**
     * Seconds to wait before retrying the listener.
     */
    public int $backoff = 30;

    /**
     * Hand the published job post off to the n8n embedding pipeline.
     *
     * Records a pending embedding-meta row, then POSTs the text to embed to the
     * configured n8n webhook. n8n upserts the vector into Qdrant and calls back
     * into the routes referenced in the payload.
     */
    public function handle(JobPostPublished $event): void
    {
        $job = $event->jobPost;

        Log::info('TriggerJobEmbeddingPipeline: handle() called', ['job_post_id' => $job->id]);

        $textToEmbed = $job->embeddableText();

        $meta = JobEmbedMeta::updateOrCreate(
            ['job_post_id' => $job->id],
            [
                'model'           => 'mistralai/mistral-embed-2312',
                'dimensions'      => 1024,
                'char_count'      => strlen($textToEmbed),
                'status'          => 'pending',
                'qdrant_point_id' => null,
            ],
        );

        $payload = [
            'job_post_id'     => $job->id,
            'company_id'      => $job->company_id,
            'title'           => $job->title,
            'text_to_embed'   => $textToEmbed,
            'employment_type' => $job->employment_type,
            'location'        => $job->location,
            'published_at'    => Carbon::now()->toIso8601String(),
            'trigger'         => 'job_publish',
            'callback'        => [
                'embedding_done' => URL::route('n8n.job-embedding.done', [], true),
                'match_done'     => URL::route('n8n.match.done', [], true),
                'log_error'      => URL::route('n8n.log-error', [], true),
            ],
        ];

        $webhookUrl = config('services.n8n.job_embed_webhook');

        try {
            Log::info('Firing n8n webhook', ['url' => $webhookUrl, 'job_post_id' => $job->id]);

            $response = Http::timeout(10)
                ->withHeaders([
                    'X-N8N-Webhook-Secret' => config('services.n8n.webhook_secret'),
                ])
                ->post($webhookUrl, $payload);

            Log::info('n8n webhook response', ['status' => $response->status()]);

            $response->throw();

            Log::info('n8n job embed webhook fired', ['job_post_id' => $job->id]);
        } catch (Throwable $e) {
            Log::error('[job_embed] failed to trigger n8n embedding pipeline', [
                'job_post_id' => $job->id,
                'exception'   => $e->getMessage(),
            ]);

            $meta->update(['status' => 'failed']);

            $this->fail($e);
        }
    }
}
