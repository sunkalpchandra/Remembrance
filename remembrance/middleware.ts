import {
  clerkMiddleware,
  createRouteMatcher,
  clerkClient,
} from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
]);

const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  // If the user is accessing a public route, let them through
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // If the user is not signed in and trying to access a protected route, redirect to sign-in
  if (!userId) {
    await auth.protect();
    return;
  }

  // Check if the user has completed onboarding.
  const claims = sessionClaims as any;
  let hasCompletedOnboarding =
    claims?.publicMetadata?.onboardingComplete === true ||
    claims?.onboardingComplete === true;
  let userRole = claims?.publicMetadata?.role;

  if (!hasCompletedOnboarding || !userRole) {
    try {
      const client = await clerkClient();
      const fullUser = await client.users.getUser(userId);
      if (fullUser?.publicMetadata?.onboardingComplete === true) {
        hasCompletedOnboarding = true;
      }
      if (fullUser?.publicMetadata?.role) {
        userRole = fullUser.publicMetadata.role as string;
      }
    } catch (e) {
      console.error(e);
    }
  }

  const isAccessingOnboarding = isOnboardingRoute(req);

  // Redirect to onboarding if they haven't completed it yet
  if (!hasCompletedOnboarding && !isAccessingOnboarding) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  // Redirect to dashboard/home if they try to access onboarding after completing it
  if (hasCompletedOnboarding && isAccessingOnboarding) {
    if (userRole === "caregiver") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Redirect caregivers to dashboard if they access non-dashboard routes
  if (
    hasCompletedOnboarding &&
    userRole === "caregiver" &&
    !req.nextUrl.pathname.startsWith("/dashboard") &&
    !req.nextUrl.pathname.startsWith("/api")
  ) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Restrict /dashboard access to caregivers only
  if (
    hasCompletedOnboarding &&
    req.nextUrl.pathname.startsWith("/dashboard") &&
    userRole !== "caregiver"
  ) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
