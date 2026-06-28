import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/tokens";
import {
  DocumentRepository,
  ShareRepository,
} from "@/services/repositories";
import { documentSchema } from "@/schemas";
import {
  rateLimit,
  apiSuccess,
  apiError,
  getAuthHeader,
} from "@/lib/api-utils";
import { sanitizeHtml } from "@/lib/sanitize";

async function authenticate(request: NextRequest) {
  const token = getAuthHeader(request) ?? request.cookies.get("accessToken")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request);
  if (limited) return limited;

  const user = await authenticate(request);
  if (!user) return apiError("Unauthorized", 401);

  const { searchParams } = request.nextUrl;
  const filter = searchParams.get("filter");
  const query = searchParams.get("q");

  try {
    let documents;

    switch (filter) {
      case "shared":
        documents = await DocumentRepository.findShared(user.sub);
        break;
      case "deleted":
        documents = await DocumentRepository.findDeleted(user.sub);
        break;
      case "favourites":
        documents = await DocumentRepository.findByOwner(user.sub, {
          isFavourite: true,
          status: "active",
        });
        break;
      default:
        if (query) {
          documents = await DocumentRepository.search(user.sub, query);
        } else {
          documents = await DocumentRepository.findByOwner(user.sub, {
            status: "active",
          });
        }
    }

    return apiSuccess(
      documents.map((d) => ({
        id: d._id.toString(),
        title: d.title,
        content: d.content,
        ownerId: d.ownerId.toString(),
        tags: d.tags,
        isFavourite: d.isFavourite,
        version: d.version,
        status: d.status,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch documents";
    return apiError(message, 500);
  }
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request);
  if (limited) return limited;

  const user = await authenticate(request);
  if (!user) return apiError("Unauthorized", 401);

  try {
    const json = await request.json();
    const parsed = documentSchema.safeParse(json);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const sanitized = {
      ...parsed.data,
      content: sanitizeHtml(parsed.data.content),
    };

    const doc = await DocumentRepository.create(user.sub, sanitized);

    return apiSuccess(
      {
        id: doc._id.toString(),
        title: doc.title,
        content: doc.content,
        ownerId: doc.ownerId.toString(),
        tags: doc.tags,
        version: doc.version,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      },
      201,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create document";
    return apiError(message, 500);
  }
}
