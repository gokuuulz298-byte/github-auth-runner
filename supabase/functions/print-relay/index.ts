import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { host, port, data, format } = await req.json();

    if (!host || !port || !data) {
      return new Response(
        JSON.stringify({ success: false, error: "host, port and data are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let bytes: Uint8Array;
    if (format === "base64") {
      const bin = atob(data);
      bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    } else if (format === "hex") {
      const hex = data.replace(/(0x|\s)/gi, "");
      bytes = Uint8Array.from(hex.match(/.{1,2}/g) || [], (h) => parseInt(h, 16));
    } else {
      bytes = new TextEncoder().encode(data);
    }

    // Raw TCP connect to the print service / virtual printer (e.g. virtual-printer.online:9919)
    let written = 0;
    const conn = await Deno.connect({ hostname: host, port: Number(port) });
    try {
      while (written < bytes.length) {
        const n = await conn.write(bytes.subarray(written));
        if (n <= 0) break;
        written += n;
      }
      // Give the printer a moment to accept the job before closing
      await new Promise((r) => setTimeout(r, 200));
    } finally {
      try {
        conn.close();
      } catch {
        // ignore close errors
      }
    }

    console.log(`print-relay: sent ${written}/${bytes.length} bytes to ${host}:${port}`);

    return new Response(
      JSON.stringify({ success: true, bytesSent: written }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown relay error";
    console.error("print-relay error:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
