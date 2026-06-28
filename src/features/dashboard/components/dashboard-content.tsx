"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LocalDocumentService } from "@/services/local-document.service";
import type { LocalDocument } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime, truncate, stripHtml } from "@/lib/utils";
import {
  Plus,
  Search,
  Star,
  Trash2,
  Users,
  WifiOff,
  Clock,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";

type TabFilter =
  | "recent"
  | "shared"
  | "offline"
  | "favourites"
  | "deleted";

const tabs: { id: TabFilter; label: string; icon: React.ElementType }[] = [
  { id: "recent", label: "Recent", icon: Clock },
  { id: "shared", label: "Shared", icon: Users },
  { id: "offline", label: "Offline", icon: WifiOff },
  { id: "favourites", label: "Favourites", icon: Star },
  { id: "deleted", label: "Deleted", icon: Trash2 },
];

export function DashboardContent() {
  const router = useRouter();
  const { data: session } = useSession();
  const [documents, setDocuments] = useState<LocalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabFilter>("recent");
  const [search, setSearch] = useState("");

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      let docs: LocalDocument[];
      switch (activeTab) {
        case "shared":
          docs = await LocalDocumentService.getShared();
          break;
        case "offline":
          docs = await LocalDocumentService.getOffline();
          break;
        case "favourites":
          docs = await LocalDocumentService.getFavourites();
          break;
        case "deleted":
          docs = await LocalDocumentService.getDeleted();
          break;
        default:
          docs = await LocalDocumentService.getRecent(50);
      }

      if (search) {
        const q = search.toLowerCase();
        docs = docs.filter(
          (d) =>
            d.title.toLowerCase().includes(q) ||
            stripHtml(d.content).toLowerCase().includes(q),
        );
      }

      setDocuments(docs);
    } catch {
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [activeTab, search]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleCreate = async () => {
    const userId = session?.user?.id ?? "local-user";
    const doc = await LocalDocumentService.create(userId);
    toast.success("Document created");
    router.push(`/editor/${doc.id}`);
  };

  const handleToggleFavourite = async (
    e: React.MouseEvent,
    id: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    await LocalDocumentService.toggleFavourite(id);
    loadDocuments();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground">
            Your local-first collaborative workspace
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Document
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
            className="shrink-0"
          >
            <tab.icon className="mr-1.5 h-3.5 w-3.5" />
            {tab.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No documents found</h3>
          <p className="text-muted-foreground mt-1 mb-4">
            Create your first document to get started
          </p>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create Document
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <Link
              key={doc.id}
              href={`/editor/${doc.id}`}
              className="group rounded-lg border bg-card p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold line-clamp-1 group-hover:text-primary">
                  {doc.title}
                </h3>
                <button
                  onClick={(e) => handleToggleFavourite(e, doc.id)}
                  className="shrink-0 text-muted-foreground hover:text-yellow-500"
                >
                  <Star
                    className={`h-4 w-4 ${doc.isFavourite ? "fill-yellow-500 text-yellow-500" : ""}`}
                  />
                </button>
              </div>
              <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                {truncate(stripHtml(doc.content) || "Empty document", 120)}
              </p>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(doc.lastModified)}
                </span>
                {doc.isOffline && (
                  <Badge variant="secondary" className="text-xs">
                    <WifiOff className="mr-1 h-3 w-3" />
                    Offline
                  </Badge>
                )}
                {doc.syncStatus === "pending" && (
                  <Badge variant="outline" className="text-xs">
                    Pending sync
                  </Badge>
                )}
                {doc.role === "viewer" && (
                  <Badge variant="outline" className="text-xs">
                    View only
                  </Badge>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
