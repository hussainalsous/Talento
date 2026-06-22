import axiosClient from './axiosClient';

export const jobSeekerApi = {
  getProfile: () =>
    axiosClient.get('/job-seeker/profile'),

  updateProfile: (data) =>
    axiosClient.patch('/job-seeker/profile', data),

  updatePrivacy: (data) =>
    axiosClient.patch('/job-seeker/privacy', data),

  updateSkills: (skillIds) =>
    axiosClient.put('/job-seeker/skills', { skill_ids: skillIds }),

  getRecommendedCourses: (params) =>
    axiosClient.get('/job-seeker/recommended-courses', { params }),

  getCvs: () =>
    axiosClient.get('/job-seeker/cvs'),

  getApplications: (params) =>
    axiosClient.get('/job-seeker/applications', { params }),

  getSavedJobs: (params) =>
    axiosClient.get('/job-seeker/saved-jobs', { params }),

  getInvitations: (params) =>
    axiosClient.get('/job-seeker/invitations', { params }),
};
