import React from "react";

// Catches runtime JS errors (common on older Smart TV browsers) and shows a
// readable message instead of a black/blank screen.
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("Cartoonix error boundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: "100vh", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", textAlign: "center",
          background: "#0a0a0a", color: "#fff", padding: "24px", fontFamily: "Nunito, Arial, sans-serif",
        }}>
          <img src="/cartoonix-logo.png" alt="Cartoonix" style={{ height: 56, marginBottom: 20 }} />
          <h1 style={{ fontSize: 26, margin: "0 0 10px" }}>Ceva n-a mers bine</h1>
          <p style={{ color: "#aaa", maxWidth: 460, marginBottom: 22, lineHeight: 1.5 }}>
            A apărut o eroare la încărcarea aplicației. Reîncarcă pagina. Dacă folosești
            browserul unui Smart TV mai vechi, încearcă de pe telefon sau de pe un browser actualizat.
          </p>
          <button
            data-testid="error-reload-btn"
            onClick={() => window.location.reload()}
            style={{
              background: "#ec1c24", color: "#fff", border: "none", borderRadius: 999,
              padding: "12px 28px", fontSize: 16, fontWeight: 700, cursor: "pointer",
            }}
          >
            Reîncarcă
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
