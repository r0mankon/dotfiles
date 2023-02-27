# Steps

`git clone https://github.com/r0mankon/dotfiles ~/.dotfiles`

`cd ~/.dotfiles`

`./setup.sh`

# Notes

Most of the things are automated except for deb & appImage packages which are supposed to be downloaded manually from the respective site.

And it starts from `setup.sh`

#### Delete or comment out this line in `setup.sh` if not on KDE

`# ./kde.sh`

## Editor fonts

Sorted by preference

- Meslo or Menlo
- Jetbrains Mono
- Cascadia Code

## Terminal fonts

- Meslo Nerd Font patched for Powerlevel10k
- Cascadia Mono PL

# Caution for others

Delete `.config/user-dirs.dirs` if you don't know what you're doing!
