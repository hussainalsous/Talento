<?php

namespace App\Events;

use App\Models\JobPost;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class JobPostPublished
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * @param  JobPost  $jobPost  The job post that has just transitioned to "published".
     */
    public function __construct(public readonly JobPost $jobPost)
    {
    }
}
