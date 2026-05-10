import { supabase } from "@/integrations/supabase/client";
import { trackMetaEvent } from "@/lib/metaPixel";

interface Props {
  phone?: string; // Apenas números, com DDI. Ex: "5511999999999"
  message?: string;
  href?: string; // Se fornecido, sobrescreve o link gerado a partir de phone/message
}

export function FloatingWhatsAppButton({
  phone = "5511999999999",
  message = "Olá! Quero saber mais sobre a Laura SDR da AdvOne.",
  href,
}: Props) {
  const finalHref = href ?? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  const handleClick = () => {
    // Não bloqueia abertura: dispara fire-and-forget
    try {
      trackMetaEvent("Contact", { contentName: "Floating WhatsApp Button" });
    } catch (e) {
      console.warn("[WA Button] Meta Pixel falhou", e);
    }

    try {
      const params = new URLSearchParams(window.location.search);
      void supabase.from("landing_whatsapp_clicks").insert({
        page: window.location.pathname,
        phone,
        user_agent: navigator.userAgent,
        referrer: document.referrer || null,
        utm_source: params.get("utm_source"),
        utm_medium: params.get("utm_medium"),
        utm_campaign: params.get("utm_campaign"),
        utm_content: params.get("utm_content"),
        utm_term: params.get("utm_term"),
      });
    } catch (e) {
      console.warn("[WA Button] Falha ao registrar clique", e);
    }
  };

  return (
    <a
      href={finalHref}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      aria-label="Falar no WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/40 transition-all hover:scale-110 hover:shadow-xl md:h-16 md:w-16"
    >
      <span className="absolute inset-0 animate-ping rounded-full bg-[#25D366] opacity-30" />
      <svg
        viewBox="0 0 32 32"
        className="relative h-8 w-8 md:h-9 md:w-9"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.315-.688.645-1.032 1.318-1.06 2.264v.114c-.015.99.472 1.977 1.017 2.78 1.23 1.82 2.506 3.41 4.554 4.34.616.287 2.035.888 2.722.888.817 0 2.15-.515 2.49-1.318.147-.343.247-.717.247-1.087 0-.07 0-.176-.04-.246-.1-.176-2.522-1.39-2.683-1.39zm-2.825 7.683h-.04a9.88 9.88 0 0 1-5.013-1.375l-.36-.214-3.722.97 1-3.624-.236-.374a9.846 9.846 0 0 1-1.51-5.237c.003-5.45 4.444-9.885 9.9-9.885a9.79 9.79 0 0 1 6.995 2.898 9.847 9.847 0 0 1 2.895 6.99c-.002 5.45-4.443 9.885-9.91 9.885zm8.42-18.297A11.81 11.81 0 0 0 16.28 3.13c-6.55 0-11.883 5.32-11.886 11.853a11.82 11.82 0 0 0 1.59 5.93L4.29 26.87l6.107-1.6a11.9 11.9 0 0 0 5.68 1.444h.005c6.548 0 11.88-5.32 11.883-11.853a11.77 11.77 0 0 0-3.473-8.434z" />
      </svg>
    </a>
  );
}
