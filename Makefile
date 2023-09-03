CLIENT_DIR = client
SERVER_DIR = server

.PHONY: client
client:
	@echo "Installing npm dependencies for the client project..."
	cd $(CLIENT_DIR) && npm install

.PHONY: server
server:
	@echo "Installing npm dependencies for the server project..."
	cd $(SERVER_DIR) && npm install

.PHONY: install
install: client server
	@echo "All dependencies have been installed."

.PHONY: clean
clean:
	@echo "Cleaning up node_modules..."
	rm -rf $(CLIENT_DIR)/node_modules $(SERVER_DIR)/node_modules

.PHONY: run-client
dev-client:
	@echo "Running the client application..."
	cd $(CLIENT_DIR) && npm run dev

.PHONY: run-server
dev-server:
	@echo "Running the server application..."
	cd $(SERVER_DIR) && npm run dev

.PHONY: run
dev: dev-client dev-server

.PHONY: default
default:
	@echo "Available targets:"
	@echo "  - install: Install npm dependencies in both projects"
	@echo "  - clean: Clean up node_modules in both projects"
	@echo "  - dev-client: Run the client application"
	@echo "  - dev-server: Run the server application"
	@echo "  - dev: Run both client and server applications"
