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
      in {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_22 # includes npm
          ];

          shellHook = ''
            echo "Santorini React client development environment"
            echo "node: $(node --version), npm: $(npm --version)"
            echo ""
          '';
        };
      });
}
