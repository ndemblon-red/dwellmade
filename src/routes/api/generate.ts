import { createFileRoute } from "@tanstack/react-router";
import { buildPrompt } from "@/prompts/generate.prompt";
import { checkAndIncrement, releaseGeneration } from "@/lib/generation-gate.server";
import { GenerationRequestSchema, type GenerationRequest } from "@/lib/generation-request.schema";

export const Route = createFileRoute("/api/generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        let payload: GenerationRequest;
        try {
          const raw = await request.json();
          payload = GenerationRequestSchema.parse(raw);
        } catch (e) {
          return new Response(
            JSON.stringify({ error: e instanceof Error ? e.message : "Invalid body" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        // Server-side generation gate — must run before any upstream call.
        const gate = await checkAndIncrement(request);
        if (!gate.ok) {
          const gateHeaders: Record<string, string> = { "Content-Type": "application/json" };
          if (gate.setCookie) gateHeaders["Set-Cookie"] = gate.setCookie;
          return new Response(
            JSON.stringify({
              error: gate.code,
              kind: gate.kind,
              used: gate.used,
              limit: gate.limit,
            }),
            { status: gate.status, headers: gateHeaders },
          );
        }

        const prompt = buildPrompt(payload);

        const content: Array<
          { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }
        > = [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: payload.room } },
        ];
        for (const url of payload.inspo) {
          content.push({ type: "image_url", image_url: { url } });
        }

        const upstreamBody = {
          model: "google/gemini-3.1-flash-image-preview",
          messages: [{ role: "user", content }],
          modalities: ["image", "text"],
          stream: true,
        };

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(upstreamBody),
        });

        if (!upstream.ok || !upstream.body) {
          // Never produced an image — give the reserved slot back.
          await releaseGeneration(gate);
          const text = await upstream.text().catch(() => "");
          return new Response(text || "Upstream error", { status: upstream.status });
        }

        // Refund the slot if the stream ends without a completed image.
        let sawCompleted = false;
        let buffered = "";
        const watcher = new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, controller) {
            buffered += new TextDecoder().decode(chunk, { stream: true });
            if (buffered.includes("image_generation.completed")) sawCompleted = true;
            if (buffered.length > 4096) buffered = buffered.slice(-1024);
            controller.enqueue(chunk);
          },
          async flush() {
            if (!sawCompleted) await releaseGeneration(gate);
          },
        });

        const streamHeaders: Record<string, string> = {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        };
        if (gate.setCookie) streamHeaders["Set-Cookie"] = gate.setCookie;
        return new Response(upstream.body.pipeThrough(watcher), { headers: streamHeaders });

      },
    },
  },
});
