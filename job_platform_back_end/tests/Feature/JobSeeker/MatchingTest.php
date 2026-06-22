<?php

namespace Tests\Feature\JobSeeker;

use App\Models\Course;
use App\Models\JobPost;
use Tests\TestCase;

class MatchingTest extends TestCase
{
    // -------------------------------------------------------------------------
    // Suitable jobs
    // -------------------------------------------------------------------------

    public function test_job_seeker_can_get_suitable_jobs(): void
    {
        $this->actingAsJobSeeker();

        $result = $this->makeCompanyOwner();
        JobPost::factory()->count(3)->create([
            'company_id' => $result['company']->id,
            'created_by' => $result['user']->id,
            'status'     => 'published',
        ]);

        $response = $this->getJson('/api/v1/job-seeker/suitable-jobs');

        $this->assertApiSuccess($response);
        $this->assertGreaterThanOrEqual(3, count($response->json('data')));
    }

    public function test_draft_jobs_are_excluded_from_suitable_jobs(): void
    {
        $this->actingAsJobSeeker();
        $result = $this->makeCompanyOwner();

        JobPost::factory()->create([
            'company_id' => $result['company']->id,
            'created_by' => $result['user']->id,
            'status'     => 'draft',
            'title'      => 'Hidden Draft',
        ]);

        $response = $this->getJson('/api/v1/job-seeker/suitable-jobs');

        $this->assertApiSuccess($response);
        $titles = collect($response->json('data'))->pluck('title')->all();
        $this->assertNotContains('Hidden Draft', $titles);
    }

    // -------------------------------------------------------------------------
    // Course recommendations
    // -------------------------------------------------------------------------

    public function test_job_seeker_can_get_recommended_courses(): void
    {
        $this->actingAsJobSeeker();

        Course::factory()->count(3)->create();

        $response = $this->getJson('/api/v1/job-seeker/recommended-courses');

        $this->assertApiSuccess($response);
        $this->assertGreaterThanOrEqual(3, count($response->json('data')));
    }

    public function test_public_course_listing_is_accessible_without_auth(): void
    {
        Course::factory()->count(3)->create();

        $response = $this->getJson('/api/v1/courses');

        $this->assertApiSuccess($response);
        $this->assertGreaterThanOrEqual(3, count($response->json('data')));
    }
}
