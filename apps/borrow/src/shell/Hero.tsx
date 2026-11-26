import { Highlight, Text } from '@aurora-is-near/ui-kit';

/**
 * The hero (Web-Borrow-NotConnected.dc.html lines 197–202): section padding
 * 28px 0; h1 `--h64`, 800, line-height 1.02, tracking -0.04em, margin-top
 * 14px; sub 19px / 1.45 `mut`, max-width 620, margin-top 16px. The
 * artboard's eyebrow is in its data but never rendered, so not here either.
 * Copy as drawn (decided; revisit before launch).
 */
export function Hero() {
  return (
    <section className="py-7">
      <Text className="mt-3.5" variant="h64">
        One click <Highlight>borrow</Highlight>
      </Text>
      <p className="mt-4 mb-0 max-w-155 text-19/1.45 text-mut">
        Pick what you supply and what you borrow. We compare the markets and
        point you to the cheapest one.
      </p>
    </section>
  );
}
