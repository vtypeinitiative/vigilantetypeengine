// supabase/functions/save-results/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0'

// This is a helper for Cross-Origin Resource Sharing (CORS).
// It's required to allow your GitHub Pages site to call this function.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Or specify your GitHub Pages URL for better security
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // This is needed for the browser's "preflight" request.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the user's access token.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get the data from the request body.
    const {
      raw_answers,
      best_fit_type,
      reported_type,
      email,
      enjoys_frameworks,
      wants_in_schools
    } = await req.json();

    // Basic validation
    if (!raw_answers || !best_fit_type || !reported_type) {
      throw new Error("Missing required fields: raw_answers, best_fit_type, and reported_type are required.");
    }

    // Insert the data into the 'results' table.
    const { error } = await supabaseClient
      .from('results')
      .insert({
        raw_answers,
        best_fit_type,
        reported_type,
        email,
        enjoys_frameworks,
        wants_in_schools
      });

    if (error) {
      throw error
    }

    // Return a success response.
    return new Response(JSON.stringify({ message: "Result saved successfully!" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    // Return an error response.
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})