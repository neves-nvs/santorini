variable "SANTORINI_SERVER_IMAGE" {
  default = "santorini-server:check"
}

variable "SANTORINI_CLIENT_IMAGE" {
  default = "santorini-client:check"
}

variable "REVISION" {
  default = "unknown"
}

group "default" {
  targets = ["server", "client"]
}

target "server" {
  context  = "packages/server"
  contexts = { shared = "packages/shared" }
  tags     = [SANTORINI_SERVER_IMAGE]
  labels   = { "org.opencontainers.image.revision" = REVISION }
}

target "client" {
  context  = "packages/client-react"
  contexts = { shared = "packages/shared" }
  tags     = [SANTORINI_CLIENT_IMAGE]
  labels   = { "org.opencontainers.image.revision" = REVISION }
}
