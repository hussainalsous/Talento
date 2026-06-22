import axiosClient from './axiosClient';

export const notificationApi = {
  getNotifications: (page = 1, perPage = 20) =>
    axiosClient.get('/notifications', { params: { page, per_page: perPage } }),

  getUnreadCount: () =>
    axiosClient.get('/notifications/unread-count'),

  markAsRead: (id) =>
    axiosClient.patch(`/notifications/${id}/read`),

  markAllAsRead: () =>
    axiosClient.patch('/notifications/read-all'),

  deleteNotification: (id) =>
    axiosClient.delete(`/notifications/${id}`),
};
