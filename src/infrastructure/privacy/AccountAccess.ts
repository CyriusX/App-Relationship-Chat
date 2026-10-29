export async function assertAccountActive(userId: string): Promise<void> {
  const response = await coreRequest(`/internal/users/${encodeURIComponent(userId)}`);
  const user = (await response.json()) as { status?: string };
  if (user.status !== 'ACTIVE')
    throw Object.assign(new Error('User account is inactive'), { statusCode: 403 });
}
export async function assertDeletionAuthorized(userId: string): Promise<void> {
  const response = await coreRequest(`/internal/users/${encodeURIComponent(userId)}/deletion`);
  const result = (await response.json()) as { authorized?: boolean };
  if (!result.authorized)
    throw Object.assign(new Error('Deletion is not due or authorized'), { statusCode: 403 });
}
async function coreRequest(path: string): Promise<Response> {
  const url = process.env['CORE_SERVICE_URL'];
  const key =
    process.env['CORE_SERVICE_API_KEY'] ??
    process.env['CORE_INTERNAL_TOKEN'] ??
    process.env['INTERNAL_API_KEY'] ??
    process.env['INTERNAL_TOKEN'];
  if (!url || !key)
    throw Object.assign(new Error('Account validation is not configured'), { statusCode: 503 });
  const response = await fetch(`${url}${path}`, {
    headers: { 'x-internal-api-key': key },
    signal: AbortSignal.timeout(5000),
  }).catch(() => {
    throw Object.assign(new Error('Account validation temporarily unavailable'), {
      statusCode: 503,
    });
  });
  if (response.status === 404)
    throw Object.assign(new Error('User account is inactive'), { statusCode: 403 });
  if (!response.ok)
    throw Object.assign(new Error('Account validation temporarily unavailable'), {
      statusCode: 503,
    });
  return response;
}
