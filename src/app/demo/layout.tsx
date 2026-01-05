/**
 * Demo layout - no SessionProvider to avoid auth errors
 */
export default function DemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
