/**
 * Scope checks, mirroring the platform's Auth0 scope vocabulary.
 *
 * The API enforces these. The portal checks them too, not for security -
 * anything the portal decides can be bypassed with the browser console - but
 * so an agent is not offered a button that will come back 403. Every one of
 * those is a support ticket about the support tool.
 */
export const Scopes = {
  READ_SIM: 'read:sims',
  ACTIVATE_SIM: 'activate:sims',
  SUSPEND_SIM: 'suspend:sims',
  TERMINATE_SIM: 'terminate:sims',
  APPROVE_FRAUD: 'approve:fraud',
  ADMIN: 'admin:all'
};

export function scopesFrom(token: { scope?: string | string[]; permissions?: string[] } | null): string[] {
  if (!token) {
    return [];
  }

  if (Array.isArray(token.scope)) {
    return token.scope.slice();
  }

  if (typeof token.scope === 'string') {
    return token.scope.split(' ').filter(s => s.length > 0);
  }

  if (Array.isArray(token.permissions)) {
    return token.permissions.slice();
  }

  return [];
}

export function hasScope(held: string[], required: string): boolean {
  return held.indexOf(required) !== -1 || held.indexOf(Scopes.ADMIN) !== -1;
}
