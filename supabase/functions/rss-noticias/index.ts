import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { Database } from "../database.types.ts";
import { normalizeText } from "../_shared/text_utils.ts";
import { ESTADOS_POR_REGIAO } from "../_shared/constants.ts";

declare const Deno: any;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const escapeXml = (unsafe: string | null | undefined): string => {
  if (unsafe === null || unsafe === undefined) return '';
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
};

const toRfc822 = (dateStr: string | null): string | null => {
    if (!dateStr) return null;
    // The date format is now YYYY-MM-DD, which can be parsed directly.
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toUTCString();
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const supabase = createClient<Database>(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? 100), 500);

    let query = supabase
      .from("news_articles")
      .select("title, link, publication_date, source")
      .order("publication_date", { ascending: false })
      .limit(limit);

    if (searchParams.get("searchTerm")) {
        query = query.ilike('normalized_title', `%${normalizeText(searchParams.get("searchTerm"))}%`);
    }
    if (searchParams.get("location") && searchParams.get("location") !== 'brasil') {
        const location = searchParams.get("location")!;
        if (location.startsWith('regiao-')) {
            const regionKeyRaw = location.replace('regiao-', '');
            const regionKey = Object.keys(ESTADOS_POR_REGIAO).find(k => k.toLowerCase() === regionKeyRaw);
            if (regionKey) {
                const regionStates = ESTADOS_POR_REGIAO[regionKey as keyof typeof ESTADOS_POR_REGIAO].map(s => s.sigla);
                const orFilter = regionStates.map(st => `mentioned_states.cs.["${st}"]`).join(',');
                query = query.or(orFilter);
            }
        } else {
            const orFilter = `mentioned_states.cs.["${location.toUpperCase()}"]`;
            query = query.or(orFilter);
        }
    }
    if (searchParams.get("year")) {
        const year = searchParams.get("year")!;
        const month = searchParams.get("month");
        const datePattern = `${year}-${month ? String(month).padStart(2, '0') : '%'}-%`;
        query = query.like('publication_date', datePattern);
    } else if (searchParams.get("month")) {
        const month = searchParams.get("month")!;
        const datePattern = `%-{String(month).padStart(2, '0')}-%`;
        query = query.like('publication_date', datePattern);
    }

    const { data: articles, error } = await query;
    if (error) throw error;

    const site = "https://www.buscarconcursos.com.br";
    const now = new Date();

    const items = (articles ?? []).map((c) => {
        const dateParts = c.publication_date?.split('-');
        const displayDate = dateParts ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : 'Data não informada';
        const description = `Fonte: ${c.source} | Publicado em: ${displayDate}`;
        const pubDate = toRfc822(c.publication_date);
        return `
<item>
  <title>${escapeXml(c.title)}</title>
  <link>${escapeXml(c.link)}</link>
  <guid isPermaLink="true">${escapeXml(c.link)}</guid>
  ${pubDate ? `<pubDate>${pubDate}</pubDate>` : ''}
  <description>${escapeXml(description)}</description>
</item>
`;
    }).join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Buscar Concursos – Notícias</title>
  <link>${site}</link>
  <description>Últimas notícias sobre concursos públicos no Brasil.</description>
  <language>pt-BR</language>
  <lastBuildDate>${now.toUTCString()}</lastBuildDate>
  ${items}
</channel>
</rss>`;

    return new Response(xml, {
      headers: {
        ...CORS_HEADERS,
        "content-type": "application/rss+xml; charset=utf-8",
        "cache-control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error generating RSS feed for noticias:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});