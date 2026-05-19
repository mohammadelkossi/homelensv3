import Script from "next/script";

const TYPEFORM_LIVE_ID = "01KRZYTD6CG3DKY9S8FQVCG36D";

export function TypeformEmbed() {
  return (
    <>
      <div data-tf-live={TYPEFORM_LIVE_ID} />
      <Script
        src="https://embed.typeform.com/next/embed.js"
        strategy="lazyOnload"
      />
    </>
  );
}
