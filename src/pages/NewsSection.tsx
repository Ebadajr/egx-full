export default function NewsSection({ TK }: { TK: { body: string } }) {
  return (
    <div style={{ margin: '-32px -32px -40px', height: 'calc(100vh - 60px)' }}>
      <iframe
        src="/api/news/"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        title="EGX News"
      />
    </div>
  );
}
