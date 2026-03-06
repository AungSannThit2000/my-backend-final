import { requireAuth } from "@/lib/auth";
import { getCorsHeaders } from "@/lib/cors";
import {
  BOOK_COLLECTION,
  BORROW_COLLECTION,
  DB_NAME,
  getClientPromise,
} from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

const STATUS = {
  INIT: "INIT",
  CLOSE_NO_AVAILABLE_BOOK: "CLOSE-NO-AVAILABLE-BOOK",
  ACCEPTED: "ACCEPTED",
  CANCEL_ADMIN: "CANCEL-ADMIN",
  CANCEL_USER: "CANCEL-USER",
};
const RESTORE_STATUS = new Set([
  STATUS.CLOSE_NO_AVAILABLE_BOOK,
  STATUS.CANCEL_ADMIN,
  STATUS.CANCEL_USER,
]);

export async function OPTIONS(req) {
  // ...existing code for CORS (see Item)
  return new Response(null, {
    status: 200,
    headers: getCorsHeaders(req),
  });
}

export async function GET(req) {
  // TODO: Implement list existing request
  const headers = getCorsHeaders(req);
  const auth = await requireAuth(req);
  if (auth.error) {
    return auth.error;
  }

  try {
    const client = await getClientPromise();
    const db = client.db(DB_NAME);

    const query = auth.user.role === "ADMIN" ? {} : { userId: auth.user.id };
    const records = await db
      .collection(BORROW_COLLECTION)
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(records, {
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
  // TODO: Implement create a new request
  const headers = getCorsHeaders(req);
  const auth = await requireAuth(req);
  if (auth.error) {
    return auth.error;
  }

  try {
    const body = await req.json();

    if (body.requestId && body.requestStatus) {
      const requestId = body.requestId;
      const requestStatus = String(body.requestStatus);

      if (!ObjectId.isValid(requestId)) {
        return NextResponse.json(
          { message: "Invalid request id" },
          {
            status: 400,
            headers,
          }
        );
      }

      const allowedStatus = Object.values(STATUS);
      if (!allowedStatus.includes(requestStatus)) {
        return NextResponse.json(
          { message: "Invalid request status" },
          {
            status: 400,
            headers,
          }
        );
      }

      const client = await getClientPromise();
      const db = client.db(DB_NAME);
      const collection = db.collection(BORROW_COLLECTION);
      const record = await collection.findOne({ _id: new ObjectId(requestId) });

      if (!record) {
        return NextResponse.json(
          { message: "Borrow request not found" },
          {
            status: 404,
            headers,
          }
        );
      }

      if (auth.user.role === "ADMIN") {
        const allowedByAdmin = [
          STATUS.ACCEPTED,
          STATUS.CLOSE_NO_AVAILABLE_BOOK,
          STATUS.CANCEL_ADMIN,
        ];
        if (!allowedByAdmin.includes(requestStatus)) {
          return NextResponse.json(
            { message: "Admin cannot set this status" },
            {
              status: 400,
              headers,
            }
          );
        }
      } else {
        if (record.userId !== auth.user.id) {
          return NextResponse.json(
            { message: "Forbidden: not your request" },
            {
              status: 403,
              headers,
            }
          );
        }
        if (requestStatus !== STATUS.CANCEL_USER) {
          return NextResponse.json(
            { message: "User can only cancel request" },
            {
              status: 403,
              headers,
            }
          );
        }
      }

      const prevStatus = record.requestStatus;
      const nextStatus = requestStatus;

      // Reserve one copy when request becomes ACCEPTED.
      if (nextStatus === STATUS.ACCEPTED && prevStatus !== STATUS.ACCEPTED) {
        if (!record.bookId || !ObjectId.isValid(record.bookId)) {
          return NextResponse.json(
            { message: "Cannot accept request without a valid book" },
            {
              status: 400,
              headers,
            }
          );
        }

        const reserveResult = await db.collection(BOOK_COLLECTION).updateOne(
          {
            _id: new ObjectId(record.bookId),
            status: { $ne: "DELETED" },
            quantity: { $gte: 1 },
          },
          {
            $inc: { quantity: -1 },
            $set: { updatedAt: new Date() },
          }
        );

        if (reserveResult.modifiedCount === 0) {
          return NextResponse.json(
            { message: "Book is not available for acceptance" },
            {
              status: 400,
              headers,
            }
          );
        }
      }

      // Release the reserved copy when an ACCEPTED request is closed/cancelled.
      if (
        prevStatus === STATUS.ACCEPTED &&
        nextStatus !== STATUS.ACCEPTED &&
        RESTORE_STATUS.has(nextStatus) &&
        record.bookId &&
        ObjectId.isValid(record.bookId)
      ) {
        await db.collection(BOOK_COLLECTION).updateOne(
          { _id: new ObjectId(record.bookId) },
          {
            $inc: { quantity: 1 },
            $set: { updatedAt: new Date() },
          }
        );
      }

      await collection.updateOne(
        { _id: record._id },
        {
          $set: {
            requestStatus,
            updatedAt: new Date(),
            updatedBy: auth.user.id,
          },
        }
      );

      return NextResponse.json(
        { message: "Borrow request updated" },
        {
          status: 200,
          headers,
        }
      );
    }

    if (auth.user.role !== "USER") {
      return NextResponse.json(
      { message: "Only USER can create borrow request" },
      {
        status: 403,
        headers,
      }
    );
    }

    const targetDateInput = body.targetDate;
    if (!targetDateInput) {
      return NextResponse.json(
      { message: "Missing targetDate" },
      {
        status: 400,
        headers,
      }
    );
    }

    const targetDate = new Date(targetDateInput);
    if (Number.isNaN(targetDate.getTime())) {
      return NextResponse.json(
      { message: "Invalid targetDate" },
      {
        status: 400,
        headers,
      }
    );
    }

    const bookId = body.bookId?.trim();
    let initialStatus = STATUS.INIT;

    const client = await getClientPromise();
    const db = client.db(DB_NAME);

    if (bookId) {
      if (!ObjectId.isValid(bookId)) {
        return NextResponse.json(
          { message: "Invalid bookId" },
          {
            status: 400,
            headers,
          }
        );
      }

      const targetBook = await db.collection(BOOK_COLLECTION).findOne({
        _id: new ObjectId(bookId),
        status: { $ne: "DELETED" },
      });

      if (!targetBook || Number(targetBook.quantity) <= 0) {
        initialStatus = STATUS.CLOSE_NO_AVAILABLE_BOOK;
      }
    }

    const result = await db.collection(BORROW_COLLECTION).insertOne({
      userId: auth.user.id,
      userEmail: auth.user.email,
      bookId: bookId || null,
      targetDate,
      createdAt: new Date(),
      requestStatus: initialStatus,
    });

    return NextResponse.json(
      { id: result.insertedId, requestStatus: initialStatus },
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
