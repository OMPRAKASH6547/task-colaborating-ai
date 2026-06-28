"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { History, RotateCcw, Camera, GitCompare } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";

interface Version {
  _id: string;
  version: number;
  title: string;
  changeSummary: string;
  createdAt: string;
  createdBy?: { name: string; email: string };
}

interface VersionHistoryPanelProps {
  documentId: string;
  onRestore: (content: string, title: string) => void;
  onClose: () => void;
}

export function VersionHistoryPanel({
  documentId,
  onRestore,
  onClose,
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Version | null>(null);

  useEffect(() => {
    fetch(`/api/documents/${documentId}/versions`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setVersions(data.data);
      })
      .finally(() => setLoading(false));
  }, [documentId]);

  const createSnapshot = async () => {
    const res = await fetch(`/api/documents/${documentId}/versions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changeSummary: "Manual snapshot" }),
    });
    const data = await res.json();
    if (data.success) {
      toast.success("Snapshot created");
      const listRes = await fetch(`/api/documents/${documentId}/versions`);
      const listData = await listRes.json();
      if (listData.success) setVersions(listData.data);
    } else {
      toast.error(data.error ?? "Failed to create snapshot");
    }
  };

  const restoreVersion = async (versionId: string) => {
    const res = await fetch(
      `/api/documents/${documentId}/versions/${versionId}/restore`,
      { method: "POST" },
    );
    const data = await res.json();
    if (data.success) {
      toast.success(`Restored to version ${data.data.restoredFromVersion}`);
      onRestore(data.data.content, data.data.title);
    } else {
      toast.error(data.error ?? "Failed to restore");
    }
  };

  return (
    <div className="flex flex-col h-full border-l bg-card w-80 shrink-0">
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5" />
          <h3 className="font-semibold">Version History</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ✕
        </Button>
      </div>

      <div className="p-4 border-b">
        <Button size="sm" className="w-full" onClick={createSnapshot}>
          <Camera className="mr-2 h-4 w-4" />
          Create Snapshot
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-md" />
          ))
        ) : versions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No versions yet. Create a snapshot to start tracking changes.
          </p>
        ) : (
          versions.map((version) => (
            <div
              key={version._id}
              className={`rounded-md border p-3 cursor-pointer transition-colors ${
                selected?._id === version._id ? "border-primary bg-accent" : "hover:bg-muted/50"
              }`}
              onClick={() => setSelected(version)}
            >
              <div className="flex items-center justify-between">
                <Badge variant="outline">v{version.version}</Badge>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(new Date(version.createdAt).getTime())}
                </span>
              </div>
              <p className="text-sm mt-1 font-medium">{version.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {version.changeSummary}
              </p>
              {version.createdBy && (
                <p className="text-xs text-muted-foreground mt-1">
                  by {version.createdBy.name}
                </p>
              )}
              {selected?._id === version._id && (
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      restoreVersion(version._id);
                    }}
                  >
                    <RotateCcw className="mr-1 h-3 w-3" />
                    Restore
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs">
                    <GitCompare className="mr-1 h-3 w-3" />
                    Compare
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
