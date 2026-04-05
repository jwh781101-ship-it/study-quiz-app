export const metadata = {
  title: '시험 문제 생성기',
  description: '교재를 찍어 올리면 AI가 예상 문제를 만들어드려요',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
