import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the calling user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the caller using anon client
    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: authError } = await anonClient.auth.getUser();
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { username, password, display_name, action, waiter_id } = await req.json();

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    if (action === "create") {
      const waiterEmail = `${username.trim().toLowerCase()}@waiter.eduvanca.local`;

      // Create Supabase Auth account for waiter
      const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
        email: waiterEmail,
        password: password,
        email_confirm: true,
        user_metadata: { display_name, role: "waiter" },
      });

      if (createError) {
        console.error("Auth create error:", createError);
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const authUserId = authData.user.id;

      // Create user_roles entry
      const { error: roleError } = await adminClient
        .from("user_roles")
        .insert({
          user_id: authUserId,
          role: "waiter",
          parent_user_id: caller.id,
        });

      if (roleError) {
        console.error("Role insert error:", roleError);
        // Cleanup: delete the auth user
        await adminClient.auth.admin.deleteUser(authUserId);
        return new Response(JSON.stringify({ error: roleError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create waiter record using RPC (hashes password server-side)
      const { data: waiterId, error: waiterError } = await adminClient.rpc("create_waiter", {
        p_username: username.trim().toLowerCase(),
        p_password: password,
        p_display_name: display_name,
        p_created_by: caller.id,
      });

      if (waiterError) {
        console.error("Waiter create error:", waiterError);
        // Cleanup
        await adminClient.from("user_roles").delete().eq("user_id", authUserId);
        await adminClient.auth.admin.deleteUser(authUserId);
        return new Response(JSON.stringify({ error: waiterError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update waiter record with auth_user_id
      await adminClient
        .from("waiters")
        .update({ auth_user_id: authUserId })
        .eq("id", waiterId);

      return new Response(
        JSON.stringify({ success: true, waiter_id: waiterId, auth_user_id: authUserId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete") {
      // Get waiter's auth_user_id
      const { data: waiter } = await adminClient
        .from("waiters")
        .select("auth_user_id")
        .eq("id", waiter_id)
        .single();

      if (waiter?.auth_user_id) {
        await adminClient.from("user_roles").delete().eq("user_id", waiter.auth_user_id);
        await adminClient.auth.admin.deleteUser(waiter.auth_user_id);
      }

      const { error } = await adminClient.from("waiters").delete().eq("id", waiter_id);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "update") {
      // Get waiter's auth_user_id
      const { data: waiter } = await adminClient
        .from("waiters")
        .select("auth_user_id, username")
        .eq("id", waiter_id)
        .single();

      const newEmail = `${username.trim().toLowerCase()}@waiter.eduvanca.local`;

      if (waiter?.auth_user_id) {
        // Update auth user email and password
        const { error: updateError } = await adminClient.auth.admin.updateUserById(
          waiter.auth_user_id,
          { email: newEmail, password, email_confirm: true }
        );
        if (updateError) {
          console.error("Auth update error:", updateError);
          return new Response(JSON.stringify({ error: updateError.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Update waiter record via RPC
      const { error: waiterError } = await adminClient.rpc("update_waiter", {
        p_waiter_id: waiter_id,
        p_username: username.trim().toLowerCase(),
        p_password: password,
        p_display_name: display_name,
      });

      if (waiterError) {
        return new Response(JSON.stringify({ error: waiterError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
