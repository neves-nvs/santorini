{
  description = "Santorini React client development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in rec {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_26
            pnpm
          ];

          shellHook = ''
            if [[ $- == *i* ]]; then
              echo "Santorini React client development environment"
              echo "node: $(node --version), pnpm: $(pnpm --version)"
              echo ""
            fi
          '';
        };

        # The browsers for the Playwright tests: `nix develop .#e2e`. They only work with the Playwright version
        # that this nixpkgs ships (playwright-driver.version), so keep @playwright/test in package.json at exactly
        # that version when updating either one.
        devShells.e2e = pkgs.mkShell {
          inputsFrom = [ devShells.default ];
          env = {
            PLAYWRIGHT_BROWSERS_PATH = "${pkgs.playwright-driver.browsers}";
            PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = "true";
          };
        };
      });
}
