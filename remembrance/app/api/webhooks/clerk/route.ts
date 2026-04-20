import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../db";
import { users } from "../../../../db/schema";
import { eq } from "drizzle-orm";
import * as crypto from "crypto";

// Manual Svix webhook verification without external libraries
function verifyClerkWebhook(body: string, headers: Headers, secret: string) {
  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return false;
  }

  // Clerk's secret usually starts with "whsec_"
  const secretBase64 = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  const secretBytes = Buffer.from(secretBase64, "base64");

  const signedContent = `${svixId}.${svixTimestamp}.${body}`;

  const hmac = crypto.createHmac("sha256", secretBytes);
  const expectedSignature = hmac.update(signedContent).digest("base64");

  // Signatures are passed as a space-separated list of versions e.g. "v1,SIGNATURE_1 v1,SIGNATURE_2"
  const passedSignatures = svixSignature
    .split(" ")
    .map((sig) => sig.split(",")[1]);

  // Use timingSafeEqual to prevent timing attacks
  const expectedBuffer = Buffer.from(expectedSignature);
  for (const passedSig of passedSignatures) {
    const passedBuffer = Buffer.from(passedSig);
    if (
      expectedBuffer.length === passedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, passedBuffer)
    ) {
      return true;
    }
  }

  return false;
}

export async function POST(req: NextRequest) {
  try {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      console.error("Missing CLERK_WEBHOOK_SECRET");
      return new NextResponse("Error: Missing Webhook Secret", { status: 500 });
    }

    const payloadString = await req.text();
    const headers = req.headers;

    // Verify the webhook signature natively
    const isValid = verifyClerkWebhook(payloadString, headers, WEBHOOK_SECRET);
    if (!isValid) {
      console.error("Invalid webhook signature");
      return new NextResponse("Error: Invalid signature", { status: 400 });
    }

    const event = JSON.parse(payloadString);
    const eventType = event.type;
    const { id, email_addresses, first_name, last_name, public_metadata } =
      event.data;

    // Handle user creation and updates
    if (eventType === "user.created" || eventType === "user.updated") {
      const email = email_addresses?.[0]?.email_address || "";
      const name =
        [first_name, last_name].filter(Boolean).join(" ") || "Unknown User";

      // Determine role from Clerk metadata, default to 'individual'
      const role =
        public_metadata?.role === "caregiver"
          ? "caregiver"
          : public_metadata?.role === "patient"
            ? "patient"
            : "individual";

      await db
        .insert(users)
        .values({
          id: id,
          email: email,
          name: name,
          role: role,
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            email: email,
            name: name,
            role: role,
          },
        });

      return new NextResponse("User synced successfully", { status: 200 });
    }

    // Handle user deletion (Cascading will clean up patients, conversations, messages automatically)
    if (eventType === "user.deleted") {
      await db.delete(users).where(eq(users.id, id));
      return new NextResponse("User deleted successfully", { status: 200 });
    }

    // Return 200 for unhandled event types so Clerk doesn't retry
    return new NextResponse("Event ignored", { status: 200 });
  } catch (err) {
    console.error("Webhook processing error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
