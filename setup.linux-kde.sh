# Konsole profile
cp ./r0mankon.profile ~/.local/share/konsole/r0mankon.profile

# vscode fix
cat ./xinitrc >> ~/.xinitrc
apt install gnome-keyring libsecret libgnome-keyring

apt install software-properties-qt yakuake kio-gdrive libdbusmenu-glib4 kdenetwork-filesharing  xdg-desktop-portal xdg-desktop-portal-kde -y

# file picker for snap/flatpak apps
mkdir -p "$HOME/.config/plasma-workspace/env"
echo "export GTK_USE_PORTAL=1" >> "$HOME/.config/plasma-workspace/env/gtk_use_portal.sh"

./setup.linux.sh