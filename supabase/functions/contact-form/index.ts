import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

declare const Deno: any;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const TO_EMAIL = "suporte@buscarconcursos.com.br";
// FIX: Use the default 'onboarding@resend.dev' address.
// This is the recommended approach for sending emails from unverified domains,
// which is a common cause of failure with the Resend API.
// The 'reply_to' field ensures that replies still go to the user's actual email.
const FROM_EMAIL = "onboarding@resend.dev";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { name, email, subject, message } = await req.json();

    if (!name || !email || !subject || !message) {
      return new Response(JSON.stringify({ error: "Todos os campos são obrigatórios." }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const emailHtml = `
      <html>
        <body>
          <h2>Nova Mensagem do Formulário de Contato - Buscar Concursos</h2>
          <p><strong>Nome:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Assunto:</strong> ${subject}</p>
          <hr>
          <h3>Mensagem:</h3>
          <p style="white-space: pre-wrap;">${message}</p>
        </body>
      </html>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `Formulário Buscar Concursos <${FROM_EMAIL}>`,
        to: [TO_EMAIL],
        subject: `[Contato] ${subject} - ${name}`,
        reply_to: email,
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const errorBody = await resendResponse.json();
      console.error("Resend API error:", errorBody);
      throw new Error("Falha ao enviar o e-mail. Tente novamente mais tarde.");
    }

    return new Response(JSON.stringify({ message: "Mensagem enviada com sucesso!" }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 200,
    });
    
  } catch (error) {
    console.error("Contact form function error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
