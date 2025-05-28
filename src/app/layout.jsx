import logoDark from '@/assets/images/logo-dark.png';
import AppProvidersWrapper from '@/components/wrappers/AppProvidersWrapper';
import { Figtree } from 'next/font/google';
import Image from 'next/image';
import NextTopLoader from 'nextjs-toploader';
import '@/assets/scss/app.scss';
import { DEFAULT_PAGE_TITLE } from '@/context/constants';
const figtree = Figtree({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap'
});
export const metadata = {
  title: {
    template: '%s | Parceirize - Clube de descontos',
    default: DEFAULT_PAGE_TITLE
  },
  description: 'Descontos exclusivos para clientes Parceirize',
};
const splashScreenStyles = `
#splash-screen {
  position: fixed;
  top: 50%;
  left: 50%;
  background: #1B1236;
  display: flex;
  height: 100%;
  width: 100%;
  transform: translate(-50%, -50%);
  align-items: center;
  justify-content: center;
  z-index: 9999;
  opacity: 1;
  transition: all 15s linear;
  overflow: hidden;
}

#splash-screen.remove {
  animation: fadeout 0.7s forwards;
  z-index: 0;
}

@keyframes fadeout {
  to {
    opacity: 0;
    visibility: hidden;
  }
}
`;
export default function RootLayout({
  children
}) {
  return <html lang="en">
      <head>
        <style suppressHydrationWarning>{splashScreenStyles}</style>
      </head>
      <body className={figtree.className}>
        <div id="splash-screen">
          <Image alt="Logo" width={312} height={312} src={logoDark} style={{
          height: '6%',
          width: 'auto'
        }} priority />
        </div>
        <NextTopLoader color="#8E96AC" showSpinner={false} />
        <div id="__next_splash">
          <AppProvidersWrapper>{children}</AppProvidersWrapper>
        </div>
      </body>
    </html>;
}