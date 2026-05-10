import { MessageCircle } from "lucide-react";

interface Props {
  phone?: string; // Apenas números, com DDI. Ex: "5511999999999"
  message?: string;
}

export function FloatingWhatsAppButton({
  phone = "5511999999999",
  message = "Olá! Quero saber mais sobre a Laura SDR da AdvOne.",
}: Props) {
  const href = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/40 transition-all hover:scale-110 hover:shadow-xl md:h-16 md:w-16"
    >
      <span className="absolute inset-0 animate-ping rounded-full bg-[#25D366] opacity-30" />
      <MessageCircle className="relative h-7 w-7 md:h-8 md:w-8" fill="currentColor" />
    </a>
  );
}
