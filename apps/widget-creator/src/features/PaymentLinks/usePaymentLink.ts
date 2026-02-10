import { useState, useCallback } from 'react';
import type { PaymentLinkFormValues } from './schema';

export function usePaymentLink() {
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const generateLink = useCallback((data: PaymentLinkFormValues) => {
    const params = new URLSearchParams();
    params.set('asset', data.asset.symbol);
    params.set('chain', data.asset.blockchain);
    params.set('amount', data.amount);
    params.set('recipient', data.recipient);

    if (data.description) {
      params.set('description', data.description);
    }

    const link = `${window.location.origin}/payment-links?${params.toString()}`;
    setGeneratedLink(link);
    return link;
  }, []);

  const copyLink = useCallback(async () => {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  }, [generatedLink]);

  return { generatedLink, generateLink, copyLink, copyFeedback };
}
