APP_DIR   ?= ./app
VENV_DIR  ?= ./.venv
PYTHON    ?= $(VENV_DIR)/bin/python
DOCKER    ?= podman

$(VENV_DIR):
	uv sync

.PHONY: dev
dev: $(VENV_DIR)

.PHONY: build
build:
	$(DOCKER) build -t ghcr.io/smartfinn/wararchive-telegram-tracker:latest .

.PHONY: install
install:
	uv sync --no-dev

.PHONY: service
service: container-wararchive-telegram-tracker.timer container-wararchive-telegram-tracker.service
	cp $^ $(if $(filter 0,$(shell id -u)),\
		/etc/systemd/system,\
		$${XDG_CONFIG_HOME:-~/.config}/systemd/user)
	systemctl $(if $(filter-out 0,$(shell id -u)),--user) daemon-reload
	systemctl $(if $(filter-out 0,$(shell id -u)),--user) enable --now $<

.PHONY: run
run:
	@$(PYTHON) $(APP_DIR)/main.py

.PHONY: update
update:
	git pull --ff-only
	uv lock --upgrade

.PHONY: clean
clean:
	-rm -rf $(VENV_DIR)
	-find $(APP_DIR) -regex '.*\.py[co]$$' -delete
	-find $(APP_DIR) -depth -type d -name '__pycache__' -exec rm -r -- {} \;
