# zsh setup
./z.sh

# better cd
curl -sS https://raw.githubusercontent.com/ajeetdsouza/zoxide/main/install.sh | bash

add-apt-repository ppa:neovim-ppa/stable -y
sudo add-apt-repository -y ppa:team-xbmc/ppa -y

wget -qO- 'http://keyserver.ubuntu.com/pks/lookup?op=get&search=0x6888550b2fc77d09' | sudo tee /etc/apt/trusted.gpg.d/songrec.asc
sudo apt-add-repository ppa:marin-m/songrec -y -u

xargs --verbose --arg-file apps/apt.txt apt install -y &
apps/snap.txt # Installs all snaps in parallel