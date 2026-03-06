// TODO: Students must implement CRUD for Book here, similar to Item.
// Example: GET (list all books), POST (create book)

// import necessary modules and setup as in Item
import { requireAuth } from "@/lib/auth";
import { getCorsHeaders } from "@/lib/cors";
import { BOOK_COLLECTION, DB_NAME, getClientPromise } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function OPTIONS(req) {
  // ...existing code for CORS (see Item)
  return new Response(null, {
    status: 200,
    headers: getCorsHeaders(req),
  });
}

export async function GET(req) {
  // TODO: Implement list all books
  const headers = getCorsHeaders(req);
  const auth = await requireAuth(req);
  if (auth.error) {
    return auth.error;
  }

  try {
    const { searchParams } = new URL(req.url);
    const title = searchParams.get("title")?.trim();
    const author = searchParams.get("author")?.trim();
    const includeDeleted = searchParams.get("includeDeleted") === "true";

    const query = {};
    if (title) {
      query.title = { $regex: title, $options: "i" };
    }
    if (author) {
      query.author = { $regex: author, $options: "i" };
    }
    if (auth.user.role !== "ADMIN" || !includeDeleted) {
      query.status = { $ne: "DELETED" };
    }

    const client = await getClientPromise();
    const db = client.db(DB_NAME);
    const books = await db
      .collection(BOOK_COLLECTION)
      .find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .toArray();

    return NextResponse.json(books, {
      status: 200,
      headers,
    });
  } catch (exception) {
    return NextResponse.json(
      { message: "Internal server error" },
      {
        status: 500,
        headers,
      }
    );
  }
}

export async function POST(req) {
  // TODO: Implement create a new book
  const headers = getCorsHeaders(req);
  const auth = await requireAuth(req, ["ADMIN"]);
  if (auth.error) {
    return auth.error;
  }

  try {
    const body = await req.json();
    const title = body.title?.trim();
    const author = body.author?.trim();
    const location = body.location?.trim();
    const quantity = Number(body.quantity);

    if (!title || !author || !location || Number.isNaN(quantity) || quantity < 0) {
      return NextResponse.json(
        { message: "Invalid book data" },
        {
          status: 400,
          headers,
        }
      );
    }

    const client = await getClientPromise();
    const db = client.db(DB_NAME);
    const result = await db.collection(BOOK_COLLECTION).insertOne({
      title,
      author,
      quantity,
      location,
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      { id: result.insertedId },
      {
        status: 201,
        headers,
      }
    );
  } catch (exception) {
    return NextResponse.json(
      { message: "Internal server error" },
      {
        status: 500,
        headers,
      }
    );
  }
}
