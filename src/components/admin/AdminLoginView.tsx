"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ContentImage } from "@/components/ui/ContentImage";
import { useAppData } from "@/context/AppDataContext";
import { ApiError } from "@/lib/services/contracts";
import { loginInputSchema } from "@/lib/types/auth";

interface FieldErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export function AdminLoginView() {
  const router = useRouter();
  const { site, signinMemes, mode, services } = useAppData();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [slideIndex, setSlideIndex] = useState(0);

  const slides = signinMemes;
  const totalSlides = slides.length;
  const safeIndex = totalSlides > 0 ? slideIndex % totalSlides : 0;
  const currentSlide = slides[safeIndex];

  const handlePrevMeme = () => {
    if (totalSlides === 0) return;
    setSlideIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const handleNextMeme = () => {
    if (totalSlides === 0) return;
    setSlideIndex((prev) => (prev + 1) % totalSlides);
  };

  const clearFieldError = (field: keyof FieldErrors) => {
    if (!fieldErrors[field]) return;
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const parsed = loginInputSchema.safeParse({
      email: email.trim(),
      password,
      confirmPassword,
    });

    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (
          key === "email" ||
          key === "password" ||
          key === "confirmPassword"
        ) {
          if (!nextErrors[key]) {
            nextErrors[key] = issue.message;
          }
        }
      }
      setFieldErrors(nextErrors);
      setFormError(
        parsed.error.issues[0]?.message ?? "Please check your credentials.",
      );
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    try {
      await services.auth.login(parsed.data);
      router.replace("/admin/overview");
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError("Unable to sign in right now. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FFFFFF] flex flex-col lg:grid lg:grid-cols-2 overflow-x-hidden">
      {/* Left Panel: Sign-in Form */}
      <div className="flex flex-col justify-between px-5 sm:px-10 lg:px-14 xl:px-20 py-6 sm:py-10 bg-[#FFFFFF]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ContentImage
              asset={site.logoDark}
              className="h-10 sm:h-12 w-auto object-contain"
              priority
            />
            {mode === "mock" ? (
              <Badge tone="info" className="rounded-full">
                Preview / Mock Mode
              </Badge>
            ) : null}
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm sm:text-base font-medium text-[#0038E1] hover:text-[#002BAA] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038E1]"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Back to Home
          </Link>
        </div>

        <div className="my-auto py-10 lg:py-14 w-full max-w-[540px] mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-2xl bg-[#F4F5F7] border border-[#E2E8F0] p-2 flex items-center justify-center overflow-hidden">
              <ContentImage
                asset={{
                  id: "media-signin-doge-avatar",
                  src: "/images/figma/signin-doge-avatar.png",
                  alt: "MUICT Dev Club Admin Mascot",
                }}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <div>
              <p className="font-mono text-xs sm:text-sm font-medium uppercase tracking-wider text-[#757E91]">
                MUICT DEV CLUB / ADMIN PORTAL
              </p>
              <h1 className="text-2xl sm:text-[32px] font-medium text-[#1C1B1F] leading-tight mt-1">
                &lt;Admin SignIn /&gt; !
              </h1>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {formError ? (
              <div
                role="alert"
                className="px-4 py-3 border border-[#FB4A2A] bg-[#FAAF98]/25 text-[#B41B00] text-sm font-medium"
              >
                {formError}
              </div>
            ) : null}

            {/* Email */}
            <div>
              <label
                htmlFor="admin-email"
                className="block text-sm font-medium text-[#1C1B1F] mb-1.5"
              >
                Email
              </label>
              <div className="relative">
                <Mail
                  className="w-5 h-5 text-[#4A5565] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="admin-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    clearFieldError("email");
                  }}
                  placeholder="Enter your email (@student.mahidol........)"
                  aria-invalid={Boolean(fieldErrors.email)}
                  className={[
                    "w-full h-[52px] pl-11 pr-4 text-base text-[#1C1B1F] placeholder:text-[#1C1B1F]/45 transition-colors",
                    "focus:outline-2 focus:outline-offset-0 focus:outline-[#0038E1]",
                    fieldErrors.email
                      ? "bg-[#FAAF98]/20 border border-[#FB4A2A]"
                      : "bg-[#E9E9E9]/80 border border-transparent focus:bg-[#FFFFFF] focus:border-[#0038E1]",
                  ].join(" ")}
                />
              </div>
              {fieldErrors.email ? (
                <p className="mt-1.5 text-sm font-medium text-[#B41B00]">
                  {fieldErrors.email}
                </p>
              ) : null}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="admin-password"
                className="block text-sm font-medium text-[#1C1B1F] mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  className="w-5 h-5 text-[#4A5565] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="admin-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    clearFieldError("password");
                  }}
                  placeholder="Enter your password"
                  aria-invalid={Boolean(fieldErrors.password)}
                  className={[
                    "w-full h-[52px] pl-11 pr-12 text-base text-[#1C1B1F] placeholder:text-[#1C1B1F]/45 transition-colors",
                    "focus:outline-2 focus:outline-offset-0 focus:outline-[#0038E1]",
                    fieldErrors.password
                      ? "bg-[#FAAF98]/20 border border-[#FB4A2A]"
                      : "bg-[#E9E9E9]/80 border border-transparent focus:bg-[#FFFFFF] focus:border-[#0038E1]",
                  ].join(" ")}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 inline-flex items-center justify-center text-[#4A5565] hover:text-[#1C1B1F] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0038E1]"
                >
                  {showPassword ? (
                    <Eye className="w-5 h-5" aria-hidden="true" />
                  ) : (
                    <EyeOff className="w-5 h-5" aria-hidden="true" />
                  )}
                </button>
              </div>
              {fieldErrors.password ? (
                <p className="mt-1.5 text-sm font-medium text-[#B41B00]">
                  {fieldErrors.password}
                </p>
              ) : null}
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="admin-confirm-password"
                className="block text-sm font-medium text-[#1C1B1F] mb-1.5"
              >
                Confirm Password
              </label>
              <div className="relative">
                <Lock
                  className="w-5 h-5 text-[#4A5565] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="admin-confirm-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    clearFieldError("confirmPassword");
                  }}
                  placeholder="Confirm your password"
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                  className={[
                    "w-full h-[52px] pl-11 pr-12 text-base text-[#1C1B1F] placeholder:text-[#1C1B1F]/45 transition-colors",
                    "focus:outline-2 focus:outline-offset-0 focus:outline-[#0038E1]",
                    fieldErrors.confirmPassword
                      ? "bg-[#FAAF98]/20 border border-[#FB4A2A]"
                      : "bg-[#E9E9E9]/80 border border-transparent focus:bg-[#FFFFFF] focus:border-[#0038E1]",
                  ].join(" ")}
                />
                <button
                  type="button"
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 inline-flex items-center justify-center text-[#4A5565] hover:text-[#1C1B1F] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0038E1]"
                >
                  {showConfirmPassword ? (
                    <Eye className="w-5 h-5" aria-hidden="true" />
                  ) : (
                    <EyeOff className="w-5 h-5" aria-hidden="true" />
                  )}
                </button>
              </div>
              {fieldErrors.confirmPassword ? (
                <p className="mt-1.5 text-sm font-medium text-[#B41B00]">
                  {fieldErrors.confirmPassword}
                </p>
              ) : null}
            </div>

            <div className="pt-3 flex flex-wrap items-center justify-between gap-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-[50px] min-w-[210px] px-8 bg-[#A9E041] text-[#1C1B1F] text-base font-semibold border-2 border-[#001C26] rounded-r-[60px] hover:bg-[#97CE32] active:bg-[#86BC24] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038E1]"
              >
                {isSubmitting ? "Signing in..." : "Submit"}
              </button>

              {mode === "mock" ? (
                <p className="text-xs text-[#757E91]">
                  Mock mode: enter any valid email &amp; 6+ char matching
                  password.
                </p>
              ) : null}
            </div>
          </form>
        </div>

        <p className="text-xs text-[#757E91]">
          {site.footer.copyright}
        </p>
      </div>

      {/* Right Panel: Royal Blue Meme Carousel */}
      <div className="relative bg-[#0038E1] text-white flex flex-col justify-between px-5 sm:px-10 lg:px-12 py-8 sm:py-10 overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-repeat opacity-20"
          style={{
            backgroundImage: 'url("/images/figma/hero-pattern.png")',
            backgroundSize: "1024px 1024px",
            backgroundPosition: "top left",
          }}
        />

        <div className="relative z-10 flex items-center justify-between gap-4">
          <p className="text-xs sm:text-sm lg:text-base font-medium tracking-wide uppercase text-white/95">
            MUICT DEV CLUB / MAHIDOL UNIVERSITY
          </p>
          <ContentImage
            asset={{
              id: "media-devclub-white-mark",
              src: "/images/figma/devclub-white-mark.svg",
              alt: "MUICT Dev Club white mark",
            }}
            className="h-9 w-9 object-contain shrink-0"
            priority
          />
        </div>

        <div className="relative z-10 my-auto py-8 flex flex-col items-center">
          {currentSlide ? (
            <div className="w-full max-w-[540px]">
              <div className="flex items-center gap-2 sm:gap-4">
                <button
                  type="button"
                  aria-label="Previous meme"
                  onClick={handlePrevMeme}
                  className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 inline-flex items-center justify-center text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
                >
                  <ChevronLeft className="w-6 h-6" aria-hidden="true" />
                </button>

                <div className="flex-1 min-w-0 bg-white/10 backdrop-blur-[2px] border border-white/25 rounded-2xl p-4 sm:p-6 flex items-center justify-center">
                  <ContentImage
                    asset={currentSlide}
                    className="w-full h-[240px] sm:h-[340px] lg:h-[400px] object-contain rounded-lg"
                    priority
                  />
                </div>

                <button
                  type="button"
                  aria-label="Next meme"
                  onClick={handleNextMeme}
                  className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 inline-flex items-center justify-center text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
                >
                  <ChevronRight className="w-6 h-6" aria-hidden="true" />
                </button>
              </div>

              <div className="mt-5 flex flex-col items-center text-center gap-3">
                {currentSlide.caption ? (
                  <p className="text-base sm:text-lg font-medium text-white max-w-md">
                    {currentSlide.caption}
                  </p>
                ) : null}

                <div className="flex items-center gap-3">
                  <span
                    data-testid="meme-counter"
                    className="font-mono text-xs sm:text-sm font-semibold px-3 py-1 rounded-full bg-white/15 border border-white/25 text-white"
                  >
                    {safeIndex + 1} / {totalSlides}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {slides.map((slide, idx) => (
                      <button
                        key={slide.id}
                        type="button"
                        aria-label={`Go to meme ${idx + 1}`}
                        onClick={() => setSlideIndex(idx)}
                        className={[
                          "h-2 rounded-full transition-all cursor-pointer",
                          idx === safeIndex
                            ? "w-6 bg-[#A9E041]"
                            : "w-2 bg-white/40 hover:bg-white/70",
                        ].join(" ")}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-white/80">
          <span>Committee Workspace</span>
          <span className="font-mono">&lt;Learn. Hack. Deliver. /&gt;</span>
        </div>
      </div>
    </div>
  );
}
