{ config, pkgs, ... }:

{
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_22;
  };

  packages = with pkgs; [
    docker-client
    git
    postgresql
  ];

  env = {
    NPM_CONFIG_CACHE = "${config.git.root}/.npm";
    npm_config_audit = "false";
    npm_config_fund = "false";
    npm_config_update_notifier = "false";

    PORT = "3000";
    JWT_SECRET = "santorini-dev-secret";
    DB_HOST = "127.0.0.1";
    DB_PORT = "5432";
    DB_USER = "postgres";
    DB_DATABASE = "santorini";
    DB_PASSWORD = "postgres";

    VITE_API_URL = "http://localhost:3000";
    VITE_WS_URL = "ws://localhost:3000";

    SANTORINI_DB_CONTAINER = "santorini-postgres";
    SANTORINI_DB_IMAGE = "postgres:13";
  };

  scripts = {
    santorini-install.exec = "${config.git.root}/scripts/install";
    santorini-db-up.exec = "${config.git.root}/scripts/db-up";
    santorini-db-down.exec = "${config.git.root}/scripts/db-down";
    santorini-migrate.exec = "${config.git.root}/scripts/migrate";
    santorini-dev.exec = "${config.git.root}/scripts/dev";
    santorini-build.exec = "${config.git.root}/scripts/build";
  };

  tasks = {
    "santorini:db-up" = {
      description = "Start the PostgreSQL Docker container.";
      exec = "${config.git.root}/scripts/db-up";
      before = [ "santorini:migrate" ];
    };

    "santorini:migrate" = {
      description = "Run backend database migrations.";
      exec = "${config.git.root}/scripts/migrate";
      before = [
        "devenv:processes:server"
        "devenv:processes:client-react"
      ];
    };
  };

  processes = {
    server = {
      exec = "${config.git.root}/scripts/server";
      cwd = "${config.git.root}/packages/server";
      after = [ "santorini:migrate" ];
    };

    client-react = {
      exec = "${config.git.root}/scripts/client-react";
      cwd = "${config.git.root}/packages/client-react";
      after = [ "santorini:migrate" ];
    };
  };

  enterShell = ''
    echo "Santorini development environment"
    echo "node: $(node --version)"
    echo "npm:  $(npm --version)"
    echo "commands: santorini-install, santorini-db-up, santorini-db-down, santorini-migrate, santorini-dev, santorini-build"
  '';
}
