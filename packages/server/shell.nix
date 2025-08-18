{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    nodejs_20  # Node.js LTS (includes npm)
    postgresql
  ];

  shellHook = ''
    echo "🚀 Santorini Server Development Environment"
    echo "Node.js version: $(node --version)"
    echo "npm version: $(npm --version)"
    echo ""
    echo "Available commands:"
    echo "  npm run dev        - Start development server"
    echo "  npm run test       - Run all tests"
    echo "  npm run test:unit  - Run unit tests"
    echo "  npm run test:integration - Run integration tests"
    echo ""
  '';
}
