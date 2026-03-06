// TODO: Students must implement CRUD for Book here, similar to Item.
// Example: GET (get book by id), PATCH (update), DELETE (remove)

// import necessary modules and setup as in Item
import { requireAuth } from "@/lib/auth";
import { getCorsHeaders } from "@/lib/cors";
import { BOOK_COLLECTION, DB_NAME, getClientPromise } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

function parseObjectId(id) {
  if (!ObjectId.isValid(id)) {
    return null;
  }
  return new ObjectId(id);
}

export async function OPTIONS(req) {
  // ...existing code for CORS (see Item)
  return new Response(null, {
    status: 200,
    headers: getCorsHeaders(req),
  });
}

export async function GET(req, { params }) {
  // TODO: Implement get book by id
  const headers = getCorsHeaders(req);
  const auth = await requireAuth(req);
  if (auth.error) {
    return auth.error;
  }

  const resolvedParams = await params;
  const id = parseObjectId(resolvedParams?.id);
  if (!id) {
    return NextResponse.json(
      { message: "Invalid book id" },
      {
        status: 400,
        headers,
      }
    );
  }

  try {
    const client = await getClientPromise();
    const db = client.db(DB_NAME);

    const query = { _id: id };
    if (auth.user.role !== "ADMIN") {
      query.status = { $ne: "DELETED" };
    }

    const book = await db.collection(BOOK_COLLECTION).findOne(query);
    if (!book) {
      return NextResponse.json(
        { message: "Book not found" },
        {
          status: 404,
          headers,
        }
      );
    }

    return NextResponse.json(book, {
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

export async function PATCH(req, { params }) {
  // TODO: Implement update book by id
  const headers = getCorsHeaders(req);
  const auth = await requireAuth(req, ["ADMIN"]);
  if (auth.error) {
    return auth.error;
  }

  const resolvedParams = await params;
  const id = parseObjectId(resolvedParams?.id);
  if (!id) {
    return NextResponse.json(
      { message: "Invalid book id" },
      {
        status: 400,
        headers,
      }
    );
  }

  try {
    const body = await req.json();
    const updateData = {};

    if (body.title !== undefined) {
      const value = String(body.title).trim();
      if (!value) {
        return NextResponse.json(
          { message: "Title cannot be empty" },
          {
            status: 400,
            headers,
          }
        );
      }
      updateData.title = value;
    }
    if (body.author !== undefined) {
      const value = String(body.author).trim();
      if (!value) {
        return NextResponse.json(
          { message: "Author cannot be empty" },
          {
            status: 400,
            headers,
          }
        );
      }
      updateData.author = value;
    }
    if (body.location !== undefined) {
      const value = String(body.location).trim();
      if (!value) {
        return NextResponse.json(
          { message: "Location cannot be empty" },
          {
            status: 400,
            headers,
          }
        );
      }
      updateData.location = value;
    }
    if (body.quantity !== undefined) {
      const quantity = Number(body.quantity);
      if (Number.isNaN(quantity) || quantity < 0) {
        return NextResponse.json(
          { message: "Quantity must be a non-negative number" },
          {
            status: 400,
            headers,
          }
        );
      }
      updateData.quantity = quantity;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { message: "No valid field to update" },
        {
          status: 400,
          headers,
        }
      );
    }

    updateData.updatedAt = new Date();

    const client = await getClientPromise();
    const db = client.db(DB_NAME);
    const result = await db.collection(BOOK_COLLECTION).updateOne(
      { _id: id },
      {
        $set: updateData,
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Book not found" },
        {
          status: 404,
          headers,
        }
      );
    }

    return NextResponse.json(
      { message: "Book updated" },
      {
        status: 200,
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

export async function DELETE(req, { params }) {
  // TODO: Implement delete book by id
  const headers = getCorsHeaders(req);
  const auth = await requireAuth(req, ["ADMIN"]);
  if (auth.error) {
    return auth.error;
  }

  const resolvedParams = await params;
  const id = parseObjectId(resolvedParams?.id);
  if (!id) {
    return NextResponse.json(
      { message: "Invalid book id" },
      {
        status: 400,
        headers,
      }
    );
  }

  try {
    const client = await getClientPromise();
    const db = client.db(DB_NAME);
    const result = await db.collection(BOOK_COLLECTION).updateOne(
      { _id: id },
      {
        $set: {
          status: "DELETED",
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Book not found" },
        {
          status: 404,
          headers,
        }
      );
    }

    return NextResponse.json(
      { message: "Book deleted (soft delete)" },
      {
        status: 200,
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
