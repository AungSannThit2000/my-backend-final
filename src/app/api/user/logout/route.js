
// REFERENCE: This file is provided as a user logout example.
// Students must implement authentication and role-based logic as required in the exam.
import { getCorsHeaders } from "@/lib/cors";
import { NextResponse } from "next/server";

export async function OPTIONS(req) {
  return new Response(null, {
    status: 200,
    headers: getCorsHeaders(req),
  });
}

export async function POST(req) {
  const headers = getCorsHeaders(req);
  // Clear the JWT cookie by setting it to empty and expired
  const response = NextResponse.json({
    message: "Logout successful"
  }, {
    status: 200,
    headers
  });
  response.cookies.set("token", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    secure: process.env.NODE_ENV === "production"
  });
  return response;
}
