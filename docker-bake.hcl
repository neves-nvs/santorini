variable "SERVER_REPOSITORY" {
  default = "santorini-server"
}

variable "CLIENT_REPOSITORY" {
  default = "santorini-client"
}

variable "SANTORINI_SERVER_IMAGE" {
  default = "${SERVER_REPOSITORY}:check"
}

variable "SANTORINI_CLIENT_IMAGE" {
  default = "${CLIENT_REPOSITORY}:check"
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
  tags     = [SANTORINI_SERVER_IMAGE, "${SERVER_REPOSITORY}:${REVISION}"]
  labels   = { "org.opencontainers.image.revision" = REVISION }
}

target "client" {
  context  = "packages/client-react"
  contexts = { shared = "packages/shared" }
  tags     = [SANTORINI_CLIENT_IMAGE, "${CLIENT_REPOSITORY}:${REVISION}"]
  labels   = { "org.opencontainers.image.revision" = REVISION }
}
