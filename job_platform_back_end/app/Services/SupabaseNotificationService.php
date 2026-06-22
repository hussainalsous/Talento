<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SupabaseNotificationService
{
    private const CONNECTION = 'supabase';
    private const TABLE      = 'notifications';

    // -------------------------------------------------------------------------
    // Core
    // -------------------------------------------------------------------------

    public function createNotification(
        int $userId,
        string $title,
        string $message,
        array $data = [],
        bool $isRead = false,
        $createdAt = null,
        $updatedAt = null
    ): ?int {
        try {
            $id = DB::connection(self::CONNECTION)
                ->table(self::TABLE)
                ->insertGetId([
                    'user_id'    => $userId,
                    'title'      => $title,
                    'message'    => $message,
                    'data'       => json_encode($data),
                    'is_read'    => $isRead,
                    'created_at' => $createdAt ?? now(),
                    'updated_at' => $updatedAt ?? now(),
                ]);

            return $id;
        } catch (\Throwable $e) {
            Log::error('SupabaseNotificationService: failed to create notification.', [
                'user_id' => $userId,
                'title'   => $title,
                'error'   => $e->getMessage(),
            ]);
            return null;
        }
    }

    // -------------------------------------------------------------------------
    // Typed helpers — keep callers readable
    // -------------------------------------------------------------------------

    public function notifyCompany(int $ownerUserId, string $title, string $message, array $data = []): void
    {
        $this->createNotification($ownerUserId, $title, $message, $data);
    }

    public function notifyJobSeeker(int $jobSeekerUserId, string $title, string $message, array $data = []): void
    {
        $this->createNotification($jobSeekerUserId, $title, $message, $data);
    }

    public function notifyAdmin(int $adminUserId, string $title, string $message, array $data = []): void
    {
        $this->createNotification($adminUserId, $title, $message, $data);
    }

    /**
     * Notify a collection of User models (each must have an `id` property).
     */
    public function createForUsers(iterable $users, string $title, string $message, array $data = []): void
    {
        foreach ($users as $user) {
            $this->createNotification((int) $user->id, $title, $message, $data);
        }
    }

    /**
     * Notify an iterable of raw user IDs.
     */
    public function notifyMany(iterable $userIds, string $title, string $message, array $data = []): void
    {
        foreach ($userIds as $userId) {
            $this->createNotification((int) $userId, $title, $message, $data);
        }
    }

    // -------------------------------------------------------------------------
    // Read
    // -------------------------------------------------------------------------

    public function listNotifications(int $userId, int $page = 1, int $perPage = 20): array
    {
        try {
            $total = DB::connection(self::CONNECTION)
                ->table(self::TABLE)
                ->where('user_id', $userId)
                ->count();

            $rows = DB::connection(self::CONNECTION)
                ->table(self::TABLE)
                ->where('user_id', $userId)
                ->orderByDesc('created_at')
                ->forPage($page, $perPage)
                ->get();

            // [DEBUG] — remove after confirming notification ownership is correct
            Log::debug('[Notifications] listNotifications query result', [
                'queried_user_id'          => $userId,
                'total_in_db'              => $total,
                'returned_count'           => $rows->count(),
                'returned_ids'             => $rows->pluck('id')->toArray(),
                'returned_user_ids'        => $rows->pluck('user_id')->unique()->toArray(),
                'user_id_mismatch_present' => $rows->contains(fn ($r) => (int) $r->user_id !== $userId),
            ]);

            $items = $rows->map(fn ($row) => $this->formatRow($row))->toArray();

            return [
                'items'        => $items,
                'current_page' => $page,
                'per_page'     => $perPage,
                'total'        => $total,
                'last_page'    => $perPage > 0 ? (int) max(1, ceil($total / $perPage)) : 1,
            ];
        } catch (\Throwable $e) {
            Log::error('SupabaseNotificationService: failed to list notifications.', [
                'user_id' => $userId,
                'error'   => $e->getMessage(),
            ]);
            return $this->emptyPaginatedResult($page, $perPage);
        }
    }

    public function unreadCount(int $userId): int
    {
        try {
            return (int) DB::connection(self::CONNECTION)
                ->table(self::TABLE)
                ->where('user_id', $userId)
                ->where('is_read', false)
                ->count();
        } catch (\Throwable $e) {
            Log::error('SupabaseNotificationService: failed to get unread count.', [
                'user_id' => $userId,
                'error'   => $e->getMessage(),
            ]);
            return 0;
        }
    }

    // -------------------------------------------------------------------------
    // Update
    // -------------------------------------------------------------------------

    public function markAsRead(int $notificationId, int $userId): ?array
    {
        try {
            $affected = DB::connection(self::CONNECTION)
                ->table(self::TABLE)
                ->where('id', $notificationId)
                ->where('user_id', $userId)
                ->update([
                    'is_read'    => true,
                    'updated_at' => now(),
                ]);

            if ($affected === 0) {
                return null;
            }

            $row = DB::connection(self::CONNECTION)
                ->table(self::TABLE)
                ->where('id', $notificationId)
                ->first();

            return $row ? $this->formatRow($row) : null;
        } catch (\Throwable $e) {
            Log::error('SupabaseNotificationService: failed to mark notification as read.', [
                'notification_id' => $notificationId,
                'user_id'         => $userId,
                'error'           => $e->getMessage(),
            ]);
            return null;
        }
    }

    public function markAllAsRead(int $userId): void
    {
        try {
            DB::connection(self::CONNECTION)
                ->table(self::TABLE)
                ->where('user_id', $userId)
                ->where('is_read', false)
                ->update([
                    'is_read'    => true,
                    'updated_at' => now(),
                ]);
        } catch (\Throwable $e) {
            Log::error('SupabaseNotificationService: failed to mark all notifications as read.', [
                'user_id' => $userId,
                'error'   => $e->getMessage(),
            ]);
        }
    }

    // -------------------------------------------------------------------------
    // Delete
    // -------------------------------------------------------------------------

    public function deleteNotification(int $notificationId, int $userId): void
    {
        try {
            DB::connection(self::CONNECTION)
                ->table(self::TABLE)
                ->where('id', $notificationId)
                ->where('user_id', $userId)
                ->delete();
        } catch (\Throwable $e) {
            Log::error('SupabaseNotificationService: failed to delete notification.', [
                'notification_id' => $notificationId,
                'user_id'         => $userId,
                'error'           => $e->getMessage(),
            ]);
        }
    }

    /**
     * Delete ALL notifications for a user_id.
     * Called when a brand-new User account is created for a freshly approved
     * company owner, to clear any stale notifications that may exist in Supabase
     * for that numeric ID (can happen when MySQL auto_increment reuses IDs after
     * a database reset in development/staging environments).
     * In a live production database where IDs are never reused this is a no-op.
     */
    public function deleteAllForUser(int $userId): void
    {
        try {
            $deleted = DB::connection(self::CONNECTION)
                ->table(self::TABLE)
                ->where('user_id', $userId)
                ->delete();

            if ($deleted > 0) {
                Log::warning('[Notifications] deleteAllForUser removed stale notifications — possible ID reuse detected', [
                    'user_id'       => $userId,
                    'deleted_count' => $deleted,
                ]);
            }
        } catch (\Throwable $e) {
            Log::error('SupabaseNotificationService: failed to delete all notifications for user.', [
                'user_id' => $userId,
                'error'   => $e->getMessage(),
            ]);
        }
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private function formatRow(object $row): array
    {
        $arr = (array) $row;
        if (isset($arr['data']) && is_string($arr['data'])) {
            $arr['data'] = json_decode($arr['data'], true) ?? [];
        }
        // PDO pgsql returns booleans as 't'/'f' strings; normalise to PHP bool
        // so JSON response always delivers true/false (never a truthy "f" string).
        $raw = $arr['is_read'] ?? false;
        $arr['is_read'] = in_array($raw, [true, 1, 't', '1'], true);
        return $arr;
    }

    private function emptyPaginatedResult(int $page, int $perPage): array
    {
        return [
            'items'        => [],
            'current_page' => $page,
            'per_page'     => $perPage,
            'total'        => 0,
            'last_page'    => 1,
        ];
    }
}
