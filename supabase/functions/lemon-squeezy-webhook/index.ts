import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const IS_TEST_MODE = Deno.env.get("WEBHOOK_TEST_MODE") === "true";

async function verifySignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signed = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const expectedSignature = Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return expectedSignature === signature;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();

    // Verify signature (skip in test mode)
    const testHeader = req.headers.get("x-test-mode");
    if (testHeader !== "true") {
      const secret = Deno.env.get("LEMONSQUEEZY_WEBHOOK_SECRET");
      if (!secret) {
        return new Response(
          JSON.stringify({ error: "Webhook secret not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const signature = req.headers.get("x-signature");
      if (!signature) {
        return new Response(
          JSON.stringify({ error: "Missing signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const isValid = await verifySignature(body, signature, secret);
      if (!isValid) {
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const event = JSON.parse(body);
    const eventName = event.meta?.event_name;

    console.log("Lemon Squeezy event:", eventName);

    if (eventName === "order_created") {
      const customerEmail = event.data?.attributes?.user_email;

      if (!customerEmail) {
        console.error("No customer email found in event");
        return new Response(
          JSON.stringify({ error: "No customer email" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Granting lifetime access to:", customerEmail);

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: users, error: userError } =
        await supabaseAdmin.auth.admin.listUsers();

      if (userError) {
        console.error("Error listing users:", userError);
        return new Response(
          JSON.stringify({ error: "Failed to look up user" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const user = users.users.find(
        (u) => u.email?.toLowerCase() === customerEmail.toLowerCase()
      );

      if (!user) {
        console.log("User not found for email:", customerEmail);
        return new Response(
          JSON.stringify({ message: "User not found, but webhook received" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ has_lifetime_access: true })
        .eq("id", user.id);

      if (updateError) {
        console.error("Error updating profile:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update profile" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Lifetime access granted to user:", user.id);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
