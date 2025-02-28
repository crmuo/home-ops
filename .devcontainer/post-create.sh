#!/bin/bash

# Packages
sudo apt-get update
sudo apt-get install -y nmap

# Shell
ln -sf /shell_sync/.zshrc /home/vscode/.zshrc
ln -sf /shell_sync/.zsh_history /home/vscode/.zsh_history

# Mise
ACTIVATE_MISE='eval "$(mise activate zsh)"'
grep -qxF "$ACTIVATE_MISE" "/home/vscode/.zshrc" || echo "\n$ACTIVATE_MISE" >> "/home/vscode/.zshrc"
mise trust && mise install && mise run deps

# Git
git config --global --add safe.directory /workspaces/crmuo-home-ops
git config --global user.name "crmuo"
git config --global user.email "crmuo@crmuo"

