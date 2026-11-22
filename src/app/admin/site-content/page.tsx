"use client";

import { useId, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { MediaLibraryTab } from "@/components/admin/MediaLibraryTab";
import { WebsiteCopyTab } from "@/components/admin/WebsiteCopyTab";

type SiteContentTabKey = "copy" | "media";

export default function AdminSiteContentPage() {
  const [activeTab, setActiveTab] = useState<SiteContentTabKey>("copy");
  const baseId = useId();
  const copyTabId = `${baseId}-tab-copy`;
  const mediaTabId = `${baseId}-tab-media`;
  const copyPanelId = `${baseId}-panel-copy`;
  const mediaPanelId = `${baseId}-panel-media`;

  return (
    <AdminShell
      activeNav="site-content"
      title="Content & Text Management"
      subtitle="Edit website copy, JSON content slots, and media assets."
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div
            role="tablist"
            aria-label="Site content workspace tabs"
            className="inline-flex flex-wrap items-center gap-3.5"
          >
            <button
              id={copyTabId}
              type="button"
              role="tab"
              aria-selected={activeTab === "copy"}
              aria-controls={copyPanelId}
              onClick={() => setActiveTab("copy")}
              className={[
                "h-12 px-5 rounded-[5px] text-base transition-colors cursor-pointer whitespace-nowrap",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038E1]",
                activeTab === "copy"
                  ? "bg-[#0038E1] text-white font-medium"
                  : "bg-white border border-[#A1A7B4] text-[#0038E1] hover:bg-[#F4F5F7]",
              ].join(" ")}
            >
              Website copy
            </button>

            <button
              id={mediaTabId}
              type="button"
              role="tab"
              aria-selected={activeTab === "media"}
              aria-controls={mediaPanelId}
              onClick={() => setActiveTab("media")}
              className={[
                "h-12 px-5 rounded-[5px] text-base transition-colors cursor-pointer whitespace-nowrap",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038E1]",
                activeTab === "media"
                  ? "bg-[#0038E1] text-white font-medium"
                  : "bg-white border border-[#A1A7B4] text-[#0038E1] hover:bg-[#F4F5F7]",
              ].join(" ")}
            >
              Media &amp; Assets
            </button>
          </div>

          <p className="text-sm text-[#4A5565]">
            {activeTab === "copy"
              ? "Modular JSON · site / home / recruitment / legal"
              : "Asset Library · PNG / JPG / WebP / GIF / SVG (≤ 10 MB)"}
          </p>
        </div>

        {activeTab === "copy" ? (
          <div
            id={copyPanelId}
            role="tabpanel"
            aria-labelledby={copyTabId}
          >
            <WebsiteCopyTab />
          </div>
        ) : (
          <div
            id={mediaPanelId}
            role="tabpanel"
            aria-labelledby={mediaTabId}
          >
            <MediaLibraryTab />
          </div>
        )}
      </div>
    </AdminShell>
  );
}
