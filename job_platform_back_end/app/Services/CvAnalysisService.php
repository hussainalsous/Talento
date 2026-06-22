<?php

namespace App\Services;

use App\Models\CV;

/**
 * CV Analysis Service — stub implementation.
 *
 * In production this would call an AI/NLP service (e.g. OpenAI, a custom parser).
 * For now it returns a structured mock response and stores it as parsed_data.
 * The endpoint and data contract are production-ready — swap the stub with a real
 * implementation without changing anything else.
 */
class CvAnalysisService
{
    public function __construct(private readonly SupabaseNotificationService $notifications) {}

    public function analyze(CV $cv): array
    {
        if (! $cv->file_path) {
            abort(422, 'No CV file uploaded to analyze.');
        }

        $parsedData = [
            'summary'    => 'Experienced professional with strong technical skills.',
            'skills'     => [],
            'experience' => [
                [
                    'company'    => 'Example Corp',
                    'title'      => 'Software Engineer',
                    'years'      => 3,
                    'start_date' => '2020-01',
                    'end_date'   => '2023-06',
                ],
            ],
            'education'  => [
                [
                    'institution' => 'State University',
                    'degree'      => 'B.Sc. Computer Science',
                    'year'        => 2020,
                ],
            ],
            'languages'   => ['English', 'Arabic'],
            'analyzed_at' => now()->toISOString(),
            'engine'      => 'stub_v1',
        ];

        $cv->update(['parsed_data' => $parsedData]);

        $cv->load('jobSeeker');
        $this->notifications->createNotification(
            userId: (int) $cv->jobSeeker->user_id,
            title: 'CV Analysis Complete',
            message: "Your CV \"{$cv->title}\" has been analyzed successfully.",
            data: [
                'type'  => 'cv_analyzed',
                'cv_id' => $cv->id,
            ]
        );

        return $parsedData;
    }


}
