export const metadata = {
  title: 'AI시험도우미',
  description: '교재를 찍어 올리면 AI가 예상 문제를 만들어드려요',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/quiz-favicon.png', apple: '/quiz-apple.png' },
  appleWebApp: { capable: true, title: 'AI시험도우미', statusBarStyle: 'default' },
};

export const viewport = { themeColor: '#4f46e5' };

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
