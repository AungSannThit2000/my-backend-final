
// REFERENCE: This file is provided as a user login example.
// Students must implement authentication and role-based logic as required in the exam.
import { getCorsHeaders } from "@/lib/cors";
import { ensureRequiredUsers } from "@/lib/auth";
import { DB_NAME, USER_COLLECTION, getClientPromise } from "@/lib/mongodb";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "mydefaulyjwtsecret"; // Use a strong secret in production

export async function OPTIONS(req) {
  return new Response(null, {
    status: 200,
    headers: getCorsHeaders(req),
  });
}

export async function POST(req) {
  const headers = getCorsHeaders(req);
  const data = await req.json();
  const { email, password } = data;

  if (!email || !password) {
    return NextResponse.json({
      message: "Missing email or password"
    }, {
      status: 400,
      headers
    });
  }

  try {
    const client = await getClientPromise();
    const db = client.db(DB_NAME);
    await ensureRequiredUsers(db);
    const user = await db.collection(USER_COLLECTION).findOne({ email });
    if (!user) {
      return NextResponse.json({
        message: "Invalid email or password"
      }, {
        status: 401,
        headers
      });
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json({
        message: "Invalid email or password"
      }, {
        status: 401,
        headers
      });
    }
    // Generate JWT
    const token = jwt.sign({
      id: user._id,
      email: user.email,
      username: user.username,
      role: user.role ?? (user.email === "admin@test.com" ? "ADMIN" : "USER")
    }, JWT_SECRET, { expiresIn: "7d" });

    // Set JWT as HTTP-only cookie
    const response = NextResponse.json({
      message: "Login successful",
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        role: user.role ?? (user.email === "admin@test.com" ? "ADMIN" : "USER")
      }
    }, {
      status: 200,
      headers
    });
    response.cookies.set("token", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      secure: process.env.NODE_ENV === "production"
    });
    return response;
  } catch (exception) {
    return NextResponse.json({
      message: "Internal server error"
    }, {
      status: 500,
      headers
    });
  }
}
