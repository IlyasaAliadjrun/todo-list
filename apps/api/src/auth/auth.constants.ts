/** Nama cookie refresh token (httpOnly). */
export const REFRESH_COOKIE = "refresh_token";

/** Payload JWT access token. */
export interface AccessTokenPayload {
  sub: string; // userId
  email: string;
}

/** User yang sudah terautentikasi, ditempel ke request oleh JwtAuthGuard. */
export interface AuthenticatedUser {
  id: string;
  email: string;
}
