# oh-my-zsh, themes & plugins

sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

git clone --depth=1 "https://github.com/romkatv/powerlevel10k.git \
${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/themes/powerlevel10k" &

git clone "https://github.com/zsh-users/zsh-autosuggestions \
${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/plugins/zsh-autosuggestions" &

# fast syntax highlighting
git clone "https://github.com/z-shell/F-Sy-H.git \
${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/plugins/F-Sy-H" &

git clone --depth 1 -- "https://github.com/marlonrichert/zsh-autocomplete.git \
${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/plugins/zsh-autocomplete" &

git clone "https://github.com/grigorii-zander/zsh-npm-scripts-autocomplete.git \
${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/plugins/zsh-npm-scripts-autocomplete" &

curl -L https://git.io/auto-ls > ~/.oh-my-zsh/custom/plugins/auto-ls.zsh &
