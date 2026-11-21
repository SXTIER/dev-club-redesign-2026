import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppDataProvider } from "@/context/AppDataContext";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ContentImage } from "@/components/ui/ContentImage";
import { FileDropzone } from "@/components/ui/FileDropzone";
import { MediaPickerModal } from "@/components/ui/MediaPickerModal";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { PublicFooter } from "@/components/public/PublicFooter";
import { PublicNavbar } from "@/components/public/PublicNavbar";
import { clearAllFiles, putFile } from "@/lib/storage/indexedDbFiles";
import { clearAllOverlays } from "@/lib/storage/localOverlay";

function stubObjectUrlFns() {
  const prevCreate = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
  const prevRevoke = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");
  const createSpy = vi.fn<(obj: Blob | MediaSource) => string>();
  const revokeSpy = vi.fn<(url: string) => void>();

  Object.defineProperty(URL, "createObjectURL", {
    value: createSpy,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    value: revokeSpy,
    configurable: true,
    writable: true,
  });

  const restore = () => {
    if (prevCreate) {
      Object.defineProperty(URL, "createObjectURL", prevCreate);
    } else {
      Reflect.deleteProperty(URL, "createObjectURL");
    }
    if (prevRevoke) {
      Object.defineProperty(URL, "revokeObjectURL", prevRevoke);
    } else {
      Reflect.deleteProperty(URL, "revokeObjectURL");
    }
  };

  return { createSpy, revokeSpy, restore };
}

