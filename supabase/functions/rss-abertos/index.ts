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

const toRfc822 = (d: string | Date | null): string | null => {
    if (!d) return null;
    try {
        return new Date(d).toUTCString();
    } catch {
        return null;
    }
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
      .from("job_openings")
      .select("title, organization, location, link, deadline_date, deadline_formatted, parsed_salary_text, parsed_vacancies_text, education_levels")
      .order("deadline_date", { ascending: true, nulls: 'last' })
      .limit(limit);

    if (searchParams.get("palavraChave")) {
      query = query.textSearch('searchable_text', `'${normalizeText(searchParams.get("palavraChave"))}'`, { type: 'plain', config: 'portuguese' });
    }
    if (searchParams.get("cargo")) {
        query = query.textSearch('education_level_text', `'${normalizeText(searchParams.get("cargo"))}'`, { type: 'plain', config: 'portuguese' });
    }
    if (searchParams.get("escolaridade")) {
        const escolaridade = searchParams.get("escolaridade")!.split(',');
        const orFilter = escolaridade.map(level => `education_levels.cs.["${level}"]`).join(',');
        query = query.or(orFilter);
    }
    if (searchParams.get("estado") && searchParams.get("estado") !== 'brasil') {
        const estado = searchParams.get("estado")!;
        if (estado.startsWith('regiao-')) {
            const regionKeyRaw = estado.replace('regiao-', '');
            const regionKey = Object.keys(ESTADOS_POR_REGIAO).find(k => k.toLowerCase() === regionKeyRaw);
            if (regionKey) {
                const regionStates = ESTADOS_POR_REGIAO[regionKey as keyof typeof ESTADOS_POR_REGIAO].map(s => s.sigla);
                const orFilter = regionStates.map(st => `mentioned_states.cs.["${st}"]`).join(',');
                query = query.or(orFilter);
            }
        } else if (estado !== 'nacional') {
            const orFilter = `mentioned_states.cs.["${estado.toUpperCase()}"]`;
            query = query.or(orFilter);
        } else {
            query = query.eq('location', 'Nacional');
        }
    }

    const { data: jobs, error } = await query;
    if (error) throw error;

    const site = "https://www.buscarconcursos.com.br";
    const now = new Date();

    const items = (jobs ?? []).map((c) => {
        const title = `${c.organization}: ${c.title}`;
        const descriptionParts = [
            `<strong>Local:</strong> ${escapeXml(c.location)}`,
            c.deadline_formatted && `<strong>Prazo:</strong> ${escapeXml(c.deadline_formatted)}`,
            c.parsed_salary_text && `<strong>Salário:</strong> ${escapeXml(c.parsed_salary_text)}`,
            c.parsed_vacancies_text && `<strong>Vagas:</strong> ${escapeXml(c.parsed_vacancies_text)}`,
            c.education_levels && c.education_levels.length > 0 && `<strong>Escolaridade:</strong> ${escapeXml(c.education_levels.join(', '))}`,
        ].filter(Boolean);
        
        const description = descriptionParts.join('<br>');
        const pubDate = toRfc822(c.deadline_date); // Using deadline as a sortable date, though not ideal for pubDate semantically.

        return `
<item>
  <title>${escapeXml(title)}</title>
  <link>${escapeXml(c.link)}</link>
  <guid isPermaLink="true">${escapeXml(c.link)}</guid>
  ${pubDate ? `<pubDate>${pubDate}</pubDate>` : ''}
  <description><![CDATA[${description}]]></description>
</item>
`;
    }).join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
  <title>Buscar Concursos – Vagas Abertas</title>
  <link>${site}</link>
  <description>Últimas vagas de concursos e processos seletivos abertos em todo o Brasil.</description>
  <language>pt-BR</language>
  <lastBuildDate>${now.toUTCString()}</lastBuildDate>
  ${items}
</channel>
</rss>`;

    return new Response(xml, {
      headers: {
        ...CORS_HEADERS,
        "content-type": "application/rss+xml; charset=utf-8",
        "cache-control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("Error generating RSS feed for abertos:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});