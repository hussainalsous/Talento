<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\SupabaseNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class NotificationController extends Controller
{
    public function __construct(private readonly SupabaseNotificationService $notifications) {}

    /**
     * GET /api/v1/notifications
     */
    public function index(Request $request): JsonResponse
    {
        $userId  = (int) $request->user()->id;
        $page    = max(1, (int) $request->query('page', 1));
        $perPage = min(100, max(1, (int) $request->query('per_page', 20)));

        // [DEBUG] — remove after confirming notification ownership is correct
        Log::debug('[Notifications] index called', [
            'auth_user_id' => $userId,
            'auth_email'   => $request->user()->email,
            'auth_role'    => $request->user()->role,
        ]);

        $result      = $this->notifications->listNotifications($userId, $page, $perPage);
        $unreadCount = $this->notifications->unreadCount($userId);

        return response()->json([
            'success' => true,
            'data'    => $result['items'],
            'meta'    => [
                'current_page' => $result['current_page'],
                'per_page'     => $result['per_page'],
                'total'        => $result['total'],
                'last_page'    => $result['last_page'],
                'unread_count' => $unreadCount,
            ],
        ]);
    }

    /**
     * GET /api/v1/notifications/unread-count
     */
    public function unreadCount(Request $request): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data'    => [
                'unread_count' => $this->notifications->unreadCount((int) $request->user()->id),
            ],
        ]);
    }

    /**
     * PATCH /api/v1/notifications/{id}/read
     */
    public function markAsRead(Request $request, string $id): JsonResponse
    {
        $notification = $this->notifications->markAsRead((int) $id, (int) $request->user()->id);

        if ($notification === null) {
            return response()->json([
                'success' => false,
                'message' => 'Notification not found or could not be updated.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Notification marked as read.',
            'data'    => $notification,
        ]);
    }

    /**
     * PATCH /api/v1/notifications/read-all
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $this->notifications->markAllAsRead((int) $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'All notifications marked as read.',
        ]);
    }

    /**
     * DELETE /api/v1/notifications/{id}
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $this->notifications->deleteNotification((int) $id, (int) $request->user()->id);

        return response()->json([
            'success' => true,
            'message' => 'Notification deleted.',
        ]);
    }
}