describe("Shared UI primitives and Public shell", () => {
  beforeEach(async () => {
    localStorage.clear();
    clearAllOverlays();
    await clearAllFiles();
  });

  describe("ContentImage", () => {
    it("resolves idb:// ImageAsset from IndexedDB and revokes ObjectURL on unmount (Review Focus #3)", async () => {
      await putFile("hero-custom", new Blob(["png"], { type: "image/png" }), {
        filename: "hero.png",
        mimeType: "image/png",
      });
      const { createSpy, revokeSpy, restore } = stubObjectUrlFns();
      createSpy.mockReturnValue("blob:hero-custom");

      try {
        const { unmount } = render(
          <ContentImage
            asset={{ id: "hero-custom", src: "idb://hero-custom", alt: "Hero" }}
          />,
        );

        await waitFor(() =>
          expect(screen.getByAltText("Hero")).toHaveAttribute(
            "src",
            "blob:hero-custom",
          ),
        );
        unmount();
        expect(revokeSpy).toHaveBeenCalledWith("blob:hero-custom");
      } finally {
        restore();
      }
    });

    it("revokes previous ObjectURL when asset.src changes and handles non-idb paths directly", async () => {
      await putFile("img-1", new Blob(["a"], { type: "image/png" }), {
        filename: "a.png",
        mimeType: "image/png",
      });
      await putFile("img-2", new Blob(["b"], { type: "image/png" }), {
        filename: "b.png",
        mimeType: "image/png",
      });
      const { createSpy, revokeSpy, restore } = stubObjectUrlFns();
      createSpy
        .mockReturnValueOnce("blob:img-1")
        .mockReturnValueOnce("blob:img-2");

      try {
        const { rerender, unmount } = render(
          <ContentImage
            asset={{ id: "img-1", src: "idb://img-1", alt: "Slide" }}
          />,
        );

        await waitFor(() =>
          expect(screen.getByAltText("Slide")).toHaveAttribute("src", "blob:img-1"),
        );

        rerender(
          <ContentImage
            asset={{ id: "img-2", src: "idb://img-2", alt: "Slide" }}
          />,
        );

        await waitFor(() =>
          expect(screen.getByAltText("Slide")).toHaveAttribute("src", "blob:img-2"),
        );
        expect(revokeSpy).toHaveBeenCalledWith("blob:img-1");

        rerender(
          <ContentImage
            asset={{
              id: "static-1",
              src: "/images/figma/campus-ict.png",
              alt: "Campus",
            }}
          />,
        );
        expect(screen.getByAltText("Campus")).toHaveAttribute(
          "src",
          "/images/figma/campus-ict.png",
        );
        expect(revokeSpy).toHaveBeenCalledWith("blob:img-2");

        unmount();
      } finally {
        restore();
      }
    });

    it("revokes ObjectURL immediately if unmounted while IndexedDB lookup is in flight", async () => {
      await putFile("race-img", new Blob(["race"], { type: "image/png" }), {
        filename: "race.png",
        mimeType: "image/png",
      });
      const { createSpy, revokeSpy, restore } = stubObjectUrlFns();
      createSpy.mockReturnValue("blob:race-img");

      try {
        const { unmount } = render(
          <ContentImage
            asset={{ id: "race-img", src: "idb://race-img", alt: "Race" }}
          />,
        );
        unmount();
        await waitFor(() => {
          expect(revokeSpy).toHaveBeenCalledWith("blob:race-img");
        });
      } finally {
        restore();
      }
    });
  });

  describe("Modal", () => {
    it("closes on Escape key, close button, and backdrop click", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const { rerender } = render(
        <Modal open={false} onClose={onClose} title="Hidden Modal">
          <p>Body</p>
        </Modal>,
      );
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      rerender(
        <Modal open={true} onClose={onClose} title="Confirm Action">
          <p>Are you sure?</p>
        </Modal>,
      );

      const dialog = screen.getByRole("dialog", { name: "Confirm Action" });
      expect(dialog).toHaveAttribute("aria-modal", "true");

      await user.keyboard("{Escape}");
      expect(onClose).toHaveBeenCalledTimes(1);

      await user.click(screen.getByRole("button", { name: /close modal/i }));
      expect(onClose).toHaveBeenCalledTimes(2);

      const backdrop = screen.getByTestId("modal-backdrop");
      fireEvent.mouseDown(backdrop);
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(3);
    });
  });

  describe("FileDropzone, Pagination, Button, Badge", () => {
    it("validates FileDropzone selection and renders error alert", async () => {
      const user = userEvent.setup();
      const onFileSelected = vi.fn();
      render(
        <FileDropzone
          id="cv-upload"
          label="Upload CV"
          helper="PDF or DOCX up to 10 MB"
          accept=".pdf,.docx"
          error="File too large"
          onFileSelected={onFileSelected}
        />,
      );

      expect(screen.getByRole("alert")).toHaveTextContent("File too large");
      const input = screen.getByLabelText(/Upload CV/i) as HTMLInputElement;
      const file = new File(["%PDF-1.4"], "resume.pdf", {
        type: "application/pdf",
      });
      await user.upload(input, file);
      expect(onFileSelected).toHaveBeenCalledWith(file);
    });

    it("renders Pagination controls and invokes onPageChange", async () => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      render(
        <Pagination
          currentPage={1}
          totalPages={3}
          onPageChange={onPageChange}
        />,
      );

      expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
      await user.click(screen.getByRole("button", { name: "2" }));
      expect(onPageChange).toHaveBeenCalledWith(2);
      await user.click(screen.getByRole("button", { name: /next/i }));
      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    it("renders Button variants and Badge tones", () => {
      render(
        <div>
          <Button variant="primary">Primary CTA</Button>
          <Button variant="lime">Lime CTA</Button>
          <Badge tone="success">Published</Badge>
          <Badge tone="teal">Answered</Badge>
        </div>,
      );
      expect(screen.getByRole("button", { name: "Primary CTA" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Lime CTA" })).toBeInTheDocument();
      expect(screen.getByText("Published")).toBeInTheDocument();
      expect(screen.getByText("Answered")).toBeInTheDocument();
    });
  });

  describe("MediaPickerModal", () => {
    it("filters media items and calls onSelectAsset", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const onSelectAsset = vi.fn();

      render(
        <AppDataProvider>
          <MediaPickerModal
            open={true}
            onClose={onClose}
            onSelectAsset={onSelectAsset}
          />
        </AppDataProvider>,
      );

      const dialog = await screen.findByRole("dialog", {
        name: /choose media asset/i,
      });
      expect(
        within(dialog).getByText("Navbar Dark Wordmark"),
      ).toBeInTheDocument();

      await user.type(
        within(dialog).getByPlaceholderText(/search media/i),
        "Campus",
      );
      expect(
        within(dialog).getByText("Faculty of ICT Salaya Campus"),
      ).toBeInTheDocument();
      expect(
        within(dialog).queryByText("Navbar Dark Wordmark"),
      ).not.toBeInTheDocument();

      await user.click(
        within(dialog).getByRole("button", {
          name: /Faculty of ICT Salaya Campus/i,
        }),
      );
      expect(onSelectAsset).toHaveBeenCalledWith(
        expect.objectContaining({ id: "media-campus-ict" }),
      );
      expect(onClose).toHaveBeenCalled();
    });

    it("supports inline Upload New via services.media.uploadMedia", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const onSelectAsset = vi.fn();
      const { createSpy, restore } = stubObjectUrlFns();
      createSpy.mockReturnValue("blob:uploaded-svg");

      try {
        render(
          <AppDataProvider>
            <MediaPickerModal
              open={true}
              onClose={onClose}
              onSelectAsset={onSelectAsset}
            />
          </AppDataProvider>,
        );

        const dialog = await screen.findByRole("dialog", {
          name: /choose media asset/i,
        });

        await user.click(
          within(dialog).getByRole("button", { name: /upload new/i }),
        );

        const uploadInput = within(dialog).getByLabelText(
          /upload new image or svg/i,
        ) as HTMLInputElement;

        const svgFile = new File(
          ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>'],
          "custom-badge.svg",
          { type: "image/svg+xml" },
        );

        await user.upload(uploadInput, svgFile);

        await waitFor(() =>
          expect(onSelectAsset).toHaveBeenCalledWith(
            expect.objectContaining({
              filename: "custom-badge.svg",
              kind: "svg",
              url: expect.stringMatching(/^idb:\/\//),
            }),
          ),
        );
        expect(onClose).toHaveBeenCalled();
      } finally {
        restore();
      }
    });
  });

  describe("PublicNavbar and PublicFooter", () => {
    it("renders PublicNavbar links and PublicFooter legal links from site.json and toggles mobile menu", async () => {
      const user = userEvent.setup();
      render(
        <AppDataProvider>
          <PublicNavbar />
          <PublicFooter />
        </AppDataProvider>,
      );

      // Non-clickable brand logo in navbar
      const navLogo = screen.getByAltText("MUICT Dev Club wordmark");
      expect(navLogo.closest("a")).toBeNull();

      expect(
        screen.getByRole("link", { name: /Joining information/i }),
      ).toHaveAttribute("href", "/joining-information");
      expect(
        screen.getByRole("link", { name: /Privacy Policy/i }),
      ).toHaveAttribute("href", "/privacy-policy");
      expect(
        screen.getByRole("link", { name: /Terms of Use/i }),
      ).toHaveAttribute("href", "/terms-of-use");
      expect(
        screen.getByRole("link", { name: /Acknowledgement/i }),
      ).toHaveAttribute("href", "/acknowledgement");

      expect(
        screen.getByText(/Faculty of Information and Communication Technology/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Copyright © 2026\. MUICT Dev Club/i),
      ).toBeInTheDocument();

      const menuBtn = screen.getByRole("button", { name: /toggle navigation/i });
      await user.click(menuBtn);
      const drawer = screen.getByRole("dialog", { name: /mobile navigation/i });
      expect(drawer).toBeInTheDocument();

      await user.keyboard("{Escape}");
      expect(
        screen.queryByRole("dialog", { name: /mobile navigation/i }),
      ).not.toBeInTheDocument();
    });
  });
});
