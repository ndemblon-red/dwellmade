import { useState } from "react";

const CREAM = "#F5F0E8";
const MUSTARD = "#F0A500";
const NEAR_BLACK = "#1A1A2E";

const dmSans = { fontFamily: "'DM Sans', ui-sans-serif, system-ui, sans-serif" };
const serif = { fontFamily: "'Instrument Serif', serif" };

export const FAQ_ITEMS = [
  {
    question: "Why is dwellmade different from other AI interior design tools?",
    answer: `Most AI design tools ask you to describe what you want — "modern Scandinavian with warm tones and natural materials." But if you knew exactly what you wanted, you wouldn't need the tool. dwellmade starts with images instead of words. You bring the spaces that move you — a hotel lobby, a Pinterest save, a page torn from a magazine — and dwellmade extracts the palette, materials and mood from them. No design vocabulary required.`,
  },
  {
    question: "Do I need to know anything about interior design?",
    answer: `No. That's the point. dwellmade is built for people who know what they like when they see it, but struggle to put it into words or translate it into their own space. You collect images, click the ones that resonate, and the app does the design thinking.`,
  },
  {
    question: "Will the result actually look like my room?",
    answer: `Yes — that's what makes dwellmade different from generic room visualisers. You upload a photo of your actual room, set which elements to keep (floors, windows, structural walls) and which to change, and the generated image applies your aesthetic brief to your real space — not a generic showroom.`,
  },
  {
    question: "What inspiration images work best?",
    answer: `Anything visual that moves you — Pinterest saves, Instagram screenshots, magazine pages, hotel lobbies, a friend's living room. The more specific and personal the better. dwellmade analyses each image and extracts colour palette, materials, furniture style and mood — so even a bathroom image can inspire a living room redesign without importing the bath.`,
  },
  {
    question: "How does the free trial work?",
    answer: `You get 3 free generations with no account and no card required. Just upload your room photo, add some inspiration images, build your brief and generate. If you want to continue, you can subscribe for £15/month.`,
  },
  {
    question: "What happens when I hit my monthly generation limit?",
    answer: `Your 50 generations reset at the start of each billing period. You'll see a clear message with your exact reset date so you always know where you stand.`,
  },
  {
    question: "Can I cancel anytime?",
    answer: `Yes — no contract, no cancellation fee. Most people use dwellmade intensively for a project and cancel when they're done. That's exactly what it's designed for.`,
  },
  {
    question: "Is my data private?",
    answer: `Your room photos and generated designs are stored privately in your account and are never shared or used to train AI models. You can delete your account and all associated data at any time.`,
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const toggle = (index: number) => {
    setOpenIndex((current) => (current === index ? null : index));
  };
  return (
    <section style={{ backgroundColor: NEAR_BLACK }}>
      <div className="max-w-[720px] mx-auto px-6 py-24">
        <h2
          className="text-center mb-12"
          style={{
            fontSize: "11px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(245, 240, 232, 0.6)",
            ...dmSans,
          }}
        >
          FREQUENTLY ASKED QUESTIONS
        </h2>
        <div>
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;
            const panelId = `faq-panel-${index}`;
            return (
              <div
                key={index}
                className="border-b last:border-b-0"
                style={{ borderColor: "rgba(245, 240, 232, 0.08)" }}
              >
                <button
                  type="button"
                  onClick={() => toggle(index)}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className="w-full py-5 flex items-center justify-between text-left gap-4"
                >
                  <span
                    style={{
                      ...serif,
                      fontSize: "18px",
                      fontStyle: "italic",
                      color: CREAM,
                    }}
                  >
                    {item.question}
                  </span>
                  <span
                    className="shrink-0"
                    aria-hidden
                    style={{
                      fontSize: "18px",
                      color: MUSTARD,
                      ...dmSans,
                    }}
                  >
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                <div
                  id={panelId}
                  hidden={!isOpen}
                  className="overflow-hidden transition-all duration-300 ease-out"
                  style={{
                    maxHeight: isOpen ? "600px" : "0px",
                    opacity: isOpen ? 1 : 0,
                  }}
                >
                  <p
                    className="pb-5"
                    style={{
                      fontSize: "13px",
                      lineHeight: 1.7,
                      color: "rgba(245, 240, 232, 0.6)",
                      ...dmSans,
                    }}
                  >
                    {item.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
