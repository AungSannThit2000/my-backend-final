// REFERENCE: This file is provided as a user registration example.
// Students must implement authentication and role-based logic as required in the exam.
import { requireAuth } from "@/lib/auth";
import corsHeaders from "@/lib/cors";
import { DB_NAME, USER_COLLECTION, getClientPromise } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function OPTIONS(req) {
  return new Response(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function GET (req) {
  const auth = await requireAuth(req);
  if (auth.error) {
    return auth.error;
  }

  try {
    const client = await getClientPromise();
    const db = client.db(DB_NAME);
    const email = auth.user.email;
    const profile = await db.collection(USER_COLLECTION).findOne(
      { email },
      {
        projection: { password: 0 },
      }
    );
    return NextResponse.json(profile, {
      headers: corsHeaders
    })
  }
  catch(error) {
    return NextResponse.json(error.toString(), {
      headers: corsHeaders
    })
  }
}
