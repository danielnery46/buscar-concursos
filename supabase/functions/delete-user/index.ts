/*
 * Copyright 2025 Daniel Nery Frangilo Paiva
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { Database } from "../database.types.ts";

// Declare Deno to resolve TypeScript errors in non-Deno environments.
declare const Deno: any;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Edge function to securely delete a user's data and authentication record.
 * 1. Authenticates the user from the request context.
 * 2. Uses an admin client to delete the user's record from `user_data`.
 * 3. Deletes the user from `auth.users`.
 */
serve(async (req: Request) => {
  // Handle CORS preflight requests.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    // 1. Create a Supabase client with the Auth context of the user making the request.
    const supabaseClient: SupabaseClient<Database> = createClient<Database>(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );
    
    // 2. Retrieve the user object.
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "User not found or not authenticated." }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // 3. Create a Supabase admin client to perform privileged operations.
    const supabaseAdmin = createClient<Database>(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 4. Delete the user's associated data from the 'user_data' table first.
    console.log(`Attempting to delete data for user: ${user.id}`);
    const { error: deleteDataError } = await supabaseAdmin
      .from("user_data")
      .delete()
      .eq("id", user.id);

    if (deleteDataError) {
      console.error(`Error deleting user_data for ${user.id}:`, deleteDataError.message);
      // This is non-fatal, but good to log. We can still try to delete the auth user.
    } else {
        console.log(`Successfully deleted user_data for ${user.id}.`);
    }

    // 5. Delete the user from auth.users. This is the critical step.
    const { error: deleteAuthUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteAuthUserError) {
      console.error(`Error deleting auth user ${user.id}:`, deleteAuthUserError.message);
      return new Response(JSON.stringify({ error: `Failed to delete user: ${deleteAuthUserError.message}` }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: 500,
      });
    }
    
    console.log(`Successfully deleted auth user: ${user.id}`);
    
    return new Response(JSON.stringify({ message: "User deleted successfully" }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Main function error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
