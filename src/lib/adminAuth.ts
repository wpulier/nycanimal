import type { NextRequest } from "next/server";

export function isAdminAuthorized(request: NextRequest) {
  const token = process.env.ADMIN_API_TOKEN;
  const authorization = request.headers.get("authorization");

  return Boolean(token && authorization === `Bearer ${token}`);
}
