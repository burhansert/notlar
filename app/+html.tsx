import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #F4EFE6;
}

/* Prevent bottom tab labels from clipping on web */
[data-testid="bottom-tab-bar"] [role="tab"],
nav[role="tablist"] [role="tab"] {
  overflow: visible !important;
}

[data-testid="bottom-tab-bar"] [role="tab"] span,
nav[role="tablist"] [role="tab"] span {
  overflow: visible !important;
  white-space: normal !important;
  text-overflow: unset !important;
  line-height: 1.2 !important;
}
`;
