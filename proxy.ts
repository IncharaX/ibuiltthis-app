import {
  clerkClient,
  clerkMiddleware,
  createRouteMatcher,
} from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/clerk(.*)",
]);

const isProtectedRoute = createRouteMatcher([
  "/admin(.*)",
  "/submit(.*)",
  "/_action(.*)",
  "/api(.*)",
  "/trpc(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  if (!isProtectedRoute(req)) {
    return NextResponse.next();
  }

  const { userId, orgId } = await auth();

  if (!userId) {
    await auth.protect();
  }

  if (userId && !orgId) {
    try {
      const client = await clerkClient();

      const { data: organizations } =
        await client.users.getOrganizationMembershipList({
          userId,
        });

      if (organizations && organizations.length > 0) {
        return NextResponse.next();
      }

      const user = await client.users.getUser(userId);

      const orgName = user.fullName
        ? `${user.fullName}'s Organization`
        : user.firstName
        ? `${user.firstName}'s Organization`
        : user.username
        ? `${user.username}'s Organization`
        : user.primaryEmailAddress?.emailAddress
        ? `${user.primaryEmailAddress.emailAddress}'s Organization`
        : "My Organization";

      await client.organizations.createOrganization({
        name: orgName,
        createdBy: userId,
      });

      console.log("Auto-created organization:", orgName);
    } catch (error) {
      console.error("Error auto-creating organization:", error);
    }
  }

  return NextResponse.next();
});


export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
