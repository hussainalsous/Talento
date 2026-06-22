<?php

namespace Tests\Feature\JobSeeker;

use App\Models\CV;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class CvTest extends TestCase
{
    // -------------------------------------------------------------------------
    // List
    // -------------------------------------------------------------------------

    public function test_job_seeker_can_list_own_cvs(): void
    {
        $seeker = $this->actingAsJobSeeker();

        CV::factory()->count(2)->create(['job_seeker_id' => $seeker->jobSeeker->id]);

        $response = $this->getJson('/api/v1/job-seeker/cvs');

        $this->assertApiSuccess($response);
        $this->assertCount(2, $response->json('data'));
    }

    // -------------------------------------------------------------------------
    // Upload
    // -------------------------------------------------------------------------

    public function test_job_seeker_can_upload_a_cv(): void
    {
        Storage::fake('public');
        $seeker = $this->actingAsJobSeeker();

        $response = $this->postJson('/api/v1/job-seeker/cvs', [
            'file'       => UploadedFile::fake()->create('resume.pdf', 200, 'application/pdf'),
            'title'      => 'My Main CV',
            'is_primary' => true,
            'visibility' => 'public',
        ]);

        $this->assertApiSuccess($response, 201);
        $this->assertDatabaseHas('cvs', [
            'job_seeker_id' => $seeker->jobSeeker->id,
            'title'         => 'My Main CV',
            'is_primary'    => true,
        ]);
    }

    public function test_only_one_cv_can_be_primary(): void
    {
        Storage::fake('public');
        $seeker = $this->actingAsJobSeeker();

        // Create an existing primary CV
        CV::factory()->create([
            'job_seeker_id' => $seeker->jobSeeker->id,
            'is_primary'    => true,
        ]);

        // Upload a new one as primary
        $this->postJson('/api/v1/job-seeker/cvs', [
            'file'       => UploadedFile::fake()->create('resume2.pdf', 200, 'application/pdf'),
            'title'      => 'New Primary',
            'is_primary' => true,
            'visibility' => 'public',
        ]);

        // Only one primary should exist
        $this->assertEquals(
            1,
            CV::where('job_seeker_id', $seeker->jobSeeker->id)
               ->where('is_primary', true)
               ->count()
        );
    }

    // -------------------------------------------------------------------------
    // Update
    // -------------------------------------------------------------------------

    public function test_job_seeker_can_update_cv_visibility(): void
    {
        $seeker = $this->actingAsJobSeeker();
        $cv     = CV::factory()->create([
            'job_seeker_id' => $seeker->jobSeeker->id,
            'visibility'    => 'public',
        ]);

        $response = $this->patchJson("/api/v1/job-seeker/cvs/{$cv->id}", [
            'visibility' => 'upon_request',
        ]);

        $this->assertApiSuccess($response);
        $this->assertDatabaseHas('cvs', [
            'id'         => $cv->id,
            'visibility' => 'upon_request',
        ]);
    }

    public function test_job_seeker_cannot_update_another_seekers_cv(): void
    {
        $this->actingAsJobSeeker();
        $otherSeeker = $this->makeJobSeeker();
        $cv          = CV::factory()->create(['job_seeker_id' => $otherSeeker->jobSeeker->id]);

        $this->patchJson("/api/v1/job-seeker/cvs/{$cv->id}", [
            'visibility' => 'private',
        ])->assertStatus(403);
    }

    // -------------------------------------------------------------------------
    // Delete
    // -------------------------------------------------------------------------

    public function test_job_seeker_can_soft_delete_own_cv(): void
    {
        $seeker = $this->actingAsJobSeeker();
        $cv     = CV::factory()->create(['job_seeker_id' => $seeker->jobSeeker->id]);

        $response = $this->deleteJson("/api/v1/job-seeker/cvs/{$cv->id}");

        $this->assertApiSuccess($response);
        $this->assertSoftDeleted('cvs', ['id' => $cv->id]);
    }

    public function test_job_seeker_cannot_delete_another_seekers_cv(): void
    {
        $this->actingAsJobSeeker();
        $otherSeeker = $this->makeJobSeeker();
        $cv          = CV::factory()->create(['job_seeker_id' => $otherSeeker->jobSeeker->id]);

        $this->deleteJson("/api/v1/job-seeker/cvs/{$cv->id}")
             ->assertStatus(403);
    }

    // -------------------------------------------------------------------------
    // Analyze
    // -------------------------------------------------------------------------

    public function test_job_seeker_can_analyze_own_cv(): void
    {
        $seeker = $this->actingAsJobSeeker();
        $cv     = CV::factory()->create([
            'job_seeker_id' => $seeker->jobSeeker->id,
            'file_path'     => 'cvs/1/resume.pdf', // stub path
        ]);

        $response = $this->postJson("/api/v1/job-seeker/cvs/{$cv->id}/analyze");

        $this->assertApiSuccess($response);
        $response->assertJsonStructure([
            'data'     => ['id'],
            'analysis' => ['skills', 'experience', 'education'],
        ]);
    }

    public function test_job_seeker_cannot_analyze_another_seekers_cv(): void
    {
        $this->actingAsJobSeeker();
        $otherSeeker = $this->makeJobSeeker();
        $cv          = CV::factory()->create([
            'job_seeker_id' => $otherSeeker->jobSeeker->id,
            'file_path'     => 'cvs/2/resume.pdf',
        ]);

        $this->postJson("/api/v1/job-seeker/cvs/{$cv->id}/analyze")
             ->assertStatus(403);
    }
}
