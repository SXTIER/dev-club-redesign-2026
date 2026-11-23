"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
} from "lucide-react";
import { PublicNavbar } from "@/components/public/PublicNavbar";
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
  const { signinMemes, services } = useAppData();

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
    <div className="min-h-screen w-full flex flex-col bg-[#A1A7B4] overflow-x-hidden">
      <PublicNavbar />

      <main className="relative flex-1 w-full bg-[#A1A7B4] flex items-center">
        {/* Stepped White Grid Background Pattern */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-repeat opacity-90"
          style={{
            backgroundImage: 'url("/images/figma/hero-pattern.png")',
            backgroundSize: "1024px 1024px",
            backgroundPosition: "top left",
          }}
        />

        <div className="relative z-10 w-full max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 xl:px-16 py-10 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Left Column: Mascot sitting atop Sharp White Sign-In Card */}
            <div className="lg:col-span-6 flex flex-col items-center lg:items-start">
              <div className="w-full max-w-[540px] flex flex-col items-center">
                {/* Mascot with Dev Club white mark on chest */}
                <div className="relative w-[156px] h-[156px] sm:w-[180px] sm:h-[180px] -mb-2 z-10 select-none pointer-events-none">
                  <ContentImage
                    asset={{
                      id: "media-signin-doge-avatar",
                      src: "/images/figma/signin-doge-avatar.png",
                      alt: "MUICT Dev Club Admin Mascot",
                    }}
                    className="w-full h-full object-contain"
                    priority
                  />
                  <div className="absolute left-1/2 bottom-[14%] -translate-x-1/2 rotate-3 w-[32px] h-[32px] sm:w-[36px] sm:h-[36px]">
                    <ContentImage
                      asset={{
                        id: "media-devclub-white-mark",
                        src: "/images/figma/devclub-white-mark.svg",
                        alt: "",
                      }}
                      className="w-full h-full object-contain"
                      priority
                    />
                  </div>
                </div>

                {/* Sharp-Cornered White Card */}
                <div className="w-full bg-[#FFFFFF] px-7 sm:px-10 py-8 sm:py-10">
                  <h1 className="text-xl sm:text-[22px] font-normal text-[#1C1B1F] leading-snug mb-6">
                    &lt;Admin SignIn /&gt; !
                  </h1>

                  <form
                    onSubmit={handleSubmit}
                    noValidate
                    className="space-y-4 sm:space-y-5"
                  >
                    {formError ? (
                      <div
                        role="alert"
                        className="px-3.5 py-2.5 border border-[#FB4A2A] bg-[#FAAF98]/25 text-[#B41B00] text-sm font-medium"
                      >
                        {formError}
                      </div>
                    ) : null}

                    {/* Email */}
                    <div>
                      <label htmlFor="admin-email" className="sr-only">
                        Email
                      </label>
                      <div className="relative">
                        <Mail
                          className="w-4 h-4 text-[#4A5565] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
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
                            "w-full h-[46px] pl-10 pr-4 text-sm sm:text-[15px] text-[#1C1B1F] placeholder:text-[#1C1B1F]/45 transition-colors",
                            "focus:outline-2 focus:outline-offset-0 focus:outline-[#0038E1]",
                            fieldErrors.email
                              ? "bg-[#FAAF98]/20 border border-[#FB4A2A]"
                              : "bg-[#E9E9E9] border border-transparent focus:bg-[#FFFFFF] focus:border-[#0038E1]",
                          ].join(" ")}
                        />
                      </div>
                      {fieldErrors.email ? (
                        <p className="mt-1 text-xs sm:text-sm font-medium text-[#B41B00]">
                          {fieldErrors.email}
                        </p>
                      ) : null}
                    </div>

                    {/* Password */}
                    <div>
                      <label htmlFor="admin-password" className="sr-only">
                        Password
                      </label>
                      <div className="relative">
                        <Lock
                          className="w-4 h-4 text-[#4A5565] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
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
                            "w-full h-[46px] pl-10 pr-11 text-sm sm:text-[15px] text-[#1C1B1F] placeholder:text-[#1C1B1F]/45 transition-colors",
                            "focus:outline-2 focus:outline-offset-0 focus:outline-[#0038E1]",
                            fieldErrors.password
                              ? "bg-[#FAAF98]/20 border border-[#FB4A2A]"
                              : "bg-[#E9E9E9] border border-transparent focus:bg-[#FFFFFF] focus:border-[#0038E1]",
                          ].join(" ")}
                        />
                        <button
                          type="button"
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-0.5 top-1/2 -translate-y-1/2 w-11 h-11 inline-flex items-center justify-center text-[#1C1B1F]/70 hover:text-[#1C1B1F] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0038E1]"
                        >
                          {showPassword ? (
                            <Eye className="w-4 h-4" aria-hidden="true" />
                          ) : (
                            <EyeOff className="w-4 h-4" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                      {fieldErrors.password ? (
                        <p className="mt-1 text-xs sm:text-sm font-medium text-[#B41B00]">
                          {fieldErrors.password}
                        </p>
                      ) : null}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label
                        htmlFor="admin-confirm-password"
                        className="sr-only"
                      >
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock
                          className="w-4 h-4 text-[#4A5565] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
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
                            "w-full h-[46px] pl-10 pr-11 text-sm sm:text-[15px] text-[#1C1B1F] placeholder:text-[#1C1B1F]/45 transition-colors",
                            "focus:outline-2 focus:outline-offset-0 focus:outline-[#0038E1]",
                            fieldErrors.confirmPassword
                              ? "bg-[#FAAF98]/20 border border-[#FB4A2A]"
                              : "bg-[#E9E9E9] border border-transparent focus:bg-[#FFFFFF] focus:border-[#0038E1]",
                          ].join(" ")}
                        />
                        <button
                          type="button"
                          aria-label={
                            showConfirmPassword
                              ? "Hide confirm password"
                              : "Show confirm password"
                          }
                          onClick={() =>
                            setShowConfirmPassword((prev) => !prev)
                          }
                          className="absolute right-0.5 top-1/2 -translate-y-1/2 w-11 h-11 inline-flex items-center justify-center text-[#1C1B1F]/70 hover:text-[#1C1B1F] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0038E1]"
                        >
                          {showConfirmPassword ? (
                            <Eye className="w-4 h-4" aria-hidden="true" />
                          ) : (
                            <EyeOff className="w-4 h-4" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                      {fieldErrors.confirmPassword ? (
                        <p className="mt-1 text-xs sm:text-sm font-medium text-[#B41B00]">
                          {fieldErrors.confirmPassword}
                        </p>
                      ) : null}
                    </div>

                    <div className="pt-3">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="h-12 w-full sm:w-auto min-w-[180px] px-8 bg-[#A9E041] text-[#1C1B1F] text-[15px] font-normal rounded-r-[60px] rounded-l-none hover:bg-[#97CE32] active:bg-[#86BC24] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0038E1]"
                      >
                        {isSubmitting ? "Signing in..." : "Submit"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Right Column: Meme Image Flanked by Lime Green Chevrons */}
            <div className="lg:col-span-6 flex items-center justify-center">
              {currentSlide ? (
                <div className="w-full max-w-[540px] flex items-center justify-center gap-3 sm:gap-5">
                  <button
                    type="button"
                    aria-label="Previous meme"
                    onClick={handlePrevMeme}
                    className="shrink-0 p-1 text-[#A9E041] hover:text-[#B9EC58] transition-transform hover:scale-110 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0038E1]"
                  >
                    <ChevronLeft
                      className="w-9 h-9 sm:w-12 sm:h-12 drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]"
                      strokeWidth={2.25}
                      aria-hidden="true"
                    />
                  </button>

                  <div className="flex-1 min-w-0 flex items-center justify-center">
                    {/\.(mp4|webm|mov)(\?.*)?$/i.test(currentSlide.src) ? (
                      <video
                        key={currentSlide.src}
                        src={currentSlide.src}
                        aria-label={currentSlide.alt}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full max-h-[420px] sm:max-h-[540px] object-contain"
                      />
                    ) : (
                      <ContentImage
                        asset={currentSlide}
                        className="w-full max-h-[420px] sm:max-h-[540px] object-contain"
                        priority
                      />
                    )}
                  </div>

                  <button
                    type="button"
                    aria-label="Next meme"
                    onClick={handleNextMeme}
                    className="shrink-0 p-1 text-[#A9E041] hover:text-[#B9EC58] transition-transform hover:scale-110 cursor-pointer focus-visible:outline-2 focus-visible:outline-[#0038E1]"
                  >
                    <ChevronRight
                      className="w-9 h-9 sm:w-12 sm:h-12 drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]"
                      strokeWidth={2.25}
                      aria-hidden="true"
                    />
                  </button>

                  {/* Accessible slide metadata for screen readers & tests */}
                  <span data-testid="meme-counter" className="sr-only">
                    {safeIndex + 1} / {totalSlides}
                  </span>
                  {currentSlide.caption ? (
                    <span className="sr-only">{currentSlide.caption}</span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
