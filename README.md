# Steps

`git clone git@github.com:r0mankon/dotfiles.git ~/.dotfiles`

`cd ~/.dotfiles`

## Linux
`./setup.linux.sh`

### With KDE specific fixes and packages
`./setup.linux-kde.sh`

## MacOS

`./setup.mac.sh`

# Notes

Most of the things are automated except for deb & appImage packages which should be downloaded manually from the respective site.

## Fonts

Sorted by preference

- ### Editor

  - Meslo or Menlo
  - Jetbrains Mono
  - Cascadia Code

- ### Terminal

  - Meslo Nerd Font patched for Powerlevel10k
  - Cascadia Mono PL

## Caution for others

- Delete `.config/user-dirs.dirs` if you don't know what you're doing!

# MacOS extras

## Make ntfs drive writeable

`brew tap gromgit/homebrew-fuse`
`brew install ntfs-3g-mac`

- ### Need to disable SIP in recovery mode

   `csrutil disable`

- ### Replace the built-in `mount_ntfs` with `ntfs-3g-mac`

   ```sh
   sudo mount -uw /
   sudo mv /sbin/mount_ntfs /sbin/mount_ntfs.original
   sudo ln -s /usr/local/sbin/mount_ntfs /sbin/mount_ntfs
   ```

- ### Re-enable SIP

   `csrutil enable`
