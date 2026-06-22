<?php

namespace App\Providers;

use App\Listeners\LogNotificationToEmailLog;
use App\Services\RedisCacheService;
use App\Services\SupabaseNotificationService;
use Illuminate\Notifications\Events\NotificationFailed;
use Illuminate\Notifications\Events\NotificationSending;
use Illuminate\Notifications\Events\NotificationSent;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(SupabaseNotificationService::class);
        $this->app->singleton(RedisCacheService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Schema::defaultStringLength(191);

        // Mirror notification-channel emails into the email_logs audit table so
        // they share the same trail as SendEmail-dispatched messages.
        Event::listen(NotificationSending::class, [LogNotificationToEmailLog::class, 'sending']);
        Event::listen(NotificationSent::class, [LogNotificationToEmailLog::class, 'sent']);
        Event::listen(NotificationFailed::class, [LogNotificationToEmailLog::class, 'failed']);

        // JobPostPublished → TriggerJobEmbeddingPipeline is wired via Laravel's
        // event auto-discovery (typed handle(JobPostPublished $event)); no manual
        // registration here to avoid a duplicate listener.
    }
}
