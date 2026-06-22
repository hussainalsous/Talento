import api from './api';

/**
 * POST /auth/job-seeker/register
 * Body: { name, email, password, password_confirmation }
 */
export async function registerJobSeeker(data) {
  const res = await api.post('/auth/job-seeker/register', data);
  return res.data;
}

/**
 * POST /auth/company-registration-requests
 * Body: { company_name, registration_number, website, address, country,
 *         description, requester_first_name, requester_last_name,
 *         requester_email, requester_phone, password, password_confirmation }
 */
export async function submitCompanyRegistration(data) {
  const res = await api.post('/auth/company-registration-requests', data);
  
  return res.data;
}
