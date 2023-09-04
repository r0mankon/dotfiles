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
sudo software-properties-qt
sudo software-properties-gtk || exit

# Required packages to continue below, in case the os doesn't have them already
sudo apt install curl wget unzip xargs build-essential python3-pip

# Install NodeJS with fnm
curl -fsSL https://fnm.vercel.app/install | bash
fnm completions --shell zsh
fnm install
fnm use
corepack enable
corepack prepare yarn@stable --activate

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

# KDE specific fixes and packages
./kde.sh

# Install all apps and packages
sudo ./install.sh
jobs

# login with new .bash_profile
exec zsh --login & exec bash --login

