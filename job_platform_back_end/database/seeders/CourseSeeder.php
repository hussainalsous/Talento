<?php

namespace Database\Seeders;

use App\Models\Course;
use Illuminate\Database\Seeder;

class CourseSeeder extends Seeder
{
    public function run(): void
    {
        $courses = [
            ['title' => 'The Complete PHP Developer Course',      'category' => 'Backend Development',   'provider' => 'Udemy',             'link' => 'https://udemy.com',                   'description' => 'Learn PHP from scratch including OOP and Laravel.'],
            ['title' => 'Python for Everybody Specialization',    'category' => 'Programming',            'provider' => 'Coursera',          'link' => 'https://coursera.org',                'description' => 'Master Python programming from beginner to advanced.'],
            ['title' => 'React - The Complete Guide',             'category' => 'Frontend Development',   'provider' => 'Udemy',             'link' => 'https://udemy.com',                   'description' => 'Dive into React, Hooks, Redux, and Next.js.'],
            ['title' => 'AWS Certified Solutions Architect',      'category' => 'Cloud Computing',        'provider' => 'AWS Training',      'link' => 'https://aws.amazon.com/training',     'description' => 'Prepare for the AWS SAA certification exam.'],
            ['title' => 'Docker and Kubernetes: The Complete Guide', 'category' => 'DevOps',             'provider' => 'Udemy',             'link' => 'https://udemy.com',                   'description' => 'Build, test, and deploy Docker applications with Kubernetes.'],
            ['title' => 'Machine Learning Specialization',        'category' => 'Artificial Intelligence', 'provider' => 'Coursera',        'link' => 'https://coursera.org',                'description' => "Andrew Ng's machine learning course series."],
            ['title' => 'UI/UX Design Bootcamp',                  'category' => 'Design',                 'provider' => 'Udemy',             'link' => 'https://udemy.com',                   'description' => 'Learn UX research, UI design, and Figma prototyping.'],
            ['title' => 'Cybersecurity for Beginners',            'category' => 'Security',               'provider' => 'Cybrary',           'link' => 'https://cybrary.it',                  'description' => 'Introduction to cybersecurity concepts and tools.'],
            ['title' => 'Flutter & Dart - The Complete Guide',    'category' => 'Mobile Development',     'provider' => 'Udemy',             'link' => 'https://udemy.com',                   'description' => 'Build iOS and Android apps with Flutter.'],
            ['title' => 'Agile Project Management',               'category' => 'Management',             'provider' => 'LinkedIn Learning', 'link' => 'https://linkedin.com/learning',       'description' => 'Master Agile and Scrum project management methodologies.'],
        ];

        foreach ($courses as $courseData) {
            Course::updateOrCreate(['title' => $courseData['title']], $courseData);
        }
    }
}
