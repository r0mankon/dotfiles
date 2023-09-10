# Disable accented keys popup
defaults write -g ApplePressAndHoldEnabled -bool false
# Make dock appear faster
defaults write com.apple.dock autohide-delay -float 0.1; defaults write com.apple.dock autohide-time-modifier -float 0.3; killall Dock
# Make hidden apps easier to identify in the dock
defaults write com.apple.Dock showhidden -bool TRUE && killall Dock
# Change screenshot file type
defaults write com.apple.screencapture type jpg

# zsh setup
./z.sh

# Copy & source configs in place
alias cp="cp -v"
cp -r ./.config/smplayer ~/.config/smplayer
cp ./.gitconfig ~/.gitconfig
cp ./.vimrc ~/.vimrc
cp ./.yarnrc.yml ~/.yarnrc.yml
cp ./.p10k.zsh ~/.p10k.zsh

cat ./.profile >> ~/.zprofile
echo 'source "$HOME/.dotfiles/env.mac"' >> ~/.zprofile
# cat ./.profile >> ~/.zshenv

echo "source "$HOME/.dotfiles/.zshrc"" >> ~/.zshrc

mkdir ~/.config/nvim
echo "source ~/.dotfiles/nvim/init.vim" > ~/.config/nvim/init.vim

# brew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

source ~/.zprofile

# Install all apps and packages
xargs --verbose --arg-file apps/brew.txt brew install -y &
xargs --verbose --arg-file apps/port.txt sudo port install -y &

jobs

qlmanage -r
brew services restart mysql


# Install NodeJS with fnm
fnm completions --shell zsh
fnm install
fnm use
corepack enable
corepack prepare yarn@stable --activate

# iterm settings
defaults write com.googlecode.iterm2.plist PrefsCustomFolder -string "$HOME/.dotfiles/.config"
defaults write com.googlecode.iterm2.plist LoadPrefsFromCustomFolder -bool true

# login with new .zprofile
exec zsh --login
