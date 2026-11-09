{
  description = "Santorini server development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_26 # includes npm
            postgresql
          ];

          shellHook = ''
            echo "Santorini server development environment"
            echo "node: $(node --version), npm: $(npm --version)"
            echo ""
            echo "Available commands:"
            echo "  npm run dev              - Start development server"
            echo "  npm run test             - Run all tests"
            echo "  npm run test:unit        - Run unit tests"
            echo "  npm run test:integration - Run integration tests"
            echo ""
          '';
        };
      });
}
