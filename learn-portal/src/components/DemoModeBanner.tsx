export function DemoModeBanner() {
  return (
    <div
      style={{
        background: '#FDF3E3',
        color: '#B36B00',
        textAlign: 'center',
        padding: '10px 20px',
        fontSize: 13.5,
        fontWeight: 500,
      }}
    >
      Demo mode — showing shell courses, no Supabase project is connected. Enrollment and progress
      are saved to this browser only.{' '}
      <a href="https://github.com/Jay1724/Ezamazwe/tree/main/learn-portal#getting-started" style={{ textDecoration: 'underline' }}>
        Connect a real project
      </a>
      .
    </div>
  );
}
