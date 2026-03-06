// TODO: Students must implement authentication and role-based access control here.
// Remove this stub and implement JWT verification and role checking as required in the exam.
import { getCorsHeaders } from "@/lib/cors";
import { DB_NAME, USER_COLLECTION, getClientPromise } from "@/lib/mongodb";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "mydefaulyjwtsecret";

const REQUIRED_USERS = [
  {
    username: "admin",
    email: "admin@test.com",
    password: "admin123",
    firstname: "Admin",
    lastname: "User",
    role: "ADMIN",
  },
  {
    username: "user",
    email: "user@test.com",
    password: "user123",
    firstname: "Normal",
    lastname: "User",
    role: "USER",
  },
];

function unauthorized(req, message = "Unauthorized") {
  return NextResponse.json(
    { message },
    {
      status: 401,
      headers: getCorsHeaders(req),
    }
  );
}

function forbidden(req, message = "Forbidden") {
  return NextResponse.json(
    { message },
    {
      status: 403,
      headers: getCorsHeaders(req),
    }
  );
}

function normalizeRole(email, role) {
  if (role === "ADMIN" || role === "USER") {
    return role;
  }
  return email === "admin@test.com" ? "ADMIN" : "USER";
}

export async function ensureRequiredUsers(db) {
  const users = db.collection(USER_COLLECTION);
  for (const seedUser of REQUIRED_USERS) {
    const existing = await users.findOne({ email: seedUser.email });
    if (!existing) {
      await users.insertOne({
        username: seedUser.username,
        email: seedUser.email,
        password: await bcrypt.hash(seedUser.password, 10),
        firstname: seedUser.firstname,
        lastname: seedUser.lastname,
        role: seedUser.role,
        status: "ACTIVE",
      });
    } else if (existing.role !== seedUser.role) {
      await users.updateOne(
        { _id: existing._id },
        {
          $set: {
            role: seedUser.role,
          },
        }
      );
    }
  }
}

export async function getAuthorizedUser(req) {
  const token = req.cookies.get("token")?.value;
  if (!token) {
    return { error: unauthorized(req, "Missing authentication token") };
  }

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (exception) {
    return { error: unauthorized(req, "Invalid or expired token") };
  }

  try {
    const client = await getClientPromise();
    const db = client.db(DB_NAME);
    await ensureRequiredUsers(db);

    const users = db.collection(USER_COLLECTION);
    const user = await users.findOne({ email: payload.email });
    if (!user) {
      return { error: unauthorized(req, "User does not exist") };
    }
    if (user.status === "INACTIVE") {
      return { error: forbidden(req, "User account is inactive") };
    }

    return {
      db,
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        role: normalizeRole(user.email, user.role),
      },
    };
  } catch (exception) {
    return {
      error: NextResponse.json(
        { message: "Internal server error" },
        {
          status: 500,
          headers: getCorsHeaders(req),
        }
      ),
    };
  }
}

export async function requireAuth(req, allowedRoles = []) {
  const authResult = await getAuthorizedUser(req);
  if (authResult.error) {
    return authResult;
  }

  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(authResult.user.role)
  ) {
    return { error: forbidden(req, "Forbidden: Insufficient permission") };
  }

  return authResult;
}
