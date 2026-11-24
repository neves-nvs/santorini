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
            nodejs_26
            pnpm
            postgresql
          ];

          shellHook = ''
            if [[ $- == *i* ]]; then
              echo "Santorini server development environment"
              echo "node: $(node --version), pnpm: $(pnpm --version)"
              echo ""
              echo "Available commands:"
              echo "  pnpm run dev              - Start development server"
              echo "  pnpm run test             - Run all tests"
              echo "  pnpm run test:unit        - Run unit tests"
              echo "  pnpm run test:integration - Run integration tests"
              echo ""
            fi
          '';
        };
      });
}
