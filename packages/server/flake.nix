{
  description = "Santorini server development environment";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "aarch64-darwin" "x86_64-darwin" "aarch64-linux" "x86_64-linux" ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in {
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_22 # includes npm
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
    };
}
