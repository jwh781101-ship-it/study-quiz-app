import './base.css';
import './student.css';

export const metadata = {
  title: 'AI시험도우미',
  description: '사진으로 만드는 나만의 학습 문제. 공부할수록 성장하는 학습 메이트와 함께해요.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/quiz-favicon.png', apple: '/quiz-apple.png' },
  appleWebApp: { capable: true, title: 'AI시험도우미', statusBarStyle: 'default' },
};

export const viewport = { themeColor: '#f7f8f4' };

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
