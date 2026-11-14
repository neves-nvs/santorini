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
  inherits = ["metadata-server"]
  context  = "packages/server"
  contexts = { shared = "packages/shared" }
}

target "client" {
  inherits = ["metadata-client"]
  context  = "packages/client-react"
  contexts = { shared = "packages/shared" }
}
