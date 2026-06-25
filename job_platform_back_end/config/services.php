<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'n8n' => [
        'job_embed_webhook' => env('N8N_JOB_EMBED_WEBHOOK'),
        'cv_match_webhook'  => env('N8N_CV_MATCH_WEBHOOK'),
        'cv_ingest_webhook' => env('N8N_CV_INGEST_WEBHOOK', 'http://localhost:5678/webhook/cv-ingest'),
        'webhook_secret'    => env('N8N_WEBHOOK_SECRET'),
        'callback_base'     => env('N8N_CALLBACK_BASE', 'http://host.docker.internal:8000'),
    ],

    'google' => [
        'service_account_json_path' => env('GOOGLE_SERVICE_ACCOUNT_JSON_PATH'),
        'resume_folder_id'          => env('GOOGLE_RESUME_FOLDER_ID'),
    ],

];
