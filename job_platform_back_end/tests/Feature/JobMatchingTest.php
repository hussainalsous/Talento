<?php

namespace Tests\Feature;

use App\Events\JobPostPublished;
use App\Listeners\TriggerJobEmbeddingPipeline;
use App\Models\JobCandidateMatch;
use App\Models\JobEmbedMeta;
use App\Models\JobPost;
use App\Models\JobSeeker;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class JobMatchingTest extends TestCase
{
    private string $secret = 'test-n8n-secret';

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.n8n.webhook_secret'    => $this->secret,
            'services.n8n.job_embed_webhook' => 'https://n8n.test/webhook/job-embed',
        ]);
    }

    /** A job seeker user wired with a Google Drive file ID (Qdrant candidate_id). */
    private function candidateWithDriveId(string $driveId): User
    {
        $user = $this->makeJobSeeker(['google_drive_file_id' => $driveId]);
        JobSeeker::where('user_id', $user->id)->update([
            'first_name' => 'Test',
            'last_name'  => 'Candidate',
        ]);

        return $user;
    }

    // -------------------------------------------------------------------------
    // Event → listener
    // -------------------------------------------------------------------------

    public function test_publishing_a_job_dispatches_the_embedding_event(): void
    {
        Event::fake([JobPostPublished::class]);

        $job = JobPost::factory()->draft()->create();
        $job->update(['status' => 'published']);

        Event::assertDispatched(JobPostPublished::class, fn ($e) => $e->jobPost->is($job));
    }

    public function test_status_change_between_non_published_states_does_not_dispatch(): void
    {
        Event::fake([JobPostPublished::class]);

        $job = JobPost::factory()->draft()->create();
        $job->update(['status' => 'closed']);

        Event::assertNotDispatched(JobPostPublished::class);
    }

    public function test_listener_records_pending_meta_and_posts_to_n8n(): void
    {
        Http::fake(['n8n.test/*' => Http::response(['ok' => true], 200)]);

        $job = JobPost::factory()->create([
            'title'       => 'Senior Laravel Dev',
            'description' => 'Build APIs',
        ]);

        (new TriggerJobEmbeddingPipeline())->handle(new JobPostPublished($job));

        $this->assertDatabaseHas('job_embed_meta', [
            'job_post_id' => $job->id,
            'status'      => 'pending',
            'dimensions'  => 1024,
        ]);

        Http::assertSent(function ($request) use ($job) {
            return $request->url() === 'https://n8n.test/webhook/job-embed'
                && $request->hasHeader('X-N8N-Webhook-Secret', $this->secret)
                && $request['job_post_id'] === $job->id
                && $request['trigger'] === 'job_publish'
                && str_contains($request['text_to_embed'], 'Senior Laravel Dev');
        });
    }

    public function test_listener_marks_meta_failed_when_n8n_unreachable(): void
    {
        Http::fake(['n8n.test/*' => Http::response('boom', 500)]);

        $job = JobPost::factory()->create();

        try {
            (new TriggerJobEmbeddingPipeline())->handle(new JobPostPublished($job));
        } catch (\Throwable) {
            // $this->fail() rethrows — expected.
        }

        $this->assertDatabaseHas('job_embed_meta', [
            'job_post_id' => $job->id,
            'status'      => 'failed',
        ]);
    }

    // -------------------------------------------------------------------------
    // n8n callbacks (secret-guarded)
    // -------------------------------------------------------------------------

    public function test_callbacks_reject_missing_or_wrong_secret(): void
    {
        $job = JobPost::factory()->create();

        $this->postJson('/api/n8n/job-embedding/done', [])->assertStatus(401);

        $this->withHeaders(['X-N8N-Webhook-Secret' => 'nope'])
            ->postJson('/api/n8n/job-embedding/done', [])
            ->assertStatus(401);
    }

    public function test_job_embedding_done_marks_meta_embedded(): void
    {
        $job = JobPost::factory()->create();

        $response = $this->withHeaders(['X-N8N-Webhook-Secret' => $this->secret])
            ->postJson('/api/n8n/job-embedding/done', [
                'job_post_id'     => $job->id,
                'qdrant_point_id' => 'point-abc-123',
                'model'           => 'mistralai/mistral-embed-2312',
                'dimensions'      => 1024,
                'char_count'      => 420,
            ]);

        $response->assertStatus(200)->assertJson(['ok' => true]);
        $this->assertDatabaseHas('job_embed_meta', [
            'job_post_id'     => $job->id,
            'status'          => 'embedded',
            'qdrant_point_id' => 'point-abc-123',
        ]);
    }

    public function test_match_done_resolves_drive_ids_and_auto_shortlists(): void
    {
        $job   = JobPost::factory()->create();
        $alice = $this->candidateWithDriveId('drive_alice');
        $bob   = $this->candidateWithDriveId('drive_bob');

        $response = $this->withHeaders(['X-N8N-Webhook-Secret' => $this->secret])
            ->postJson('/api/n8n/match/done', [
                'job_post_id' => $job->id,
                'trigger'     => 'job_publish',
                'matches'     => [
                    ['candidate_id' => 'drive_alice', 'match_score' => 0.91, 'score_breakdown' => ['skills' => 0.9]],
                    ['candidate_id' => 'drive_bob',   'match_score' => 0.65],
                    ['candidate_id' => 'drive_unknown', 'match_score' => 0.99], // no matching user
                ],
            ]);

        $response->assertStatus(200)->assertJson(['ok' => true, 'upserted' => 2, 'skipped' => 1]);

        $this->assertDatabaseHas('job_candidate_matches', [
            'job_post_id'  => $job->id,
            'candidate_id' => $alice->id,
            'status'       => 'auto_shortlisted',
        ]);
        $this->assertDatabaseHas('job_candidate_matches', [
            'job_post_id'  => $job->id,
            'candidate_id' => $bob->id,
            'status'       => 'new',
        ]);
    }

    public function test_match_done_is_idempotent(): void
    {
        $job   = JobPost::factory()->create();
        $alice = $this->candidateWithDriveId('drive_alice');

        $payload = [
            'job_post_id' => $job->id,
            'trigger'     => 'job_publish',
            'matches'     => [['candidate_id' => 'drive_alice', 'match_score' => 0.70]],
        ];

        $this->withHeaders(['X-N8N-Webhook-Secret' => $this->secret])->postJson('/api/n8n/match/done', $payload);
        $this->withHeaders(['X-N8N-Webhook-Secret' => $this->secret])->postJson('/api/n8n/match/done', [
            ...$payload,
            'matches' => [['candidate_id' => 'drive_alice', 'match_score' => 0.88]],
        ]);

        $this->assertDatabaseCount('job_candidate_matches', 1);
        $this->assertDatabaseHas('job_candidate_matches', [
            'job_post_id'  => $job->id,
            'candidate_id' => $alice->id,
            'status'       => 'auto_shortlisted',
        ]);
    }

    // -------------------------------------------------------------------------
    // Recruiter & candidate views
    // -------------------------------------------------------------------------

    public function test_company_can_list_matches_and_new_become_viewed(): void
    {
        ['user' => $owner, 'company' => $company] = $this->makeCompanyOwner();
        Sanctum::actingAs($owner, ['*']);

        $job       = JobPost::factory()->create(['company_id' => $company->id]);
        $candidate = $this->candidateWithDriveId('drive_x');

        JobCandidateMatch::create([
            'job_post_id'  => $job->id,
            'candidate_id' => $candidate->id,
            'match_score'  => 0.75,
            'status'       => 'new',
            'matched_by'   => 'job_publish',
        ]);

        $response = $this->getJson("/api/jobs/{$job->id}/matches");

        $response->assertStatus(200)->assertJsonPath('success', true);
        $this->assertCount(1, $response->json('data'));
        $this->assertDatabaseHas('job_candidate_matches', [
            'job_post_id' => $job->id,
            'status'      => 'viewed',
        ]);
    }

    public function test_company_cannot_view_matches_for_another_companys_job(): void
    {
        ['user' => $owner] = $this->makeCompanyOwner();
        Sanctum::actingAs($owner, ['*']);

        $otherJob = JobPost::factory()->create(); // different company

        $this->getJson("/api/jobs/{$otherJob->id}/matches")->assertStatus(403);
    }

    public function test_candidate_sees_only_visible_own_matches(): void
    {
        $candidate = $this->candidateWithDriveId('drive_me');
        Sanctum::actingAs($candidate, ['*']);

        $job = JobPost::factory()->create();

        JobCandidateMatch::create([
            'job_post_id'  => $job->id,
            'candidate_id' => $candidate->id,
            'match_score'  => 0.82,
            'status'       => 'auto_shortlisted',
            'matched_by'   => 'cv_upload',
        ]);
        // Below the SCORE_SUGGEST threshold — must be hidden.
        JobCandidateMatch::create([
            'job_post_id'  => JobPost::factory()->create()->id,
            'candidate_id' => $candidate->id,
            'match_score'  => 0.40,
            'status'       => 'new',
            'matched_by'   => 'cv_upload',
        ]);

        $response = $this->getJson('/api/candidate/matches');

        $response->assertStatus(200);
        $this->assertCount(1, $response->json('data'));
    }
}
