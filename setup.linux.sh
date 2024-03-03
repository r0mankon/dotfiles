# Copy & source configs in place
alias cp="cp -v"
cp -r ./.config/** ~/.config
cp ./.gitconfig ~/.gitconfig
cp ./.vimrc ~/.vimrc
cp ./.yarnrc.yml ~/.yarnrc.yml
cp ./.p10k.zsh ~/.p10k.zsh
cp ./.zshrc ~/.zshrc
cat ./.profile >> ~/.profile
cat ./.profile >> ~/.zprofile
cat ./.profile >> ~/.zshenv

mkdir ~/.config/nvim
echo "source ~/.dotfiles/nvim/init.vim" > ~/.config/nvim/init.vim

# System tweaks
echo "vm.swappiness=10" | sudo tee -a /etc/sysctl.conf
sudo sed -i "s/NoDisplay=true/NoDisplay=false/g" /etc/xdg/autostart/*.desktop

# Disable tracker miner fs
sudo systemctl mask tracker-store.service tracker-miner-fs.service tracker-miner-rss.service tracker-extract.service tracker-miner-apps.service tracker-writeback.service

# Check apt mirror server location before installing anything
sudo software-properties-gtk || exit
software-properties-gtk

# Required packages to continue below, in case the os doesn't have them already
sudo apt install zsh curl wget unzip xargs build-essential python3-pip

# Install NodeJS with fnm
# curl -fsSL https://fnm.vercel.app/install | bash
# fnm completions --shell zsh
# fnm install
# fnm use

# Install NodeJS with nvm
PROFILE=/dev/null bash -c 'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.5/install.sh | bash'

nvm install --lts
corepack enable
corepack prepare yarn@stable --activate

yarn global add neovim

# Install lastversion with python3-pip
pip install lastversion

# Download exa with lastversion
mkdir ~/bin
cd ~/bin || exit
lastversion -v --assets --exclude musl --filter "linux-$(uname -m)-v" download https://github.com/ogham/exa
unzip ./exa*.zip -d exa
unalias cp
sudo cp ~/bin/exa/completions/exa.zsh /usr/local/share/zsh/site-functions/exa.zsh
rm -rfv ./*.zip

# stretchly deb
lastversion -v --assets --filter "amd64.deb$" download  https://github.com/hovancik/stretchly/releases
sudo dpkg -i ./Stretchly*.deb &

# Install all apps and packages

./z.sh

# better cd
curl -sS https://raw.githubusercontent.com/ajeetdsouza/zoxide/main/install.sh | bash

add-apt-repository ppa:neovim-ppa/stable -y
add-apt-repository ppa:appimagelauncher-team/stable
add-apt-repository -y ppa:team-xbmc/ppa -y

wget -qO- 'http://keyserver.ubuntu.com/pks/lookup?op=get&search=0x6888550b2fc77d09' | sudo tee /etc/apt/trusted.gpg.d/songrec.asc
sudo apt-add-repository ppa:marin-m/songrec -y -u

xargs --verbose --arg-file apps/apt.txt apt install -y &
apps/snap.txt # Installs all snaps in parallel
jobs

# login with new .bash_profile
exec zsh --login & exec bash --login
