export function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="spread-row">
          <div>
            <div className="stack-row" style={{ marginBottom: 8, color: 'white', fontWeight: 700 }}>
              <span className="brand__mark" aria-hidden="true" />
              <span>Ezamazwe Learn</span>
            </div>
            <p className="text-soft" style={{ maxWidth: '34ch', fontSize: 14 }}>
              Courses from Ezamazwe Education Centre for Innovation — for kids, teens, and adult
              professionals across South Africa.
            </p>
          </div>
          <div>
            <a href="https://ezamazwe.africa" style={{ fontSize: 14 }}>
              Ezamazwe Education main site &rarr;
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} Ezamazwe Education Centre for Innovation.</span>
          <span>learn.ezamazwe.africa</span>
        </div>
      </div>
    </footer>
  );
}
