variable "SANTORINI_SERVER_IMAGE" {
  default = "santorini-server:check"
}

variable "SANTORINI_CLIENT_IMAGE" {
  default = "santorini-client:check"
}

group "default" {
  targets = ["server", "client"]
}

# Locally these carry the :check tag. In CI docker/metadata-action replaces them
# with generated tags and labels.
target "metadata-server" {
  tags = [SANTORINI_SERVER_IMAGE]
}

target "metadata-client" {
  tags = [SANTORINI_CLIENT_IMAGE]
}

target "server" {
  inherits   = ["metadata-server"]
  context    = "."
  dockerfile = "packages/server/Dockerfile"
}

target "client" {
  inherits   = ["metadata-client"]
  context    = "."
  dockerfile = "packages/client-react/Dockerfile"
}
