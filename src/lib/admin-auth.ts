import { cookies } from "next/headers";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "./admin-session";

/**
 * Returns true when the request carries a valid, signed admin session cookie.
 * Use this in every admin route handler and admin server component.
 */
export async function isAdminAuthenticated(): Promise<boolean> {
    const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
    return verifyAdminSessionToken(token);
}
